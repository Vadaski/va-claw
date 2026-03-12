import { cancel, intro, isCancel, note, outro, text } from "@clack/prompts";

import { normalizeConfig } from "./defaults.js";
import { DEFAULT_CONFIG_PATH } from "./path.js";
import { loadIdentity, saveIdentity } from "./storage.js";
import type { VaClawConfig } from "./types.js";

export async function runInstallWizard(): Promise<VaClawConfig> {
  const current = normalizeConfig(await loadIdentity());

  intro("va-claw identity setup");
  note(DEFAULT_CONFIG_PATH, "Config path");

  const config = normalizeConfig({
    name: await ask("Name", current.name, true),
    persona: await ask("Persona", current.persona, true),
    systemPrompt: await ask("System prompt", current.systemPrompt, false),
    wakePrompt: await ask("Wake prompt", current.wakePrompt, false),
    loopInterval: await ask("Loop interval (cron)", current.loopInterval, true),
  });

  await saveIdentity(config);
  outro(`Saved identity to ${DEFAULT_CONFIG_PATH}`);
  return config;
}

async function ask(
  message: string,
  initialValue: string,
  required: boolean,
): Promise<string> {
  const value = await text({
    message,
    initialValue,
    validate(input) {
      if (!required || input.trim() !== "") {
        return undefined;
      }
      return `${message} is required.`;
    },
  });

  if (isCancel(value)) {
    cancel("Identity setup cancelled.");
    throw new Error("Identity setup cancelled.");
  }

  return value;
}
