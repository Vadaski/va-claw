declare module "node:assert/strict" {
  export function ok(value: unknown, message?: string): asserts value;
}

declare module "node:child_process" {
  export type SpawnSyncReturns<T> = {
    status: number | null;
    stdout: T;
    stderr: T;
  };

  export function spawnSync(
    command: string,
    args?: readonly string[],
    options?: { encoding?: "utf8" },
  ): SpawnSyncReturns<string>;
}

declare module "node:fs/promises" {
  export function access(path: string): Promise<void>;
  export function mkdir(path: string, options?: { recursive?: boolean }): Promise<string | undefined>;
  export function mkdtemp(prefix: string): Promise<string>;
  export function readFile(path: string, encoding: "utf8"): Promise<string>;
  export function rm(path: string, options?: { force?: boolean; recursive?: boolean }): Promise<void>;
  export function writeFile(path: string, data: string, encoding: "utf8"): Promise<void>;
}

declare module "node:os" {
  export function homedir(): string;
  export function tmpdir(): string;
}

declare module "node:path" {
  export function dirname(path: string): string;
  export function join(...paths: string[]): string;
}

declare module "node:readline/promises" {
  export function createInterface(input: {
    input: unknown;
    output: { write(chunk: string): boolean };
  }): {
    close(): void;
    question(message: string): Promise<string>;
  };
}

declare module "node:sqlite" {
  export class StatementSync {
    all<T = Record<string, unknown>>(...parameters: unknown[]): T[];
    get<T = Record<string, unknown>>(...parameters: unknown[]): T | undefined;
    run(...parameters: unknown[]): void;
  }

  export class DatabaseSync {
    constructor(path: string);
    close(): void;
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
  }
}

declare module "node:test" {
  export function test(name: string, fn: () => void | Promise<void>): void;
  export default test;
}

declare namespace NodeJS {
  type Platform = "darwin" | "linux" | string;
  type Signals = "SIGINT" | "SIGTERM";
}

declare const process: {
  argv: string[];
  cwd(): string;
  execPath: string;
  exitCode?: number;
  platform: NodeJS.Platform;
  stdin: unknown;
  stdout: { write(chunk: string): boolean };
  stderr: { write(chunk: string): boolean };
  on(event: NodeJS.Signals, listener: () => void): void;
  off(event: NodeJS.Signals, listener: () => void): void;
};
