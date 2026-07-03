import { z } from "zod";

export const severitySchema = z.enum(["info", "warning", "error"]);

export type Severity = z.infer<typeof severitySchema>;

export const audioAssetSchema = z.object({
  id: z.string(),
  path: z.string(),
  fileName: z.string(),
  extension: z.string(),
  sizeBytes: z.number().int().nonnegative(),
  durationSeconds: z.number().nonnegative().optional(),
  sampleRate: z.number().int().positive().optional(),
  channels: z.number().int().positive().optional(),
  bitDepth: z.number().int().positive().optional(),
  format: z.string().optional(),
  referencedBy: z.array(z.string())
});

export type AudioAsset = z.infer<typeof audioAssetSchema>;

export const unityAudioReferenceSchema = z.object({
  sourceFile: z.string(),
  referencedAssetGuid: z.string().optional(),
  referencedPath: z.string().optional(),
  componentType: z.enum(["AudioSource", "CustomAsset", "Unknown"]).optional(),
  propertyName: z.string().optional()
});

export type UnityAudioReference = z.infer<typeof unityAudioReferenceSchema>;

export const unityAudioSourceSchema = z.object({
  sourceFile: z.string(),
  lineNumber: z.number().int().positive(),
  clipGuid: z.string().optional(),
  clipPath: z.string().optional(),
  hasAudioClip: z.boolean(),
  hasMixerRouting: z.boolean(),
  playOnAwake: z.boolean().optional(),
  volume: z.number().optional(),
  spatialBlend: z.number().optional()
});

export type UnityAudioSource = z.infer<typeof unityAudioSourceSchema>;

export const pipelineProfileSchema = z.object({
  kind: z.enum(["SerializedAudioSources", "RuntimeUnityAudio", "ScriptableObjectAudio", "Wwise", "FMOD", "Unknown"]),
  confidence: z.enum(["low", "medium", "high"]),
  summary: z.string(),
  evidence: z.array(
    z.object({
      file: z.string(),
      line: z.number().int().positive().optional(),
      signal: z.string()
    })
  )
});

export type PipelineProfile = z.infer<typeof pipelineProfileSchema>;

export const middlewareCallSchema = z.object({
  engine: z.enum(["Wwise", "FMOD"]),
  api: z.string(),
  sourceFile: z.string(),
  lineNumber: z.number().int().positive(),
  matchedText: z.string(),
  eventName: z.string().optional()
});

export type MiddlewareCall = z.infer<typeof middlewareCallSchema>;

export const scriptAudioSignalSchema = z.object({
  sourceFile: z.string(),
  lineNumber: z.number().int().positive(),
  kind: z.enum([
    "RuntimeAudioSource",
    "SerializedAudioSourceField",
    "AudioClipUsage",
    "AudioMixerRouting",
    "UnityAudioPlayback",
    "MiddlewareUsage"
  ]),
  signal: z.string(),
  matchedText: z.string()
});

export type ScriptAudioSignal = z.infer<typeof scriptAudioSignalSchema>;

export const scriptableAudioDefinitionSchema = z.object({
  sourceFile: z.string(),
  definitionType: z.enum(["MusicTrack", "SfxDefinition", "Unknown"]),
  audioClipGuids: z.array(z.string()),
  audioClipPaths: z.array(z.string()),
  hasAudioClip: z.boolean(),
  hasMixerRouting: z.boolean(),
  mixerGroupGuid: z.string().optional(),
  volume: z.number().optional(),
  loop: z.boolean().optional()
});

export type ScriptableAudioDefinition = z.infer<typeof scriptableAudioDefinitionSchema>;

export const auditConfigurationSchema = z.object({
  rules: z.object({
    maxFileSizeBytes: z.number().int().positive(),
    maxDurationSeconds: z.number().positive(),
    maxAudioSourceVolume: z.number().positive(),
    flagUnreferencedAudio: z.boolean(),
    flagMissingAudioClips: z.boolean(),
    requireAudioMixerRouting: z.boolean(),
    flagPlayOnAwake: z.boolean(),
    failOnSeverity: z.enum(["off", "warning", "error"])
  })
});

export type AuditConfiguration = z.infer<typeof auditConfigurationSchema>;

export const findingSchema = z.object({
  id: z.string(),
  ruleId: z.string(),
  severity: severitySchema,
  title: z.string(),
  message: z.string(),
  file: z.string().optional(),
  details: z.record(z.unknown()).optional()
});

export type Finding = z.infer<typeof findingSchema>;

export const audioAuditReportSchema = z.object({
  projectPath: z.string(),
  generatedAt: z.string(),
  configuration: auditConfigurationSchema,
  summary: z.object({
    audioAssetCount: z.number().int().nonnegative(),
    referenceCount: z.number().int().nonnegative(),
    audioSourceCount: z.number().int().nonnegative(),
    scriptAudioSignalCount: z.number().int().nonnegative(),
    middlewareCallCount: z.number().int().nonnegative(),
    scriptableAudioDefinitionCount: z.number().int().nonnegative(),
    findingCount: z.number().int().nonnegative(),
    errorCount: z.number().int().nonnegative(),
    warningCount: z.number().int().nonnegative(),
    infoCount: z.number().int().nonnegative()
  }),
  assets: z.array(audioAssetSchema),
  references: z.array(unityAudioReferenceSchema),
  audioSources: z.array(unityAudioSourceSchema),
  pipelineProfiles: z.array(pipelineProfileSchema),
  scriptAudioSignals: z.array(scriptAudioSignalSchema),
  middlewareCalls: z.array(middlewareCallSchema),
  scriptableAudioDefinitions: z.array(scriptableAudioDefinitionSchema),
  findings: z.array(findingSchema)
});

export type AudioAuditReport = z.infer<typeof audioAuditReportSchema>;
