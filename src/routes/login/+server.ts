import { redirect } from '@sveltejs/kit';
import { authorizeUrl } from '#lib/server/auth.ts';

// only ever back to a page on this site
const local = (next: string | null) =>
  next?.startsWith('/') && !next.startsWith('//') ? next : '/';

export const GET = ({ url, cookies }) => {
  const state = crypto.randomUUID();
  const next = local(url.searchParams.get('next'));
  cookies.set('sign-in', JSON.stringify({ state, next }), { path: '/auth', maxAge: 600 });
  redirect(302, authorizeUrl(state));
};
