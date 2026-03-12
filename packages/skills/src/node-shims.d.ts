declare module "node:assert/strict" {
  export function deepEqual(actual: unknown, expected: unknown, message?: string): void;
  export function equal(actual: unknown, expected: unknown, message?: string): void;
}

declare module "node:fs/promises" {
  export function access(path: string): Promise<void>;
  export function mkdir(path: string, options?: { recursive?: boolean }): Promise<string | undefined>;
  export function mkdtemp(prefix: string): Promise<string>;
  export function readFile(path: string, encoding: "utf8"): Promise<string>;
  export function readdir(path: string): Promise<string[]>;
  export function rm(path: string, options?: { force?: boolean; recursive?: boolean }): Promise<void>;
  export function writeFile(path: string, data: string, encoding: "utf8"): Promise<void>;
}

declare module "node:os" {
  export function homedir(): string;
  export function tmpdir(): string;
}

declare module "node:path" {
  export function isAbsolute(path: string): boolean;
  export function join(...paths: string[]): string;
  export function resolve(...paths: string[]): string;
}

declare module "node:test" {
  export function test(name: string, fn: () => void | Promise<void>): void;
  export default test;
}

declare const process: {
  cwd(): string;
};
