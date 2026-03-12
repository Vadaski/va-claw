import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { ServiceType } from "./types.js";

export type ServiceDefinition = {
  path: string;
  content: string;
  command: string;
  args: string[];
};

export function createServiceDefinition(type: ServiceType): ServiceDefinition {
  const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const repoRoot = resolve(packageRoot, "../..");
  const runnerPath = join(packageRoot, "dist", "runner.js");
  const nodePath = process.execPath;

  if (type === "launchd") {
    return {
      path: join(homedir(), "Library", "LaunchAgents", "com.va-claw.daemon.plist"),
      content: renderLaunchdPlist(repoRoot, [nodePath, runnerPath]),
      command: "launchctl",
      args: ["load", join(homedir(), "Library", "LaunchAgents", "com.va-claw.daemon.plist")],
    };
  }

  return {
    path: join(homedir(), ".config", "systemd", "user", "va-claw.service"),
    content: renderSystemdUnit(repoRoot, [nodePath, runnerPath]),
    command: "systemctl",
    args: ["--user", "enable", "--now", "va-claw.service"],
  };
}

export function createUninstallCommand(type: ServiceType): { command: string; args: string[] } {
  if (type === "launchd") {
    return {
      command: "launchctl",
      args: ["unload", join(homedir(), "Library", "LaunchAgents", "com.va-claw.daemon.plist")],
    };
  }
  return {
    command: "systemctl",
    args: ["--user", "disable", "--now", "va-claw.service"],
  };
}

function renderLaunchdPlist(workingDirectory: string, programArguments: string[]): string {
  const argsXml = programArguments.map((arg) => `    <string>${escapeXml(arg)}</string>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.va-claw.daemon</string>
  <key>ProgramArguments</key>
  <array>
${argsXml}
  </array>
  <key>WorkingDirectory</key>
  <string>${escapeXml(workingDirectory)}</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
</dict>
</plist>
`;
}

function renderSystemdUnit(workingDirectory: string, programArguments: string[]): string {
  return `[Unit]
Description=va-claw daemon

[Service]
Type=simple
WorkingDirectory=${workingDirectory}
ExecStart=${programArguments.map(quoteSystemdArg).join(" ")}
Restart=always
RestartSec=5

[Install]
WantedBy=default.target
`;
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&apos;");
}

function quoteSystemdArg(value: string): string {
  return `'${value.replaceAll("'", `'\\''`)}'`;
}
