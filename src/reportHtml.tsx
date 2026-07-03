import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { renderToStaticMarkup } from "react-dom/server";

import { Metric, StatusChip, VisualSummary } from "./report/charts.js";
import { formatReportDate, formatReportTime } from "./report/formatters.js";
import { createReportScript } from "./report/interactivity.js";
import { ContextGrid, PipelineOverview } from "./report/sections.js";
import { createStyles } from "./report/styles.js";
import { AssetTable, AudioSourceTable, DefinitionTable, FindingGroup, MiddlewareCallTable, ScriptSignalTable } from "./report/tables.js";
import type { AudioAuditReport, Severity } from "./reportSchema.js";

type ReportHtmlProps = {
  report: AudioAuditReport;
};

export async function writeHtmlReport(report: AudioAuditReport, outputDirectory: string): Promise<string> {
  await mkdir(outputDirectory, { recursive: true });

  const htmlPath = path.join(outputDirectory, "index.html");
  const fontBase64 = await loadMonofontoFont();
  const faviconBase64 = await loadFavicon();
  const markup = `<!doctype html>${renderToStaticMarkup(
    <ReportHtml report={report} fontBase64={fontBase64} faviconBase64={faviconBase64} />
  )}`;

  await writeFile(htmlPath, markup, "utf8");
  return htmlPath;
}

async function loadMonofontoFont(): Promise<string | undefined> {
  try {
    return (await readFile(path.resolve("assets/monofonto/monofonto rg.otf"))).toString("base64");
  } catch {
    return undefined;
  }
}

async function loadFavicon(): Promise<string | undefined> {
  try {
    return (await readFile(path.resolve("assets/favicon.png"))).toString("base64");
  } catch {
    return undefined;
  }
}

function ReportHtml({
  report,
  fontBase64,
  faviconBase64
}: ReportHtmlProps & { fontBase64?: string; faviconBase64?: string }) {
  const findingsBySeverity = {
    error: report.findings.filter((finding) => finding.severity === "error"),
    warning: report.findings.filter((finding) => finding.severity === "warning"),
    info: report.findings.filter((finding) => finding.severity === "info")
  };

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {faviconBase64 ? <link rel="icon" type="image/png" href={`data:image/png;base64,${faviconBase64}`} /> : null}
        <title>Audio Pipeline Audit for Unity</title>
        <style>{createStyles(fontBase64)}</style>
      </head>
      <body>
        <header className="topbar">
          <div className="topbarInner">
            <span className="brandMark">
              {faviconBase64 ? <img src={`data:image/png;base64,${faviconBase64}`} alt="" /> : "APA"}
            </span>
            <span>Audio Pipeline Auditor for Unity</span>
          </div>
        </header>
        <main className="shell">
          <section className="hero">
            <div>
              <p className="eyebrow">report.json</p>
              <h1>Audio Audit Report for Unity</h1>
            </div>
            <div className="stamp">
              <span>Generated</span>
              <strong>{formatReportDate(report.generatedAt)}</strong>
              <span>{formatReportTime(report.generatedAt)}</span>
            </div>
          </section>

          <section className="statusBar" aria-label="Finding totals">
            <StatusChip label="Errors" value={report.summary.errorCount} severity="error" />
            <StatusChip label="Warnings" value={report.summary.warningCount} severity="warning" />
            <StatusChip label="Info" value={report.summary.infoCount} severity="info" />
          </section>

          <ContextGrid report={report} />

          <section className="metrics" aria-label="Report summary">
            <Metric label="Audio assets" value={report.summary.audioAssetCount} />
            <Metric label="Definitions" value={report.summary.scriptableAudioDefinitionCount} />
            <Metric label="Script signals" value={report.summary.scriptAudioSignalCount} />
            <Metric label="Middleware calls" value={report.summary.middlewareCallCount} />
            <Metric label="Findings" value={report.summary.findingCount} />
          </section>

          <VisualSummary report={report} />

          <section className="section">
            <div className="sectionHeader">
              <h2>Audio Pipeline</h2>
              <p>Detected architecture, confidence, and expandable evidence.</p>
            </div>
            <PipelineOverview profiles={report.pipelineProfiles} />
          </section>

          <section className="section">
            <div className="sectionHeader">
              <h2>Findings</h2>
              <p>Grouped by severity for quick triage.</p>
            </div>
            <div className="findingGroups">
              {(["error", "warning", "info"] as Severity[]).map((severity) => (
                <FindingGroup key={severity} severity={severity} findings={findingsBySeverity[severity]} />
              ))}
            </div>
          </section>

          <section className="section">
            <div className="sectionHeader">
              <h2>Audio Definitions</h2>
              <p>ScriptableObject-style assets that reference audio clips.</p>
            </div>
            <DefinitionTable definitions={report.scriptableAudioDefinitions} />
          </section>

          <section className="section">
            <div className="sectionHeader">
              <h2>Script Signals</h2>
              <p>C# patterns that indicate runtime audio behavior.</p>
            </div>
            <ScriptSignalTable signals={report.scriptAudioSignals} />
          </section>

          <section className="section">
            <div className="sectionHeader">
              <h2>Middleware Calls</h2>
              <p>Wwise and FMOD script calls detected in project code.</p>
            </div>
            <MiddlewareCallTable calls={report.middlewareCalls} />
          </section>

          <section className="section">
            <div className="sectionHeader">
              <h2>Audio Assets</h2>
              <p>Discovered audio files and reference status.</p>
            </div>
            <AssetTable assets={report.assets} />
          </section>

          <section className="section">
            <div className="sectionHeader">
              <h2>AudioSources</h2>
              <p>Component settings extracted from Unity text assets.</p>
            </div>
            <AudioSourceTable audioSources={report.audioSources} />
          </section>
        </main>
        <script dangerouslySetInnerHTML={{ __html: createReportScript() }} />
      </body>
    </html>
  );
}
