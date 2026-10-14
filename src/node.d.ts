declare module "node:fs" {
  export function readFileSync(path: string, encoding: string): string;
  export function mkdirSync(path: string, options?: unknown): void;
}

declare module "node:path" {
  export function resolve(...paths: string[]): string;
  export function dirname(path: string): string;
  export function join(...paths: string[]): string;
}

declare module "node:sqlite" {
  export class DatabaseSync { constructor(path: string); exec(sql: string): void; prepare(sql: string): { run(...params: unknown[]): { changes: number }; get(...params: unknown[]): Record<string, unknown> | undefined; all(...params: unknown[]): Array<Record<string, unknown>>; }; }
}

declare module "node:module" {
  export function createRequire(url: string): (name: string) => any;
}

declare module "node:url" {
  export function fileURLToPath(url: string | URL): string;
}

declare const __dirname: string;
declare const process: {
  env: Record<string, string | undefined>;
  loadEnvFile?: () => void;
  argv: string[];
  exit: (code?: number) => never;
  stdin: {
    isTTY?: boolean;
    [Symbol.asyncIterator](): AsyncIterableIterator<any>;
  };
  cwd(): string;
};

declare class Buffer {
  static concat(list: any[]): Buffer;
  static from(value: string): Buffer;
  toString(encoding?: string): string;
}
