let nextTs = 1;

export class App {
  constructor(options) {
    this.options = options;
    this.handlers = new Map();
    this.errorHandler = undefined;
    this.started = false;
    this.client = {
      chat: {
        postMessage: async ({ channel, text }) => ({
          ok: true,
          channel,
          text,
          ts: String(nextTs++),
        }),
        update: async ({ channel, text, ts }) => ({
          ok: true,
          channel,
          text,
          ts,
        }),
      },
    };
  }

  event(name, handler) {
    const handlers = this.handlers.get(name) ?? [];
    handlers.push(handler);
    this.handlers.set(name, handlers);
    return this;
  }

  error(handler) {
    this.errorHandler = handler;
    return this;
  }

  async start() {
    this.started = true;
  }

  async stop() {
    this.started = false;
  }

  async simulateEvent(name, event) {
    const handlers = this.handlers.get(name) ?? [];
    const say = async (message) =>
      this.client.chat.postMessage({
        channel: message.channel ?? event.channel,
        text: message.text,
      });

    try {
      for (const handler of handlers) {
        await handler({
          body: { event },
          client: this.client,
          event,
          say,
        });
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
