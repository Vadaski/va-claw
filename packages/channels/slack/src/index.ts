import { App } from "@slack/bolt";

import { createSlackEventHandler } from "./message.js";
import type { SlackChannel, StartSlackChannelConfig } from "./types.js";

export async function startSlackChannel(config: StartSlackChannelConfig): Promise<SlackChannel> {
  const app = new App({
    token: config.botToken,
    appToken: config.appToken,
    socketMode: true,
  });
  const handler = createSlackEventHandler(config.cliCommand);
  app.event("app_mention", handler);
  app.event("message", handler);
  app.error((error) => {
    console.error("[va-claw/channel-slack]", error);
  });
  await app.start();
  return {
    app,
    appToken: config.appToken,
    botToken: config.botToken,
    cliCommand: config.cliCommand ?? "va-claw",
  };
}

export async function stopSlackChannel(channel: SlackChannel): Promise<void> {
  await channel.app.stop();
}

export type { SlackChannel, SlackCliResult, StartSlackChannelConfig } from "./types.js";
export { createSlackEventHandler, formatSlackReply, parseSlackPrompt } from "./message.js";
export { parseCliCommand, runSlackCli } from "./cli.js";
