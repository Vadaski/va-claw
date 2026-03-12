let nextMessageId = 1;

export class Context {
  constructor(bot, update) {
    this.bot = bot;
    this.update = update;
    this.message = update.message;
    this.chat = update.message?.chat;
    this.api = bot.api;
    this.match = "";
  }

  async reply(text) {
    return this.api.sendMessage(this.chat?.id ?? 0, text);
  }
}

export class Bot {
  constructor(token) {
    this.token = token;
    this.commandHandlers = new Map();
    this.messageHandlers = [];
    this.errorHandler = undefined;
    this.running = false;
    this.api = {
      sendMessage: async (chatId, text) => ({
        chat: { id: chatId },
        message_id: nextMessageId++,
        text,
      }),
      editMessageText: async (chatId, messageId, text) => ({
        chat: { id: chatId },
        message_id: messageId,
        text,
      }),
    };
  }

  command(name, handler) {
    this.commandHandlers.set(name, handler);
    return this;
  }

  on(filter, handler) {
    if (filter === "message:text") {
      this.messageHandlers.push(handler);
    }
    return this;
  }

  catch(handler) {
    this.errorHandler = handler;
    return this;
  }

  async start() {
    this.running = true;
  }

  stop() {
    this.running = false;
  }

  async handleUpdate(update) {
    const text = update.message?.text ?? "";
    const ctx = new Context(this, update);
    const commandMatch = /^\/([^\s@]+)(?:@[^\s]+)?(?:\s+(.*))?$/.exec(text);

    try {
      if (commandMatch) {
        const handler = this.commandHandlers.get(commandMatch[1]);
        if (handler) {
          ctx.match = commandMatch[2] ?? "";
          await handler(ctx);
        }
      }

      for (const handler of this.messageHandlers) {
        await handler(ctx);
      }
    } catch (error) {
      if (this.errorHandler) {
        await this.errorHandler(error);
        return;
      }
      throw error;
    }
  }
}
