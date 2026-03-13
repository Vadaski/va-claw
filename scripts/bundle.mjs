#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from "node:fs";
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
  `--external:@huggingface/transformers`,
  `--external:onnxruntime-node`,
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
    external: ["node:*", "@huggingface/transformers", "onnxruntime-node"],
    entryPoints: [entryPoint],
    outfile: outFile,
    logLevel: "error",
  });
// Fix dynamic import path: the compiled deps.js uses "../../channels/dist/index.js"
// relative to packages/cli/dist/, which resolves correctly in dev but breaks when
// the bundle is placed at dist/va-claw-bundle.mjs. Patch to the correct relative path.
const bundleContent = readFileSync(outFile, "utf8");
const patched = bundleContent.replace(
  /["']\.\.\/\.\.\/channels\/dist\/index\.js["']/g,
  '"../packages/channels/dist/index.js"',
);
if (patched !== bundleContent) {
  writeFileSync(outFile, patched, "utf8");
}
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
