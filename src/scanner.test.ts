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
      [
        "AudioSource:",
        "  m_audioClip: {fileID: 8300000, guid: 0123456789abcdef0123456789abcdef, type: 3}",
        "  m_OutputAudioMixerGroup: {fileID: 0}",
        "  m_PlayOnAwake: 1",
        "  m_Volume: 1.2"
      ].join("\n"),
      "utf8"
    );

    const report = await scanUnityProject(root, defaultConfig);

    expect(report.assets).toHaveLength(1);
    expect(report.assets[0]?.referencedBy).toEqual(["Assets/Scenes/Main.unity"]);
    expect(report.references).toHaveLength(1);
    expect(report.audioSources).toHaveLength(1);
    expect(report.audioSources[0]).toMatchObject({
      clipPath: "Assets/Audio/jump.wav",
      hasMixerRouting: false,
      playOnAwake: true,
      volume: 1.2
    });
    expect(report.findings.map((finding) => finding.ruleId)).toEqual([
      "audio-source-volume",
      "missing-mixer-routing",
      "play-on-awake"
    ]);
  });

  test("flags missing and unresolved AudioSource clip references", async ({ task }) => {
    const root = path.join(".tmp-tests", task.id);
    await mkdir(path.join(root, "Assets", "Scenes"), { recursive: true });

    await writeFile(
      path.join(root, "Assets", "Scenes", "Broken.unity"),
      [
        "AudioSource:",
        "  m_audioClip: {fileID: 0}",
        "  m_OutputAudioMixerGroup: {fileID: 0}",
        "--- !u!82 &8200001",
        "AudioSource:",
        "  m_audioClip: {fileID: 8300000, guid: ffffffffffffffffffffffffffffffff, type: 3}",
        "  m_OutputAudioMixerGroup: {fileID: 0}"
      ].join("\n"),
      "utf8"
    );

    const report = await scanUnityProject(root, defaultConfig);

    expect(report.audioSources).toHaveLength(2);
    expect(report.findings.map((finding) => finding.ruleId)).toEqual([
      "missing-audio-asset-reference",
      "missing-audio-clip",
      "missing-mixer-routing",
      "missing-mixer-routing"
    ]);
  });

  test("detects runtime Unity audio and ScriptableObject audio definitions", async ({ task }) => {
    const root = path.join(".tmp-tests", task.id);
    await mkdir(path.join(root, "Assets", "Audio", "Source"), { recursive: true });
    await mkdir(path.join(root, "Assets", "Scripts"), { recursive: true });

    await writeFile(path.join(root, "Assets", "Audio", "Source", "laser.wav"), "placeholder", "utf8");
    await writeFile(
      path.join(root, "Assets", "Audio", "Source", "laser.wav.meta"),
      "fileFormatVersion: 2\nguid: 11111111111111111111111111111111\n",
      "utf8"
    );
    await writeFile(
      path.join(root, "Assets", "Audio", "SFX_Laser.asset"),
      [
        "%YAML 1.1",
        "--- !u!114 &11400000",
        "MonoBehaviour:",
        "  m_Name: SFX_Laser",
        "  clips:",
        "  - {fileID: 8300000, guid: 11111111111111111111111111111111, type: 3}",
        "  volume: 0.8",
        "  loop: 0",
        "  mixerGroup: {fileID: 24300002, guid: 22222222222222222222222222222222, type: 2}"
      ].join("\n"),
      "utf8"
    );
    await writeFile(
      path.join(root, "Assets", "Scripts", "RuntimeAudio.cs"),
      [
        "using UnityEngine;",
        "public class RuntimeAudio : MonoBehaviour",
        "{",
        "  [SerializeField] private AudioSource musicSource;",
        "  private void Awake()",
        "  {",
        "    musicSource = gameObject.AddComponent<AudioSource>();",
        "    musicSource.Play();",
        "  }",
        "}"
      ].join("\n"),
      "utf8"
    );

    const report = await scanUnityProject(root, defaultConfig);

    expect(report.audioSources).toHaveLength(0);
    expect(report.scriptableAudioDefinitions).toHaveLength(1);
    expect(report.scriptableAudioDefinitions[0]).toMatchObject({
      sourceFile: "Assets/Audio/SFX_Laser.asset",
      definitionType: "SfxDefinition",
      audioClipPaths: ["Assets/Audio/Source/laser.wav"],
      hasMixerRouting: true
    });
    expect(report.scriptAudioSignals.map((signal) => signal.kind)).toContain("RuntimeAudioSource");
    expect(report.pipelineProfiles.map((profile) => profile.kind)).toEqual([
      "RuntimeUnityAudio",
      "ScriptableObjectAudio"
    ]);
    expect(report.assets[0]?.referencedBy).toEqual(["Assets/Audio/SFX_Laser.asset"]);
  });
});
