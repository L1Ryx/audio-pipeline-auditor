import type { ReactNode } from "react";

import type {
  AudioAsset,
  Finding,
  MiddlewareCall,
  ScriptAudioSignal,
  ScriptableAudioDefinition,
  Severity,
  UnityAudioSource
} from "../reportSchema.js";
import { formatBytes } from "./formatters.js";

export function FindingGroup({ severity, findings }: { severity: Severity; findings: Finding[] }) {
  const listId = `findings-${severity}`;
  const sortedFindings = [...findings].sort((left, right) =>
    [left.ruleId, left.title, left.file ?? ""].join(":").localeCompare([right.ruleId, right.title, right.file ?? ""].join(":"))
  );

  return (
    <article className={`findingGroup ${severity}`}>
      <div className="findingGroupTitle">
        <h3>{severity}</h3>
        <span>{findings.length}</span>
      </div>
      {findings.length === 0 ? (
        <p className="empty">No {severity} findings.</p>
      ) : (
        <>
          <ListControls id={listId} total={findings.length} placeholder={`Filter ${severity} findings`} />
          <div className="findingScroll">
            <ul id={listId} data-filter-list="">
              {sortedFindings.map((finding) => (
                <li
                  key={finding.id}
                  data-filter-item=""
                  data-filter-text={[finding.title, finding.message, finding.ruleId, finding.file ?? ""].join(" ")}
                >
                  <strong>{finding.title}</strong>
                  <span>{finding.message}</span>
                  <div className="findingMeta">
                    <span>{finding.ruleId}</span>
                    {finding.file ? <code>{finding.file}</code> : null}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </article>
  );
}

export function DefinitionTable({ definitions }: { definitions: ScriptableAudioDefinition[] }) {
  const sortedDefinitions = [...definitions].sort((left, right) =>
    [left.definitionType, left.sourceFile].join(":").localeCompare([right.definitionType, right.sourceFile].join(":"))
  );

  return (
    <TableShell id="audio-definitions-table" total={definitions.length} placeholder="Filter definitions">
      <table id="audio-definitions-table" data-report-table="">
        <thead>
          <tr>
            <th><SortButton type="text">Definition</SortButton></th>
            <th><SortButton type="text">Type</SortButton></th>
            <th><SortButton type="number">Clips</SortButton></th>
            <th><SortButton type="text">Mixer</SortButton></th>
            <th><SortButton type="number">Volume</SortButton></th>
            <th><SortButton type="text">Loop</SortButton></th>
          </tr>
        </thead>
        <tbody>
          {sortedDefinitions.length === 0 ? (
            <tr>
              <td colSpan={6}>No ScriptableObject audio definitions detected.</td>
            </tr>
          ) : (
            sortedDefinitions.map((definition) => (
              <tr
                key={definition.sourceFile}
                data-filter-text={[definition.sourceFile, definition.definitionType, definition.audioClipPaths.join(" ")].join(" ")}
              >
                <td>
                  <code>{definition.sourceFile}</code>
                </td>
                <td>{definition.definitionType}</td>
                <td data-sort-value={definition.audioClipPaths.length}>{definition.audioClipPaths.length}</td>
                <td>{definition.hasMixerRouting ? "Routed" : "None"}</td>
                <td data-sort-value={definition.volume ?? -1}>{definition.volume ?? "Unknown"}</td>
                <td>{definition.loop === undefined ? "Unknown" : definition.loop ? "Yes" : "No"}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </TableShell>
  );
}

export function ScriptSignalTable({ signals }: { signals: ScriptAudioSignal[] }) {
  const sortedSignals = [...signals].sort((left, right) =>
    [left.kind, left.sourceFile, String(left.lineNumber)].join(":").localeCompare([right.kind, right.sourceFile, String(right.lineNumber)].join(":"))
  );

  return (
    <TableShell id="script-signals-table" total={signals.length} placeholder="Filter script signals">
      <table id="script-signals-table" data-report-table="">
        <thead>
          <tr>
            <th><SortButton type="text">Location</SortButton></th>
            <th><SortButton type="text">Kind</SortButton></th>
            <th><SortButton type="text">Signal</SortButton></th>
          </tr>
        </thead>
        <tbody>
          {sortedSignals.length === 0 ? (
            <tr>
              <td colSpan={3}>No C# audio signals detected.</td>
            </tr>
          ) : (
            sortedSignals.map((signal) => (
              <tr
                key={`${signal.sourceFile}:${signal.lineNumber}:${signal.signal}`}
                data-filter-text={[signal.sourceFile, signal.lineNumber, signal.kind, signal.signal, signal.matchedText].join(" ")}
              >
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
    </TableShell>
  );
}

export function MiddlewareCallTable({ calls }: { calls: MiddlewareCall[] }) {
  const sortedCalls = [...calls].sort((left, right) =>
    [left.engine, left.api, left.sourceFile, String(left.lineNumber)].join(":").localeCompare([right.engine, right.api, right.sourceFile, String(right.lineNumber)].join(":"))
  );

  return (
    <TableShell id="middleware-calls-table" total={calls.length} placeholder="Filter middleware calls">
      <table id="middleware-calls-table" data-report-table="">
        <thead>
          <tr>
            <th><SortButton type="text">Location</SortButton></th>
            <th><SortButton type="text">Engine</SortButton></th>
            <th><SortButton type="text">API</SortButton></th>
            <th><SortButton type="text">Event</SortButton></th>
          </tr>
        </thead>
        <tbody>
          {sortedCalls.length === 0 ? (
            <tr>
              <td colSpan={4}>No Wwise or FMOD script calls detected.</td>
            </tr>
          ) : (
            sortedCalls.map((call) => (
              <tr
                key={`${call.engine}:${call.sourceFile}:${call.lineNumber}:${call.api}:${call.matchedText}`}
                data-filter-text={[call.sourceFile, call.lineNumber, call.engine, call.api, call.eventName ?? "", call.matchedText].join(" ")}
              >
                <td>
                  <code>
                    {call.sourceFile}:{call.lineNumber}
                  </code>
                </td>
                <td>{call.engine}</td>
                <td>{call.api}</td>
                <td>{call.eventName ?? "Unknown"}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </TableShell>
  );
}

export function AssetTable({ assets }: { assets: AudioAsset[] }) {
  const sortedAssets = [...assets].sort((left, right) => right.sizeBytes - left.sizeBytes || left.path.localeCompare(right.path));

  return (
    <TableShell id="audio-assets-table" total={assets.length} placeholder="Filter audio assets">
      <table id="audio-assets-table" data-report-table="">
        <thead>
          <tr>
            <th><SortButton type="text">File</SortButton></th>
            <th><SortButton type="text">Type</SortButton></th>
            <th><SortButton type="number">Size</SortButton></th>
            <th><SortButton type="number">Duration</SortButton></th>
            <th><SortButton type="number">References</SortButton></th>
          </tr>
        </thead>
        <tbody>
          {sortedAssets.length === 0 ? (
            <tr>
              <td colSpan={5}>No audio assets detected.</td>
            </tr>
          ) : (
            sortedAssets.map((asset) => (
              <tr key={asset.path} data-filter-text={[asset.path, asset.extension, asset.format ?? ""].join(" ")}>
                <td>
                  <code>{asset.path}</code>
                </td>
                <td>{asset.extension}</td>
                <td data-sort-value={asset.sizeBytes}>{formatBytes(asset.sizeBytes)}</td>
                <td data-sort-value={asset.durationSeconds ?? -1}>{asset.durationSeconds ? `${asset.durationSeconds.toFixed(1)}s` : "Unknown"}</td>
                <td data-sort-value={asset.referencedBy.length}>
                  <span className={asset.referencedBy.length > 0 ? "pill ok" : "pill muted"}>{asset.referencedBy.length}</span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </TableShell>
  );
}

export function AudioSourceTable({ audioSources }: { audioSources: UnityAudioSource[] }) {
  const sortedSources = [...audioSources].sort((left, right) => {
    const leftMissing = left.hasAudioClip ? 0 : 1;
    const rightMissing = right.hasAudioClip ? 0 : 1;
    const leftUnrouted = left.hasMixerRouting ? 0 : 1;
    const rightUnrouted = right.hasMixerRouting ? 0 : 1;

    return (
      rightMissing - leftMissing ||
      rightUnrouted - leftUnrouted ||
      left.sourceFile.localeCompare(right.sourceFile) ||
      left.lineNumber - right.lineNumber
    );
  });

  return (
    <TableShell id="audio-sources-table" total={audioSources.length} placeholder="Filter AudioSources">
      <table id="audio-sources-table" data-report-table="">
        <thead>
          <tr>
            <th><SortButton type="text">Source</SortButton></th>
            <th><SortButton type="text">Clip</SortButton></th>
            <th><SortButton type="text">Mixer</SortButton></th>
            <th><SortButton type="text">Awake</SortButton></th>
            <th><SortButton type="number">Volume</SortButton></th>
          </tr>
        </thead>
        <tbody>
          {sortedSources.length === 0 ? (
            <tr>
              <td colSpan={5}>No serialized AudioSource components detected.</td>
            </tr>
          ) : (
            sortedSources.map((audioSource) => {
              const clipLabel = audioSource.clipPath ?? (audioSource.hasAudioClip ? "Unresolved" : "Missing");
              const mixerLabel = audioSource.hasMixerRouting ? "Routed" : "None";
              const awakeLabel = audioSource.playOnAwake ? "Yes" : "No";

              return (
                <tr
                  key={`${audioSource.sourceFile}:${audioSource.lineNumber}`}
                  data-filter-text={[audioSource.sourceFile, audioSource.lineNumber, clipLabel, mixerLabel, awakeLabel].join(" ")}
                >
                  <td>
                    <code>
                      {audioSource.sourceFile}:{audioSource.lineNumber}
                    </code>
                  </td>
                  <td>{clipLabel}</td>
                  <td>{mixerLabel}</td>
                  <td>{awakeLabel}</td>
                  <td data-sort-value={audioSource.volume ?? -1}>{audioSource.volume ?? "Unknown"}</td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </TableShell>
  );
}

function TableShell({
  id,
  total,
  placeholder,
  children
}: {
  id: string;
  total: number;
  placeholder: string;
  children: ReactNode;
}) {
  return (
    <div className="tablePanel">
      <div className="tableControls">
        <label>
          <span>Filter</span>
          <input type="search" placeholder={placeholder} data-table-filter="" data-table-target={id} />
        </label>
        <span className="resultCount" data-table-count="" data-table-target={id}>
          {total} entries
        </span>
      </div>
      <div className="tableWrap">{children}</div>
    </div>
  );
}

function ListControls({ id, total, placeholder }: { id: string; total: number; placeholder: string }) {
  return (
    <div className="listControls">
      <label>
        <span>Filter</span>
        <input type="search" placeholder={placeholder} data-list-filter="" data-list-target={id} />
      </label>
      <span className="resultCount" data-list-count="" data-list-target={id}>
        {total}
      </span>
    </div>
  );
}

function SortButton({ type, children }: { type: "text" | "number"; children: ReactNode }) {
  return (
    <button className="sortButton" type="button" data-sort-type={type}>
      {children}
      <span aria-hidden="true">sort</span>
    </button>
  );
}
