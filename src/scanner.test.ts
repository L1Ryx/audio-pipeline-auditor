import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, test } from "vitest";

import { defaultConfig } from "./config.js";
import { scanUnityProject } from "./scanner.js";

describe("scanUnityProject", () => {
  test("links Unity guid references to audio assets", async ({ task }) => {
    const root = path.join(".tmp-tests", task.id);
    await mkdir(path.join(root, "Assets", "Audio"), { recursive: true });
    await mkdir(path.join(root, "Assets", "Scenes"), { recursive: true });

    await writeFile(path.join(root, "Assets", "Audio", "jump.wav"), "placeholder", "utf8");
    await writeFile(
      path.join(root, "Assets", "Audio", "jump.wav.meta"),
      "fileFormatVersion: 2\nguid: 0123456789abcdef0123456789abcdef\n",
      "utf8"
    );
    await writeFile(
      path.join(root, "Assets", "Scenes", "Main.unity"),
      "AudioSource:\n  m_audioClip: {fileID: 8300000, guid: 0123456789abcdef0123456789abcdef, type: 3}\n",
      "utf8"
    );

    const report = await scanUnityProject(root, defaultConfig);

    expect(report.assets).toHaveLength(1);
    expect(report.assets[0]?.referencedBy).toEqual(["Assets/Scenes/Main.unity"]);
    expect(report.references).toHaveLength(1);
  });
});
