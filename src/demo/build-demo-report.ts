import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { defaultConfig } from "../config.js";
import { writeHtmlReport } from "../reportHtml.js";
import { scanUnityProject } from "../scanner.js";

const demoRoot = path.resolve("demo-fixture");
const outputRoot = path.resolve("demo-site");

await createDemoUnityProject(demoRoot);

const report = await scanUnityProject(demoRoot, {
  ...defaultConfig,
  rules: {
    ...defaultConfig.rules,
    maxFileSizeBytes: 10
  }
});

await mkdir(outputRoot, { recursive: true });
await writeFile(path.join(outputRoot, ".nojekyll"), "", "utf8");
await writeFile(path.join(outputRoot, "report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
await writeHtmlReport(report, outputRoot);

console.log(`Demo report written to ${outputRoot}`);

async function createDemoUnityProject(root: string): Promise<void> {
  const audioDirectory = path.join(root, "Assets", "Audio");
  const sceneDirectory = path.join(root, "Assets", "Scenes");
  const scriptDirectory = path.join(root, "Assets", "Scripts");

  await mkdir(audioDirectory, { recursive: true });
  await mkdir(sceneDirectory, { recursive: true });
  await mkdir(scriptDirectory, { recursive: true });

  await writeFile(path.join(audioDirectory, "laser.wav"), "demo audio placeholder", "utf8");
  await writeFile(
    path.join(audioDirectory, "laser.wav.meta"),
    "fileFormatVersion: 2\nguid: aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\nAudioImporter:\n  serializedVersion: 7\n",
    "utf8"
  );
  await writeFile(path.join(audioDirectory, "unused.ogg"), "unused demo audio placeholder", "utf8");
  await writeFile(
    path.join(audioDirectory, "unused.ogg.meta"),
    "fileFormatVersion: 2\nguid: bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb\nAudioImporter:\n  serializedVersion: 7\n",
    "utf8"
  );
  await writeFile(
    path.join(audioDirectory, "SFX_Laser.asset"),
    [
      "%YAML 1.1",
      "--- !u!114 &11400000",
      "MonoBehaviour:",
      "  m_Name: SFX_Laser",
      "  clips:",
      "  - {fileID: 8300000, guid: aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa, type: 3}",
      "  volume: 0.8",
      "  loop: 0",
      "  mixerGroup: {fileID: 24300002, guid: cccccccccccccccccccccccccccccccc, type: 2}"
    ].join("\n"),
    "utf8"
  );
  await writeFile(
    path.join(sceneDirectory, "SampleScene.unity"),
    [
      "%YAML 1.1",
      "--- !u!82 &8200000",
      "AudioSource:",
      "  m_audioClip: {fileID: 8300000, guid: aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa, type: 3}",
      "  m_OutputAudioMixerGroup: {fileID: 0}",
      "  m_PlayOnAwake: 1",
      "  m_Volume: 1",
      "--- !u!82 &8200001",
      "AudioSource:",
      "  m_audioClip: {fileID: 0}",
      "  m_OutputAudioMixerGroup: {fileID: 0}",
      "  m_PlayOnAwake: 0",
      "  m_Volume: 1"
    ].join("\n"),
    "utf8"
  );
  await writeFile(
    path.join(scriptDirectory, "RuntimeAudioPool.cs"),
    [
      "using UnityEngine;",
      "using FMODUnity;",
      "",
      "public class RuntimeAudioPool : MonoBehaviour",
      "{",
      "    [SerializeField] private AudioSource source;",
      "",
      "    private void Awake()",
      "    {",
      "        source = gameObject.AddComponent<AudioSource>();",
      "        source.playOnAwake = false;",
      "        AkSoundEngine.PostEvent(\"Play_Laser\", gameObject);",
      "        RuntimeManager.PlayOneShot(\"event:/UI/Click\");",
      "    }",
      "}"
    ].join("\n"),
    "utf8"
  );
}
