import { CLAUDE_MARKERS, CODEX_MARKERS } from "./install-files.js";
import { countMemoryEntries, findLastWakeAt } from "./memory-status.js";
import {
  formatClawDefinitions,
  formatMemoryEntries,
  formatSkills,
  writeLine,
} from "./output.js";
import { detectServiceType, probeServiceRunning, stopInstalledService } from "./platform.js";
import {
  listClaws,
  registerClaw,
  removeClaw,
  updateClaw,
  validateClawStatus,
} from "./claw-store.js";
import type { CliDeps, InstallTarget } from "./types.js";
import { waitForStopSignal } from "./wait.js";

const CLAW_FLEET_PROTOCOL_SKILL_URL =
  "https://raw.githubusercontent.com/Vadaski/va-claw/main/skills/claw-fleet-protocol.md";

export async function runInstall(target: InstallTarget, deps: CliDeps): Promise<void> {
  const installTarget = normalizeInstallTarget(target);
  const config = (await deps.fileExists(deps.configPath)) ? await deps.loadIdentity() : await deps.runInstallWizard();
  const summary = [`Installed va-claw for ${installTarget}.`, `Config: ${deps.configPath}`];
  if (installTarget === "claude-code" || installTarget === "all") {
    await deps.upsertManagedBlock(deps.claudePath, deps.toClaudeMdSnippet(config), CLAUDE_MARKERS);
    summary.push(`CLAUDE.md: ${deps.claudePath}`);
  }
  if (installTarget === "codex" || installTarget === "all") {
    const prompt = deps.wrapCodexPrompt(deps.toCodexSystemPrompt(config));
    await deps.upsertManagedBlock(deps.codexPath, prompt, CODEX_MARKERS);
    summary.push(`Codex instructions: ${deps.codexPath}`);
  }
  const serviceType = detectServiceType(deps.platform);
  await deps.installDaemonService(serviceType);
  summary.push(`Daemon service: ${serviceType}`);
  const fleetSkillName = await installFleetProtocolSkill(deps);
  if (fleetSkillName) {
    summary.push(`Claw fleet protocol skill: ${fleetSkillName}`);
  }
  for (const line of summary) {
    writeLine(deps.stdout, line);
  }
}

export async function runStart(deps: CliDeps): Promise<void> {
  const config = await deps.loadIdentity();
  await deps.startDaemon(config);
  writeLine(deps.stdout, "va-claw daemon started in foreground. Press Ctrl+C to stop.");
  await waitForStopSignal(async () => {
    await deps.stopDaemon();
    writeLine(deps.stdout, "va-claw daemon stopped.");
  });
}

export async function runStop(deps: CliDeps): Promise<void> {
  await deps.stopDaemon();
  const serviceType = safeDetectServiceType(deps.platform);
  if (serviceType) {
    stopInstalledService(serviceType, deps.spawnSync);
  }
  writeLine(deps.stdout, "va-claw stop requested.");
}

export async function runStatus(deps: CliDeps): Promise<void> {
  const runtime = await deps.getDaemonStatus();
  const serviceType = safeDetectServiceType(deps.platform);
  const serviceRunning = serviceType ? probeServiceRunning(serviceType, deps.spawnSync) : false;
  const lastWakeAt = runtime.lastWakeAt?.toISOString() ?? (await findLastWakeAt(deps.memoryDbPath, deps.fileExists));
  const memoryCount = await countMemoryEntries(deps.memoryDbPath, deps.fileExists);
  writeLine(deps.stdout, `Daemon: ${runtime.running || serviceRunning ? "running" : "stopped"}`);
  writeLine(deps.stdout, `Discord: ${runtime.discord}`);
  writeLine(deps.stdout, `Last wake: ${lastWakeAt ?? "never"}`);
  writeLine(deps.stdout, `Memory entries: ${memoryCount}`);
}

export async function runClawStatus(deps: CliDeps): Promise<void> {
  const clawStatus = await buildProtocolReport(deps);
  writeLine(deps.stdout, formatClawDefinitions(clawStatus.claws));
  writeLine(
    deps.stdout,
    `Daemon running: ${clawStatus.runtime.running ? "yes" : "no"} | service: ${clawStatus.runtime.serviceRunning ? "running" : "stopped"} | wakeCount: ${clawStatus.runtime.wakeCount}`,
  );
}

export async function runClawList(deps: CliDeps): Promise<void> {
  const claws = await listClaws(deps.clawRegistryPath);
  writeLine(deps.stdout, formatClawDefinitions(claws));
}

