declare module "node:fs" {
  export function readFileSync(path: string, encoding: string): string;
}

declare module "node:path" {
  export function resolve(...paths: string[]): string;
  export function dirname(path: string): string;
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
};

declare class Buffer {
  static concat(list: any[]): Buffer;
  toString(encoding?: string): string;
}
