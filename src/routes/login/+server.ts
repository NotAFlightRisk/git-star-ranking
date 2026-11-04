import { redirect } from '@sveltejs/kit';
import { authorizeUrl, safeNext } from '#lib/server/auth.ts';

export const GET = ({ url, cookies }) => {
  const state = crypto.randomUUID();
  const next = safeNext(url.searchParams.get('next'), url);
  cookies.set('sign-in', JSON.stringify({ state, next }), { path: '/auth', maxAge: 600 });
  redirect(302, authorizeUrl(state));
};
