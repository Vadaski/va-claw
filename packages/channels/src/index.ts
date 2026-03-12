import type { VaClawConfig } from "@va-claw/identity";

import {
  startDiscordChannel,
  stopDiscordChannel,
  type DiscordChannel,
  type DiscordChannelConfig,
} from "../discord/dist/index.js";
import {
  startSlackChannel,
  stopSlackChannel,
  type SlackChannel,
  type StartSlackChannelConfig,
} from "../slack/dist/index.js";
import {
  startTelegramChannel,
  stopTelegramChannel,
  type StartTelegramChannelConfig,
  type TelegramChannel,
} from "../telegram/dist/index.js";

export type StartedChannels = {
  discord?: DiscordChannel;
  slack?: SlackChannel;
  telegram?: TelegramChannel;
};

export async function startAllChannels(config: Pick<VaClawConfig, "channels">): Promise<StartedChannels> {
  const channels: StartedChannels = {};
  if (config.channels.discord.autoStart && config.channels.discord.token && config.channels.discord.clientId) {
    channels.discord = await startDiscordChannel(config.channels.discord satisfies DiscordChannelConfig);
  }
  if (config.channels.telegram.token) {
    channels.telegram = await startTelegramChannel(config.channels.telegram satisfies StartTelegramChannelConfig);
  }
  if (config.channels.slack.botToken && config.channels.slack.appToken) {
    channels.slack = await startSlackChannel(config.channels.slack satisfies StartSlackChannelConfig);
  }
  return channels;
}

export async function stopAllChannels(channels: StartedChannels): Promise<void> {
  await Promise.all([
    channels.discord ? stopDiscordChannel(channels.discord) : Promise.resolve(),
    channels.telegram ? stopTelegramChannel(channels.telegram) : Promise.resolve(),
    channels.slack ? stopSlackChannel(channels.slack) : Promise.resolve(),
  ]);
}

export {
  startDiscordChannel,
  startSlackChannel,
  startTelegramChannel,
  stopDiscordChannel,
  stopSlackChannel,
  stopTelegramChannel,
};
export type {
  DiscordChannel,
  DiscordChannelConfig,
  SlackChannel,
  StartSlackChannelConfig,
  StartTelegramChannelConfig,
  TelegramChannel,
};
