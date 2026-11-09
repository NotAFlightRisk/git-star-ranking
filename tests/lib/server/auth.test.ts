import { generateKeyPairSync } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { appJwt, pkcs8, safeNext } from '../../../src/lib/server/auth.ts';

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const pkcs1 = privateKey.export({ type: 'pkcs1', format: 'pem' }).toString();

const verify = async (jwt: string) => {
  const [header, payload, signature] = jwt.split('.');
  const key = await crypto.subtle.importKey(
    'spki',
    publicKey.export({ type: 'spki', format: 'der' }),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );
  return crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    key,
    Buffer.from(signature, 'base64url'),
    new TextEncoder().encode(`${header}.${payload}`)
  );
};

describe('pkcs8', () => {
  it('wraps a PKCS#1 key into the same bytes Node writes for PKCS#8', () => {
    const expected = privateKey.export({ type: 'pkcs8', format: 'der' });
    expect(Buffer.from(pkcs8(pkcs1))).toEqual(expected);
  });

  it('takes the PEM base64 encoded on one line, as .env files like it', () => {
    expect(pkcs8(Buffer.from(pkcs1).toString('base64'))).toEqual(pkcs8(pkcs1));
  });
});

describe('appJwt', () => {
  it('signs a token GitHub would accept: backdated a minute, ten minutes long', async () => {
    const now = Date.parse('2026-11-04T12:00:00Z');
    const jwt = await appJwt('123', pkcs1, now);
    const claims = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString());
    expect(claims).toEqual({ iat: now / 1000 - 60, exp: now / 1000 + 540, iss: '123' });
    expect(await verify(jwt)).toBe(true);
  });

  it('fails on a key that is not one', async () => {
    await expect(appJwt('123', 'bm90IGEga2V5')).rejects.toThrow();
  });
});

describe('safeNext', () => {
  const site = new URL('https://git-star-ranking.com/login?next=x');

  it('keeps a page on this site, query and all', () => {
    expect(safeNext('/users?page=2', site)).toBe('/users?page=2');
    expect(safeNext(null, site)).toBe('/');
  });

  it.each([
    '//evil.example',
    '/\\evil.example',
    '/\\/evil.example',
    'https://evil.example/x',
    'http://['
  ])('sends %s home instead', (next) => {
    expect(safeNext(next, site)).toBe('/');
  });
});
