import type { SkillDefinition } from "./types.js";

type FrontmatterShape = Omit<SkillDefinition, "content" | "path">;

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

export function parseSkillMarkdown(source: string, path: string): SkillDefinition {
  const match = FRONTMATTER_RE.exec(source);
  if (!match) {
    throw new Error(`Skill "${path}" is missing YAML frontmatter.`);
  }

  const frontmatter = parseFrontmatterBlock(match[1]);
  return {
    ...frontmatter,
    content: match[2].trim(),
    path,
  };
}

function parseFrontmatterBlock(block: string): FrontmatterShape {
  const values = new Map<string, string>();
  for (const rawLine of block.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === "") {
      continue;
    }
    const separator = line.indexOf(":");
    if (separator === -1) {
      throw new Error(`Invalid frontmatter line: ${rawLine}`);
    }
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    values.set(key, value);
  }

  const name = parseScalar(values.get("name"), "name");
  const description = parseScalar(values.get("description"), "description");
  const version = parseScalar(values.get("version"), "version");
  const triggers = parseArray(values.get("triggers"), "triggers");
  return { name, description, version, triggers };
}

function parseScalar(rawValue: string | undefined, field: string): string {
  if (!rawValue) {
    throw new Error(`Skill frontmatter is missing "${field}".`);
  }
  if (
    (rawValue.startsWith("'") && rawValue.endsWith("'")) ||
    (rawValue.startsWith("\"") && rawValue.endsWith("\""))
  ) {
    return rawValue.slice(1, -1);
  }
  return rawValue;
}

function parseArray(rawValue: string | undefined, field: string): string[] {
  if (!rawValue) {
    throw new Error(`Skill frontmatter is missing "${field}".`);
  }
  if (!rawValue.startsWith("[") || !rawValue.endsWith("]")) {
    throw new Error(`Skill frontmatter field "${field}" must be an inline array.`);
  }

  const body = rawValue.slice(1, -1).trim();
  if (body === "") {
    return [];
  }
  return splitInlineArray(body).map((item) => parseScalar(item.trim(), field));
}

function splitInlineArray(value: string): string[] {
  const items: string[] = [];
  let current = "";
  let quote: "'" | "\"" | null = null;

  for (const character of value) {
    if ((character === "'" || character === "\"") && quote === null) {
      quote = character;
      current += character;
      continue;
    }
    if (quote !== null && character === quote) {
      quote = null;
      current += character;
      continue;
    }
    if (character === "," && quote === null) {
      items.push(current);
      current = "";
      continue;
    }
    current += character;
  }

  if (current !== "") {
    items.push(current);
  }
  return items;
}
