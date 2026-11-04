import type { Handle, HandleServerError } from '@sveltejs/kit/hooks';
import { waitUntil } from 'cloudflare:workers';
import { edge } from '#lib/server/cache.ts';
import { report } from '#lib/server/report.ts';
import { readSession } from '#lib/server/session.ts';
import { flush, meter } from '#lib/server/usage.ts';

// signed in, or not the same for everyone
const PERSONAL = /^\/(admin|login|logout|auth|api\/budget)(\/|$)/;

const LOCAL = new Set(['localhost', '127.0.0.1']);

export const handle: Handle = async ({ event, resolve }) => {
  meter('worker_requests');
  const { url } = event;
  if (url.protocol === 'http:' && !LOCAL.has(url.hostname)) {
    return Response.redirect(url.href.replace('http:', 'https:'), 301);
  }
  event.locals.user = await readSession(event.cookies);
  const shared =
    event.request.method === 'GET' && !event.locals.user && !PERSONAL.test(event.url.pathname);
  const response = shared ? await edge(event.url, () => resolve(event)) : await resolve(event);
  if (!shared) response.headers.set('cache-control', 'private, no-store');
  waitUntil(flush());
  return response;
};

export const handleError: HandleServerError = async ({ kind, error, event }) => {
  if (kind === 'unknown') await report(error, event.request);
};
