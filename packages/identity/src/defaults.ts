import type { VaClawConfig } from "./types.js";

export const DEFAULT_LOOP_INTERVAL = "0 * * * *";
export const DEFAULT_WAKE_TIMEOUT_MS = 300_000;

const DEFAULT_CONFIG: VaClawConfig = {
  name: "va-claw",
  persona: "A pragmatic CLI identity that values clarity, rigor, and continuity.",
  systemPrompt:
    "You are va-claw. Be direct, honest about uncertainty, and keep actions aligned with the saved identity.",
  wakePrompt:
    "Wake up, load the saved identity, and continue from the most recent remembered state.",
  wakeTimeoutMs: DEFAULT_WAKE_TIMEOUT_MS,
  loopInterval: DEFAULT_LOOP_INTERVAL,
  channels: {
    discord: {
      token: "",
      clientId: "",
      cliCommand: "",
      autoStart: false,
    },
    telegram: {
      token: "",
      cliCommand: "",
    },
    slack: {
      botToken: "",
      appToken: "",
      cliCommand: "",
    },
  },
};

function pickString(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function pickBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function pickNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback;
}

export function getDefaultIdentity(): VaClawConfig {
  return { ...DEFAULT_CONFIG };
}

export function normalizeConfig(input: unknown): VaClawConfig {
  const base = getDefaultIdentity();
  const data = input && typeof input === "object" ? input : {};
  const channels = readObject(Reflect.get(data, "channels"));
  const discord = readObject(Reflect.get(channels, "discord"));
  const telegram = readObject(Reflect.get(channels, "telegram"));
  const slack = readObject(Reflect.get(channels, "slack"));

  return {
    name: pickString(Reflect.get(data, "name"), base.name),
    persona: pickString(Reflect.get(data, "persona"), base.persona),
    systemPrompt: pickString(Reflect.get(data, "systemPrompt"), base.systemPrompt),
    wakePrompt: pickString(Reflect.get(data, "wakePrompt"), base.wakePrompt),
    wakeTimeoutMs: pickNumber(Reflect.get(data, "wakeTimeoutMs"), base.wakeTimeoutMs ?? DEFAULT_WAKE_TIMEOUT_MS),
    loopInterval: pickString(Reflect.get(data, "loopInterval"), base.loopInterval),
    channels: {
      discord: {
        token: pickString(Reflect.get(discord, "token"), base.channels.discord.token),
        clientId: pickString(Reflect.get(discord, "clientId"), base.channels.discord.clientId),
        cliCommand: pickString(Reflect.get(discord, "cliCommand"), base.channels.discord.cliCommand),
        autoStart: pickBoolean(Reflect.get(discord, "autoStart"), base.channels.discord.autoStart),
      },
      telegram: {
        token: pickString(Reflect.get(telegram, "token"), base.channels.telegram.token),
        cliCommand: pickString(
          Reflect.get(telegram, "cliCommand"),
          base.channels.telegram.cliCommand,
        ),
      },
      slack: {
        botToken: pickString(Reflect.get(slack, "botToken"), base.channels.slack.botToken),
        appToken: pickString(Reflect.get(slack, "appToken"), base.channels.slack.appToken),
        cliCommand: pickString(
          Reflect.get(slack, "cliCommand"),
          base.channels.slack.cliCommand,
        ),
      },
    },
  };
}

function readObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}
