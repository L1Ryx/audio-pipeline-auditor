import { readFile, stat } from "node:fs/promises";
import path from "node:path";

import fg from "fast-glob";
import { parseFile } from "music-metadata";

import type { AudioAuditConfig } from "./config.js";
import { detectPipelineProfiles } from "./pipelineDetector.js";
import type {
  AudioAsset,
  AudioAuditReport,
  Finding,
  ScriptableAudioDefinition,
  Severity,
  UnityAudioReference,
  UnityAudioSource
} from "./reportSchema.js";
import { scanScriptableAudioDefinitions } from "./scriptableAudioScanner.js";
import { scanScriptAudio } from "./scriptScanner.js";

const unityTextPatterns = ["Assets/**/*.unity", "Assets/**/*.prefab", "Assets/**/*.asset"];

const ignoredUnityFolders = [
  "Library/**",
  "Temp/**",
  "Obj/**",
  "Build/**",
  "Builds/**",
  "Logs/**",
  "UserSettings/**",
  "Packages/**"
];

type GuidIndex = Map<string, string>;

export async function scanUnityProject(
  projectPath: string,
  config: AudioAuditConfig
): Promise<AudioAuditReport> {
  const absoluteProjectPath = path.resolve(projectPath);
  const guidIndex = await buildAudioGuidIndex(absoluteProjectPath);
  const assets = await scanAudioAssets(absoluteProjectPath);
  const { references, audioSources } = await scanUnityTextAssets(absoluteProjectPath, guidIndex);
  const { signals: scriptAudioSignals, middlewareCalls } = await scanScriptAudio(absoluteProjectPath);
  const scriptableAudioDefinitions = await scanScriptableAudioDefinitions(absoluteProjectPath, guidIndex);
  const pipelineProfiles = await detectPipelineProfiles({
    projectPath: absoluteProjectPath,
    audioSources,
    scriptAudioSignals,
    middlewareCalls,
    scriptableAudioDefinitions
  });

  const referencesByPath = groupReferencesByPath(references);
  const linkedAssets = assets.map((asset) => ({
    ...asset,
    referencedBy: referencesByPath.get(asset.path) ?? []
  }));

  const findings = runRules(linkedAssets, audioSources, scriptableAudioDefinitions, config);

  return {
    projectPath: absoluteProjectPath,
    generatedAt: new Date().toISOString(),
    configuration: config,
    summary: {
      audioAssetCount: linkedAssets.length,
      referenceCount: references.length,
      audioSourceCount: audioSources.length,
      scriptAudioSignalCount: scriptAudioSignals.length,
      middlewareCallCount: middlewareCalls.length,
      scriptableAudioDefinitionCount: scriptableAudioDefinitions.length,
      findingCount: findings.length,
      errorCount: findings.filter((finding) => finding.severity === "error").length,
      warningCount: findings.filter((finding) => finding.severity === "warning").length,
      infoCount: findings.filter((finding) => finding.severity === "info").length
    },
    assets: linkedAssets,
    references,
    audioSources,
    pipelineProfiles,
    scriptAudioSignals,
    middlewareCalls,
    scriptableAudioDefinitions,
    findings
  };
}

async function scanAudioAssets(projectPath: string): Promise<AudioAsset[]> {
  const audioFiles = await fg("Assets/**/*.{wav,mp3,ogg,aiff,aif}", {
    cwd: projectPath,
    absolute: false,
    onlyFiles: true,
    ignore: ignoredUnityFolders
  });

  const assets = await Promise.all(
    audioFiles.sort().map(async (relativePath) => {
      const absolutePath = path.join(projectPath, relativePath);
      const fileStat = await stat(absolutePath);
      const extension = path.extname(relativePath).toLowerCase();
      const metadata = await readAudioMetadata(absolutePath);

      return {
        id: relativePath,
        path: normalizePath(relativePath),
        fileName: path.basename(relativePath),
        extension,
        sizeBytes: fileStat.size,
        durationSeconds: metadata.durationSeconds,
        sampleRate: metadata.sampleRate,
        channels: metadata.channels,
        bitDepth: metadata.bitDepth,
        format: metadata.format,
        referencedBy: []
      };
    })
  );

  return assets;
}

async function readAudioMetadata(absolutePath: string): Promise<Partial<AudioAsset>> {
  try {
    const metadata = await parseFile(absolutePath);
    return {
      durationSeconds: metadata.format.duration,
      sampleRate: metadata.format.sampleRate,
      channels: metadata.format.numberOfChannels,
      bitDepth: metadata.format.bitsPerSample,
      format: metadata.format.container
    };
  } catch {
    return {};
  }
}

async function buildAudioGuidIndex(projectPath: string): Promise<GuidIndex> {
  const metaFiles = await fg("Assets/**/*.{wav,mp3,ogg,aiff,aif}.meta", {
    cwd: projectPath,
    absolute: false,
    onlyFiles: true,
    ignore: ignoredUnityFolders
  });

  const entries = await Promise.all(
    metaFiles.map(async (metaPath) => {
      const contents = await readFile(path.join(projectPath, metaPath), "utf8");
      const guid = contents.match(/^guid:\s*([a-fA-F0-9]+)/m)?.[1];
      const assetPath = normalizePath(metaPath.replace(/\.meta$/u, ""));
      return guid ? ([guid, assetPath] as const) : undefined;
    })
  );

  return new Map(entries.filter((entry): entry is readonly [string, string] => Boolean(entry)));
}

