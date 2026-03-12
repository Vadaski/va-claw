import { createDiscordClient } from "./discord-client.js";
import { formatDiscordError, formatDiscordReply, DISCORD_PLACEHOLDER } from "./format.js";
import { buildDiscordPrompt, shouldHandleDiscordMessage } from "./prompt.js";
import { runDiscordCliPrompt } from "./cli-runner.js";
import type {
  DiscordChannel,
  DiscordChannelConfig,
  DiscordRuntimeClient,
  IncomingDiscordMessage,
} from "./types.js";

type DiscordDeps = {
  createClient: () => Promise<DiscordRuntimeClient>;
  runCliPrompt: (prompt: string, cliCommand?: string) => Promise<string>;
};

let discordDeps: DiscordDeps = {
  createClient: createDiscordClient,
  runCliPrompt: runDiscordCliPrompt,
};

export async function startDiscordChannel(
  config: DiscordChannelConfig,
): Promise<DiscordChannel> {
  validateDiscordChannelConfig(config);
  const client = await discordDeps.createClient();
  let connected = false;

  client.onMessage((message) => {
    const clientId = client.getSelfId() ?? config.clientId;
    if (!shouldHandleDiscordMessage(message, clientId)) {
      return;
    }
    return handleDiscordMessage(message, clientId, config.cliCommand);
  });

  await client.login(config.token);
  connected = true;

  return {
    status() {
      return connected ? "connected" : "disconnected";
    },
    async stop() {
      if (!connected) {
        return;
      }
      connected = false;
      await client.destroy();
    },
  };
}

export async function stopDiscordChannel(channel: DiscordChannel): Promise<void> {
  await channel.stop();
}

export function setDiscordDepsForTests(deps: Partial<DiscordDeps>): void {
  discordDeps = { ...discordDeps, ...deps };
}

export function resetDiscordDepsForTests(): void {
  discordDeps = {
    createClient: createDiscordClient,
    runCliPrompt: runDiscordCliPrompt,
  };
}

async function handleDiscordMessage(
  message: IncomingDiscordMessage,
  clientId: string,
  cliCommand?: string,
): Promise<void> {
  const pending = await message.send(DISCORD_PLACEHOLDER);
  try {
    const prompt = buildDiscordPrompt(message, clientId);
    const response = await discordDeps.runCliPrompt(prompt, cliCommand);
    await pending.edit(formatDiscordReply(response));
  } catch (error) {
    await pending.edit(formatDiscordError(error));
  }
}

function validateDiscordChannelConfig(config: DiscordChannelConfig): void {
  if (config.token.trim() === "") {
    throw new Error("Discord bot token is required.");
  }
  if (config.clientId.trim() === "") {
    throw new Error("Discord clientId is required.");
  }
}
