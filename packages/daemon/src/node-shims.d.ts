declare module "node:assert/strict" {
  export function deepEqual(actual: unknown, expected: unknown, message?: string): void;
  export function equal(actual: unknown, expected: unknown, message?: string): void;
}

declare module "node:child_process" {
  export type SpawnSyncReturns<T> = {
    error?: Error;
    output: Array<T | null>;
    pid?: number;
    signal: NodeJS.Signals | null;
    status: number | null;
    stdout: T;
    stderr: T;
  };

  export type SpawnSyncOptions = {
    cwd?: string;
    encoding?: "utf8";
    maxBuffer?: number;
  };

  export function spawnSync(
    command: string,
    args?: readonly string[],
    options?: SpawnSyncOptions,
  ): SpawnSyncReturns<string>;
}

declare module "node:fs/promises" {
  export function mkdir(
    path: string,
    options?: { recursive?: boolean },
  ): Promise<string | undefined>;
  export function rm(
    path: string,
    options?: { force?: boolean },
  ): Promise<void>;
  export function writeFile(
    path: string,
    data: string,
    encoding: "utf8",
  ): Promise<void>;
}

declare module "node:os" {
  export function homedir(): string;
}

declare module "node:path" {
  export function dirname(path: string): string;
  export function join(...paths: string[]): string;
  export function resolve(...paths: string[]): string;
}

declare module "node:test" {
  export function afterEach(fn: () => void | Promise<void>): void;
  export function test(
    name: string,
    fn: (context: unknown) => void | Promise<void>,
  ): void;
  export default test;
}

declare module "node:url" {
  export function fileURLToPath(url: string | URL): string;
}

declare namespace NodeJS {
  type Signals = "SIGINT" | "SIGTERM";
}

declare const process: {
  cwd(): string;
  execPath: string;
  exit(code?: number): never;
  on(event: NodeJS.Signals, listener: () => void): void;
};
