import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createServiceDefinition,
  createUninstallCommand,
} from "./service-files.js";

test("createServiceDefinition for launchd includes com.va-claw.daemon label", () => {
  const def = createServiceDefinition("launchd");

  assert.equal(/<key>Label<\/key>/.test(def.content), true);
  assert.equal(/<string>com\.va-claw\.daemon<\/string>/.test(def.content), true);
});

test("createServiceDefinition for launchd includes correct ProgramArguments", () => {
  const def = createServiceDefinition("launchd");

  assert.equal(/<key>ProgramArguments<\/key>/.test(def.content), true);
  assert.equal(/<array>/.test(def.content), true);
  assert.equal(/<\/array>/.test(def.content), true);
});

test("createServiceDefinition for launchd includes WorkingDirectory", () => {
  const def = createServiceDefinition("launchd");

  assert.equal(/<key>WorkingDirectory<\/key>/.test(def.content), true);
  assert.equal(/<string>.*<\/string>/.test(def.content), true);
});

test("createServiceDefinition for launchd includes RunAtLoad and KeepAlive", () => {
  const def = createServiceDefinition("launchd");

  assert.equal(/<key>RunAtLoad<\/key>/.test(def.content), true);
  assert.equal(/<true\/>/.test(def.content), true);
  assert.equal(/<key>KeepAlive<\/key>/.test(def.content), true);
});

test("createServiceDefinition for launchd returns correct command and args", () => {
  const def = createServiceDefinition("launchd");

  assert.equal(def.command, "launchctl");
  assert.equal(def.args.length >= 2, true);
  assert.equal(def.args[0], "load");
  assert.equal(def.args[1]?.includes("LaunchAgents"), true);
});

test("createServiceDefinition for systemd includes ExecStart", () => {
  const def = createServiceDefinition("systemd");

  assert.equal(/ExecStart=/.test(def.content), true);
});

test("createServiceDefinition for systemd includes WorkingDirectory", () => {
  const def = createServiceDefinition("systemd");

  assert.equal(/WorkingDirectory=/.test(def.content), true);
});

test("createServiceDefinition for systemd includes WantedBy", () => {
  const def = createServiceDefinition("systemd");

  assert.equal(/WantedBy=default\.target/.test(def.content), true);
});

test("createServiceDefinition for systemd includes Restart configuration", () => {
  const def = createServiceDefinition("systemd");

  assert.equal(/Restart=(always|on-failure)/.test(def.content), true);
  assert.equal(/RestartSec=5/.test(def.content), true);
});

test("launchd plist includes RunAtLoad and KeepAlive", () => {
  const def = createServiceDefinition("launchd");

  assert.equal(/<key>RunAtLoad<\/key>/.test(def.content), true);
  assert.equal(/<key>KeepAlive<\/key>/.test(def.content), true);
});

test("createServiceDefinition for systemd returns correct command and args", () => {
  const def = createServiceDefinition("systemd");

  assert.equal(def.command, "systemctl");
  assert.equal(def.args.includes("--user"), true);
  assert.equal(def.args.includes("enable"), true);
  assert.equal(def.args.includes("--now"), true);
  assert.equal(def.args.includes("va-claw.service"), true);
});

test("createUninstallCommand for launchd returns correct unload args", () => {
  const cmd = createUninstallCommand("launchd");

  assert.equal(cmd.command, "launchctl");
  assert.equal(cmd.args[0], "unload");
  assert.equal(cmd.args[1]?.includes("com.va-claw.daemon.plist"), true);
});

test("createUninstallCommand for systemd returns correct disable args", () => {
  const cmd = createUninstallCommand("systemd");

  assert.equal(cmd.command, "systemctl");
  assert.equal(cmd.args.includes("--user"), true);
  assert.equal(cmd.args.includes("disable"), true);
  assert.equal(cmd.args.includes("--now"), true);
  assert.equal(cmd.args.includes("va-claw.service"), true);
});