async function scanUnityTextAssets(
  projectPath: string,
  guidIndex: GuidIndex
): Promise<{ references: UnityAudioReference[]; audioSources: UnityAudioSource[] }> {
  const unityFiles = await fg(unityTextPatterns, {
    cwd: projectPath,
    absolute: false,
    onlyFiles: true,
    ignore: ignoredUnityFolders
  });

  const references: UnityAudioReference[] = [];
  const audioSources: UnityAudioSource[] = [];

  for (const relativePath of unityFiles.sort()) {
    const normalizedSource = normalizePath(relativePath);
    const contents = await readFile(path.join(projectPath, relativePath), "utf8");
    const parsedAudioSources = parseAudioSources(normalizedSource, contents, guidIndex);
    audioSources.push(...parsedAudioSources);

    const guidMatches = contents.matchAll(/guid:\s*([a-fA-F0-9]+)/g);

    for (const match of guidMatches) {
      const guid = match[1];
      const referencedPath = guidIndex.get(guid);

      if (!referencedPath) {
        continue;
      }

      references.push({
        sourceFile: normalizedSource,
        referencedAssetGuid: guid,
        referencedPath,
        componentType: parsedAudioSources.some((audioSource) => audioSource.clipGuid === guid) ? "AudioSource" : "Unknown"
      });
    }
  }

  return { references, audioSources };
}

function parseAudioSources(sourceFile: string, contents: string, guidIndex: GuidIndex): UnityAudioSource[] {
  const lines = contents.split(/\r?\n/u);
  const audioSources: UnityAudioSource[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index]?.trim() !== "AudioSource:") {
      continue;
    }

    const blockLines = collectYamlBlock(lines, index);
    const block = blockLines.join("\n");
    const clipLine = block.match(/m_audioClip:\s*\{[^}]*\}/u)?.[0];
    const clipGuid = clipLine?.match(/guid:\s*([a-fA-F0-9]+)/u)?.[1];
    const mixerLine = block.match(/m_OutputAudioMixerGroup:\s*\{[^}]*\}/u)?.[0];

    audioSources.push({
      sourceFile,
      lineNumber: index + 1,
      clipGuid,
      clipPath: clipGuid ? guidIndex.get(clipGuid) : undefined,
      hasAudioClip: Boolean(clipGuid) || Boolean(clipLine && !clipLine.includes("fileID: 0")),
      hasMixerRouting: Boolean(mixerLine && !mixerLine.includes("fileID: 0")),
      playOnAwake: parseUnityBoolean(block, "m_PlayOnAwake"),
      volume: parseUnityNumber(block, "m_Volume"),
      spatialBlend: parseUnityNumber(block, "m_SpatialBlend")
    });
  }

  return audioSources;
}

function collectYamlBlock(lines: string[], startIndex: number): string[] {
  const block = [lines[startIndex] ?? ""];

  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = lines[index] ?? "";

    if (line.startsWith("---")) {
      break;
    }

    block.push(line);
  }

  return block;
}

function parseUnityBoolean(block: string, propertyName: string): boolean | undefined {
  const value = block.match(new RegExp(`^\\s*${propertyName}:\\s*(\\d+)`, "mu"))?.[1];
  return value === undefined ? undefined : value === "1";
}

function parseUnityNumber(block: string, propertyName: string): number | undefined {
  const value = block.match(new RegExp(`^\\s*${propertyName}:\\s*(-?\\d+(?:\\.\\d+)?)`, "mu"))?.[1];
  return value === undefined ? undefined : Number(value);
}

function groupReferencesByPath(references: UnityAudioReference[]): Map<string, string[]> {
  const grouped = new Map<string, string[]>();

  for (const reference of references) {
    if (!reference.referencedPath) {
      continue;
    }

    const existing = grouped.get(reference.referencedPath) ?? [];
    existing.push(reference.sourceFile);
    grouped.set(reference.referencedPath, Array.from(new Set(existing)).sort());
  }

  return grouped;
}

