import { equal, match } from "node:assert/strict";
import { afterEach, test } from "node:test";

import { resetDiscordDepsForTests, setDiscordDepsForTests, startDiscordChannel } from "./runtime.js";
import type { DiscordRuntimeClient, IncomingDiscordMessage } from "./types.js";

afterEach(() => {
  resetDiscordDepsForTests();
});

test("startDiscordChannel throws when token is missing", async () => {
  await assertRejects(
    () => startDiscordChannel({ token: "", clientId: "client-1" }),
    /Discord bot token is required/,
  );
});

test("startDiscordChannel registers a Discord client and exposes connected status", async () => {
  let loginToken = "";
  let destroyed = false;
  const client = createMockClient();

  setDiscordDepsForTests({
    async createClient() {
      return {
        ...client,
        async destroy() {
          destroyed = true;
        },
        async login(token: string) {
          loginToken = token;
        },
      };
    },
  });

  const channel = await startDiscordChannel({ token: "token-1", clientId: "client-1" });

  equal(loginToken, "token-1");
  equal(channel.status(), "connected");
  await channel.stop();
  equal(channel.status(), "disconnected");
  equal(destroyed, true);
});

test("Discord messages send placeholder and invoke CLI", async () => {
  const edits: string[] = [];
  const prompts: string[] = [];
  const client = createMockClient({
    message: createMockMessage({
      content: "<@client-1> hello from discord",
      onEdit(content) {
        edits.push(content);
      },
    }),
  });

  setDiscordDepsForTests({
    async createClient() {
      return client;
    },
    async runCliPrompt(prompt) {
      prompts.push(prompt);
      return "discord reply";
    },
  });

  await startDiscordChannel({ token: "token-1", clientId: "client-1" });
  await client.dispatchMessage();

  equal(edits[0], "正在思考...");
  equal(edits[1], "discord reply");
  match(prompts[0] ?? "", /hello from discord/);
});

function createMockClient(options: { message?: IncomingDiscordMessage } = {}): DiscordRuntimeClient & {
  dispatchMessage(): Promise<void>;
} {
  let listener: ((message: IncomingDiscordMessage) => void | Promise<void>) | null = null;
  return {
    async destroy() {},
    dispatchMessage() {
      return Promise.resolve(listener?.(options.message ?? createMockMessage()));
    },
    getSelfId() {
      return "client-1";
    },
    async login() {},
    onMessage(next) {
      listener = next;
    },
  };
}

function createMockMessage(options: {
  content?: string;
  onEdit?: (content: string) => void;
} = {}): IncomingDiscordMessage {
  return {
    authorId: "user-1",
    authorName: "tester",
    content: options.content ?? "hello",
    isBot: false,
    isDirectMessage: true,
    sourceLabel: "dm",
    isMentioned() {
      return true;
    },
    async send(content: string) {
      options.onEdit?.(content);
      return {
        async edit(nextContent: string) {
          options.onEdit?.(nextContent);
        },
      };
    },
  };
}

async function assertRejects(
  fn: () => Promise<unknown>,
  pattern: RegExp,
): Promise<void> {
  try {
    await fn();
  } catch (error) {
    match(error instanceof Error ? error.message : String(error), pattern);
    return;
  }
  throw new Error("Expected promise to reject.");
}