export async function runClawAdd(
  name: string,
  options: {
    goal?: string;
    status?: string;
    cliCommand?: string;
    note?: string;
    tags?: string;
  },
  deps: CliDeps,
): Promise<void> {
  const normalizedName = name.trim();
  if (normalizedName === "") {
    throw new Error("Claw name cannot be empty.");
  }
  const status = options.status
    ? validateClawStatus(options.status)
    : null;
  if (options.status && status === null) {
    throw new Error(`Invalid claw status: ${options.status}`);
  }
  const claw = await registerClaw(deps.clawRegistryPath, {
    name: normalizedName,
    goal: options.goal,
    status: status ?? undefined,
    cliCommand: options.cliCommand,
    note: options.note,
    tags: options.tags ? splitCommaList(options.tags) : [],
  });
  writeLine(deps.stdout, formatClawDefinitions([claw]));
}

export async function runClawUpdate(
  name: string,
  options: {
    goal?: string;
    status?: string;
    cliCommand?: string;
    note?: string;
    tags?: string;
    seen?: string;
  },
  deps: CliDeps,
): Promise<void> {
  const status = options.status ? validateClawStatus(options.status) : null;
  const normalizedName = name.trim();
  if (normalizedName === "") {
    throw new Error("Claw name cannot be empty.");
  }
  if (options.status && status === null) {
    throw new Error(`Invalid claw status: ${options.status}`);
  }
  const patch = {
    goal: options.goal,
    status: status ?? undefined,
    cliCommand: options.cliCommand,
    note: options.note,
    tags: options.tags ? splitCommaList(options.tags) : undefined,
    seen: options.seen === "1" || options.seen === "true" || options.seen === "yes",
  };
  const claw = await updateClaw(deps.clawRegistryPath, normalizedName, patch);
  if (!claw) {
    writeLine(deps.stdout, `Claw not found: ${name}`);
    return;
  }
  writeLine(deps.stdout, formatClawDefinitions([claw]));
}

export async function runClawRemove(name: string, deps: CliDeps): Promise<void> {
  const normalizedName = name.trim();
  if (normalizedName === "") {
    throw new Error("Claw name cannot be empty.");
  }
  const removed = await removeClaw(deps.clawRegistryPath, normalizedName);
  writeLine(deps.stdout, removed ? `Removed claw: ${normalizedName}` : `Claw not found: ${normalizedName}`);
}

export async function runClawHeartbeat(name: string, deps: CliDeps): Promise<void> {
  const normalizedName = name.trim();
  if (normalizedName === "") {
    throw new Error("Claw name cannot be empty.");
  }
  const claw = await updateClaw(deps.clawRegistryPath, normalizedName, { seen: true, status: "running" });
  if (!claw) {
    writeLine(deps.stdout, `Claw not found: ${name}`);
    return;
  }
  writeLine(deps.stdout, formatClawDefinitions([claw]));
}

export async function runProtocol(deps: CliDeps, textMode = false): Promise<void> {
  const report = await buildProtocolReport(deps);
  if (textMode) {
    writeLine(deps.stdout, `protocol: ${report.protocol}`);
    writeLine(deps.stdout, `timestamp: ${report.timestamp}`);
    writeLine(deps.stdout, `daemon.running: ${report.runtime.running}`);
    writeLine(deps.stdout, `daemon.serviceRunning: ${report.runtime.serviceRunning}`);
    writeLine(deps.stdout, `daemon.discord: ${report.runtime.discord}`);
    writeLine(deps.stdout, `daemon.wakeCount: ${report.runtime.wakeCount}`);
    writeLine(deps.stdout, `daemon.lastWakeAt: ${report.runtime.lastWakeAt ?? "never"}`);
    writeLine(deps.stdout, `memory.entries: ${report.memory.entries}`);
    writeLine(deps.stdout, `memory.lastWakeAt: ${report.memory.lastWakeAt ?? "never"}`);
    writeLine(deps.stdout, "");
    writeLine(deps.stdout, "Claws:");
    writeLine(deps.stdout, formatClawDefinitions(report.claws));
    return;
  }
  writeLine(deps.stdout, JSON.stringify(report, null, 2));
}

