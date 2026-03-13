import { ok, strictEqual } from "node:assert/strict";
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

  ok(claws.length === 2);
  strictEqual(claws[0]?.name, second.name);
  strictEqual(first.name, "research-claw");
  strictEqual(first.status, "running");

  const raw = await readFile(path, "utf8");
  ok(raw.includes("\"version\":1"));

  await rm(dir, { recursive: true, force: true });
});

test("update and remove claws", async () => {
  const dir = await mkdtemp(join(tmpdir(), "va-claw-claw-store-"));
  const path = join(dir, "claws.json");

  await registerClaw(path, { name: "review-claw", goal: "open PRs", status: "idle" });
  const updated = await updateClaw(path, "review-claw", { status: "working", seen: true, note: "active now" });
  ok(updated?.status === "working");
  ok(updated?.note === "active now");
  ok(typeof updated?.lastSeenAt === "string" && updated.lastSeenAt.length > 0);

  const missing = await getClaw(path, "unknown");
  ok(missing === undefined);
  const removed = await removeClaw(path, "review-claw");
  ok(removed);

  const after = await listClaws(path);
  ok(after.length === 0);

  await rm(dir, { recursive: true, force: true });
});
