import { readFile } from "node:fs/promises";
import path from "node:path";

import fg from "fast-glob";

import type { ScriptableAudioDefinition } from "./reportSchema.js";

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

export async function scanScriptableAudioDefinitions(
  projectPath: string,
  audioGuidIndex: GuidIndex
): Promise<ScriptableAudioDefinition[]> {
  const assetFiles = await fg("Assets/**/*.asset", {
    cwd: projectPath,
    absolute: false,
    onlyFiles: true,
    ignore: ignoredUnityFolders
  });

  const definitions: ScriptableAudioDefinition[] = [];

  for (const relativePath of assetFiles.sort()) {
    const contents = await readFile(path.join(projectPath, relativePath), "utf8");

    if (!looksLikeScriptableAudioDefinition(contents)) {
      continue;
    }

    const audioClipGuids = Array.from(new Set(findAudioClipGuids(contents, audioGuidIndex)));
    const audioClipPaths = audioClipGuids.map((guid) => audioGuidIndex.get(guid)).filter((value): value is string => Boolean(value));
    const mixerGroupGuid = contents.match(/^\s*mixerGroup:\s*\{[^}]*guid:\s*([a-fA-F0-9]+)/mu)?.[1];
    const mixerGroupLine = contents.match(/^\s*mixerGroup:\s*\{[^}]*\}/mu)?.[0];

    definitions.push({
      sourceFile: normalizePath(relativePath),
      definitionType: inferDefinitionType(relativePath, contents),
      audioClipGuids,
      audioClipPaths,
      hasAudioClip: audioClipGuids.length > 0,
      hasMixerRouting: Boolean(mixerGroupLine && !mixerGroupLine.includes("fileID: 0")),
      mixerGroupGuid,
      volume: parseUnityNumber(contents, "volume"),
      loop: parseUnityBoolean(contents, "loop")
    });
  }

  return definitions;
}

function looksLikeScriptableAudioDefinition(contents: string): boolean {
  const hasClipField = /^\s*clips?:\s*(?:\{|$)/mu.test(contents);
  const hasAudioTuningFields = /^\s*(?:mixerGroup|volume|pitch|loop|spatialBlend):/mu.test(contents);
  return hasClipField && hasAudioTuningFields;
}

function findAudioClipGuids(contents: string, audioGuidIndex: GuidIndex): string[] {
  return Array.from(contents.matchAll(/guid:\s*([a-fA-F0-9]+)/gu))
    .map((match) => match[1])
    .filter((guid) => audioGuidIndex.has(guid));
}

function inferDefinitionType(relativePath: string, contents: string): ScriptableAudioDefinition["definitionType"] {
  const fileName = path.basename(relativePath).toLowerCase();

  if (/^\s*clips:\s*$/mu.test(contents) || fileName.startsWith("sfx_")) {
    return "SfxDefinition";
  }

  if (/^\s*clip:\s*\{/mu.test(contents) || fileName.includes("theme") || fileName.startsWith("music_")) {
    return "MusicTrack";
  }

  return "Unknown";
}

function parseUnityBoolean(block: string, propertyName: string): boolean | undefined {
  const value = block.match(new RegExp(`^\\s*${propertyName}:\\s*(\\d+)`, "mu"))?.[1];
  return value === undefined ? undefined : value === "1";
}

function parseUnityNumber(block: string, propertyName: string): number | undefined {
  const value = block.match(new RegExp(`^\\s*${propertyName}:\\s*(-?\\d+(?:\\.\\d+)?)`, "mu"))?.[1];
  return value === undefined ? undefined : Number(value);
}

function normalizePath(value: string): string {
  return value.split(path.sep).join("/");
}
