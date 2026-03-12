export type DiscordChannelConfig = {
  token: string;
  clientId: string;
  cliCommand?: string;
};

export type DiscordChannelStatus = "connected" | "disconnected";

export type DiscordChannel = {
  status(): DiscordChannelStatus;
  stop(): Promise<void>;
};

export type SentDiscordMessage = {
  edit(content: string): Promise<void>;
};

export type IncomingDiscordMessage = {
  authorId: string;
  authorName: string;
  content: string;
  isBot: boolean;
  isDirectMessage: boolean;
  sourceLabel: string;
  isMentioned(userId: string): boolean;
  send(content: string): Promise<SentDiscordMessage>;
};

export type DiscordRuntimeClient = {
  destroy(): Promise<void>;
  getSelfId(): string | null;
  login(token: string): Promise<void>;
  onMessage(listener: (message: IncomingDiscordMessage) => void | Promise<void>): void;
};
