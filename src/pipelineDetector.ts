import { readFile } from "node:fs/promises";
import path from "node:path";

import fg from "fast-glob";

import type {
  MiddlewareCall,
  PipelineProfile,
  ScriptAudioSignal,
  ScriptableAudioDefinition,
  UnityAudioSource
} from "./reportSchema.js";

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

export async function detectPipelineProfiles(input: {
  projectPath: string;
  audioSources: UnityAudioSource[];
  scriptAudioSignals: ScriptAudioSignal[];
  middlewareCalls: MiddlewareCall[];
  scriptableAudioDefinitions: ScriptableAudioDefinition[];
}): Promise<PipelineProfile[]> {
  const profiles: PipelineProfile[] = [];

  if (input.audioSources.length > 0) {
    profiles.push({
      kind: "SerializedAudioSources",
      confidence: "high",
      summary: `${input.audioSources.length} serialized AudioSource component(s) found in Unity text assets.`,
      evidence: input.audioSources.slice(0, 8).map((audioSource) => ({
        file: audioSource.sourceFile,
        line: audioSource.lineNumber,
        signal: "Serialized AudioSource component"
      }))
    });
  }

  const runtimeSignals = input.scriptAudioSignals.filter((signal) =>
    ["RuntimeAudioSource", "SerializedAudioSourceField", "UnityAudioPlayback", "AudioMixerRouting"].includes(signal.kind)
  );

  if (runtimeSignals.length > 0) {
    profiles.push({
      kind: "RuntimeUnityAudio",
      confidence: runtimeSignals.some((signal) => signal.kind === "RuntimeAudioSource") ? "high" : "medium",
      summary: `${runtimeSignals.length} C# signal(s) indicate runtime Unity audio usage.`,
      evidence: runtimeSignals.slice(0, 10).map((signal) => ({
        file: signal.sourceFile,
        line: signal.lineNumber,
        signal: signal.signal
      }))
    });
  }

  if (input.scriptableAudioDefinitions.length > 0) {
    profiles.push({
      kind: "ScriptableObjectAudio",
      confidence: "high",
      summary: `${input.scriptableAudioDefinitions.length} ScriptableObject audio definition(s) found.`,
      evidence: input.scriptableAudioDefinitions.slice(0, 10).map((definition) => ({
        file: definition.sourceFile,
        signal: `${definition.definitionType} references ${definition.audioClipPaths.length} audio clip(s)`
      }))
    });
  }

  const wwiseProfile = await detectMiddlewareProfile({
    projectPath: input.projectPath,
    kind: "Wwise",
    calls: input.middlewareCalls.filter((call) => call.engine === "Wwise"),
    artifactPatterns: ["Assets/WwiseSettings.xml", "Assets/**/*Wwise*.{xml,asset}", "Assets/**/*.wwu"],
    unityObjectPattern: /\b(?:WwiseGlobal|AkInitializer|AkEvent|AkBank)\b/u,
    artifactSignal: "Wwise artifact or settings file",
    unityObjectSignal: "Wwise component or object name in Unity asset"
  });
  const fmodProfile = await detectMiddlewareProfile({
    projectPath: input.projectPath,
    kind: "FMOD",
    calls: input.middlewareCalls.filter((call) => call.engine === "FMOD"),
    artifactPatterns: ["Assets/**/*FMOD*.{asset,bank,strings}", "Assets/StreamingAssets/**/*.bank"],
    unityObjectPattern: /\b(?:StudioEventEmitter|StudioBankLoader|FMODStudioSettings|EventReference)\b/u,
    artifactSignal: "FMOD artifact, bank, or settings file",
    unityObjectSignal: "FMOD component or object name in Unity asset"
  });

  if (wwiseProfile) {
    profiles.push(wwiseProfile);
  }

  if (fmodProfile) {
    profiles.push(fmodProfile);
  }

  if (profiles.length === 0) {
    profiles.push({
      kind: "Unknown",
      confidence: "low",
      summary: "No Unity audio pipeline signals were detected.",
      evidence: []
    });
  }

  return profiles;
}

async function detectMiddlewareProfile(input: {
  projectPath: string;
  kind: Extract<PipelineProfile["kind"], "Wwise" | "FMOD">;
  calls: MiddlewareCall[];
  artifactPatterns: string[];
  unityObjectPattern: RegExp;
  artifactSignal: string;
  unityObjectSignal: string;
}): Promise<PipelineProfile | undefined> {
  const evidence: PipelineProfile["evidence"] = [];

  evidence.push(
    ...input.calls.slice(0, 10).map((call) => ({
      file: call.sourceFile,
      line: call.lineNumber,
      signal: call.eventName ? `${call.api} -> ${call.eventName}` : call.api
    }))
  );

  const artifactFiles = await fg(input.artifactPatterns, {
    cwd: input.projectPath,
    absolute: false,
    onlyFiles: true,
    ignore: ignoredUnityFolders
  });

  for (const artifactFile of artifactFiles.sort().slice(0, 8)) {
    evidence.push({
      file: normalizePath(artifactFile),
      signal: input.artifactSignal
    });
  }

  const unityFiles = await fg(["Assets/**/*.{unity,prefab,asset}"], {
    cwd: input.projectPath,
    absolute: false,
    onlyFiles: true,
    ignore: ignoredUnityFolders
  });

  for (const unityFile of unityFiles.sort()) {
    if (evidence.length >= 16) {
      break;
    }

    const contents = await readFile(path.join(input.projectPath, unityFile), "utf8");
    const lines = contents.split(/\r?\n/u);
    const lineIndex = lines.findIndex((line) => input.unityObjectPattern.test(line));

    if (lineIndex >= 0) {
      evidence.push({
        file: normalizePath(unityFile),
        line: lineIndex + 1,
        signal: input.unityObjectSignal
      });
    }
  }

  if (evidence.length === 0) {
    return undefined;
  }

  const apiSummary = summarizeMiddlewareApis(input.calls);

  return {
    kind: input.kind,
    confidence: input.calls.length > 0 ? "high" : "medium",
    summary:
      input.calls.length > 0
        ? `${input.calls.length} ${input.kind} script call(s) detected${apiSummary ? `: ${apiSummary}.` : "."}`
        : `${input.kind} artifacts were detected, but no active ${input.kind} script API usage was found.`,
    evidence
  };
}

function summarizeMiddlewareApis(calls: MiddlewareCall[]): string {
  const counts = new Map<string, number>();

  for (const call of calls) {
    counts.set(call.api, (counts.get(call.api) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 4)
    .map(([api, count]) => `${api} x${count}`)
    .join(", ");
}

function normalizePath(value: string): string {
  return value.split(path.sep).join("/");
}
