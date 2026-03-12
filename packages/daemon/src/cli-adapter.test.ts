import { deepEqual, equal } from "node:assert/strict";
import { test } from "node:test";

import { detectCliAdapter } from "./cli-adapter.js";

test("cli detection warns and skips when claude and codex are unavailable", async () => {
  const warnings: string[] = [];

  const adapter = await detectCliAdapter({
    runWhich: () => null,
    warn(message) {
      warnings.push(message);
    },
  });

  equal(adapter, null);
  equal(warnings.length, 1);
  deepEqual(warnings[0]?.includes("skipping wake"), true);
});

test("cli detection prefers VA_CLAW_CLI override", async () => {
  const adapter = await detectCliAdapter({
    env: { VA_CLAW_CLI: "claude-copilot" },
    runWhich: () => null,
  });

  deepEqual(adapter, { name: "claude-copilot", command: "claude-copilot", args: ["-p"] });
});
