declare module "node:assert/strict" {
  export function deepEqual(actual: unknown, expected: unknown, message?: string): void;
  export function equal(actual: unknown, expected: unknown, message?: string): void;
  export function ok(value: unknown, message?: string): asserts value;
}

declare module "node:crypto" {
  export function randomUUID(): string;
}

declare module "node:fs" {
  export function mkdirSync(
    path: string,
    options?: { recursive?: boolean },
  ): string | undefined;
}

declare module "node:os" {
  export function homedir(): string;
}

declare module "node:path" {
  export function dirname(path: string): string;
  export function join(...paths: string[]): string;
}

declare module "node:sqlite" {
  export class StatementSync {
    all<T = Record<string, unknown>>(...parameters: unknown[]): T[];
    run(...parameters: unknown[]): void;
  }

  export class DatabaseSync {
    constructor(path: string);
    close(): void;
    enableLoadExtension(allow: boolean): void;
    exec(sql: string): void;
    loadExtension(path: string): void;
    prepare(sql: string): StatementSync;
  }
}

declare module "node:test" {
  export function test(
    name: string,
    fn: () => void | Promise<void>,
  ): void;
}
