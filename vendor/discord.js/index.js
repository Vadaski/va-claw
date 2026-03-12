export const Events = {
  MessageCreate: "messageCreate",
};

export const GatewayIntentBits = {
  DirectMessages: 1,
  GuildMessages: 2,
  MessageContent: 4,
};

export const Partials = {
  Channel: 1,
};

export class Client {
  constructor(options) {
    this.options = options;
    this.listeners = new Map();
    this.user = { id: "stub-discord-user" };
  }

  async destroy() {}

  async login(_token) {}

  on(event, listener) {
    const listeners = this.listeners.get(event) ?? [];
    listeners.push(listener);
    this.listeners.set(event, listeners);
  }

  async emit(event, payload) {
    for (const listener of this.listeners.get(event) ?? []) {
      await listener(payload);
    }
  }
}
