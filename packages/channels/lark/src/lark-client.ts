import * as lark from "@larksuiteoapi/node-sdk";

import type { LarkIncomingMessage, LarkListener, LarkMessageHandler, StartLarkChannelConfig } from "./types.js";

type FeishuApiResponse = {
  code?: number;
};

type FeishuEventData = {
  sender?: {
    sender_id?: { open_id?: string; user_id?: string };
    sender_type?: string;
  };
  message?: {
    message_id: string;
    chat_id: string;
    chat_type: string;
    message_type: string;
    content: string;
    create_time: string;
    mentions?: Array<{ key: string; name: string }>;
  };
};

type WsClientWithLifecycle = {
  start(options: { eventDispatcher: unknown }): void;
  stop?: () => Promise<void> | void;
};

type MessageClient = {
  im: {
    message: {
      create(args: {
        params: { receive_id_type: string };
        data: { receive_id: string; content: string; msg_type: string };
      }): Promise<FeishuApiResponse>;
      reply(args: {
        path: { message_id: string };
        data: { content: string; msg_type: string };
      }): Promise<FeishuApiResponse>;
    };
  };
};

type LarkClientDeps = {
  createClient: (config: StartLarkChannelConfig) => MessageClient;
  createDispatcher: () => { register(mapping: Record<string, (data: unknown) => Promise<void>>): void };
  createWsClient: (config: StartLarkChannelConfig) => WsClientWithLifecycle;
  clearTimeoutFn: typeof clearTimeout;
  setTimeoutFn: typeof setTimeout;
};

let larkClientDeps: LarkClientDeps = {
  createClient: createSdkClient,
  createDispatcher: () => new lark.EventDispatcher({}),
  createWsClient: (config) =>
    new lark.WSClient({
      appId: config.appId,
      appSecret: config.appSecret,
      autoReconnect: true,
      loggerLevel: lark.LoggerLevel.warn,
    }) as WsClientWithLifecycle,
  clearTimeoutFn: clearTimeout,
  setTimeoutFn: setTimeout,
};

const RECENT_MESSAGE_TTL_MS = 60_000;

export function createLarkListener(
  config: StartLarkChannelConfig,
  handler: LarkMessageHandler,
): LarkListener {
  const client = larkClientDeps.createClient(config);
  const wsClient = larkClientDeps.createWsClient(config);
  const deduper = createRecentMessageDeduper(
    RECENT_MESSAGE_TTL_MS,
    larkClientDeps.setTimeoutFn,
    larkClientDeps.clearTimeoutFn,
  );

  return {
    async reply(messageId, text) {
      try {
        const res = await client.im.message.reply({
          path: { message_id: messageId },
          data: {
            content: JSON.stringify({ text }),
            msg_type: "text",
          },
        });
        return (res as FeishuApiResponse).code === 0;
      } catch {
        return false;
      }
    },
    async sendToChat(chatId, text) {
      try {
        const res = await client.im.message.create({
          params: { receive_id_type: "chat_id" },
          data: {
            receive_id: chatId,
            content: JSON.stringify({ text }),
            msg_type: "text",
          },
        });
        return (res as FeishuApiResponse).code === 0;
      } catch {
        return false;
      }
    },
    start() {
      const dispatcher = larkClientDeps.createDispatcher();
      dispatcher.register({
        "im.message.receive_v1": async (data: unknown) => {
          const message = parseLarkEvent(data as FeishuEventData);
          if (!message) {
            return;
          }
          if (deduper.has(message.messageId)) {
            return;
          }
          deduper.add(message.messageId);
          await handler(message);
        },
      });
      wsClient.start({ eventDispatcher: dispatcher });
    },
    async stop() {
      await wsClient.stop?.();
    },
  };
}

export async function sendLarkMessage(
  config: StartLarkChannelConfig,
  chatId: string,
  text: string,
): Promise<boolean> {
  const client = larkClientDeps.createClient(config);
  try {
    const res = await client.im.message.create({
      params: { receive_id_type: "chat_id" },
      data: {
        receive_id: chatId,
        content: JSON.stringify({ text }),
        msg_type: "text",
      },
    });
    return (res as FeishuApiResponse).code === 0;
  } catch {
    return false;
  }
}

export function createRecentMessageDeduper(
  ttlMs: number,
  setTimeoutFn: typeof setTimeout = setTimeout,
  clearTimeoutFn: typeof clearTimeout = clearTimeout,
): { add(messageId: string): void; has(messageId: string): boolean } {
  const seen = new Set<string>();
  const timers = new Map<string, ReturnType<typeof setTimeout>>();

  return {
    add(messageId) {
      const existingTimer = timers.get(messageId);
      if (existingTimer) {
        clearTimeoutFn(existingTimer);
      }
      seen.add(messageId);
      timers.set(
        messageId,
        setTimeoutFn(() => {
          seen.delete(messageId);
          timers.delete(messageId);
        }, ttlMs),
      );
    },
    has(messageId) {
      return seen.has(messageId);
    },
  };
}

export function setLarkClientDepsForTests(deps: Partial<LarkClientDeps>): void {
  larkClientDeps = { ...larkClientDeps, ...deps };
}

export function resetLarkClientDepsForTests(): void {
  larkClientDeps = {
    createClient: createSdkClient,
    createDispatcher: () => new lark.EventDispatcher({}),
    createWsClient: (config) =>
      new lark.WSClient({
        appId: config.appId,
        appSecret: config.appSecret,
        autoReconnect: true,
        loggerLevel: lark.LoggerLevel.warn,
      }) as WsClientWithLifecycle,
    clearTimeoutFn: clearTimeout,
    setTimeoutFn: setTimeout,
  };
}

export function parseLarkEvent(data: FeishuEventData): LarkIncomingMessage | null {
  const { message, sender } = data;
  if (!message || message.message_type !== "text") {
    return null;
  }

  let text = "";
  try {
    const parsed = JSON.parse(message.content) as { text?: string };
    text = parsed.text?.trim() ?? "";
  } catch {
    return null;
  }

  if (message.mentions) {
    for (const mention of message.mentions) {
      text = text.replace(mention.key, "").trim();
    }
  }

  if (text === "") {
    return null;
  }

  return {
    messageId: message.message_id,
    chatId: message.chat_id,
    chatType: message.chat_type === "p2p" ? "p2p" : "group",
    senderId: sender?.sender_id?.open_id ?? sender?.sender_id?.user_id ?? "unknown",
    senderType: sender?.sender_type,
    text,
    rawContent: message.content,
    timestamp: message.create_time,
  };
}

function createSdkClient(config: StartLarkChannelConfig): MessageClient {
  return new lark.Client({
    appId: config.appId,
    appSecret: config.appSecret,
    appType: lark.AppType.SelfBuild,
    domain: lark.Domain.Feishu,
  }) as MessageClient;
}
