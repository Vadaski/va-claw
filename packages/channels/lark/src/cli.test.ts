import assert from "node:assert/strict";
import { test } from "node:test";

import { parseCliCommand, runLarkCli } from "./cli.js";

test("parseCliCommand handles quoted lark runner args", () => {
  const parsed = parseCliCommand('node --input-type=module "./runner.mjs"');

  assert.equal(parsed.command, "node");
  assert.equal(parsed.args.join(" "), "--input-type=module ./runner.mjs");
});

test("runLarkCli returns stdout on success", async () => {
  const command = 'node -e "console.log(\'hello lark\')"';
  const result = await runLarkCli("ping", command);

  assert.equal(result.type, "success");
  assert.equal((result as { type: "success"; text: string }).text, "hello lark");
});
