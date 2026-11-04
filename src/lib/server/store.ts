import { env } from 'cloudflare:workers';
import { one } from './db.ts';
import { meter, meterD1 } from './usage.ts';

/** Snapshots live in R2 when there's a bucket bound, and in a D1 table until then */
export async function put(key: string, value: unknown) {
  const body = JSON.stringify(value);
  meter('blob_writes');
  if (env.SNAPSHOTS) {
    await env.SNAPSHOTS.put(key, body, { httpMetadata: { contentType: 'application/json' } });
    return;
  }
  meterD1(
    await env.DB.prepare(
      'INSERT INTO blobs (key, body) VALUES (?1, ?2) ON CONFLICT (key) DO UPDATE SET body = ?2'
    )
      .bind(key, body)
      .run()
  );
}

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
