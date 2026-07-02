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
  summary: z.object({
    audioAssetCount: z.number().int().nonnegative(),
    referenceCount: z.number().int().nonnegative(),
    findingCount: z.number().int().nonnegative(),
    errorCount: z.number().int().nonnegative(),
    warningCount: z.number().int().nonnegative(),
    infoCount: z.number().int().nonnegative()
  }),
  assets: z.array(audioAssetSchema),
  references: z.array(unityAudioReferenceSchema),
  findings: z.array(findingSchema)
});

export type AudioAuditReport = z.infer<typeof audioAuditReportSchema>;