async function buildProtocolReport(deps: CliDeps): Promise<{
  protocol: string;
  timestamp: string;
  runtime: {
    running: boolean;
    serviceRunning: boolean;
    discord: string;
    wakeCount: number;
    lastWakeAt: string | null;
  };
  memory: {
    entries: number;
    lastWakeAt: string | null;
  };
  claws: {
    name: string;
    goal: string;
    status: string;
    cliCommand: string;
    note: string;
    tags: string[];
    lastSeenAt?: string;
    createdAt: string;
    updatedAt: string;
  }[];
}> {
  const runtime = await deps.getDaemonStatus();
  const serviceType = safeDetectServiceType(deps.platform);
  const serviceRunning = serviceType ? probeServiceRunning(serviceType, deps.spawnSync) : false;
  const runtimeLastWakeAt = runtime.lastWakeAt?.toISOString() ?? null;
  const fallbackLastWakeAt = await findLastWakeAt(deps.memoryDbPath, deps.fileExists);
  const memoryCount = await countMemoryEntries(deps.memoryDbPath, deps.fileExists);
  const claws = await listClaws(deps.clawRegistryPath);

  return {
    protocol: "va-claw-claw-protocol-1",
    timestamp: new Date().toISOString(),
    runtime: {
      running: runtime.running,
      serviceRunning,
      discord: runtime.discord,
      wakeCount: runtime.wakeCount,
      lastWakeAt: runtimeLastWakeAt ?? fallbackLastWakeAt,
    },
    memory: {
      entries: memoryCount,
      lastWakeAt: runtimeLastWakeAt ?? fallbackLastWakeAt,
    },
    claws: claws.map((claw) => ({
      name: claw.name,
      goal: claw.goal,
      status: claw.status,
      cliCommand: claw.cliCommand,
      note: claw.note,
      tags: claw.tags,
      lastSeenAt: claw.lastSeenAt,
      createdAt: claw.createdAt,
      updatedAt: claw.updatedAt,
    })),
  };
}

async function installFleetProtocolSkill(deps: CliDeps): Promise<string | null> {
  try {
    const response = await fetch(CLAW_FLEET_PROTOCOL_SKILL_URL);
    if (!response.ok) {
      return null;
    }
    const content = await response.text();
    return await deps.skillInstall(content, "claw-fleet-protocol");
  } catch {
    return null;
  }
}

export async function runMemorySearch(query: string, deps: CliDeps): Promise<void> {
  writeLine(deps.stdout, formatMemoryEntries(await deps.memorySearch(query, 10)));
}

export async function runMemoryList(deps: CliDeps): Promise<void> {
  writeLine(deps.stdout, formatMemoryEntries(await deps.memoryList(20)));
}

export async function runMemoryMemorize(
  key: string,
  essence: string,
  options: { tags?: string; details?: string; importance?: string },
  deps: CliDeps,
): Promise<void> {
  const importance = options.importance === undefined
    ? undefined
    : Number(options.importance);
  const entry = await deps.memoryMemorize(key, essence, {
    tags: options.tags ? splitCommaList(options.tags) : [],
    details: options.details,
    importance: Number.isFinite(importance) ? importance : undefined,
  });
  writeLine(deps.stdout, formatMemoryEntries([entry]));
}

export async function runMemoryGet(key: string, deps: CliDeps): Promise<void> {
  const entry = await deps.memoryGet(key);
  if (!entry) {
    writeLine(deps.stdout, `Memory not found: ${key}`);
    return;
  }
  writeLine(deps.stdout, formatMemoryEntries([entry]));
}

export async function runMemoryUpdate(
  key: string,
  options: { essence?: string; tags?: string; details?: string; importance?: string },
  deps: CliDeps,
): Promise<void> {
  const importance = options.importance === undefined
    ? undefined
    : Number(options.importance);
  const entry = await deps.memoryUpdate(key, {
    essence: options.essence,
    tags: options.tags ? splitCommaList(options.tags) : undefined,
    details: options.details,
    importance: Number.isFinite(importance) ? importance : undefined,
  });
  if (!entry) {
    writeLine(deps.stdout, `Memory not found: ${key}`);
    return;
  }
  writeLine(deps.stdout, formatMemoryEntries([entry]));
}

export async function runMemoryForget(key: string, deps: CliDeps): Promise<void> {
  const removed = await deps.memoryForget(key);
  writeLine(deps.stdout, removed ? `Forgot memory: ${key}` : `Memory not found: ${key}`);
}

export async function runMemoryRecall(query: string, limit: number, deps: CliDeps): Promise<void> {
  writeLine(deps.stdout, formatMemoryEntries(await deps.memoryRecall(query, limit)));
}

export async function runMemoryConsolidate(deps: CliDeps): Promise<void> {
  writeLine(deps.stdout, JSON.stringify(await deps.memoryConsolidate(), null, 2));
}

export async function runMemoryReflect(deps: CliDeps): Promise<void> {
  writeLine(deps.stdout, await deps.memoryReflect());
}

