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
  constructor(options: { intents: number[]; partials?: number[] });
  user: { id: string } | null;
  destroy(): Promise<void>;
  emit(event: string, payload: unknown): Promise<void>;
  login(token: string): Promise<void>;
  on(event: string, listener: (message: unknown) => void): void;
}
