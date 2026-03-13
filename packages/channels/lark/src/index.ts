import { createLarkListener, parseLarkEvent } from "./lark-client.js";
import { createLarkMessageHandler, formatLarkReply, parseLarkPrompt } from "./message.js";
import type { LarkChannel, LarkListener, StartLarkChannelConfig } from "./types.js";

type LarkDeps = {
  createListener: (config: StartLarkChannelConfig, handler: (message: Parameters<ReturnType<typeof createLarkMessageHandler>>[0]) => Promise<void>) => LarkListener;
};

let larkDeps: LarkDeps = {
  createListener: createLarkListener,
};

export async function startLarkChannel(config: StartLarkChannelConfig): Promise<LarkChannel> {
  validateLarkChannelConfig(config);
  const handler = createLarkMessageHandler(config.cliCommand);
  const listener = larkDeps.createListener(config, async (message) => {
    await handler(message, listener);
  });
  listener.start();
  return {
    appId: config.appId,
    appSecret: config.appSecret,
    cliCommand: config.cliCommand ?? "va-claw",
    listener,
  };
}

export async function stopLarkChannel(channel: LarkChannel): Promise<void> {
  await channel.listener.stop();
}

export function setLarkDepsForTests(deps: Partial<LarkDeps>): void {
  larkDeps = { ...larkDeps, ...deps };
}

export function resetLarkDepsForTests(): void {
  larkDeps = {
    createListener: createLarkListener,
  };
}

function validateLarkChannelConfig(config: StartLarkChannelConfig): void {
  if (config.appId.trim() === "") {
    throw new Error("Lark appId is required.");
  }
  if (config.appSecret.trim() === "") {
    throw new Error("Lark appSecret is required.");
  }
}

export type { LarkChannel, LarkCliResult, LarkIncomingMessage, LarkListener, StartLarkChannelConfig } from "./types.js";
export { createLarkListener, createLarkMessageHandler, formatLarkReply, parseLarkEvent, parseLarkPrompt };
export { parseCliCommand, runLarkCli } from "./cli.js";
