export type Chat = {
  id: number;
  type: string;
};

export type Message = {
  chat: Chat;
  message_id: number;
  text?: string;
};

export type Update = {
  message?: Message;
};

export class Context {
  constructor(bot: Bot, update: Update);
  api: {
    sendMessage(chatId: number, text: string): Promise<Message>;
    editMessageText(chatId: number, messageId: number, text: string): Promise<Message>;
  };
  bot: Bot;
  chat?: Chat;
  match: string;
  message?: Message;
  update: Update;
  reply(text: string): Promise<Message>;
}

export class Bot {
  constructor(token: string);
  api: {
    sendMessage(chatId: number, text: string): Promise<Message>;
    editMessageText(chatId: number, messageId: number, text: string): Promise<Message>;
  };
  token: string;
  command(name: string, handler: (context: Context) => Promise<void> | void): this;
  on(filter: "message:text", handler: (context: Context) => Promise<void> | void): this;
  catch(handler: (error: unknown) => Promise<void> | void): this;
  handleUpdate(update: Update): Promise<void>;
  start(): Promise<void>;
  stop(): void;
}
