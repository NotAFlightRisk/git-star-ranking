import type { Cookies } from '@sveltejs/kit';
import { env } from 'cloudflare:workers';
import { base64url, unbase64url, utf8 } from './bytes.ts';

export interface Session {
  id: number;
  login: string;
}

const NAME = 'session';
const MAX_AGE = 30 * 86_400;

const key = () =>
  crypto.subtle.importKey(
    'raw',
    utf8(env.SESSION_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );

/** The cookie only ever holds who you are, never a GitHub token */
export async function writeSession(cookies: Cookies, session: Session) {
  const payload = base64url(JSON.stringify({ ...session, exp: Date.now() + MAX_AGE * 1000 }));
  const signature = base64url(await crypto.subtle.sign('HMAC', await key(), utf8(payload)));
  cookies.set(NAME, `${payload}.${signature}`, { path: '/', sameSite: 'lax', maxAge: MAX_AGE });
}

export async function readSession(cookies: Cookies): Promise<Session | undefined> {
  const [payload, signature] = cookies.get(NAME)?.split('.') ?? [];
  if (!payload || !signature) return;
  const valid = await crypto.subtle
    .verify('HMAC', await key(), unbase64url(signature), utf8(payload))
    .catch(() => false);
  if (!valid) return;
  const { id, login, exp } = JSON.parse(new TextDecoder().decode(unbase64url(payload)));
  return exp > Date.now() ? { id, login } : undefined;
}

export const endSession = (cookies: Cookies) => cookies.delete(NAME, { path: '/' });
