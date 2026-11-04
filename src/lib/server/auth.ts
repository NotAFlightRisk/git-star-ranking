import { env } from 'cloudflare:workers';
import { base64url, utf8 } from './bytes.ts';
import { AGENT, API, headers } from './github.ts';

const length = (n: number) => {
  if (n < 128) return [n];
  return n < 256 ? [0x81, n] : [0x82, n >> 8, n & 255];
};
const RSA = [
  0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01, 0x05, 0x00
];

/** GitHub hands out PKCS#1 keys and WebCrypto only takes PKCS#8, so wrap it */
export function pkcs8(key: string) {
  const pem = key.includes('-----') ? key : atob(key.trim());
  const der = Uint8Array.from(atob(pem.replace(/-----[^-]+-----|\s/g, '')), (c) => c.charCodeAt(0));
  if (!pem.includes('RSA PRIVATE KEY')) return der;
  const body = [0x02, 0x01, 0x00, ...RSA, 0x04, ...length(der.length), ...der];
  return new Uint8Array([0x30, ...length(body.length), ...body]);
}

export async function appJwt(appId: string, privateKey: string, now = Date.now()) {
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pkcs8(privateKey),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const iat = Math.floor(now / 1000) - 60;
  const unsigned = `${base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${base64url(
    JSON.stringify({ iat, exp: iat + 600, iss: appId })
  )}`;
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, utf8(unsigned));
  return `${unsigned}.${base64url(signature)}`;
}

export async function installationToken() {
  const jwt = await appJwt(env.GITHUB_APP_ID, env.GITHUB_PRIVATE_KEY);
  const res = await fetch(`${API}/app/installations/${env.GITHUB_INSTALLATION_ID}/access_tokens`, {
    method: 'POST',
    headers: headers(jwt)
  });
  if (!res.ok) throw new Error(`GitHub wouldn't mint an installation token (${res.status})`);
  const { token, expires_at } = (await res.json()) as { token: string; expires_at: string };
  return { value: token, expires: Date.parse(expires_at) };
}

const callback = () => `${env.APP_URL}/auth/callback`;

/** Where to land after sign-in: a page on this site, however the address is dressed up */
export const safeNext = (next: string | null, site: URL) => {
  const url = URL.parse(next ?? '/', site);
  return url?.origin === site.origin ? `${url.pathname}${url.search}${url.hash}` : '/';
};

export const authorizeUrl = (state: string) =>
  `https://github.com/login/oauth/authorize?${new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID,
    redirect_uri: callback(),
    state
  })}`;

export async function exchange(code: string) {
  const res = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'user-agent': AGENT
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: callback()
    })
  });
  const body = (await res.json()) as { access_token?: string; error_description?: string };
  if (!body.access_token) throw new Error(body.error_description ?? 'GitHub sent no token back');
  return body.access_token;
}

/** We only ever want a sign-in token for one query, so it goes straight back */
export async function revoke(token: string) {
  const res = await fetch(`${API}/applications/${env.GITHUB_CLIENT_ID}/token`, {
    method: 'DELETE',
    headers: {
      ...headers(token),
      authorization: `Basic ${btoa(`${env.GITHUB_CLIENT_ID}:${env.GITHUB_CLIENT_SECRET}`)}`
    },
    body: JSON.stringify({ access_token: token })
  });
  if (!res.ok) throw new Error(`GitHub wouldn't take a sign-in token back (${res.status})`);
}
