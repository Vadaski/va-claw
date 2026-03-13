import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  getClaw,
  listClaws,
  registerClaw,
  removeClaw,
  updateClaw,
} from "./claw-store.js";

test("register and list claws", async () => {
  const dir = await mkdtemp(join(tmpdir(), "va-claw-claw-store-"));
  const path = join(dir, "claws.json");

  const first = await registerClaw(path, { name: "research-claw", goal: "search regressions", status: "running" });
  const second = await registerClaw(path, { name: "ops-claw", goal: "watch releases", status: "idle" });
  const claws = await listClaws(path);

  assert.ok(claws.length === 2);
  assert.strictEqual(claws[0]?.name, second.name);
  assert.strictEqual(first.name, "research-claw");
  assert.strictEqual(first.status, "running");

  const raw = await readFile(path, "utf8");
  assert.ok(raw.includes("\"version\": 1"));

  await rm(dir, { recursive: true, force: true });
});

test("update and remove claws", async () => {
  const dir = await mkdtemp(join(tmpdir(), "va-claw-claw-store-"));
  const path = join(dir, "claws.json");

  await registerClaw(path, { name: "review-claw", goal: "open PRs", status: "idle" });
  const updated = await updateClaw(path, "review-claw", { status: "working", seen: true, note: "active now" });
  assert.ok(updated?.status === "working");
  assert.ok(updated?.note === "active now");
  assert.ok(typeof updated?.lastSeenAt === "string" && updated.lastSeenAt.length > 0);

  const missing = await getClaw(path, "unknown");
  assert.ok(missing === undefined);
  const removed = await removeClaw(path, "review-claw");
  assert.ok(removed);

  const after = await listClaws(path);
  assert.ok(after.length === 0);

  await rm(dir, { recursive: true, force: true });
});
