import { deepEqual, equal } from "node:assert/strict";
import test from "node:test";

import { Bot } from "grammy";

import { parseCliCommand } from "./cli.js";
import { startTelegramChannel, stopTelegramChannel } from "./index.js";
import { formatTelegramReply, parseTelegramPrompt } from "./message.js";

test("parseCliCommand splits quoted args", () => {
  deepEqual(parseCliCommand("node --loader tsx \"./bin/run.mjs\""), {
    command: "node",
    args: ["--loader", "tsx", "./bin/run.mjs"],
  });
});

test("parseTelegramPrompt handles DM and command messages", () => {
  const dm = { chat: { id: 1, type: "private" }, message: { chat: { id: 1, type: "private" }, message_id: 1, text: "hello" } };
  const group = { chat: { id: 2, type: "group" }, message: { chat: { id: 2, type: "group" }, message_id: 2, text: "/va-claw summarize this" } };

  equal(parseTelegramPrompt(dm as never), "hello");
  equal(parseTelegramPrompt(group as never), "summarize this");
});

test("startTelegramChannel wires a stoppable bot", async () => {
  const channel = await startTelegramChannel({ token: "test-token", cliCommand: "va-claw" });
  equal(channel.bot instanceof Bot, true);
  deepEqual(formatTelegramReply({ type: "timeout" }), "超时，请重试");
  await stopTelegramChannel(channel);
});
