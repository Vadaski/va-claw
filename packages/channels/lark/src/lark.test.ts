import { deepEqual, equal } from "node:assert/strict";
import test, { afterEach } from "node:test";

import {
  createLarkMessageHandler,
  formatLarkReply,
  createRecentMessageDeduper,
  parseLarkEvent,
  parseLarkPrompt,
  resetLarkClientDepsForTests,
  resetLarkDepsForTests,
  resetLarkMessageDepsForTests,
  resolveVaClawCommand,
  sendLarkMessage,
  setLarkClientDepsForTests,
  setLarkDepsForTests,
  setLarkMessageDepsForTests,
  startLarkChannel,
  stopLarkChannel,
} from "./index.js";

afterEach(() => {
  resetLarkDepsForTests();
  resetLarkClientDepsForTests();
  resetLarkMessageDepsForTests();
});

test("parseLarkPrompt ignores app messages and returns text", () => {
  equal(
    parseLarkPrompt({
      messageId: "m-1",
      chatId: "c-1",
      chatType: "p2p",
      senderId: "u-1",
      senderType: "user",
      text: " hello ",
      rawContent: "{\"text\":\"hello\"}",
      timestamp: "1",
    }),
    "hello",
  );
  equal(
    parseLarkPrompt({
      messageId: "m-2",
      chatId: "c-1",
      chatType: "p2p",
      senderId: "app-1",
      senderType: "app",
      text: "loop",
      rawContent: "{\"text\":\"loop\"}",
      timestamp: "2",
    }),
    null,
  );
});

test("parseLarkEvent strips mention placeholders", () => {
  const message = parseLarkEvent({
    sender: { sender_id: { open_id: "ou_123" }, sender_type: "user" },
    message: {
      message_id: "om_123",
      chat_id: "oc_123",
      chat_type: "group",
      message_type: "text",
      content: JSON.stringify({ text: "@_user_1 summarize this" }),
      create_time: "1741890000000",
      mentions: [{ key: "@_user_1", name: "va-claw" }],
    },
  });

  deepEqual(message?.text, "summarize this");
  deepEqual(message?.senderId, "ou_123");
});

test("resolveVaClawCommand detects direct and shortcut commands", () => {
  deepEqual(resolveVaClawCommand("va-claw memory list"), ["memory", "list"]);
  deepEqual(resolveVaClawCommand("va-claw memory recall \"foo bar\""), ["memory", "recall", "foo bar"]);
  deepEqual(resolveVaClawCommand("va-claw memory recall 'foo bar'"), ["memory", "recall", "foo bar"]);
  deepEqual(resolveVaClawCommand("STATUS"), ["status"]);
  deepEqual(resolveVaClawCommand("write me a poem"), null);
});

test("createLarkMessageHandler routes known va-claw commands locally", async () => {
  const replies: string[] = [];
  let routedArgs: string[] | null = null;
  let routedCommand = "";
  let fallbackCalled = false;

  setLarkMessageDepsForTests({
    resolveVaClawCliCommand: () => "/usr/local/bin/va-claw",
    runCli: async () => {
      fallbackCalled = true;
      return { type: "success", text: "fallback" };
    },
    runCliCommand: async (args, cliCommand) => {
      routedArgs = args;
      routedCommand = cliCommand ?? "";
      return { type: "success", text: "local status" };
    },
  });

  const handler = createLarkMessageHandler("node dist/cli.js");
  await handler(
    {
      messageId: "m-1",
      chatId: "c-1",
      chatType: "group",
      senderId: "u-1",
      senderType: "user",
      text: "status",
      rawContent: "{\"text\":\"status\"}",
      timestamp: "1",
    },
    {
      async reply(_messageId, text) {
        replies.push(text);
        return true;
      },
      async sendToChat() {
        return true;
      },
      start() {},
      async stop() {},
    },
  );

  deepEqual(routedArgs, ["status"]);
  deepEqual(routedCommand, "/usr/local/bin/va-claw");
  deepEqual(fallbackCalled, false);
  deepEqual(replies, ["思考中...", "local status"]);
});

test("createLarkMessageHandler falls through to configured cliCommand for prompts", async () => {
  let receivedPrompt = "";
  let receivedCommand = "";

  setLarkMessageDepsForTests({
    runCli: async (prompt, cliCommand) => {
      receivedPrompt = prompt;
      receivedCommand = cliCommand ?? "";
      return { type: "success", text: "ok" };
    },
  });

  const handler = createLarkMessageHandler("claude -p");
  await handler(
    {
      messageId: "m-2",
      chatId: "c-1",
      chatType: "group",
      senderId: "u-1",
      senderType: "user",
      text: "summarize this thread",
      rawContent: "{\"text\":\"summarize this thread\"}",
      timestamp: "2",
    },
    {
      async reply() {
        return true;
      },
      async sendToChat() {
        return true;
      },
      start() {},
      async stop() {},
    },
  );

  deepEqual(receivedPrompt, "summarize this thread");
  deepEqual(receivedCommand, "claude -p");
});

test("createRecentMessageDeduper expires message ids after ttl", () => {
  const timers = new Map<number, () => void>();
  let nextId = 1;
  const deduper = createRecentMessageDeduper(
    60_000,
    ((callback: () => void) => {
      const id = nextId++;
      timers.set(id, callback as () => void);
      return id as unknown as ReturnType<typeof setTimeout>;
    }) as typeof setTimeout,
    ((timer) => {
      timers.delete(timer as unknown as number);
    }) as typeof clearTimeout,
  );

  deduper.add("m-1");
  deepEqual(deduper.has("m-1"), true);
  timers.get(1)?.();
  deepEqual(deduper.has("m-1"), false);
});

test("sendLarkMessage posts a text message with a one-shot client", async () => {
  let receivedChatId = "";
  let receivedText = "";

  setLarkClientDepsForTests({
    createClient: () => ({
      im: {
        message: {
          async create(args) {
            receivedChatId = args.data.receive_id;
            receivedText = JSON.parse(args.data.content).text;
            return { code: 0 };
          },
          async reply() {
            return { code: 0 };
          },
        },
      },
    }),
  });

  const ok = await sendLarkMessage({ appId: "cli_a", appSecret: "secret" }, "oc_123", "wake done");
  deepEqual(ok, true);
  deepEqual(receivedChatId, "oc_123");
  deepEqual(receivedText, "wake done");
});

test("startLarkChannel wires a stoppable listener", async () => {
  let started = false;
  let stopped = false;

  setLarkDepsForTests({
    createListener() {
      return {
        async reply() {
          return true;
        },
        async sendToChat() {
          return true;
        },
        start() {
          started = true;
        },
        async stop() {
          stopped = true;
        },
      };
    },
  });

  const channel = await startLarkChannel({ appId: "cli_a", appSecret: "secret", cliCommand: "va-claw" });
  equal(started, true);
  deepEqual(formatLarkReply({ type: "timeout" }), "超时，请重试");
  await stopLarkChannel(channel);
  equal(stopped, true);
});
