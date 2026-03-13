import type { VaClawConfig } from "@va-claw/daemon";

import { writeLine } from "./output.js";
import type { CliDeps } from "./types.js";
import { waitForStopSignal } from "./wait.js";

export async function runTelegramChannelSetup(
  token: string | undefined,
  cliCommand: string | undefined,
  deps: CliDeps,
): Promise<void> {
  const config = await deps.loadIdentity();
  const next = withChannels(config, {
    telegram: {
      ...config.channels.telegram,
      token: token ?? config.channels.telegram.token,
      cliCommand: cliCommand ?? config.channels.telegram.cliCommand,
    },
  });
  ensureTelegramConfigured(next);
  await deps.saveIdentity(next);
  writeLine(deps.stdout, `Saved Telegram config to ${deps.configPath}`);
}

export async function runTelegramChannelStart(deps: CliDeps): Promise<void> {
  const config = await deps.loadIdentity();
  ensureTelegramConfigured(config);
  const channel = await deps.startTelegramChannel(config.channels.telegram);
  writeLine(deps.stdout, "Telegram channel started in foreground. Press Ctrl+C to stop.");
  await waitForStopSignal(async () => {
    await deps.stopTelegramChannel(channel);
    writeLine(deps.stdout, "Telegram channel stopped.");
  });
}

export async function runTelegramChannelStatus(deps: CliDeps): Promise<void> {
  const config = await deps.loadIdentity();
  writeLine(deps.stdout, `Telegram configured: ${config.channels.telegram.token ? "yes" : "no"}`);
  writeLine(deps.stdout, `Telegram CLI command: ${config.channels.telegram.cliCommand || "va-claw"}`);
}

export async function runSlackChannelSetup(
  botToken: string | undefined,
  appToken: string | undefined,
  cliCommand: string | undefined,
  deps: CliDeps,
): Promise<void> {
  const config = await deps.loadIdentity();
  const next = withChannels(config, {
    slack: {
      ...config.channels.slack,
      botToken: botToken ?? config.channels.slack.botToken,
      appToken: appToken ?? config.channels.slack.appToken,
      cliCommand: cliCommand ?? config.channels.slack.cliCommand,
    },
  });
  ensureSlackConfigured(next);
  await deps.saveIdentity(next);
  writeLine(deps.stdout, `Saved Slack config to ${deps.configPath}`);
}

export async function runSlackChannelStart(deps: CliDeps): Promise<void> {
  const config = await deps.loadIdentity();
  ensureSlackConfigured(config);
  const channel = await deps.startSlackChannel(config.channels.slack);
  writeLine(deps.stdout, "Slack channel started in foreground. Press Ctrl+C to stop.");
  await waitForStopSignal(async () => {
    await deps.stopSlackChannel(channel);
    writeLine(deps.stdout, "Slack channel stopped.");
  });
}

export async function runSlackChannelStatus(deps: CliDeps): Promise<void> {
  const config = await deps.loadIdentity();
  const configured = config.channels.slack.botToken !== "" && config.channels.slack.appToken !== "";
  writeLine(deps.stdout, `Slack configured: ${configured ? "yes" : "no"}`);
  writeLine(deps.stdout, `Slack CLI command: ${config.channels.slack.cliCommand || "va-claw"}`);
}

export async function runLarkChannelSetup(
  appId: string | undefined,
  appSecret: string | undefined,
  cliCommand: string | undefined,
  deps: CliDeps,
): Promise<void> {
  const config = await deps.loadIdentity();
  const next = withChannels(config, {
    lark: {
      ...config.channels.lark,
      appId: appId ?? config.channels.lark.appId,
      appSecret: appSecret ?? config.channels.lark.appSecret,
      cliCommand: cliCommand ?? config.channels.lark.cliCommand,
    },
  });
  ensureLarkConfigured(next);
  await deps.saveIdentity(next);
  writeLine(deps.stdout, `Saved Lark config to ${deps.configPath}`);
}

export async function runLarkChannelStart(deps: CliDeps): Promise<void> {
  const config = await deps.loadIdentity();
  ensureLarkConfigured(config);
  const channel = await deps.startLarkChannel(config.channels.lark);
  writeLine(deps.stdout, "Lark channel started in foreground. Press Ctrl+C to stop.");
  await waitForStopSignal(async () => {
    await deps.stopLarkChannel(channel);
    writeLine(deps.stdout, "Lark channel stopped.");
  });
}

export async function runLarkChannelStatus(deps: CliDeps): Promise<void> {
  const config = await deps.loadIdentity();
  const configured = config.channels.lark.appId !== "" && config.channels.lark.appSecret !== "";
  writeLine(deps.stdout, `Lark configured: ${configured ? "yes" : "no"}`);
  writeLine(deps.stdout, `Lark CLI command: ${config.channels.lark.cliCommand || "va-claw"}`);
}

function ensureTelegramConfigured(config: VaClawConfig): void {
  if (!config.channels.telegram.token) {
    throw new Error("Telegram token is required. Use `va-claw channel telegram setup --token <token>`.");
  }
}

function ensureSlackConfigured(config: VaClawConfig): void {
  if (!config.channels.slack.botToken || !config.channels.slack.appToken) {
    throw new Error(
      "Slack bot/app tokens are required. Use `va-claw channel slack setup --bot-token <token> --app-token <token>`.",
    );
  }
}

function ensureLarkConfigured(config: VaClawConfig): void {
  if (!config.channels.lark.appId || !config.channels.lark.appSecret) {
    throw new Error(
      "Lark appId/appSecret are required. Use `va-claw channel lark setup --app-id <id> --app-secret <secret>`.",
    );
  }
}

function withChannels(
  config: VaClawConfig,
  patch: Partial<VaClawConfig["channels"]>,
): VaClawConfig {
  return {
    ...config,
    channels: {
      ...config.channels,
      ...patch,
    },
  };
}
