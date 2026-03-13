import { deepEqual, equal } from "node:assert/strict";
import test from "node:test";

import {
  formatLarkReply,
  parseLarkEvent,
  parseLarkPrompt,
  resetLarkDepsForTests,
  setLarkDepsForTests,
  startLarkChannel,
  stopLarkChannel,
} from "./index.js";

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
  resetLarkDepsForTests();
});