function runRules(
  assets: AudioAsset[],
  audioSources: UnityAudioSource[],
  scriptableAudioDefinitions: ScriptableAudioDefinition[],
  config: AudioAuditConfig
): Finding[] {
  const findings: Finding[] = [];

  for (const asset of assets) {
    if (asset.sizeBytes > config.rules.maxFileSizeBytes) {
      findings.push({
        id: `large-file:${asset.path}`,
        ruleId: "large-file",
        severity: "warning",
        title: "Large audio file",
        message: `${asset.path} is ${formatBytes(asset.sizeBytes)}, above the configured limit.`,
        file: asset.path,
        details: {
          sizeBytes: asset.sizeBytes,
          maxFileSizeBytes: config.rules.maxFileSizeBytes
        }
      });
    }

    if (asset.durationSeconds && asset.durationSeconds > config.rules.maxDurationSeconds) {
      findings.push({
        id: `long-duration:${asset.path}`,
        ruleId: "long-duration",
        severity: "warning",
        title: "Long audio clip",
        message: `${asset.path} is ${asset.durationSeconds.toFixed(1)} seconds long.`,
        file: asset.path,
        details: {
          durationSeconds: asset.durationSeconds,
          maxDurationSeconds: config.rules.maxDurationSeconds
        }
      });
    }

    if (config.rules.flagUnreferencedAudio && asset.referencedBy.length === 0) {
      findings.push({
        id: `unreferenced-audio:${asset.path}`,
        ruleId: "unreferenced-audio",
        severity: "info",
        title: "Audio file is not referenced",
        message: `${asset.path} was not referenced by scanned scenes, prefabs, or assets.`,
        file: asset.path
      });
    }
  }

  for (const audioSource of audioSources) {
    const location = `${audioSource.sourceFile}:${audioSource.lineNumber}`;

    if (config.rules.flagMissingAudioClips && !audioSource.hasAudioClip) {
      findings.push({
        id: `missing-audio-clip:${location}`,
        ruleId: "missing-audio-clip",
        severity: "error",
        title: "AudioSource has no clip",
        message: `AudioSource at ${location} has an empty audio clip reference.`,
        file: audioSource.sourceFile,
        details: {
          lineNumber: audioSource.lineNumber
        }
      });
    }

    if (config.rules.flagMissingAudioClips && audioSource.clipGuid && !audioSource.clipPath) {
      findings.push({
        id: `missing-audio-asset-reference:${location}`,
        ruleId: "missing-audio-asset-reference",
        severity: "error",
        title: "AudioSource references missing audio asset",
        message: `AudioSource at ${location} references GUID ${audioSource.clipGuid}, but no scanned audio asset owns that GUID.`,
        file: audioSource.sourceFile,
        details: {
          lineNumber: audioSource.lineNumber,
          clipGuid: audioSource.clipGuid
        }
      });
    }

    if (config.rules.requireAudioMixerRouting && !audioSource.hasMixerRouting) {
      findings.push({
        id: `missing-mixer-routing:${location}`,
        ruleId: "missing-mixer-routing",
        severity: "warning",
        title: "AudioSource has no mixer routing",
        message: `AudioSource at ${location} is not routed to an AudioMixerGroup.`,
        file: audioSource.sourceFile,
        details: {
          lineNumber: audioSource.lineNumber
        }
      });
    }

    if (config.rules.flagPlayOnAwake && audioSource.playOnAwake) {
      findings.push({
        id: `play-on-awake:${location}`,
        ruleId: "play-on-awake",
        severity: "warning",
        title: "AudioSource plays on awake",
        message: `AudioSource at ${location} has Play On Awake enabled.`,
        file: audioSource.sourceFile,
        details: {
          lineNumber: audioSource.lineNumber
        }
      });
    }

    if (audioSource.volume !== undefined && audioSource.volume > config.rules.maxAudioSourceVolume) {
      findings.push({
        id: `audio-source-volume:${location}`,
        ruleId: "audio-source-volume",
        severity: "warning",
        title: "AudioSource volume exceeds limit",
        message: `AudioSource at ${location} has volume ${audioSource.volume}.`,
        file: audioSource.sourceFile,
        details: {
          lineNumber: audioSource.lineNumber,
          volume: audioSource.volume,
          maxAudioSourceVolume: config.rules.maxAudioSourceVolume
        }
      });
    }
  }

  for (const definition of scriptableAudioDefinitions) {
    if (config.rules.flagMissingAudioClips && !definition.hasAudioClip) {
      findings.push({
        id: `audio-definition-missing-clip:${definition.sourceFile}`,
        ruleId: "audio-definition-missing-clip",
        severity: "error",
        title: "Audio definition has no clip",
        message: `${definition.sourceFile} looks like an audio definition but has no resolved AudioClip reference.`,
        file: definition.sourceFile,
        details: {
          definitionType: definition.definitionType
        }
      });
    }

    if (config.rules.requireAudioMixerRouting && !definition.hasMixerRouting) {
      findings.push({
        id: `audio-definition-missing-mixer-group:${definition.sourceFile}`,
        ruleId: "audio-definition-missing-mixer-group",
        severity: "warning",
        title: "Audio definition has no mixer group",
        message: `${definition.sourceFile} is not routed to an AudioMixerGroup.`,
        file: definition.sourceFile,
        details: {
          definitionType: definition.definitionType
        }
      });
    }
  }

  return findings.sort(compareFindings);
}

function compareFindings(a: Finding, b: Finding): number {
  const severityOrder: Record<Severity, number> = {
    error: 0,
    warning: 1,
    info: 2
  };

  return severityOrder[a.severity] - severityOrder[b.severity] || (a.file ?? "").localeCompare(b.file ?? "") || a.id.localeCompare(b.id);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function normalizePath(value: string): string {
  return value.split(path.sep).join("/");
}
