import assert from "node:assert/strict";
import test from "node:test";

import { parseCliCommand } from "./cli.js";
import { startSlackChannel, stopSlackChannel } from "./index.js";
import { formatSlackReply, parseSlackPrompt } from "./message.js";

test("parseCliCommand handles quoted slack runner args", () => {
  assert.deepEqual(parseCliCommand("pnpm exec node \"./slack runner.mjs\""), {
    command: "pnpm",
    args: ["exec", "node", "./slack runner.mjs"],
  });
});

test("parseSlackPrompt handles mentions and DMs", () => {
  assert.equal(parseSlackPrompt({ channel: "C1", text: "<@U1> summarize", ts: "1", type: "app_mention" }), "summarize");
  assert.equal(parseSlackPrompt({ channel: "D1", channel_type: "im", text: "hello", ts: "2", type: "message" }), "hello");
});

test("startSlackChannel wires a socket-mode app", async () => {
  const channel = await startSlackChannel({ botToken: "xoxb", appToken: "xapp", cliCommand: "va-claw" });
  assert.equal(typeof channel.app.stop, "function");
  assert.deepEqual(formatSlackReply({ type: "timeout" }), "超时，请重试");
  await stopSlackChannel(channel);
});
