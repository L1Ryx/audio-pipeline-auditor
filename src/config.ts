import { access, readFile, writeFile } from "node:fs/promises";
import { z } from "zod";

import type { Severity } from "./reportSchema.js";

export const configSchema = z.object({
  rules: z.object({
    maxFileSizeBytes: z.number().int().positive().default(5_000_000),
    maxDurationSeconds: z.number().positive().default(120),
    flagUnreferencedAudio: z.boolean().default(true),
    failOnSeverity: z.enum(["off", "warning", "error"]).default("error")
  })
});

export type AudioAuditConfig = z.infer<typeof configSchema>;

export const defaultConfig: AudioAuditConfig = {
  rules: {
    maxFileSizeBytes: 5_000_000,
    maxDurationSeconds: 120,
    flagUnreferencedAudio: true,
    failOnSeverity: "error"
  }
};

export async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function loadConfig(configPath?: string): Promise<AudioAuditConfig> {
  if (!configPath) {
    return defaultConfig;
  }

  const contents = await readFile(configPath, "utf8");
  return configSchema.parse(JSON.parse(contents));
}

export async function writeDefaultConfig(configPath: string): Promise<void> {
  await writeFile(configPath, `${JSON.stringify(defaultConfig, null, 2)}\n`, "utf8");
}

export function shouldFailForSeverity(
  findings: Array<{ severity: Severity }>,
  failOnSeverity: AudioAuditConfig["rules"]["failOnSeverity"]
): boolean {
  if (failOnSeverity === "off") {
    return false;
  }

  if (failOnSeverity === "error") {
    return findings.some((finding) => finding.severity === "error");
  }

  return findings.some((finding) => finding.severity === "error" || finding.severity === "warning");
}
