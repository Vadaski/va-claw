import { access, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { parseSkillMarkdown } from "./frontmatter.js";
import {
  resolveInstalledSkillsDir,
  resolvePathInput,
  resolveSkillLookupDirs,
  toSkillFileName,
} from "./paths.js";
import { matchesSkillQuery } from "./search.js";
import type { SkillDefinition } from "./types.js";

export async function loadSkill(nameOrPath: string): Promise<SkillDefinition> {
  const path = await resolveSkillPath(nameOrPath);
  return readSkillFile(path);
}

export async function listSkills(dir?: string): Promise<SkillDefinition[]> {
  const skills: SkillDefinition[] = [];
  const seen = new Set<string>();

  for (const lookupDir of resolveSkillLookupDirs(dir)) {
    for (const skill of await readSkillsFromDir(lookupDir)) {
      if (seen.has(skill.name)) {
        continue;
      }
      seen.add(skill.name);
      skills.push(skill);
    }
  }

  return skills;
}

export async function installSkill(content: string, name: string): Promise<string> {
  const skillPath = join(resolveInstalledSkillsDir(), toSkillFileName(name));
  parseSkillMarkdown(content, skillPath);
  await mkdir(resolveInstalledSkillsDir(), { recursive: true });
  await writeFile(skillPath, content, "utf8");
  return skillPath;
}

export async function removeSkill(name: string): Promise<void> {
  await rm(join(resolveInstalledSkillsDir(), toSkillFileName(name)), { force: true });
}

export async function searchSkills(query: string): Promise<SkillDefinition[]> {
  return (await listSkills()).filter((skill) => matchesSkillQuery(skill, query));
}

export function injectSkillIntoPrompt(skill: SkillDefinition, basePrompt: string): string {
  const prompt = basePrompt.trimEnd();
  const skillBlock = [`[Skill: ${skill.name}@${skill.version}]`, skill.content.trim()].join("\n");
  return prompt === "" ? skillBlock : `${prompt}\n\n${skillBlock}`;
}

async function resolveSkillPath(nameOrPath: string): Promise<string> {
  const candidates = looksLikePath(nameOrPath)
    ? [resolvePathInput(nameOrPath)]
    : resolveSkillLookupDirs().map((dir) => join(dir, toSkillFileName(nameOrPath)));

  for (const candidate of candidates) {
    if (await exists(candidate)) {
      return candidate;
    }
  }
  throw new Error(`Skill not found: ${nameOrPath}`);
}

async function readSkillsFromDir(dir: string): Promise<SkillDefinition[]> {
  if (!(await exists(dir))) {
    return [];
  }
  const names = (await readdir(dir)).filter((entry) => entry.toLowerCase().endsWith(".md")).sort();
  return Promise.all(names.map((name) => readSkillFile(join(dir, name))));
}

async function readSkillFile(path: string): Promise<SkillDefinition> {
  return parseSkillMarkdown(await readFile(path, "utf8"), path);
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function looksLikePath(value: string): boolean {
  return /[\\/]/.test(value) || value.startsWith(".") || value.startsWith("~") || value.endsWith(".md");
}
