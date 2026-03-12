import assert from "node:assert/strict";
import { test } from "node:test";

import { parseCliCommand, runSlackCli } from "./cli.js";

test("parseCliCommand handles quoted slack runner args", () => {
  const parsed = parseCliCommand('node --input-type=module "./runner.mjs"');

  assert.equal(parsed.command, "node");
  assert.equal(parsed.args.join(" "), "--input-type=module ./runner.mjs");
});

test("parseCliCommand returns default command", () => {
  const parsed = parseCliCommand(undefined);
  assert.equal(parsed.command, "va-claw");
  assert.equal(parsed.args.length, 0);
});

test("runSlackCli returns stdout on success", async () => {
  const command = 'node -e "console.log(\'hello slack\')"';
  const result = await runSlackCli("ping", command);

  assert.equal(result.type, "success");
  assert.equal((result as { type: "success"; text: string }).text, "hello slack");
});

test("runSlackCli returns error result for non-zero exit code", async () => {
  const command = 'node -e "console.error(\'fail here\'); process.exit(1);"';
  const result = await runSlackCli("ping", command);

  assert.equal(result.type, "error");
  assert.equal(
    /fail here|CLI exited with code 1/.test((result as { type: "error"; text: string }).text),
    true,
  );
});

test("runSlackCli unsets CLAUDECODE and CLAUDE_CODE_SESSION", async () => {
  const command =
    "node -e \"console.log(String(process.env.CLAUDECODE === undefined && process.env.CLAUDE_CODE_SESSION === undefined));\"";
  const result = await runSlackCli("ping", command);

  assert.equal(result.type, "success");
  assert.equal((result as { type: "success"; text: string }).text, "true");
});

test("runSlackCli supports custom cliCommand", async () => {
  const result = await runSlackCli("custom output", 'node -e "console.log(process.argv[1])"');

  assert.equal(result.type, "success");
  assert.equal((result as { type: "success"; text: string }).text, "custom output");
});

test("runSlackCli returns large output and keeps handler stable", async () => {
  const command =
    'node -e "console.log(\'x\'.repeat(3100));"';
  const result = await runSlackCli("ping", command);

  assert.equal(result.type, "success");
  assert.equal(
    (result as { type: "success"; text: string }).text.length > 3000,
    true,
  );
});