export async function runMemoryClear(deps: CliDeps): Promise<void> {
  if (!(await deps.confirm("Clear all va-claw memory entries?"))) {
    writeLine(deps.stdout, "Memory clear aborted.");
    return;
  }
  await deps.memoryClear();
  writeLine(deps.stdout, "Memory cleared.");
}

export async function runDiscordSetup(deps: CliDeps): Promise<void> {
  const config = await deps.loadIdentity();
  const token = await deps.prompt("Discord Bot Token", config.channels.discord.token);
  const clientId = await deps.prompt("Discord Client ID", config.channels.discord.clientId);
  await deps.saveIdentity({
    ...config,
    channels: {
      ...config.channels,
      discord: {
        ...config.channels.discord,
        token,
        clientId,
      },
    },
  });
  writeLine(deps.stdout, `Saved Discord config to ${deps.configPath}`);
}

export async function runDiscordStart(deps: CliDeps): Promise<void> {
  const config = await deps.loadIdentity();
  const discord = await loadDiscordChannelModule();
  const channel = await discord.startDiscordChannel({
    token: config.channels.discord.token,
    clientId: config.channels.discord.clientId,
    cliCommand: config.channels.discord.cliCommand,
  });
  writeLine(deps.stdout, "Discord channel started in foreground. Press Ctrl+C to stop.");
  await waitForStopSignal(async () => {
    await discord.stopDiscordChannel(channel);
    writeLine(deps.stdout, "Discord channel stopped.");
  });
}

export async function runDiscordStatus(deps: CliDeps): Promise<void> {
  const config = await deps.loadIdentity();
  const configured =
    config.channels.discord.token.trim() !== "" &&
    config.channels.discord.clientId.trim() !== "";
  const runtime = await deps.getDaemonStatus();
  writeLine(deps.stdout, `Discord: ${configured ? runtime.discord : "disconnected"}`);
  writeLine(deps.stdout, `Configured: ${configured ? "yes" : "no"}`);
  writeLine(deps.stdout, `Auto-start: ${config.channels.discord.autoStart ? "enabled" : "disabled"}`);
}

export async function runSkillList(deps: CliDeps): Promise<void> {
  writeLine(deps.stdout, formatSkills(await deps.skillList()));
}

export async function runSkillAdd(pathOrUrl: string, deps: CliDeps): Promise<void> {
  if (/^https?:\/\//i.test(pathOrUrl)) {
    throw new Error("Network installs are not supported. Use a local skill file path.");
  }
  const source = await deps.skillLoad(pathOrUrl);
  const content = await deps.readTextFile(source.path);
  const installedPath = await deps.skillInstall(content, source.name);
  writeLine(deps.stdout, `Installed skill ${source.name} -> ${installedPath}`);
}

export async function runSkillRemove(name: string, deps: CliDeps): Promise<void> {
  await deps.skillRemove(name);
  writeLine(deps.stdout, `Removed skill ${name}.`);
}

export async function runSkillShow(name: string, deps: CliDeps): Promise<void> {
  const skill = await deps.skillLoad(name);
  writeLine(deps.stdout, await deps.readTextFile(skill.path));
}

export async function runUninstall(deps: CliDeps): Promise<void> {
  const serviceType = detectServiceType(deps.platform);
  await deps.uninstallDaemonService(serviceType);
  await deps.removeManagedBlock(deps.claudePath, CLAUDE_MARKERS);
  await deps.removeManagedBlock(deps.codexPath, CODEX_MARKERS);
  writeLine(deps.stdout, "va-claw uninstalled.");
}

function normalizeInstallTarget(target: InstallTarget): InstallTarget {
  if (target === "claude-code" || target === "codex" || target === "all") {
    return target;
  }
  throw new Error(`Invalid --for target: ${target}`);
}

function safeDetectServiceType(platform: NodeJS.Platform) {
  try {
    return detectServiceType(platform);
  } catch {
    return null;
  }
}

async function loadDiscordChannelModule(): Promise<{
  startDiscordChannel(config: {
    token: string;
    clientId: string;
    cliCommand?: string;
  }): Promise<{ stop(): Promise<void> }>;
  stopDiscordChannel(channel: { stop(): Promise<void> }): Promise<void>;
}> {
  const moduleUrl = new URL("../../channels/discord/dist/index.js", import.meta.url);
  return import(moduleUrl.href) as Promise<{
    startDiscordChannel(config: {
      token: string;
      clientId: string;
      cliCommand?: string;
    }): Promise<{ stop(): Promise<void> }>;
    stopDiscordChannel(channel: { stop(): Promise<void> }): Promise<void>;
  }>;
}

function splitCommaList(value: string): string[] {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}
