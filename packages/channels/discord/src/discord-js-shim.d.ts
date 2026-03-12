declare module "discord.js" {
  export const Events: {
    MessageCreate: string;
  };

  export const GatewayIntentBits: {
    DirectMessages: number;
    GuildMessages: number;
    MessageContent: number;
  };

  export const Partials: {
    Channel: number;
  };

  export class Client {
    user: { id: string } | null;
    constructor(options: { intents: number[]; partials?: number[] });
    destroy(): Promise<void>;
    login(token: string): Promise<void>;
    on(event: string, listener: (message: unknown) => void): void;
  }
}
