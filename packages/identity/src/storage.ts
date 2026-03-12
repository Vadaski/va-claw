import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import { getDefaultIdentity, normalizeConfig } from "./defaults.js";
import { resolveConfigPath } from "./path.js";
import type { VaClawConfig } from "./types.js";

export async function loadIdentity(configPath?: string): Promise<VaClawConfig> {
  const resolvedPath = resolveConfigPath(configPath);

  try {
    const raw = await readFile(resolvedPath, "utf8");
    return normalizeConfig(JSON.parse(raw) as unknown);
  } catch (error) {
    if (isMissingFileError(error)) {
      return getDefaultIdentity();
    }
    throw error;
  }
}

export async function saveIdentity(
  config: VaClawConfig,
  configPath?: string,
): Promise<void> {
  const resolvedPath = resolveConfigPath(configPath);
  const normalized = normalizeConfig(config);

  await mkdir(dirname(resolvedPath), { recursive: true });
  await writeFile(resolvedPath, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
}

function isMissingFileError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}
