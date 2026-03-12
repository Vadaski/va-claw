import type { App } from "@slack/bolt";

export type StartSlackChannelConfig = {
  appToken: string;
  botToken: string;
  cliCommand?: string;
};

export type SlackChannel = {
  app: App;
  appToken: string;
  botToken: string;
  cliCommand: string;
};

export type SlackCliResult =
  | { type: "success"; text: string }
  | { type: "timeout" }
  | { type: "error"; text: string };
