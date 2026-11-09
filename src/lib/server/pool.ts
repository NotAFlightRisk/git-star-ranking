import { DurableObject } from 'cloudflare:workers';
import { installationToken } from './auth.ts';
import type { Resource, Seen } from './github.ts';

export interface Lease {
  resource: Resource;
  calls: number;
  seen?: Seen[];
  urgent?: boolean;
}

export interface Grant {
  token?: string;
  wait: number;
}

interface Bucket {
  remaining?: number;
  reset: number;
  blocked: number;
  window: number;
  used: number;
}

// GitHub's secondary limits a minute, where a query or a GET is one point
const PER_MINUTE: Record<Resource, number> = { graphql: 2000, search: 30, core: 900 };
// crawls leave this much of each hour for visitors and sign-ins
const RESERVE: Record<Resource, number> = { graphql: 500, search: 0, core: 500 };
const CONCURRENT = 100;
const LEASE_MS = 60_000;
const MINUTE = 60_000;

/** The one place that knows how much GitHub we've got left */
export class TokenPool extends DurableObject {
  private token?: { value: string; expires: number };
  private minting?: Promise<string>;
  private buckets = new Map<Resource, Bucket>();
  private leases: number[] = [];

  async lease({ resource, calls, seen = [], urgent = false }: Lease): Promise<Grant> {
    const now = Date.now();
    for (const sighting of seen) this.note(sighting, now);
    const bucket = this.bucket(resource);
    if (now - bucket.window >= MINUTE) Object.assign(bucket, { window: now, used: 0 });
    this.leases = this.leases.filter((until) => until > now);
    const short = (bucket.remaining ?? Infinity) - calls < (urgent ? 0 : RESERVE[resource]);
    const wait = Math.max(
      bucket.blocked - now,
      short ? bucket.reset - now : 0,
      bucket.used + calls > PER_MINUTE[resource] ? bucket.window + MINUTE - now : 0,
      this.leases.length >= CONCURRENT ? this.leases[0] - now : 0
    );
    if (wait > 0) return { wait };
    bucket.used += calls;
    if (bucket.remaining !== undefined) bucket.remaining -= calls;
    this.leases.push(now + LEASE_MS);
    return { token: await this.current(), wait: 0 };
  }

  /** Each resource's headroom as GitHub last told us, leaving out windows that have passed */
  async status() {
    const now = Date.now();
    const ahead = (at: number) => (at > now ? at : null);
    const buckets = [...this.buckets].map(([resource, bucket]) => ({
      resource,
      remaining: bucket.reset > now ? (bucket.remaining ?? null) : null,
      reset: ahead(bucket.reset),
      blocked: ahead(bucket.blocked),
      minute: now - bucket.window < MINUTE ? bucket.used : 0,
      perMinute: PER_MINUTE[resource]
    }));
    return { buckets, leases: this.leases.filter((until) => until > now).length };
  }

  private bucket(resource: Resource) {
    if (!this.buckets.has(resource)) {
      this.buckets.set(resource, { reset: 0, blocked: 0, window: 0, used: 0 });
    }
    return this.buckets.get(resource)!;
  }

  private note({ resource, remaining, reset, retryAfter }: Seen, now: number) {
    const bucket = this.bucket(resource);
    if (remaining !== undefined && reset) {
      const fresh = reset * 1000 !== bucket.reset;
      bucket.remaining = fresh ? remaining : Math.min(remaining, bucket.remaining ?? remaining);
      bucket.reset = reset * 1000;
    }
    if (retryAfter) bucket.blocked = Math.max(bucket.blocked, now + retryAfter * 1000);
  }

  private current() {
    if (this.token && this.token.expires - Date.now() > 5 * MINUTE) {
      return Promise.resolve(this.token.value);
    }
    this.minting ??= this.mint().finally(() => (this.minting = undefined));
    return this.minting;
  }

  private async mint() {
    const stored = await this.ctx.storage.get<{ value: string; expires: number }>('token');
    this.token =
      stored && stored.expires - Date.now() > 5 * MINUTE ? stored : await installationToken();
    if (this.token !== stored) await this.ctx.storage.put('token', this.token);
    return this.token.value;
  }
}
