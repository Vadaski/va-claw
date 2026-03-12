export type DiscordConfig = {
  token: string;
  clientId: string;
  cliCommand: string;
  autoStart: boolean;
};

export type TelegramConfig = {
  token: string;
  cliCommand: string;
};

export type SlackConfig = {
  botToken: string;
  appToken: string;
  cliCommand: string;
};

export type ChannelConfig = {
  discord: DiscordConfig;
  telegram: TelegramConfig;
  slack: SlackConfig;
};

export type VaClawConfig = {
  name: string;
  persona: string;
  systemPrompt: string;
  wakePrompt: string;
  loopInterval: string;
  channels: ChannelConfig;
};
