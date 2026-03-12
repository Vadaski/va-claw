export type SlackSayResult = {
  channel: string;
  text: string;
  ts: string;
};

export type SlackClient = {
  chat: {
    postMessage(args: { channel: string; text: string }): Promise<SlackSayResult & { ok: true }>;
    update(args: { channel: string; text: string; ts: string }): Promise<SlackSayResult & { ok: true }>;
  };
};

export type SlackHandlerArgs<T> = {
  body: { event: T };
  client: SlackClient;
  event: T;
  say(args: { channel?: string; text: string }): Promise<SlackSayResult & { ok: true }>;
};

export class App {
  constructor(options: { appToken: string; socketMode: boolean; token: string });
  client: SlackClient;
  event<T>(name: string, handler: (args: SlackHandlerArgs<T>) => Promise<void> | void): this;
  error(handler: (error: unknown) => Promise<void> | void): this;
  simulateEvent<T>(name: string, event: T): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
}
