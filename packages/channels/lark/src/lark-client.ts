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

export function createLarkListener(
  config: StartLarkChannelConfig,
  handler: LarkMessageHandler,
): LarkListener {
  const client = new lark.Client({
    appId: config.appId,
    appSecret: config.appSecret,
    appType: lark.AppType.SelfBuild,
    domain: lark.Domain.Feishu,
  });

  const wsClient = new lark.WSClient({
    appId: config.appId,
    appSecret: config.appSecret,
    autoReconnect: true,
    loggerLevel: lark.LoggerLevel.warn,
  }) as WsClientWithLifecycle;

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
      const dispatcher = new lark.EventDispatcher({});
      dispatcher.register({
        "im.message.receive_v1": async (data: unknown) => {
          const message = parseLarkEvent(data as FeishuEventData);
          if (!message) {
            return;
          }
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
