import type { AudioAsset, PipelineProfile } from "../reportSchema.js";

export type DonutSegment = {
  label: string;
  value: number;
  color: string;
};

export type AssetBreakdownItem = {
  extension: string;
  count: number;
  totalSizeBytes: number;
};

export type SizeBreakdownItem = {
  label: string;
  count: number;
  totalSizeBytes: number;
};

export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function buildConicGradient(segments: DonutSegment[]): string {
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

export function projectNameFromPath(projectPath: string): string {
  return projectPath.split(/[\\/]/u).filter(Boolean).at(-1) ?? projectPath;
}

export function formatPipelineKind(kind: PipelineProfile["kind"]): string {
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

export function formatReportDate(value: string): string {
  return new Date(value).toLocaleDateString();
}

export function formatReportTime(value: string): string {
  return new Date(value).toLocaleTimeString();
}

export function summarizeAssetTypes(assets: AudioAsset[]): AssetBreakdownItem[] {
  const totals = new Map<string, AssetBreakdownItem>();

  for (const asset of assets) {
    const extension = asset.extension || "unknown";
    const current = totals.get(extension) ?? { extension, count: 0, totalSizeBytes: 0 };
    current.count += 1;
    current.totalSizeBytes += asset.sizeBytes;
    totals.set(extension, current);
  }

  return [...totals.values()].sort((left, right) => right.count - left.count || left.extension.localeCompare(right.extension));
}

export function summarizeAssetSizes(assets: AudioAsset[]): SizeBreakdownItem[] {
  const buckets: SizeBreakdownItem[] = [
    { label: "< 100 KB", count: 0, totalSizeBytes: 0 },
    { label: "100 KB - 1 MB", count: 0, totalSizeBytes: 0 },
    { label: "1 MB - 5 MB", count: 0, totalSizeBytes: 0 },
    { label: "5 MB+", count: 0, totalSizeBytes: 0 }
  ];

  for (const asset of assets) {
    const bucket =
      asset.sizeBytes < 100 * 1024
        ? buckets[0]
        : asset.sizeBytes < 1024 * 1024
          ? buckets[1]
          : asset.sizeBytes < 5 * 1024 * 1024
            ? buckets[2]
            : buckets[3];

    bucket.count += 1;
    bucket.totalSizeBytes += asset.sizeBytes;
  }

  return buckets.filter((bucket) => bucket.count > 0);
}
