import { homedir } from "node:os";
import { join } from "node:path";

import type { ServiceType } from "@va-claw/daemon";
import type { SpawnFn } from "./types.js";

export function detectServiceType(platform: NodeJS.Platform): ServiceType {
  if (platform === "darwin") {
    return "launchd";
  }
  if (platform === "linux") {
    return "systemd";
  }
  throw new Error(`Unsupported platform for va-claw daemon service: ${platform}`);
}

export function probeServiceRunning(type: ServiceType, spawnSync: SpawnFn): boolean {
  if (type === "launchd") {
    return spawnSync("launchctl", ["list", "com.va-claw.daemon"], { encoding: "utf8" }).status === 0;
  }
  const result = spawnSync("systemctl", ["--user", "is-active", "va-claw.service"], {
    encoding: "utf8",
  });
  return result.status === 0 && result.stdout.trim() === "active";
}

export function stopInstalledService(type: ServiceType, spawnSync: SpawnFn): void {
  if (type === "launchd") {
    spawnSync("launchctl", ["unload", resolveLaunchdPath()], { encoding: "utf8" });
    return;
  }
  spawnSync("systemctl", ["--user", "stop", "va-claw.service"], { encoding: "utf8" });
}

function resolveLaunchdPath(): string {
  return join(homedir(), "Library", "LaunchAgents", "com.va-claw.daemon.plist");
}
