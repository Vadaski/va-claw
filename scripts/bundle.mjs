#!/usr/bin/env node
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const entryPoint = "packages/cli/dist/bin/va-claw.mjs";
const outFile = "dist/va-claw-bundle.mjs";
const args = [
  `--platform=node`,
  `--format=esm`,
  `--bundle`,
  `--external:node:*`,
  `--log-level=error`,
  `--outfile=${outFile}`,
  entryPoint,
];

function runEsbuildCommand(command, commandArgs) {
  const result = spawnSync(command, commandArgs, {
    stdio: "inherit",
    shell: command === "npx" || command === "pnpm",
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

try {
  const { build } = await import("esbuild");
  await build({
    platform: "node",
    format: "esm",
    bundle: true,
    external: ["node:*"],
    entryPoints: [entryPoint],
    outfile: outFile,
    logLevel: "error",
  });
} catch {
  const esbuildBinary = resolve(
    fileURLToPath(import.meta.url),
    "../node_modules/.bin/esbuild",
  );

  if (existsSync(esbuildBinary)) {
    runEsbuildCommand(esbuildBinary, args);
  } else {
    runEsbuildCommand("npx", ["esbuild", ...args]);
  }
}
