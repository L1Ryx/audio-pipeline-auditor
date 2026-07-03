import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { renderToStaticMarkup } from "react-dom/server";
import type { CSSProperties } from "react";

import type {
  AuditConfiguration,
  AudioAsset,
  AudioAuditReport,
  Finding,
  PipelineProfile,
  ScriptAudioSignal,
  ScriptableAudioDefinition,
  Severity
} from "./reportSchema.js";

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
              <p className="subtle">Project: {projectNameFromPath(report.projectPath)}</p>
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
            <div className="tableWrap">
              <table>
                <thead>
                  <tr>
                    <th>Source</th>
                    <th>Clip</th>
                    <th>Mixer</th>
                    <th>Awake</th>
                    <th>Volume</th>
                  </tr>
                </thead>
                <tbody>
                  {report.audioSources.map((audioSource) => (
                    <tr key={`${audioSource.sourceFile}:${audioSource.lineNumber}`}>
                      <td>
                        <code>
                          {audioSource.sourceFile}:{audioSource.lineNumber}
                        </code>
                      </td>
                      <td>{audioSource.clipPath ?? (audioSource.hasAudioClip ? "Unresolved" : "Missing")}</td>
                      <td>{audioSource.hasMixerRouting ? "Routed" : "None"}</td>
                      <td>{audioSource.playOnAwake ? "Yes" : "No"}</td>
                      <td>{audioSource.volume ?? "Unknown"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}

function ContextGrid({ report }: { report: AudioAuditReport }) {
  return (
    <section className="contextGrid" aria-label="Project and rule configuration">
      <article className="contextPanel projectPanel">
        <p className="panelLabel">Audited project</p>
        <h2>{projectNameFromPath(report.projectPath)}</h2>
        <code>{report.projectPath}</code>
      </article>
      <RuleConfiguration configuration={report.configuration} />
    </section>
  );
}

function RuleConfiguration({ configuration }: { configuration: AuditConfiguration }) {
  const rules = configuration.rules;

  return (
    <article className="contextPanel">
      <p className="panelLabel">Rule configuration</p>
      <dl className="configList">
        <div>
          <dt>Max file size</dt>
          <dd>{formatBytes(rules.maxFileSizeBytes)}</dd>
        </div>
        <div>
          <dt>Max duration</dt>
          <dd>{rules.maxDurationSeconds}s</dd>
        </div>
        <div>
          <dt>Max source volume</dt>
          <dd>{rules.maxAudioSourceVolume}</dd>
        </div>
        <div>
          <dt>CI fail level</dt>
          <dd>{rules.failOnSeverity}</dd>
        </div>
      </dl>
    </article>
  );
}

function VisualSummary({ report }: { report: AudioAuditReport }) {
  const referencedAssets = report.assets.filter((asset) => asset.referencedBy.length > 0).length;
  const unreferencedAssets = report.assets.length - referencedAssets;
  const architectureValues = [
    report.summary.audioSourceCount,
    report.summary.scriptableAudioDefinitionCount,
    report.summary.scriptAudioSignalCount
  ];

  return (
    <section className="chartGrid" aria-label="Visual report summary">
      <DonutChart
        title="Finding Mix"
        segments={[
          { label: "Errors", value: report.summary.errorCount, color: "var(--crimson)" },
          { label: "Warnings", value: report.summary.warningCount, color: "var(--gold)" },
          { label: "Info", value: report.summary.infoCount, color: "#244051" }
        ]}
      />
      <DonutChart
        title="Asset References"
        segments={[
          { label: "Referenced", value: referencedAssets, color: "#244051" },
          { label: "Unreferenced", value: unreferencedAssets, color: "var(--muted)" }
        ]}
      />
      <DonutChart
        title="Pipeline Signals"
        segments={[
          { label: "AudioSources", value: architectureValues[0], color: "var(--crimson)" },
          { label: "Definitions", value: architectureValues[1], color: "var(--gold)" },
          { label: "Scripts", value: architectureValues[2], color: "#244051" }
        ]}
      />
    </section>
  );
}

type DonutSegment = {
  label: string;
  value: number;
  color: string;
};

function DonutChart({ title, segments }: { title: string; segments: DonutSegment[] }) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  const background = total > 0 ? buildConicGradient(segments) : "conic-gradient(var(--border) 0 360deg)";

  return (
    <article className="chartCard">
      <div className="donut" style={{ background } as CSSProperties}>
        <span>{total}</span>
      </div>
      <div>
        <h3>{title}</h3>
        <ul className="legend">
          {segments.map((segment) => (
            <li key={segment.label}>
              <span className="legendSwatch" style={{ background: segment.color } as CSSProperties} />
              <span>{segment.label}</span>
              <strong>{segment.value}</strong>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

function PipelineOverview({ profiles }: { profiles: PipelineProfile[] }) {
  const primaryProfiles = profiles.filter((profile) => profile.kind !== "Wwise" && profile.kind !== "Unknown");
  const activeProfile = primaryProfiles[0] ?? profiles[0];

  return (
    <div className="pipelineLayout">
      <article className="pipelinePrimary">
        <p className="panelLabel">Likely primary style</p>
        <h3>{formatPipelineKind(activeProfile?.kind ?? "Unknown")}</h3>
        <p>{activeProfile?.summary ?? "No clear audio pipeline was detected."}</p>
      </article>
      <div className="pipelineList">
        {profiles.map((profile) => (
          <details className="pipelineRow" key={profile.kind} open={profile.kind === activeProfile?.kind}>
            <summary>
              <span>{formatPipelineKind(profile.kind)}</span>
              <span className={`confidence ${profile.confidence}`}>{profile.confidence}</span>
            </summary>
            <p>{profile.summary}</p>
            {profile.evidence.length > 0 ? (
              <ul>
                {profile.evidence.slice(0, 6).map((evidence) => (
                  <li key={`${profile.kind}:${evidence.file}:${evidence.line ?? 0}:${evidence.signal}`}>
                    <code>{evidence.line ? `${evidence.file}:${evidence.line}` : evidence.file}</code>
                    <span>{evidence.signal}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </details>
        ))}
      </div>
    </div>
  );
}

function StatusChip({ label, value, severity }: { label: string; value: number; severity: Severity }) {
  return (
    <div className={`statusChip ${severity}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
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
    <article className={`findingGroup ${severity}`}>
      <div className="findingGroupTitle">
        <h3>{severity}</h3>
        <span>{findings.length}</span>
      </div>
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

function DefinitionTable({ definitions }: { definitions: ScriptableAudioDefinition[] }) {
  return (
    <div className="tableWrap">
      <table>
        <thead>
          <tr>
            <th>Definition</th>
            <th>Type</th>
            <th>Clips</th>
            <th>Mixer</th>
            <th>Volume</th>
            <th>Loop</th>
          </tr>
        </thead>
        <tbody>
          {definitions.length === 0 ? (
            <tr>
              <td colSpan={6}>No ScriptableObject audio definitions detected.</td>
            </tr>
          ) : (
            definitions.map((definition) => (
              <tr key={definition.sourceFile}>
                <td>
                  <code>{definition.sourceFile}</code>
                </td>
                <td>{definition.definitionType}</td>
                <td>{definition.audioClipPaths.length}</td>
                <td>{definition.hasMixerRouting ? "Routed" : "None"}</td>
                <td>{definition.volume ?? "Unknown"}</td>
                <td>{definition.loop === undefined ? "Unknown" : definition.loop ? "Yes" : "No"}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function ScriptSignalTable({ signals }: { signals: ScriptAudioSignal[] }) {
  const visibleSignals = signals.slice(0, 40);

  return (
    <div className="tableWrap">
      <table>
        <thead>
          <tr>
            <th>Location</th>
            <th>Kind</th>
            <th>Signal</th>
          </tr>
        </thead>
        <tbody>
          {visibleSignals.length === 0 ? (
            <tr>
              <td colSpan={3}>No C# audio signals detected.</td>
            </tr>
          ) : (
            visibleSignals.map((signal) => (
              <tr key={`${signal.sourceFile}:${signal.lineNumber}:${signal.signal}`}>
                <td>
                  <code>
                    {signal.sourceFile}:{signal.lineNumber}
                  </code>
                </td>
                <td>{signal.kind}</td>
                <td>{signal.signal}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      {signals.length > visibleSignals.length ? <p className="tableNote">Showing first {visibleSignals.length} of {signals.length} signals.</p> : null}
    </div>
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
              <td>
                <span className={asset.referencedBy.length > 0 ? "pill ok" : "pill muted"}>{asset.referencedBy.length}</span>
              </td>
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

function buildConicGradient(segments: DonutSegment[]): string {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  let start = 0;

  const stops = segments
    .filter((segment) => segment.value > 0)
    .map((segment, index, activeSegments) => {
      const end = index === activeSegments.length - 1 ? 360 : start + (segment.value / total) * 360;
      const stop = `${segment.color} ${start.toFixed(1)}deg ${end.toFixed(1)}deg`;
      start = end;
      return stop;
    });

  return `conic-gradient(${stops.join(", ")})`;
}

function projectNameFromPath(projectPath: string): string {
  return projectPath.split(/[\\/]/u).filter(Boolean).at(-1) ?? projectPath;
}

function formatPipelineKind(kind: PipelineProfile["kind"]): string {
  const labels: Record<PipelineProfile["kind"], string> = {
    SerializedAudioSources: "Serialized AudioSources",
    RuntimeUnityAudio: "Runtime Unity Audio",
    ScriptableObjectAudio: "ScriptableObject Audio",
    Wwise: "Wwise",
    FMOD: "FMOD",
    Unknown: "Unknown"
  };

  return labels[kind];
}

function formatReportDate(value: string): string {
  return new Date(value).toLocaleDateString();
}

function formatReportTime(value: string): string {
  return new Date(value).toLocaleTimeString();
}

function createStyles(fontBase64?: string): string {
  const fontFace = fontBase64
    ? `
@font-face {
  font-family: "Monofonto";
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url("data:font/otf;base64,${fontBase64}") format("opentype");
}
`
    : "";

  return `${fontFace}
:root {
  color-scheme: light;
  --ink: #07090d;
  --ink-soft: #10151f;
  --panel: #151923;
  --crimson: #b91c1c;
  --crimson-bright: #dc2626;
  --gold: #d6a84f;
  --gold-soft: #f0d493;
  --paper: #f6f1e8;
  --surface: #fffaf0;
  --text: #151922;
  --muted: #68707d;
  --border: #ded6c8;
  --border-dark: rgba(255, 255, 255, 0.13);
  --rule-light: rgba(88, 79, 68, 0.22);
  --shadow: 0 18px 42px rgba(13, 18, 28, 0.11);
  --font-body: "Monofonto", "SFMono-Regular", Consolas, "Liberation Mono", monospace;
  font-family: var(--font-body);
  background: var(--paper);
  color: var(--text);
}

* {
  box-sizing: border-box;
}

html {
  background: var(--paper);
  overflow-y: scroll;
  scrollbar-gutter: stable;
}

body {
  margin: 0;
  min-width: 320px;
  background:
    linear-gradient(180deg, rgba(185, 28, 28, 0.08), transparent 28rem),
    var(--paper);
  font-family: var(--font-body);
}

.topbar {
  position: sticky;
  top: 0;
  z-index: 10;
  border-bottom: 1px solid var(--border-dark);
  background: rgba(7, 9, 13, 0.9);
  backdrop-filter: blur(10px);
}

.topbarInner {
  width: min(1120px, calc(100% - 32px));
  min-height: 64px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 12px;
  color: #fff8ed;
  font-weight: 700;
  letter-spacing: 0.03em;
}

.brandMark {
  width: 34px;
  height: 34px;
  display: inline-grid;
  place-items: center;
  border: 1px solid rgba(214, 168, 79, 0.55);
  border-radius: 8px;
  color: var(--gold-soft);
  background: var(--ink);
  font-size: 0.86rem;
  overflow: hidden;
}

.brandMark img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.shell {
  width: min(1120px, calc(100% - 32px));
  margin: 0 auto;
  padding: 36px 0 56px;
}

.hero {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  align-items: flex-end;
  padding: 32px 0 26px;
  border-bottom: 1px solid var(--rule-light);
}

.eyebrow {
  margin: 0 0 8px;
  color: var(--crimson);
  font-size: 0.92rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

h1, h2, h3, p {
  margin: 0;
}

h1 {
  max-width: 860px;
  font-size: clamp(2.35rem, 5vw, 4.25rem);
  letter-spacing: 0.03em;
  line-height: 1.02;
}

h2 {
  color: var(--ink);
  font-size: 1.55rem;
  letter-spacing: 0.03em;
}

h3 {
  color: var(--ink);
  font-size: 1.02rem;
  letter-spacing: 0.03em;
  text-transform: capitalize;
}

.subtle, .sectionHeader p {
  color: var(--muted);
}

.stamp {
  min-width: 180px;
  display: grid;
  gap: 4px;
  padding: 12px 0;
  color: var(--muted);
  text-align: right;
}

.stamp strong {
  color: var(--text);
}

.statusBar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 18px 0 4px;
}

.statusChip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 34px;
  padding: 6px 10px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: rgba(255, 250, 240, 0.75);
  color: var(--muted);
}

.statusChip strong {
  color: var(--text);
  font-size: 1rem;
}

.statusChip.error strong {
  color: var(--crimson);
}

.statusChip.warning strong {
  color: #a85f00;
}

.statusChip.info strong {
  color: #244051;
}

.contextGrid {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(320px, 0.8fr);
  gap: 12px;
  margin: 20px 0;
}

.contextPanel {
  min-width: 0;
  padding: 18px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
}

.panelLabel {
  margin: 0 0 8px;
  color: var(--crimson);
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.projectPanel h2 {
  margin: 0 0 10px;
  font-size: clamp(1.55rem, 3vw, 2.25rem);
}

.configList {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin: 0;
}

.configList div {
  min-width: 0;
}

.configList dt {
  color: var(--muted);
  font-size: 0.8rem;
  text-transform: uppercase;
}

.configList dd {
  margin: 4px 0 0;
  color: var(--text);
  font-size: 1.08rem;
}

.metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin: 20px 0;
}

.chartGrid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin: 20px 0 4px;
}

.chartCard {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 16px;
  align-items: center;
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
}

.donut {
  width: 104px;
  aspect-ratio: 1;
  display: grid;
  place-items: center;
  border-radius: 999px;
  animation: chart-pop 620ms ease both;
  position: relative;
}

.donut::after {
  content: "";
  position: absolute;
  inset: 18px;
  border-radius: inherit;
  background: var(--surface);
  border: 1px solid rgba(88, 79, 68, 0.16);
}

.donut span {
  position: relative;
  z-index: 1;
  color: var(--text);
  font-size: 1.25rem;
  font-weight: 700;
}

.legend {
  display: grid;
  gap: 8px;
  padding: 0;
  margin: 10px 0 0;
  list-style: none;
}

.legend li {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
  color: var(--muted);
}

.legendSwatch {
  width: 10px;
  height: 10px;
  border-radius: 999px;
}

@keyframes chart-pop {
  from {
    opacity: 0;
    transform: scale(0.86) rotate(-18deg);
  }

  to {
    opacity: 1;
    transform: scale(1) rotate(0deg);
  }
}

.profileGrid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.profile {
  display: grid;
  gap: 12px;
  padding: 18px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  box-shadow: var(--shadow);
}

.profileTitle {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
}

.profileTitle span {
  padding: 4px 8px;
  border: 1px solid var(--border);
  border-radius: 999px;
  color: var(--muted);
  font-size: 0.78rem;
  text-transform: uppercase;
}

.confidence.high {
  border-color: rgba(214, 168, 79, 0.8);
  color: #7c5200;
}

.confidence.medium {
  border-color: rgba(185, 28, 28, 0.28);
  color: var(--crimson);
}

.profile p {
  color: var(--muted);
  line-height: 1.45;
}

.profile ul {
  display: grid;
  gap: 8px;
  padding: 0;
  margin: 0;
  list-style: none;
}

.profile li {
  display: grid;
  gap: 3px;
}

.profile li span, .tableNote {
  color: var(--muted);
}

.pipelineLayout {
  display: grid;
  grid-template-columns: minmax(260px, 0.75fr) minmax(0, 1.25fr);
  gap: 12px;
}

.pipelinePrimary {
  padding: 18px;
  border: 1px solid rgba(214, 168, 79, 0.75);
  border-radius: 8px;
  background:
    linear-gradient(135deg, rgba(214, 168, 79, 0.18), transparent 55%),
    var(--surface);
}

.pipelinePrimary h3 {
  margin-bottom: 10px;
  font-size: 1.42rem;
  text-transform: none;
}

.pipelinePrimary p:last-child {
  color: var(--muted);
  line-height: 1.5;
}

.pipelineList {
  display: grid;
  gap: 10px;
}

.pipelineRow {
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
}

.pipelineRow summary {
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  padding: 14px 16px;
  color: var(--text);
  font-weight: 700;
  list-style: none;
}

.pipelineRow summary::-webkit-details-marker {
  display: none;
}

.pipelineRow p {
  margin: 0;
  padding: 0 16px 12px;
  color: var(--muted);
  line-height: 1.5;
}

.pipelineRow ul {
  display: grid;
  gap: 8px;
  padding: 0 16px 16px;
  margin: 0;
  list-style: none;
}

.pipelineRow li {
  display: grid;
  gap: 3px;
}

.pipelineRow li span {
  color: var(--muted);
}

.metric {
  display: grid;
  gap: 12px;
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
}

.metric span {
  color: var(--muted);
  font-size: 0.88rem;
}

.metric strong {
  font-size: 2.1rem;
  line-height: 1;
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
  margin-bottom: 14px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--rule-light);
}

.findingGroups {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.findingGroup {
  min-height: 160px;
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
}

.findingGroupTitle {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.findingGroupTitle span {
  color: var(--muted);
}

.findingGroup.error {
  border-color: rgba(185, 28, 28, 0.4);
}

.findingGroup.warning {
  border-color: rgba(214, 168, 79, 0.7);
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
  border-top: 1px solid rgba(88, 79, 68, 0.16);
}

.findingGroup span, .empty {
  color: var(--muted);
  line-height: 1.45;
}

code {
  font-family: var(--font-body);
  color: #244051;
  overflow-wrap: anywhere;
}

.tableWrap {
  overflow-x: auto;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
}

.tableNote {
  margin: 10px 14px 14px;
  font-size: 0.9rem;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  padding: 12px 14px;
  border-bottom: 1px solid rgba(88, 79, 68, 0.16);
  text-align: left;
  vertical-align: top;
}

th {
  color: var(--muted);
  font-size: 0.82rem;
  text-transform: uppercase;
}

tbody tr:last-child td {
  border-bottom: 0;
}

.pill {
  display: inline-flex;
  min-width: 28px;
  justify-content: center;
  padding: 3px 8px;
  border: 1px solid var(--border);
  border-radius: 999px;
}

.pill.ok {
  color: #244051;
  background: rgba(214, 168, 79, 0.14);
}

.pill.muted {
  color: var(--muted);
}

@media (max-width: 780px) {
  .hero, .sectionHeader {
    display: grid;
  }

  .stamp {
    text-align: left;
  }

  .contextGrid, .metrics, .findingGroups, .profileGrid, .chartGrid, .pipelineLayout {
    grid-template-columns: 1fr;
  }

  .configList {
    grid-template-columns: 1fr;
  }
}
`;
}
