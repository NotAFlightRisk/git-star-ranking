import { env } from 'cloudflare:workers';
import { one } from './db.ts';
import { meter, meterD1 } from './usage.ts';

const UPSERT =
  'INSERT INTO blobs (key, body) VALUES (?1, ?2) ON CONFLICT (key) DO UPDATE SET body = ?2';

/** Snapshots live in R2 when there's a bucket bound, and in a D1 table until then */
export async function putAll(entries: [string, unknown][]) {
  if (!entries.length) return;
  const { SNAPSHOTS } = env;
  const bodies = entries.map(([key, value]) => [key, JSON.stringify(value)]);
  meter('blob_writes', bodies.length);
  if (SNAPSHOTS) {
    const meta = { httpMetadata: { contentType: 'application/json' } };
    await Promise.all(bodies.map(([key, body]) => SNAPSHOTS.put(key, body, meta)));
    return;
  }
  // D1 answers one request at a time, so the lot goes as one
  meterD1(await env.DB.batch(bodies.map((pair) => env.DB.prepare(UPSERT).bind(...pair))));
}

export const put = (key: string, value: unknown) => putAll([[key, value]]);

export async function get<T>(key: string): Promise<T | undefined> {
  meter('blob_reads');
  if (env.SNAPSHOTS) {
    const object = await env.SNAPSHOTS.get(key);
    return object ? object.json<T>() : undefined;
  }
  const row = await one<{ body: string }>(
    env.DB.prepare('SELECT body FROM blobs WHERE key = ?').bind(key)
  );
  return row ? (JSON.parse(row.body) as T) : undefined;
}

// snapshots only change once a night, so an isolate can hang on to what it's read
const memory = new Map<string, { at: number; value: unknown }>();
const MEMORY = 200;

export async function cached<T>(key: string, version: number) {
  const hit = memory.get(key);
  if (hit && hit.at === version) return hit.value as T | undefined;
  const value = await get<T>(key);
  if (memory.size >= MEMORY) memory.delete(memory.keys().next().value!);
  memory.set(key, { at: version, value });
  return value;
}
