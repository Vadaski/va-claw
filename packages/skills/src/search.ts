import type { SkillDefinition } from "./types.js";

export function matchesSkillQuery(skill: SkillDefinition, query: string): boolean {
  const normalizedQuery = normalize(query);
  if (normalizedQuery === "") {
    return true;
  }

  const haystack = normalize([skill.name, skill.description, ...skill.triggers].join(" "));
  if (haystack.includes(normalizedQuery)) {
    return true;
  }

  return tokenize(query).some((token) => token.length > 1 && haystack.includes(token));
}

function tokenize(value: string): string[] {
  return normalize(value)
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}
