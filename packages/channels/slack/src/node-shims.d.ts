declare module "@slack/bolt" {
  export type SlackSayResult = { channel: string; text: string; ts: string };
  export type SlackHandlerArgs<T> = {
    body: { event: T };
    client: {
      chat: {
        postMessage(args: { channel: string; text: string }): Promise<SlackSayResult & { ok: true }>;
        update(args: { channel: string; text: string; ts: string }): Promise<SlackSayResult & { ok: true }>;
      };
    };
    event: T;
    say(args: { channel?: string; text: string }): Promise<SlackSayResult & { ok: true }>;
  };
  export class App {
    constructor(options: { appToken: string; socketMode: boolean; token: string });
    client: SlackHandlerArgs<unknown>["client"];
    event<T>(name: string, handler: (args: SlackHandlerArgs<T>) => Promise<void> | void): this;
    error(handler: (error: unknown) => Promise<void> | void): this;
    simulateEvent<T>(name: string, event: T): Promise<void>;
    start(): Promise<void>;
    stop(): Promise<void>;
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
