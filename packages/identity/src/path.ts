import { homedir } from "node:os";
import { resolve } from "node:path";

export const DEFAULT_CONFIG_PATH = resolve(homedir(), ".va-claw", "config.json");

export function resolveConfigPath(configPath?: string): string {
  if (!configPath || configPath.trim() === "") {
    return DEFAULT_CONFIG_PATH;
  }
  if (configPath === "~") {
    return homedir();
  }
  if (configPath.startsWith("~/")) {
    return resolve(homedir(), configPath.slice(2));
  }
  return resolve(configPath);
}
