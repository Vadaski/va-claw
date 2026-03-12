import { homedir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";

type SkillPathOverrides = {
  homeDir?: string;
  projectDir?: string;
};

let overrides: SkillPathOverrides = {};

export function resolveInstalledSkillsDir(): string {
  const baseDir = overrides.homeDir ? resolve(overrides.homeDir) : resolve(homedir(), ".va-claw");
  return join(baseDir, "skills");
}

export function resolveProjectSkillsDir(): string {
  const baseDir = overrides.projectDir ? resolve(overrides.projectDir) : process.cwd();
  return join(baseDir, "skills");
}

export function resolveSkillLookupDirs(dir?: string): string[] {
  if (dir) {
    return [resolvePathInput(dir)];
  }
  return [resolveProjectSkillsDir(), resolveInstalledSkillsDir()];
}

export function resolvePathInput(value: string): string {
  if (value === "~") {
    return homedir();
  }
  if (value.startsWith("~/")) {
    return resolve(homedir(), value.slice(2));
  }
  return isAbsolute(value) ? value : resolve(value);
}

export function toSkillFileName(name: string): string {
  const normalized = name.trim().replace(/\.md$/i, "");
  if (normalized === "") {
    throw new Error("Skill name cannot be empty.");
  }
  if (!/^[a-z0-9][a-z0-9-_]*$/i.test(normalized)) {
    throw new Error(`Invalid skill name: ${name}`);
  }
  return `${normalized}.md`;
}

export function setSkillPathOverridesForTests(next: SkillPathOverrides): void {
  overrides = { ...next };
}

export function resetSkillPathOverridesForTests(): void {
  overrides = {};
}
