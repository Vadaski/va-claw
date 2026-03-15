import { CLAUDE_MARKERS, CODEX_MARKERS } from "./install-files.js";
import { countMemoryEntries, findLastWakeAt } from "./memory-status.js";
import {
  formatClawDefinitions,
  formatMemoryEntries,
  formatSkills,
  writeLine
} from "./output.js";
import { detectServiceType, probeServiceRunning, stopInstalledService } from "./platform.js";
import {
  listClaws,
  registerClaw,
  removeClaw,
  updateClaw,
  validateClawStatus
} from "./claw-store.js";
import { waitForStopSignal } from "./wait.js";
const CLAW_FLEET_PROTOCOL_SKILL_URL = "https://raw.githubusercontent.com/Vadaski/va-claw/main/skills/claw-fleet-protocol.md";
const MEMORY_SKILL_URL = "https://raw.githubusercontent.com/Vadaski/va-claw/main/skills/memory-protocol.md";
async function runInstall(target, deps) {
  const installTarget = normalizeInstallTarget(target);
  const config = await deps.fileExists(deps.configPath) ? await deps.loadIdentity() : await deps.runInstallWizard();
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
  const memorySkillName = await installMemoryProtocolSkill(deps);
  if (memorySkillName) {
    summary.push(`Memory protocol skill: ${memorySkillName}`);
  }
  for (const line of summary) {
    writeLine(deps.stdout, line);
  }
}
async function runStart(deps) {
  const config = await deps.loadIdentity();
  await deps.startDaemon(config);
  writeLine(deps.stdout, "va-claw daemon started in foreground. Press Ctrl+C to stop.");
  await waitForStopSignal(async () => {
    await deps.stopDaemon();
    writeLine(deps.stdout, "va-claw daemon stopped.");
  });
}
async function runStop(deps) {
  await deps.stopDaemon();
  const serviceType = safeDetectServiceType(deps.platform);
  if (serviceType) {
    stopInstalledService(serviceType, deps.spawnSync);
  }
  writeLine(deps.stdout, "va-claw stop requested.");
}
async function runStatus(deps) {
  const runtime = await deps.getDaemonStatus();
  const serviceType = safeDetectServiceType(deps.platform);
  const serviceRunning = serviceType ? probeServiceRunning(serviceType, deps.spawnSync) : false;
  const lastWakeAt = runtime.lastWakeAt?.toISOString() ?? await findLastWakeAt(deps.memoryDbPath, deps.fileExists);
  const memoryCount = await countMemoryEntries(deps.memoryDbPath, deps.fileExists);
  writeLine(deps.stdout, `Daemon: ${runtime.running || serviceRunning ? "running" : "stopped"}`);
  writeLine(deps.stdout, `Discord: ${runtime.discord}`);
  writeLine(deps.stdout, `Last wake: ${lastWakeAt ?? "never"}`);
  writeLine(deps.stdout, `Memory entries: ${memoryCount}`);
}
async function runClawStatus(deps) {
  const clawStatus = await buildProtocolReport(deps);
  writeLine(deps.stdout, formatClawDefinitions(clawStatus.claws));
  writeLine(
    deps.stdout,
    `Daemon running: ${clawStatus.runtime.running ? "yes" : "no"} | service: ${clawStatus.runtime.serviceRunning ? "running" : "stopped"} | wakeCount: ${clawStatus.runtime.wakeCount}`
  );
}
async function runClawList(deps) {
  const claws = await listClaws(deps.clawRegistryPath);
  writeLine(deps.stdout, formatClawDefinitions(claws));
}
async function runClawAdd(name, options, deps) {
  const normalizedName = name.trim();
  if (normalizedName === "") {
    throw new Error("Claw name cannot be empty.");
  }
  const status = options.status ? validateClawStatus(options.status) : null;
  if (options.status && status === null) {
    throw new Error(`Invalid claw status: ${options.status}`);
  }
  const claw = await registerClaw(deps.clawRegistryPath, {
    name: normalizedName,
    goal: options.goal,
    status: status ?? void 0,
    cliCommand: options.cliCommand,
    note: options.note,
    tags: options.tags ? splitCommaList(options.tags) : []
  });
  writeLine(deps.stdout, formatClawDefinitions([claw]));
}
async function runClawUpdate(name, options, deps) {
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
    status: status ?? void 0,
    cliCommand: options.cliCommand,
    note: options.note,
    tags: options.tags ? splitCommaList(options.tags) : void 0,
    seen: options.seen === "1" || options.seen === "true" || options.seen === "yes"
  };
  const claw = await updateClaw(deps.clawRegistryPath, normalizedName, patch);
  if (!claw) {
    writeLine(deps.stdout, `Claw not found: ${name}`);
    return;
  }
  writeLine(deps.stdout, formatClawDefinitions([claw]));
}
async function runClawRemove(name, deps) {
  const normalizedName = name.trim();
  if (normalizedName === "") {
    throw new Error("Claw name cannot be empty.");
  }
  const removed = await removeClaw(deps.clawRegistryPath, normalizedName);
  writeLine(deps.stdout, removed ? `Removed claw: ${normalizedName}` : `Claw not found: ${normalizedName}`);
}
async function runClawHeartbeat(name, deps) {
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
async function runProtocol(deps, textMode = false) {
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
    writeLine(deps.stdout, "Recent session:");
    if (report.session.recent.length === 0) {
      writeLine(deps.stdout, "(none)");
    } else {
      for (const entry of report.session.recent) {
        writeLine(deps.stdout, `- ${deps.formatSessionEntry(entry)}`);
      }
    }
    writeLine(deps.stdout, "");
    writeLine(deps.stdout, "Claws:");
    writeLine(deps.stdout, formatClawDefinitions(report.claws));
    return;
  }
  writeLine(deps.stdout, JSON.stringify(report, null, 2));
}
async function buildProtocolReport(deps) {
  const runtime = await deps.getDaemonStatus();
  const serviceType = safeDetectServiceType(deps.platform);
  const serviceRunning = serviceType ? probeServiceRunning(serviceType, deps.spawnSync) : false;
  const runtimeLastWakeAt = runtime.lastWakeAt?.toISOString() ?? null;
  const fallbackLastWakeAt = await findLastWakeAt(deps.memoryDbPath, deps.fileExists);
  const memoryCount = await countMemoryEntries(deps.memoryDbPath, deps.fileExists);
  const sessionRecent = await deps.readRecentSessionEntries(5);
  const claws = await listClaws(deps.clawRegistryPath);
  return {
    protocol: "va-claw-claw-protocol-1",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    runtime: {
      running: runtime.running,
      serviceRunning,
      discord: runtime.discord,
      wakeCount: runtime.wakeCount,
      lastWakeAt: runtimeLastWakeAt ?? fallbackLastWakeAt
    },
    memory: {
      entries: memoryCount,
      lastWakeAt: runtimeLastWakeAt ?? fallbackLastWakeAt
    },
    session: {
      recent: sessionRecent
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
      updatedAt: claw.updatedAt
    }))
  };
}
async function installFleetProtocolSkill(deps) {
  return installRemoteSkill(deps, CLAW_FLEET_PROTOCOL_SKILL_URL, "claw-fleet-protocol");
}
async function installMemoryProtocolSkill(deps) {
  return installRemoteSkill(deps, MEMORY_SKILL_URL, "memory-protocol");
}
async function installRemoteSkill(deps, url, name) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }
    const content = await response.text();
    return await deps.skillInstall(content, name);
  } catch {
    return null;
  }
}
async function runMemorySearch(query, deps) {
  writeLine(deps.stdout, formatMemoryEntries(await deps.memorySearch(query, 10)));
}
async function runMemoryList(deps) {
  writeLine(deps.stdout, formatMemoryEntries(await deps.memoryList(20)));
}
async function runMemoryMemorize(key, essence, options, deps) {
  const importance = options.importance === void 0 ? void 0 : Number(options.importance);
  const entry = await deps.memoryMemorize(key, essence, {
    tags: options.tags ? splitCommaList(options.tags) : [],
    details: options.details,
    importance: Number.isFinite(importance) ? importance : void 0
  });
  writeLine(deps.stdout, formatMemoryEntries([entry]));
}
async function runMemoryGet(key, deps) {
  const entry = await deps.memoryGet(key);
  if (!entry) {
    writeLine(deps.stdout, `Memory not found: ${key}`);
    return;
  }
  writeLine(deps.stdout, formatMemoryEntries([entry]));
}
async function runMemoryUpdate(key, options, deps) {
  const importance = options.importance === void 0 ? void 0 : Number(options.importance);
  const entry = await deps.memoryUpdate(key, {
    essence: options.essence,
    tags: options.tags ? splitCommaList(options.tags) : void 0,
    details: options.details,
    importance: Number.isFinite(importance) ? importance : void 0
  });
  if (!entry) {
    writeLine(deps.stdout, `Memory not found: ${key}`);
    return;
  }
  writeLine(deps.stdout, formatMemoryEntries([entry]));
}
async function runMemoryForget(key, deps) {
  const removed = await deps.memoryForget(key);
  writeLine(deps.stdout, removed ? `Forgot memory: ${key}` : `Memory not found: ${key}`);
}
async function runMemoryRecall(query, limit, deps) {
  writeLine(deps.stdout, formatMemoryEntries(await deps.memoryRecall(query, limit)));
}
async function runMemoryConsolidate(deps) {
  writeLine(deps.stdout, JSON.stringify(await deps.memoryConsolidate(), null, 2));
}
async function runMemoryReflect(deps) {
  writeLine(deps.stdout, await deps.memoryReflect());
}
async function runMemoryClear(deps) {
  if (!await deps.confirm("Clear all va-claw memory entries?")) {
    writeLine(deps.stdout, "Memory clear aborted.");
    return;
  }
  await deps.memoryClear();
  writeLine(deps.stdout, "Memory cleared.");
}
async function runSessionAppend(options, deps) {
  const role = normalizeSessionRole(options.role);
  const summary = options.summary?.trim() ?? "";
  const entry = await deps.appendSessionEntry({ role, summary });
  writeLine(deps.stdout, deps.formatSessionEntry(entry));
}
async function runSessionRecall(options, deps) {
  const parsedLimit = options.limit === void 0 ? 10 : Number(options.limit);
  const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.floor(parsedLimit) : 10;
  const entries = await deps.readRecentSessionEntries(limit);
  if (entries.length === 0) {
    writeLine(deps.stdout, "No session entries.");
    return;
  }
  for (const entry of entries) {
    writeLine(deps.stdout, deps.formatSessionEntry(entry));
  }
}
async function runDiscordSetup(deps) {
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
        clientId
      }
    }
  });
  writeLine(deps.stdout, `Saved Discord config to ${deps.configPath}`);
}
async function runDiscordStart(deps) {
  const config = await deps.loadIdentity();
  const discord = await loadDiscordChannelModule();
  const channel = await discord.startDiscordChannel({
    token: config.channels.discord.token,
    clientId: config.channels.discord.clientId,
    cliCommand: config.channels.discord.cliCommand
  });
  writeLine(deps.stdout, "Discord channel started in foreground. Press Ctrl+C to stop.");
  await waitForStopSignal(async () => {
    await discord.stopDiscordChannel(channel);
    writeLine(deps.stdout, "Discord channel stopped.");
  });
}
async function runDiscordStatus(deps) {
  const config = await deps.loadIdentity();
  const configured = config.channels.discord.token.trim() !== "" && config.channels.discord.clientId.trim() !== "";
  const runtime = await deps.getDaemonStatus();
  writeLine(deps.stdout, `Discord: ${configured ? runtime.discord : "disconnected"}`);
  writeLine(deps.stdout, `Configured: ${configured ? "yes" : "no"}`);
  writeLine(deps.stdout, `Auto-start: ${config.channels.discord.autoStart ? "enabled" : "disabled"}`);
}
async function runSkillList(deps) {
  writeLine(deps.stdout, formatSkills(await deps.skillList()));
}
async function runSkillAdd(pathOrUrl, deps) {
  if (/^https?:\/\//i.test(pathOrUrl)) {
    throw new Error("Network installs are not supported. Use a local skill file path.");
  }
  const source = await deps.skillLoad(pathOrUrl);
  const content = await deps.readTextFile(source.path);
  const installedPath = await deps.skillInstall(content, source.name);
  writeLine(deps.stdout, `Installed skill ${source.name} -> ${installedPath}`);
}
async function runSkillRemove(name, deps) {
  await deps.skillRemove(name);
  writeLine(deps.stdout, `Removed skill ${name}.`);
}
async function runSkillShow(name, deps) {
  const skill = await deps.skillLoad(name);
  writeLine(deps.stdout, await deps.readTextFile(skill.path));
}
async function runUninstall(deps) {
  const serviceType = detectServiceType(deps.platform);
  await deps.uninstallDaemonService(serviceType);
  await deps.removeManagedBlock(deps.claudePath, CLAUDE_MARKERS);
  await deps.removeManagedBlock(deps.codexPath, CODEX_MARKERS);
  writeLine(deps.stdout, "va-claw uninstalled.");
}
function normalizeInstallTarget(target) {
  if (target === "claude-code" || target === "codex" || target === "all") {
    return target;
  }
  throw new Error(`Invalid --for target: ${target}`);
}
function safeDetectServiceType(platform) {
  try {
    return detectServiceType(platform);
  } catch {
    return null;
  }
}
async function loadDiscordChannelModule() {
  const moduleUrl = new URL("../../channels/discord/dist/index.js", import.meta.url);
  return import(moduleUrl.href);
}
function splitCommaList(value) {
  return value.split(",").map((part) => part.trim()).filter((part) => part.length > 0);
}
function normalizeSessionRole(role) {
  if (role === "user" || role === "assistant") {
    return role;
  }
  throw new Error("Session role must be 'user' or 'assistant'.");
}
export {
  runClawAdd,
  runClawHeartbeat,
  runClawList,
  runClawRemove,
  runClawStatus,
  runClawUpdate,
  runDiscordSetup,
  runDiscordStart,
  runDiscordStatus,
  runInstall,
  runMemoryClear,
  runMemoryConsolidate,
  runMemoryForget,
  runMemoryGet,
  runMemoryList,
  runMemoryMemorize,
  runMemoryRecall,
  runMemoryReflect,
  runMemorySearch,
  runMemoryUpdate,
  runProtocol,
  runSessionAppend,
  runSessionRecall,
  runSkillAdd,
  runSkillList,
  runSkillRemove,
  runSkillShow,
  runStart,
  runStatus,
  runStop,
  runUninstall
};
