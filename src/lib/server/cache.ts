import { version } from '$app/env';
import { waitUntil } from 'cloudflare:workers';

const FRESH = 10 * 60_000;
const KEEP = 'public, max-age=86400';
const BROWSER = 'public, max-age=60';

const gone = (status: number) =>
  status === 404 || status === 410 || (status >= 300 && status < 400);

const key = (url: URL) => {
  const versioned = new URL(url);
  versioned.searchParams.set('__v', version);
  return new Request(versioned);
};

const restamp = (response: Response, cacheControl: string, stored?: number) => {
  const copy = new Response(response.body, response);
  copy.headers.set('cache-control', cacheControl);
  if (stored) copy.headers.set('x-stored', String(stored));
  return copy;
};

/** Anonymous pages come from this data centre's cache, and go stale while they revalidate */
export async function edge(url: URL, render: () => Promise<Response>) {
  const cache = caches.default;
  const hit = await cache.match(key(url));
  const age = hit ? Date.now() - Number(hit.headers.get('x-stored')) : Infinity;
  if (hit && age < FRESH) return restamp(hit, BROWSER);
  const fresh = render().then(async (response) => {
    if (response.status !== 200 || response.headers.has('set-cookie')) {
      if (hit && gone(response.status)) await cache.delete(key(url));
      return response;
    }
    await cache.put(key(url), restamp(response.clone(), KEEP, Date.now()));
    return restamp(response, BROWSER);
  });
  if (!hit) return fresh;
  waitUntil(fresh);
  return restamp(hit, BROWSER);
}
