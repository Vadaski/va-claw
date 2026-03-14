declare module "grammy" {
  export type Chat = { id: number; type: string };
  export type Message = { chat: Chat; message_id: number; text?: string };
  export class Context {
    api: {
      editMessageText(chatId: number, messageId: number, text: string): Promise<Message>;
      sendMessage(chatId: number, text: string): Promise<Message>;
    };
    chat?: Chat;
    match: string;
    message?: Message;
    reply(text: string): Promise<Message>;
  }
  export class Bot {
    constructor(token: string);
    command(name: string, handler: (context: Context) => Promise<void> | void): this;
    on(filter: "message:text", handler: (context: Context) => Promise<void> | void): this;
    catch(handler: (error: unknown) => Promise<void> | void): this;
    handleUpdate(update: { message?: Message }): Promise<void>;
    start(): Promise<void>;
    stop(): void;
  }
}

declare module "node:assert/strict" {
  const assert: {
    deepEqual(actual: unknown, expected: unknown, message?: string): void;
    equal(actual: unknown, expected: unknown, message?: string): void;
  };
  export default assert;
  export function deepEqual(actual: unknown, expected: unknown, message?: string): void;
  export function equal(actual: unknown, expected: unknown, message?: string): void;
}

declare module "node:child_process" {
  export function spawn(
    command: string,
    args?: readonly string[],
    options?: {
      cwd?: string;
      env?: Record<string, string | undefined>;
      stdio?: ["ignore", "pipe", "pipe"];
    },
  ): {
    kill(signal?: string): void;
    on(event: "close", listener: (code: number | null) => void): void;
    stderr: { on(event: "data", listener: (chunk: string | Uint8Array) => void): void };
    stdout: { on(event: "data", listener: (chunk: string | Uint8Array) => void): void };
  };
}

declare module "node:test" {
  export function test(name: string, fn: () => void | Promise<void>): void;
  export default test;
}

declare const process: {
  cwd(): string;
  env: Record<string, string | undefined>;
};

declare function clearTimeout(timeout: unknown): void;
declare function setTimeout(handler: () => void, timeout: number): unknown;
