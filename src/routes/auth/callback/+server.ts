import { error, redirect } from '@sveltejs/kit';
import { waitUntil } from 'cloudflare:workers';
import { exchange, revoke } from '#lib/server/auth.ts';
import { refreshSelf } from '#lib/server/crawl.ts';
import { writeSession } from '#lib/server/session.ts';

export const GET = async ({ url, cookies }) => {
  const saved = JSON.parse(cookies.get('sign-in') ?? 'null') as {
    state: string;
    next: string;
  } | null;
  cookies.delete('sign-in', { path: '/auth' });
  if (url.searchParams.get('error') === 'access_denied') redirect(303, saved?.next ?? '/');
  const code = url.searchParams.get('code');
  if (!saved || !code || url.searchParams.get('state') !== saved.state) {
    error(400, 'That sign-in link has gone stale. Give signing in another go.');
  }
  const token = await exchange(code);
  try {
    const me = await refreshSelf(token);
    await writeSession(cookies, { id: me.id, login: me.login });
    redirect(303, saved.next === '/' ? `/${me.login}` : saved.next);
  } finally {
    waitUntil(revoke(token));
  }
};
