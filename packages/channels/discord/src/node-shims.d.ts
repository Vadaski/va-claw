declare module "node:assert/strict" {
  const assert: {
    equal<T>(actual: T, expected: T, message?: string): void;
    match(actual: string, expected: RegExp, message?: string): void;
  };
  export default assert;
  export function equal<T>(actual: T, expected: T, message?: string): void;
  export function match(actual: string, expected: RegExp, message?: string): void;
}

declare module "node:child_process" {
  export type SpawnSyncReturns<T> = {
    error?: Error;
    status: number | null;
    stdout: T;
    stderr: T;
  };

  export function spawnSync(
    command: string,
    args?: readonly string[],
    options?: {
      encoding?: "utf8";
      env?: Record<string, string>;
      maxBuffer?: number;
      timeout?: number;
    },
  ): SpawnSyncReturns<string>;
}

declare module "node:test" {
  export function afterEach(fn: () => void | Promise<void>): void;
  export function test(name: string, fn: () => void | Promise<void>): void;
}

declare const process: {
  env?: Record<string, string | undefined>;
};
