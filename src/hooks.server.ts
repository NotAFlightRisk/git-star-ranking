import { building } from '$app/env';
import type { Handle, HandleServerError } from '@sveltejs/kit/hooks';
import { waitUntil } from 'cloudflare:workers';
import { edge } from '#lib/server/cache.ts';
import { report } from '#lib/server/report.ts';
import { readSession } from '#lib/server/session.ts';
import { flush, meter } from '#lib/server/usage.ts';

// signed in, or not the same for everyone
const PERSONAL = /^\/(admin|login|logout|auth|api\/budget)(\/|$)/;

export const handle: Handle = async ({ event, resolve }) => {
  // prerendering runs in Node at build time, with no cache or bindings to hand
  if (building) return resolve(event);
  meter('worker_requests');
  // only Cloudflare's edge sets this, so local dev stays on plain http
  if (event.request.headers.get('cf-visitor')?.includes('"http"')) {
    return Response.redirect(event.url.href.replace('http:', 'https:'), 301);
  }
  event.locals.user = await readSession(event.cookies);
  const shared =
    event.request.method === 'GET' && !event.locals.user && !PERSONAL.test(event.url.pathname);
  // kit has already turned a data request's url into its page's, so key on what was asked
  const response = shared
    ? await edge(new URL(event.request.url), () => resolve(event))
    : await resolve(event);
  if (!shared) response.headers.set('cache-control', 'private, no-store');
  waitUntil(flush());
  return response;
};

export const handleError: HandleServerError = async ({ kind, error, event }) => {
  if (kind === 'unknown') await report(error, event.request);
};
