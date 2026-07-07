import type { CSSProperties } from "react";

import type { AudioAuditReport, Severity } from "../reportSchema.js";
import {
  buildConicGradient,
  formatBytes,
  summarizeAssetSizes,
  summarizeAssetTypes,
  type DonutSegment
} from "./formatters.js";

export function VisualSummary({ report }: { report: AudioAuditReport }) {
  const referencedAssets = report.assets.filter((asset) => asset.referencedBy.length > 0).length;
  const unreferencedAssets = report.assets.length - referencedAssets;
  const architectureValues = [
    report.summary.audioSourceCount,
    report.summary.scriptableAudioDefinitionCount,
    report.summary.scriptAudioSignalCount,
    report.summary.middlewareCallCount
  ];
  const assetTypeBreakdown = summarizeAssetTypes(report.assets);
  const assetSizeBreakdown = summarizeAssetSizes(report.assets);

  return (
    <>
      <section className="chartGrid" aria-label="Visual report summary">
        <DonutChart
          title="Finding Mix"
          segments={[
            { label: "Errors", value: report.summary.errorCount, color: "var(--crimson)" },
            { label: "Warnings", value: report.summary.warningCount, color: "var(--gold)" },
            { label: "Info", value: report.summary.infoCount, color: "var(--blue)" }
          ]}
        />
        <DonutChart
          title="Asset References"
          segments={[
            { label: "Referenced", value: referencedAssets, color: "var(--blue)" },
            { label: "Unreferenced", value: unreferencedAssets, color: "var(--violet)" }
          ]}
        />
        <DonutChart
          title="Pipeline Signals"
          segments={[
            { label: "AudioSources", value: architectureValues[0], color: "var(--crimson)" },
            { label: "Definitions", value: architectureValues[1], color: "var(--gold)" },
            { label: "Scripts", value: architectureValues[2], color: "var(--blue)" },
            { label: "Middleware", value: architectureValues[3], color: "var(--green)" }
          ]}
        />
      </section>
      <section className="assetGraphGrid" aria-label="Audio asset breakdowns">
        <BarBreakdown
          title="Audio Assets by Type"
          unit="files"
          items={assetTypeBreakdown.map((item) => ({
            label: item.extension,
            value: item.count,
            meta: formatBytes(item.totalSizeBytes)
          }))}
        />
        <BarBreakdown
          title="Audio Assets by Size"
          unit="files"
          items={assetSizeBreakdown.map((item) => ({
            label: item.label,
            value: item.count,
            meta: formatBytes(item.totalSizeBytes)
          }))}
        />
      </section>
    </>
  );
}

export function StatusChip({ label, value, severity }: { label: string; value: number; severity: Severity }) {
  return (
    <div className={`statusChip ${severity}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function Metric({ label, value, tone = "default" }: { label: string; value: number; tone?: "default" | "warning" }) {
  return (
    <div className={`metric ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

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

type BarBreakdownItem = {
  label: string;
  value: number;
  meta: string;
};

function BarBreakdown({ title, unit, items }: { title: string; unit: string; items: BarBreakdownItem[] }) {
  const maxValue = Math.max(...items.map((item) => item.value), 1);

  return (
    <article className="breakdownCard">
      <h3>{title}</h3>
      {items.length === 0 ? (
        <p className="empty">No audio assets detected.</p>
      ) : (
        <ul className="barList">
          {items.map((item) => (
            <li key={item.label}>
              <div className="barLabel">
                <strong>{item.label}</strong>
                <span>
                  {item.value} {unit} | {item.meta}
                </span>
              </div>
              <div className="barTrack" aria-hidden="true">
                <span style={{ width: `${Math.max((item.value / maxValue) * 100, 4)}%` } as CSSProperties} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
