import type { MemoryEntry } from "@va-claw/memory";
import type { SkillDefinition } from "../../skills/dist/index.js";
import type { ClawDefinition } from "./claw-store.js";

export function formatMemoryEntries(entries: MemoryEntry[]): string {
  if (entries.length === 0) {
    return "No memory entries found.";
  }
  return entries
    .map((entry, index) => {
      const lines = [
        `${index + 1}. ${entry.text}`,
        `   id: ${entry.id}`,
        `   key: ${entry.key}`,
        `   created: ${entry.createdAt}`,
        `   updated: ${entry.updatedAt}`,
        `   tags: ${entry.tags.join(", ") || "(none)"}`,
      ];
      if (entry.metadata) {
        lines.push(`   metadata: ${JSON.stringify(entry.metadata)}`);
      }
      if (entry.details) {
        lines.push(`   details: ${entry.details}`);
      }
      if (entry.triggerConditions.length > 0) {
        lines.push(`   trigger_conditions: ${entry.triggerConditions.join(", ")}`);
      }
      lines.push(`   importance: ${entry.importance}`, `   strength: ${entry.strength}`, `   access_count: ${entry.accessCount}`);
      return lines.join("\n");
    })
    .join("\n\n");
}

export function formatSkills(skills: SkillDefinition[]): string {
  if (skills.length === 0) {
    return "No skills found.";
  }
  return skills
    .map((skill) =>
      [
        `${skill.name} (${skill.version})`,
        `  description: ${skill.description}`,
        `  triggers: ${skill.triggers.join(", ") || "(none)"}`,
        `  path: ${skill.path}`,
      ].join("\n"),
    )
    .join("\n\n");
}

export function formatClawDefinitions(claws: ClawDefinition[]): string {
  if (claws.length === 0) {
    return "No claws registered.";
  }
  return claws
    .map((claw) => {
      const lines = [
        `${claw.name} [${claw.status}]`,
        `  goal: ${claw.goal || "(no goal)"}`,
        `  cli: ${claw.cliCommand || "va-claw"}`,
        `  tags: ${claw.tags.join(", ") || "(none)"}`,
        `  note: ${claw.note || "(none)"}`,
        `  updatedAt: ${claw.updatedAt}`,
      ];
      if (claw.lastSeenAt) {
        lines.push(`  lastSeenAt: ${claw.lastSeenAt}`);
      }
      return lines.join("\n");
    })
    .join("\n\n");
}

export function writeLine(
  stream: { write(chunk: string): boolean },
  message: string,
): void {
  stream.write(`${message}\n`);
}
