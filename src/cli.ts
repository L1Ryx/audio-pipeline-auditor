#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { Command } from "commander";
import { ZodError } from "zod";

import { loadConfig, pathExists, shouldFailForSeverity, writeDefaultConfig } from "./config.js";
import { writeHtmlReport } from "./reportHtml.js";
import { audioAuditReportSchema } from "./reportSchema.js";
import { scanUnityProject } from "./scanner.js";

const program = new Command();

program
  .name("audio-audit")
  .description("Audit Unity built-in audio pipelines.")
  .version("0.1.0");

program
  .command("init")
  .description("Create a default audio-audit.config.json file.")
  .option("-f, --force", "Overwrite an existing config file.")
  .action(async (options: { force?: boolean }) => {
    await runCommand(async () => {
      const configPath = path.resolve("audio-audit.config.json");

      if (!options.force && (await pathExists(configPath))) {
        throw new Error("audio-audit.config.json already exists. Use --force to overwrite it.");
      }

      await writeDefaultConfig(configPath);
      console.log(`Created ${configPath}`);
    });
  });

program
  .command("validate-config")
  .argument("<config>", "Path to audio-audit.config.json")
  .description("Validate a config file.")
  .action(async (configPath: string) => {
    await runCommand(async () => {
      await loadConfig(path.resolve(configPath));
      console.log("Config is valid.");
    });
  });

program
  .command("scan")
  .argument("<project>", "Path to a Unity project folder")
  .option("-c, --config <config>", "Path to audio-audit.config.json")
  .option("-o, --out <out>", "Output directory", "audio-audit-report")
  .description("Scan a Unity project and generate JSON plus static HTML reports.")
  .action(async (projectPath: string, options: { config?: string; out: string }) => {
    await runCommand(async () => {
      const config = await loadConfig(options.config ? path.resolve(options.config) : undefined);
      const report = await scanUnityProject(projectPath, config);
      const parsedReport = audioAuditReportSchema.parse(report);
      const outputDirectory = path.resolve(options.out);

      await mkdir(outputDirectory, { recursive: true });
      const jsonPath = path.join(outputDirectory, "report.json");
      await writeFile(jsonPath, `${JSON.stringify(parsedReport, null, 2)}\n`, "utf8");
      const htmlPath = await writeHtmlReport(parsedReport, outputDirectory);

      printSummary(parsedReport, jsonPath, htmlPath);

      if (shouldFailForSeverity(parsedReport.findings, config.rules.failOnSeverity)) {
        process.exitCode = 1;
      }
    });
  });

await program.parseAsync();

async function runCommand(action: () => Promise<void>): Promise<void> {
  try {
    await action();
  } catch (error) {
    if (error instanceof ZodError) {
      console.error(error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("\n"));
    } else {
      console.error(error instanceof Error ? error.message : String(error));
    }

    process.exitCode = 1;
  }
}

function printSummary(report: { summary: { audioAssetCount: number; findingCount: number; warningCount: number; errorCount: number }; findings: Array<{ severity: string }> }, jsonPath: string, htmlPath: string): void {
  console.log("Audio audit complete");
  console.log(`Assets: ${report.summary.audioAssetCount}`);
  console.log(`Findings: ${report.summary.findingCount} (${report.summary.errorCount} errors, ${report.summary.warningCount} warnings)`);
  console.log(`JSON: ${jsonPath}`);
  console.log(`HTML: ${htmlPath}`);
}
