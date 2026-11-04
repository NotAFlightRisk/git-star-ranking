// the slice of the Workers runtime we use, as @cloudflare/workers-types fights the DOM ones

interface D1Result<T = unknown> {
  results: T[];
  meta: { rows_read: number; rows_written: number };
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(): Promise<T | null>;
  all<T = unknown>(): Promise<D1Result<T>>;
  run(): Promise<D1Result>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<D1Result[]>;
}

interface Queue<Body> {
  send(body: Body): Promise<void>;
  sendBatch(messages: { body: Body }[]): Promise<void>;
}

interface R2Bucket {
  get(key: string): Promise<{ json<T>(): Promise<T> } | null>;
  put(
    key: string,
    value: string,
    options?: { httpMetadata?: { contentType?: string } }
  ): Promise<unknown>;
}

interface DurableObjectNamespace<T> {
  getByName(name: string): T;
}

interface DurableObjectState {
  storage: {
    get<T>(key: string): Promise<T | undefined>;
    put(key: string, value: unknown): Promise<void>;
  };
}

interface QueueMessage<Body> {
  body: Body;
  ack(): void;
  retry(options?: { delaySeconds?: number }): void;
}

interface ExportedHandler<Env> {
  fetch(request: Request, env: Env, ctx: unknown): Response | Promise<Response>;
}

interface CacheStorage {
  readonly default: Cache;
}

declare namespace Cloudflare {
  interface Env {}
}

declare module 'cloudflare:workers' {
  export const env: Cloudflare.Env;
  export function waitUntil(work: Promise<unknown>): void;
  export abstract class DurableObject {
    protected ctx: DurableObjectState;
    protected env: Cloudflare.Env;
    constructor(ctx: DurableObjectState, env: Cloudflare.Env);
  }
}
