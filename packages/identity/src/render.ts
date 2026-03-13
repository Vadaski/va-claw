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
    "",
    "Operational protocol:",
    "- Check long-running claw status with `va-claw protocol`.",
    "- For readable text use `va-claw protocol --text`.",
    "- Manage claws with `va-claw claw list | add | set | remove | heartbeat`.",
    "- If asked \"va/claw 在干什么\" / \"my claws are doing what\" / similar fleet questions, call `va-claw protocol --text` and answer from it.",
    "- If the user asks a non-technical phrasing like \"现在都在干嘛\", interpret it as a fleet status request and run `va-claw protocol --text`.",
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
    "",
    "Operational protocol:",
    "Use `va-claw protocol` in terminal to get long-running claw state.",
    "Use `va-claw protocol --text` when a user asks in plain language, including Chinese phrases like \"va/claw 在干什么\".",
    "Use `va-claw claw list` and `va-claw claw set <name> --status <status>` to manage claws.",
    "If the user asks what claws are doing, run `va-claw protocol --text` and summarize only from that output.",
  ].join("\n");
}
