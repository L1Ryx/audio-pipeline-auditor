import { readFile } from "node:fs/promises";
import path from "node:path";

import fg from "fast-glob";

import type {
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

  const wwiseProfile = await detectWwiseProfile(input.projectPath, input.scriptAudioSignals);

  if (wwiseProfile) {
    profiles.push(wwiseProfile);
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

async function detectWwiseProfile(projectPath: string, scriptAudioSignals: ScriptAudioSignal[]): Promise<PipelineProfile | undefined> {
  const evidence: PipelineProfile["evidence"] = [];
  const activeScriptSignals = scriptAudioSignals.filter((signal) => signal.kind === "MiddlewareUsage");

  evidence.push(
    ...activeScriptSignals.slice(0, 8).map((signal) => ({
      file: signal.sourceFile,
      line: signal.lineNumber,
      signal: signal.signal
    }))
  );

  const artifactFiles = await fg(["Assets/WwiseSettings.xml", "Assets/**/*Wwise*.{xml,asset}", "Assets/**/*.wwu"], {
    cwd: projectPath,
    absolute: false,
    onlyFiles: true,
    ignore: ignoredUnityFolders
  });

  for (const artifactFile of artifactFiles.sort().slice(0, 8)) {
    evidence.push({
      file: normalizePath(artifactFile),
      signal: "Wwise artifact or settings file"
    });
  }

  const unityFiles = await fg(["Assets/**/*.{unity,prefab,asset}"], {
    cwd: projectPath,
    absolute: false,
    onlyFiles: true,
    ignore: ignoredUnityFolders
  });

  for (const unityFile of unityFiles.sort()) {
    if (evidence.length >= 16) {
      break;
    }

    const contents = await readFile(path.join(projectPath, unityFile), "utf8");
    const lines = contents.split(/\r?\n/u);
    const lineIndex = lines.findIndex((line) => /\b(?:WwiseGlobal|AkInitializer|AkEvent|AkBank)\b/u.test(line));

    if (lineIndex >= 0) {
      evidence.push({
        file: normalizePath(unityFile),
        line: lineIndex + 1,
        signal: "Wwise component or object name in Unity asset"
      });
    }
  }

  if (evidence.length === 0) {
    return undefined;
  }

  return {
    kind: "Wwise",
    confidence: activeScriptSignals.length > 0 ? "high" : "medium",
    summary:
      activeScriptSignals.length > 0
        ? "Active Wwise/Audiokinetic script usage was detected."
        : "Wwise artifacts were detected, but no active Wwise script API usage was found.",
    evidence
  };
}

function normalizePath(value: string): string {
  return value.split(path.sep).join("/");
}
