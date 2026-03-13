export type StartLarkChannelConfig = {
  appId: string;
  appSecret: string;
  cliCommand?: string;
};

export type LarkIncomingMessage = {
  messageId: string;
  chatId: string;
  chatType: "p2p" | "group";
  senderId: string;
  senderType?: string;
  text: string;
  rawContent: string;
  timestamp: string;
};

export type LarkMessageHandler = (message: LarkIncomingMessage) => Promise<void> | void;

export type LarkListener = {
  reply(messageId: string, text: string): Promise<boolean>;
  sendToChat(chatId: string, text: string): Promise<boolean>;
  start(): void;
  stop(): Promise<void> | void;
};

export type LarkChannel = {
  appId: string;
  appSecret: string;
  cliCommand: string;
  listener: LarkListener;
};

export type LarkCliResult =
  | { type: "success"; text: string }
  | { type: "timeout" }
  | { type: "error"; text: string };
