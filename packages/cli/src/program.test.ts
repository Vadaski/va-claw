import { ok } from "node:assert/strict";
import test from "node:test";

import { createCliProgram } from "./program.js";
import { createTestDeps } from "./test-helpers.js";

test("registers top-level and memory commands", () => {
  const program = createCliProgram(createTestDeps());
  const help = program.helpInformation();

  ok(/\binstall\b/.test(help));
  ok(/\bstart\b/.test(help));
  ok(/\bstatus\b/.test(help));
  ok(/\bprotocol\b/.test(help));
  ok(/\bmemory search\b/.test(help));
  ok(/\bmemory memorize\b/.test(help));
  ok(/\bmemory get\b/.test(help));
  ok(/\bmemory update\b/.test(help));
  ok(/\bmemory forget\b/.test(help));
  ok(/\bmemory recall\b/.test(help));
  ok(/\bmemory consolidate\b/.test(help));
  ok(/\bmemory reflect\b/.test(help));
  ok(/\bmemory clear\b/.test(help));
  ok(/\bsession append\b/.test(help));
  ok(/\bsession recall\b/.test(help));
  ok(/\bskill list\b/.test(help));
  ok(/\bskill add\b/.test(help));
  ok(/\bclaw status\b/.test(help));
  ok(/\bclaw list\b/.test(help));
  ok(/\bclaw add\b/.test(help));
  ok(/\bclaw set\b/.test(help));
  ok(/\bclaw heartbeat\b/.test(help));
  ok(/\bclaw remove\b/.test(help));
  ok(/\bchannel discord setup\b/.test(help));
  ok(/\bchannel discord start\b/.test(help));
  ok(/\bchannel telegram setup\b/.test(help));
  ok(/\bchannel slack status\b/.test(help));
});
