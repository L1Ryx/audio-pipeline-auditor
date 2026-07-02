# Audio Pipeline Auditor

A small TypeScript CLI for auditing Unity projects that use built-in audio or lightweight custom audio systems.

The CLI command is:

```bash
audio-audit
```

## V1 Shape

- Scan Unity project folders for audio files and Unity text assets.
- Build a structured JSON report.
- Render a static React-powered HTML report.
- Return CI-friendly exit codes when findings reach a configured severity.
- Publish a demo report to GitHub Pages.

## Commands

```bash
npm install
npm run build
npm run dev -- init
npm run dev -- scan ./MyUnityProject --out ./audio-audit-report
npm run dev -- validate-config ./audio-audit.config.json
```

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
