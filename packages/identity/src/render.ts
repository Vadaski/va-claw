import { normalizeConfig } from "./defaults.js";
import type { VaClawConfig } from "./types.js";

function textBlock(label: string, value: string): string {
  return [label, "~~~text", value || "(empty)", "~~~"].join("\n");
}

export function toClaudeMdSnippet(config: VaClawConfig): string {
  const normalized = normalizeConfig(config);

  return [
    "<!-- va-claw:identity:start -->",
    "## VaClaw Identity",
    `- Name: ${normalized.name}`,
    "",
    "Persona:",
    normalized.persona,
    "",
    textBlock("System Prompt:", normalized.systemPrompt),
    "<!-- va-claw:identity:end -->",
  ].join("\n");
}

export function toCodexSystemPrompt(config: VaClawConfig): string {
  const normalized = normalizeConfig(config);

  return [
    `Identity name: ${normalized.name}`,
    `Persona: ${normalized.persona}`,
    "",
    "System prompt:",
    normalized.systemPrompt,
    "",
    "Wake prompt:",
    normalized.wakePrompt,
    "",
    `Wake timeout (ms): ${normalized.wakeTimeoutMs ?? 300000}`,
    "",
    `Loop interval: ${normalized.loopInterval}`,
  ].join("\n");
}
