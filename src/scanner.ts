import { readFile, stat } from "node:fs/promises";
import path from "node:path";

import fg from "fast-glob";
import { parseFile } from "music-metadata";

import type { AudioAuditConfig } from "./config.js";
import type { AudioAsset, AudioAuditReport, Finding, UnityAudioReference } from "./reportSchema.js";

const audioExtensions = new Set([".wav", ".mp3", ".ogg", ".aiff", ".aif"]);
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
  const references = await scanUnityReferences(absoluteProjectPath, guidIndex);

  const referencesByPath = groupReferencesByPath(references);
  const linkedAssets = assets.map((asset) => ({
    ...asset,
    referencedBy: referencesByPath.get(asset.path) ?? []
  }));

  const findings = runRules(linkedAssets, config);

  return {
    projectPath: absoluteProjectPath,
    generatedAt: new Date().toISOString(),
    summary: {
      audioAssetCount: linkedAssets.length,
      referenceCount: references.length,
      findingCount: findings.length,
      errorCount: findings.filter((finding) => finding.severity === "error").length,
      warningCount: findings.filter((finding) => finding.severity === "warning").length,
      infoCount: findings.filter((finding) => finding.severity === "info").length
    },
    assets: linkedAssets,
    references,
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

async function scanUnityReferences(projectPath: string, guidIndex: GuidIndex): Promise<UnityAudioReference[]> {
  const unityFiles = await fg(unityTextPatterns, {
    cwd: projectPath,
    absolute: false,
    onlyFiles: true,
    ignore: ignoredUnityFolders
  });

  const references: UnityAudioReference[] = [];

  for (const relativePath of unityFiles.sort()) {
    const normalizedSource = normalizePath(relativePath);
    const contents = await readFile(path.join(projectPath, relativePath), "utf8");
    const sourceLooksLikeAudioSource = contents.includes("AudioSource");
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
        componentType: sourceLooksLikeAudioSource ? "AudioSource" : "Unknown"
      });
    }
  }

  return references;
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

function runRules(assets: AudioAsset[], config: AudioAuditConfig): Finding[] {
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

  return findings.sort((a, b) => a.severity.localeCompare(b.severity) || a.file?.localeCompare(b.file ?? "") || 0);
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
