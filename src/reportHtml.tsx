import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { renderToStaticMarkup } from "react-dom/server";

import type { AudioAsset, AudioAuditReport, Finding, Severity } from "./reportSchema.js";

type ReportHtmlProps = {
  report: AudioAuditReport;
};

export async function writeHtmlReport(report: AudioAuditReport, outputDirectory: string): Promise<string> {
  await mkdir(outputDirectory, { recursive: true });

  const htmlPath = path.join(outputDirectory, "index.html");
  const markup = `<!doctype html>${renderToStaticMarkup(<ReportHtml report={report} />)}`;

  await writeFile(htmlPath, markup, "utf8");
  return htmlPath;
}

function ReportHtml({ report }: ReportHtmlProps) {
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
        <title>Audio Pipeline Audit Report</title>
        <style>{styles}</style>
      </head>
      <body>
        <main className="shell">
          <section className="hero">
            <div>
              <p className="eyebrow">Unity Audio Pipeline Auditor</p>
              <h1>Audio Audit Report</h1>
              <p className="subtle">{report.projectPath}</p>
            </div>
            <div className="stamp">
              <span>Generated</span>
              <strong>{new Date(report.generatedAt).toLocaleString()}</strong>
            </div>
          </section>

          <section className="metrics" aria-label="Report summary">
            <Metric label="Audio assets" value={report.summary.audioAssetCount} />
            <Metric label="References" value={report.summary.referenceCount} />
            <Metric label="Findings" value={report.summary.findingCount} />
            <Metric label="Warnings" value={report.summary.warningCount} tone="warning" />
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
              <h2>Audio Assets</h2>
              <p>Discovered audio files and reference status.</p>
            </div>
            <AssetTable assets={report.assets} />
          </section>
        </main>
      </body>
    </html>
  );
}

function Metric({ label, value, tone = "default" }: { label: string; value: number; tone?: "default" | "warning" }) {
  return (
    <div className={`metric ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function FindingGroup({ severity, findings }: { severity: Severity; findings: Finding[] }) {
  return (
    <article className="findingGroup">
      <h3>{severity}</h3>
      {findings.length === 0 ? (
        <p className="empty">No {severity} findings.</p>
      ) : (
        <ul>
          {findings.map((finding) => (
            <li key={finding.id}>
              <strong>{finding.title}</strong>
              <span>{finding.message}</span>
              {finding.file ? <code>{finding.file}</code> : null}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

function AssetTable({ assets }: { assets: AudioAsset[] }) {
  return (
    <div className="tableWrap">
      <table>
        <thead>
          <tr>
            <th>File</th>
            <th>Size</th>
            <th>Duration</th>
            <th>References</th>
          </tr>
        </thead>
        <tbody>
          {assets.map((asset) => (
            <tr key={asset.path}>
              <td>
                <code>{asset.path}</code>
              </td>
              <td>{formatBytes(asset.sizeBytes)}</td>
              <td>{asset.durationSeconds ? `${asset.durationSeconds.toFixed(1)}s` : "Unknown"}</td>
              <td>{asset.referencedBy.length}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const styles = `
:root {
  color-scheme: light;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  background: #f6f4ef;
  color: #1e2428;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
}

.shell {
  width: min(1120px, calc(100% - 32px));
  margin: 0 auto;
  padding: 32px 0 48px;
}

.hero {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  align-items: flex-end;
  padding: 28px 0 22px;
  border-bottom: 1px solid #d9d2c5;
}

.eyebrow {
  margin: 0 0 8px;
  color: #58656e;
  font-size: 0.82rem;
  font-weight: 700;
  text-transform: uppercase;
}

h1, h2, h3, p {
  margin: 0;
}

h1 {
  font-size: clamp(2rem, 5vw, 4.25rem);
  letter-spacing: 0;
}

h2 {
  font-size: 1.45rem;
}

h3 {
  font-size: 1rem;
  text-transform: capitalize;
}

.subtle, .sectionHeader p {
  color: #66727b;
}

.stamp {
  min-width: 220px;
  display: grid;
  gap: 4px;
  padding: 12px 0;
  color: #66727b;
  text-align: right;
}

.stamp strong {
  color: #1e2428;
}

.metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin: 22px 0;
}

.metric {
  display: grid;
  gap: 12px;
  padding: 16px;
  border: 1px solid #d9d2c5;
  border-radius: 8px;
  background: #fffdf8;
}

.metric span {
  color: #66727b;
  font-size: 0.88rem;
}

.metric strong {
  font-size: 2rem;
}

.metric.warning strong {
  color: #a85f00;
}

.section {
  margin-top: 28px;
}

.sectionHeader {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  align-items: baseline;
  margin-bottom: 12px;
}

.findingGroups {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.findingGroup {
  min-height: 160px;
  padding: 16px;
  border: 1px solid #d9d2c5;
  border-radius: 8px;
  background: #fffdf8;
}

.findingGroup ul {
  display: grid;
  gap: 12px;
  padding: 0;
  margin: 14px 0 0;
  list-style: none;
}

.findingGroup li {
  display: grid;
  gap: 4px;
  padding-top: 12px;
  border-top: 1px solid #ece5d9;
}

.findingGroup span, .empty {
  color: #66727b;
  line-height: 1.45;
}

code {
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
  color: #244051;
  overflow-wrap: anywhere;
}

.tableWrap {
  overflow-x: auto;
  border: 1px solid #d9d2c5;
  border-radius: 8px;
  background: #fffdf8;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  padding: 12px 14px;
  border-bottom: 1px solid #ece5d9;
  text-align: left;
  vertical-align: top;
}

th {
  color: #58656e;
  font-size: 0.82rem;
  text-transform: uppercase;
}

tbody tr:last-child td {
  border-bottom: 0;
}

@media (max-width: 780px) {
  .hero, .sectionHeader {
    display: grid;
  }

  .stamp {
    text-align: left;
  }

  .metrics, .findingGroups {
    grid-template-columns: 1fr;
  }
}
`;
