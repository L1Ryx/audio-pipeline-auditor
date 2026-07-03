# Audio Pipeline Auditor for Unity

A small TypeScript CLI for auditing Unity projects that use built-in audio or lightweight custom audio systems.

This project is a work in progress. Expect the scanner, report UI, and middleware coverage to evolve as more Unity project shapes are tested.

![Audio Pipeline Auditor report screenshot](assets/screenshot.png)

Install it with npm, then run the scanner against a Unity project path.

## What It Checks

- Scan Unity project folders for audio files and Unity text assets.
- Detect oversized audio, unreferenced clips, missing AudioSource clips, unresolved clip GUIDs, missing mixer routing, Play On Awake, and suspicious AudioSource volume.
- Detect audio pipeline architecture: serialized `AudioSource` components, runtime-created Unity audio, ScriptableObject audio definitions, and Wwise artifacts.
- Summarize obvious Wwise and FMOD script calls, including common API names and first string event arguments.
- Build a structured JSON report.
- Render a static React-powered HTML report.
- Return CI-friendly exit codes when findings reach a configured severity.

## Quick Start on a Unity Project

Install the CLI:

```bash
npm install -g @l1ryx/audio-pipeline-auditor-unity
```

Scan a Unity project:

```bash
audio-audit scan /path/to/MyUnityProject --out /path/to/MyUnityProject/audio-audit-report
```

Then open:

```txt
/path/to/MyUnityProject/audio-audit-report/index.html
```

Do not run `npm install` inside the Unity project. The Unity project is only the scan target.

If you want a config file:

```bash
audio-audit init
```

## Build From Source

You can also clone and build the auditor locally:

```bash
git clone https://github.com/l1ryx/audio-pipeline-auditor.git
cd audio-pipeline-auditor
npm install
npm run build
node dist/cli.js scan /path/to/MyUnityProject --out /path/to/MyUnityProject/audio-audit-report
```

The generated report includes `schemaVersion: "0.1.0"` in `report.json` so future report viewers can handle report shape changes deliberately.

## Reports

Audio Pipeline Auditor scans your Unity project locally or in CI. It does not require uploading your Unity project to a website.

Each scan writes a static report folder:

```text
audio-audit-report/
  index.html
  report.json
```

Open `index.html` in a browser to view the report. You can also upload the report folder as a CI artifact or host the generated files on any static file host.

## Limitations

- Unity assets must be serialized as text for scene, prefab, and asset scanning to be useful.
- Audio metadata depends on what `music-metadata` can read from the discovered files.
- Wwise and FMOD support is intentionally lightweight: the scanner summarizes obvious script calls, common component names, and simple artifacts, but it does not parse full Wwise projects, FMOD Studio projects, or bank contents.
- The report is a static snapshot. It does not watch project files or upload project contents.
