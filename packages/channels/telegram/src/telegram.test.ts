import assert from "node:assert/strict";
import test from "node:test";

import { parseCliCommand } from "./cli.js";
import { startTelegramChannel, stopTelegramChannel } from "./index.js";
import { formatTelegramReply, parseTelegramPrompt } from "./message.js";

test("parseCliCommand splits quoted args", () => {
  assert.deepEqual(parseCliCommand("node --loader tsx \"./bin/run.mjs\""), {
    command: "node",
    args: ["--loader", "tsx", "./bin/run.mjs"],
  });
});

test("parseTelegramPrompt handles DM and command messages", () => {
  const dm = { chat: { id: 1, type: "private" }, message: { chat: { id: 1, type: "private" }, message_id: 1, text: "hello" } };
  const group = { chat: { id: 2, type: "group" }, message: { chat: { id: 2, type: "group" }, message_id: 2, text: "/va-claw summarize this" } };

  assert.equal(parseTelegramPrompt(dm as never), "hello");
  assert.equal(parseTelegramPrompt(group as never), "summarize this");
});

test("startTelegramChannel wires a stoppable bot", async () => {
  const channel = await startTelegramChannel({ token: "test-token", cliCommand: "va-claw" });
  assert.equal(typeof channel.bot.stop, "function");
  assert.deepEqual(formatTelegramReply({ type: "timeout" }), "超时，请重试");
  await stopTelegramChannel(channel);
});
