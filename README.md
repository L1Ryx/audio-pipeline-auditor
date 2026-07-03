# Audio Pipeline Auditor

A small TypeScript CLI for auditing Unity projects that use built-in audio or lightweight custom audio systems.

The CLI command is:

```bash
audio-audit
```

## V1 Shape

- Scan Unity project folders for audio files and Unity text assets.
- Detect oversized audio, unreferenced clips, missing AudioSource clips, unresolved clip GUIDs, missing mixer routing, Play On Awake, and suspicious AudioSource volume.
- Detect audio pipeline architecture: serialized `AudioSource` components, runtime-created Unity audio, ScriptableObject audio definitions, and Wwise artifacts.
- Summarize obvious Wwise and FMOD script calls, including common API names and first string event arguments.
- Build a structured JSON report.
- Render a static React-powered HTML report.
- Return CI-friendly exit codes when findings reach a configured severity.
- Publish a demo report to GitHub Pages.

## Commands

```bash
npm install
npm run build
npm run dev
npm run dev:cli -- init
npm run dev:cli -- scan ./MyUnityProject --out ./audio-audit-report
npm run dev:cli -- validate-config ./audio-audit.config.json
```

`npm run dev` builds the demo report and serves it with Vite so the report UI can be tested in a browser.

`npm run dev:report` serves the existing `demo-site` folder without rebuilding it.

## Quick Start on a Unity Project

From this repo during local development:

```bash
npm install
npm run build
node dist/cli.js init
node dist/cli.js scan /path/to/MyUnityProject --out /path/to/MyUnityProject/audio-audit-report
```

Then open:

```txt
/path/to/MyUnityProject/audio-audit-report/index.html
```

After the package is published or installed globally, the same workflow becomes:

```bash
audio-audit init
audio-audit scan /path/to/MyUnityProject --out /path/to/MyUnityProject/audio-audit-report
```

The generated report includes `schemaVersion: "0.1.0"` in `report.json` so future report viewers can handle report shape changes deliberately.

## GitHub Pages Hosting

Yes, this can be hosted on GitHub Pages. The repo includes a workflow at `.github/workflows/pages.yml` that builds a sample static report and deploys it as a project page.

Once the repo is pushed to GitHub:

1. Open the repository settings.
2. Go to **Pages**.
3. Set **Build and deployment** to **GitHub Actions**.
4. Push to `main`.

The project site will use the standard project URL:

```txt
https://<github-user>.github.io/audio-pipeline-auditor/
```

The CLI-generated reports are also static HTML, so a report folder can be uploaded anywhere that serves plain files.

## Project Input Model

The hosted site should not ask users to upload an entire Unity project. Unity projects are large, private, and full of generated/cache content. For this tool, the safer V1 model is:

- Run the scanner locally against a project folder.
- Or run the scanner in CI on a checked-out repository.
- Publish only the generated `report.json` and `index.html` report.

That means GitHub Pages hosts the demo and static reports, while project access happens wherever the project already lives. For a public repo this can be a GitHub Action. For a private repo, the scan can run inside that private repo's CI and publish the report as an artifact or private Pages output.

Longer term, the front end can become a report viewer that accepts a `report.json` file, but the scanner itself should stay local/CI-first unless there is a real authenticated backend with clear storage and privacy rules.

## Limitations

- Unity assets must be serialized as text for scene, prefab, and asset scanning to be useful.
- Audio metadata depends on what `music-metadata` can read from the discovered files.
- Wwise and FMOD support is intentionally lightweight: the scanner summarizes obvious script calls, common component names, and simple artifacts, but it does not parse full Wwise projects, FMOD Studio projects, or bank contents.
- The report is a static snapshot. It does not watch project files or upload project contents.
