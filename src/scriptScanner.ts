import { readFile } from "node:fs/promises";
import path from "node:path";

import fg from "fast-glob";

import type { ScriptAudioSignal } from "./reportSchema.js";

const ignoredUnityFolders = [
  "Library/**",
  "Temp/**",
  "Obj/**",
  "Build/**",
  "Builds/**",
  "Logs/**",
  "UserSettings/**",
  "Packages/**",
  "Assets/Plugins/**",
  "Assets/**/Editor/**"
];

const signalPatterns: Array<{
  kind: ScriptAudioSignal["kind"];
  signal: string;
  pattern: RegExp;
}> = [
  {
    kind: "RuntimeAudioSource",
    signal: "Creates an AudioSource at runtime",
    pattern: /AddComponent\s*<\s*AudioSource\s*>\s*\(/u
  },
  {
    kind: "RuntimeAudioSource",
    signal: "Fetches an AudioSource component at runtime",
    pattern: /GetComponent\s*<\s*AudioSource\s*>\s*\(/u
  },
  {
    kind: "SerializedAudioSourceField",
    signal: "Declares a serialized AudioSource field",
    pattern: /(?:\[SerializeField\]\s*)?(?:private|public|protected|internal)\s+(?:readonly\s+)?AudioSource(?:\[\])?\s+\w+\s*(?:=|;|$)/u
  },
  {
    kind: "AudioClipUsage",
    signal: "Declares an AudioClip reference",
    pattern: /(?:private|public|protected|internal)\s+(?:readonly\s+)?AudioClip(?:\[\])?\s+\w+\s*(?:=|;|$)/u
  },
  {
    kind: "AudioMixerRouting",
    signal: "Declares an AudioMixerGroup reference",
    pattern: /(?:private|public|protected|internal)\s+(?:readonly\s+)?AudioMixerGroup\s+\w+\s*(?:=|;|$)/u
  },
  {
    kind: "AudioMixerRouting",
    signal: "Assigns outputAudioMixerGroup",
    pattern: /\.outputAudioMixerGroup\s*=/u
  },
  {
    kind: "UnityAudioPlayback",
    signal: "Calls Play on an audio source-like object",
    pattern: /\b(?:src|source|musicSource|sfxSource|audioSource)\s*\.\s*Play\s*\(/iu
  },
  {
    kind: "MiddlewareUsage",
    signal: "Uses Wwise/Audiokinetic API from script",
    pattern: /\b(?:AkSoundEngine|AkEvent|PostEvent|AK\.Wwise)\b/u
  }
];

export async function scanScriptAudioSignals(projectPath: string): Promise<ScriptAudioSignal[]> {
  const scriptFiles = await fg("Assets/**/*.cs", {
    cwd: projectPath,
    absolute: false,
    onlyFiles: true,
    ignore: ignoredUnityFolders
  });

  const signals: ScriptAudioSignal[] = [];

  for (const relativePath of scriptFiles.sort()) {
    const normalizedSource = normalizePath(relativePath);
    const contents = await readFile(path.join(projectPath, relativePath), "utf8");
    const lines = contents.split(/\r?\n/u);

    lines.forEach((line, index) => {
      if (/^\s*(?:\/\/|\/\*|\*)/u.test(line)) {
        return;
      }

      for (const signalPattern of signalPatterns) {
        if (!signalPattern.pattern.test(line)) {
          continue;
        }

        signals.push({
          sourceFile: normalizedSource,
          lineNumber: index + 1,
          kind: signalPattern.kind,
          signal: signalPattern.signal,
          matchedText: line.trim()
        });
      }
    });
  }

  return signals;
}

function normalizePath(value: string): string {
  return value.split(path.sep).join("/");
}
