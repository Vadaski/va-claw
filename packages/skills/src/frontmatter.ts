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
  const values = new Map<string, string | string[]>();
  const lines = block.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index];
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

    if (value !== "") {
      values.set(key, value);
      continue;
    }

    const baseIndent = rawLine.length - rawLine.trimStart().length;
    const items: string[] = [];

    while (index + 1 < lines.length) {
      const nextRawLine = lines[index + 1];
      const nextLine = nextRawLine.trim();

      if (nextLine === "") {
        index += 1;
        continue;
      }

      const nextIndent = nextRawLine.length - nextRawLine.trimStart().length;
      if (nextIndent <= baseIndent) {
        break;
      }
      if (!nextLine.startsWith("-")) {
        throw new Error(`Invalid frontmatter line: ${nextRawLine}`);
      }

      items.push(nextLine.slice(1).trim());
      index += 1;
    }

    values.set(key, items);
  }

  const name = parseScalar(values.get("name"), "name");
  const description = parseScalar(values.get("description"), "description");
  const version = parseScalar(values.get("version"), "version");
  const triggers = parseArray(values.get("triggers"), "triggers");
  return { name, description, version, triggers };
}

function parseScalar(rawValue: string | string[] | undefined, field: string): string {
  if (!rawValue) {
    throw new Error(`Skill frontmatter is missing "${field}".`);
  }
  if (Array.isArray(rawValue)) {
    throw new Error(`Skill frontmatter field "${field}" must be a scalar.`);
  }
  if (
    (rawValue.startsWith("'") && rawValue.endsWith("'")) ||
    (rawValue.startsWith("\"") && rawValue.endsWith("\""))
  ) {
    return rawValue.slice(1, -1);
  }
  return rawValue;
}

function parseArray(rawValue: string | string[] | undefined, field: string): string[] {
  if (!rawValue) {
    throw new Error(`Skill frontmatter is missing "${field}".`);
  }
  if (Array.isArray(rawValue)) {
    return rawValue.map((item) => parseScalar(item.trim(), field));
  }
  if (!rawValue.startsWith("[") || !rawValue.endsWith("]")) {
    throw new Error(`Skill frontmatter field "${field}" must be an array.`);
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
