import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { spawnSync } from "node:child_process";

import { createServiceDefinition, createUninstallCommand } from "./service-files.js";
import type { ServiceType } from "./types.js";

export async function installDaemonService(type: ServiceType): Promise<void> {
  const definition = createServiceDefinition(type);
  await mkdir(dirname(definition.path), { recursive: true });
  await writeFile(definition.path, definition.content, "utf8");
  if (type === "systemd") {
    runCommand("systemctl", ["--user", "daemon-reload"]);
  }
  runCommand(definition.command, definition.args);
}

export async function uninstallDaemonService(type: ServiceType): Promise<void> {
  const definition = createServiceDefinition(type);
  const uninstall = createUninstallCommand(type);
  runCommand(uninstall.command, uninstall.args, true);
  await rm(definition.path, { force: true });
  if (type === "systemd") {
    runCommand("systemctl", ["--user", "daemon-reload"], true);
  }
}

function runCommand(command: string, args: string[], allowFailure = false): void {
  const result = spawnSync(command, args, { encoding: "utf8" });
  if (allowFailure || result.status === 0) {
    return;
  }
  const stderr = result.stderr?.trim() || result.stdout?.trim() || "unknown error";
  throw new Error(`[va-claw/daemon] command failed: ${command} ${args.join(" ")}: ${stderr}`);
}
