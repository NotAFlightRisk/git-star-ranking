import { describe, expect, it, vi } from 'vitest';
import { nodeId, short, viewer } from '../../../src/lib/server/github.ts';

describe('nodeId', () => {
  // checked against GitHub's GraphQL API on 2026-11-04
  it.each([
    [0, 1, 'U_kgAB'],
    [0, 583231, 'U_kgDOAAjmPw'],
    [0, 1024025, 'U_kgDOAA-gGQ'],
    [1, 9919, 'O_kgDNJr8'],
    [1, 6154722, 'O_kgDOAF3p4g']
  ] as const)('turns kind %i id %i into %s', (kind, id, expected) => {
    expect(nodeId(kind, id)).toBe(expected);
  });
});

describe('nodeId past 32 bits', () => {
  const decode = (id: string) => [...Buffer.from(id.slice(2), 'base64url')];

  it('uses a uint32 right up to the limit', () => {
    expect(decode(nodeId(0, 2 ** 32 - 1))).toEqual([0x92, 0, 0xce, 255, 255, 255, 255]);
  });

  it('refuses ids it cannot represent exactly', () => {
    expect(() => nodeId(0, 2 ** 53)).toThrow(RangeError);
    expect(() => nodeId(0, -1)).toThrow(RangeError);
  });

  it('moves to a uint64 after it instead of wrapping round to a small id', () => {
    expect(decode(nodeId(0, 2 ** 32))).toEqual([0x92, 0, 0xcf, 0, 0, 0, 1, 0, 0, 0, 0]);
    expect(nodeId(0, 2 ** 32 + 1)).not.toBe(nodeId(0, 1));
  });
});

describe('short', () => {
  it('flattens whitespace and drops GitHub emoji shortcodes', () => {
    expect(short('  a\n\tb  ')).toBe('a b');
    expect(short(':zap: Fast :+1: things')).toBe('Fast things');
    expect(short('Runs at 10:30:45 sharp')).toBe('Runs at 10:30:45 sharp');
    expect(short('   ')).toBeNull();
    expect(short(':books:')).toBeNull();
    expect(short(null)).toBeNull();
  });

  it('cuts a long description on a whole word', () => {
    const long = 'word '.repeat(60);
    const cut = short(long)!;
    expect(cut.length).toBeLessThanOrEqual(200);
    expect(cut.endsWith('word...')).toBe(true);
  });

  it('re-cuts a row an older crawl chopped at exactly 200, mid-word', () => {
    const chopped = `${'word '.repeat(39)}with`;
    expect(chopped).toHaveLength(199);
    expect(short(`${chopped}o`)).toBe(`${'word '.repeat(39).trim()}...`);
  });

  it('still cuts a description with no spaces in it', () => {
    expect(short('x'.repeat(300))).toBe(`${'x'.repeat(197)}...`);
  });
});

describe('viewer', () => {
  it('only asks a User for what a User has, or GitHub refuses the whole query', async () => {
    let query = '';
    vi.stubGlobal('fetch', async (_: string, init: RequestInit) => {
      query = JSON.parse(String(init.body)).query;
      const repositories = { totalCount: 0, pageInfo: { hasNextPage: false }, nodes: [] };
      const viewer = { __typename: 'User', databaseId: 1, login: 'octo', repositories };
      return new Response(JSON.stringify({ data: { viewer } }));
    });
    await expect(viewer('token')).resolves.toMatchObject({ id: 1, login: 'octo', kind: 0 });
    expect(query).not.toMatch(/on Organization/);
    vi.unstubAllGlobals();
  });

  it("keeps the name, join date and followers, and each repo's details", async () => {
    const node = {
      databaseId: 9,
      name: 'cli',
      stargazerCount: 80,
      description: null,
      primaryLanguage: { name: 'Go' },
      createdAt: '2015-03-01T00:00:00Z',
      forkCount: 12,
      isArchived: true,
      licenseInfo: { spdxId: 'NOASSERTION' }
    };
    const repositories = { totalCount: 1, pageInfo: { hasNextPage: false }, nodes: [node] };
    const answer = {
      __typename: 'User',
      databaseId: 1,
      login: 'octo',
      name: ' The Octocat ',
      createdAt: '2011-01-25T18:44:36Z',
      followers: { totalCount: 42 },
      repositories
    };
    vi.stubGlobal('fetch', async () => new Response(JSON.stringify({ data: { viewer: answer } })));
    const me = await viewer('token');
    expect(me).toMatchObject({ name: 'The Octocat', followers: 42, joined: 1_295_981_076 });
    expect(me.list[0]).toMatchObject({
      created: 1_425_168_000,
      forks: 12,
      archived: true,
      license: 'Other'
    });
    vi.unstubAllGlobals();
  });

  it.each([
    ['hangs', () => Promise.reject(new DOMException('aborted due to timeout', 'TimeoutError'))],
    ['cuts its answer short', async () => new Response('{"data": {"vie')]
  ])('calls it a timeout when GitHub %s, so the crawl can split the batch', async (_, reply) => {
    vi.stubGlobal('fetch', reply);
    await expect(viewer('token')).rejects.toHaveProperty('timedOut', true);
    vi.unstubAllGlobals();
  });
});
