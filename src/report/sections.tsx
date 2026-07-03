import type { AuditConfiguration, AudioAuditReport, PipelineProfile } from "../reportSchema.js";
import { formatBytes, formatPipelineKind, projectNameFromPath } from "./formatters.js";

export function ContextGrid({ report }: { report: AudioAuditReport }) {
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

export function PipelineOverview({ profiles }: { profiles: PipelineProfile[] }) {
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
