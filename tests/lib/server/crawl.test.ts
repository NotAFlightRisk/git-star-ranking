import { describe, expect, it } from 'vitest';
import { afterEach, vi } from 'vitest';
import { env } from '../../workers.ts';
import { finish, pack } from '../../../src/lib/server/crawl.ts';
import type { Owner } from '../../../src/lib/server/github.ts';

describe('pack', () => {
  const owner = (repos: number, refreshed_at = 1) => ({ repos, refreshed_at });

  it('keeps each batch near 400 first-page repos', () => {
    const batches = pack([owner(100), owner(100), owner(100), owner(100), owner(5)]);
    expect(batches.map((batch) => batch.length)).toEqual([4, 1]);
  });

  it('guesses 40 repos for accounts we have not counted yet', () => {
    expect(pack(Array.from({ length: 20 }, () => owner(0, 0))).map((b) => b.length)).toEqual([
      10, 10
    ]);
  });

  it('never leaves an empty batch', () => {
    expect(pack([])).toEqual([]);
    expect(pack([owner(5000)])).toEqual([[owner(5000)]]);
  });
});

describe('finish', () => {
  Object.assign(env, {
    OWNER_REPO_PAGES: '10',
    REFRESH_TIERS: '1000:1,0:30',
    REPO_MIN_STARS: '50',
    SWEEP_DAYS: '7',
    STREAMS: '2',
    ADMINS: ''
  });
  afterEach(() => vi.unstubAllGlobals());

  const big = (id: number): Owner => ({
    id,
    login: `big${id}`,
    kind: 0,
    repos: 150,
    name: null,
    followers: null,
    joined: null,
    list: [{ id: id * 10, name: 'a', stars: 100, language: null, description: null, created: 1 }],
    cursor: 'page2'
  });
  const done: Owner = { ...big(3), cursor: undefined };
  const lastPage = {
    login: 'x',
    databaseId: 1,
    __typename: 'User',
    repositories: {
      totalCount: 150,
      pageInfo: { hasNextPage: false, endCursor: null },
      nodes: [
        { databaseId: 99, name: 'b', stargazerCount: 7, description: null, primaryLanguage: null }
      ]
    }
  };
  const answer = (data: object) =>
    vi.stubGlobal('fetch', async () => new Response(JSON.stringify({ data }), { status: 200 }));

  it('adds the next page and finishes the walk', async () => {
    answer({ o0: lastPage });
    const [owner] = await finish([big(1)], async () => ({ token: 't', wait: 0 }));
    expect(owner.list.map((repo) => repo.stars)).toEqual([100, 7]);
    expect(owner.cursor).toBeUndefined();
  });

  it('drops an owner whose walk the pool cut short, but keeps the finished ones', async () => {
    const owners = await finish([big(1), done], async () => ({ wait: 60_000 }));
    expect(owners.map((owner) => owner.id)).toEqual([3]);
  });

  it('drops owners still mid-walk when the pool runs dry between two groups of a page', async () => {
    const more = {
      ...lastPage,
      repositories: {
        ...lastPage.repositories,
        pageInfo: { hasNextPage: true, endCursor: 'page3' }
      }
    };
    answer({ o0: more, o1: more, o2: more, o3: more });
    let calls = 0;
    const owners = await finish([1, 2, 4, 5, 6].map(big), async () =>
      calls++ ? { wait: 60_000 } : { token: 't', wait: 0 }
    );
    expect(owners).toEqual([]);
  });

  it('drops an owner whose page came back empty rather than calling it complete', async () => {
    answer({ o0: lastPage, o1: null });
    const owners = await finish([big(1), big(2)], async () => ({ token: 't', wait: 0 }));
    expect(owners.map((owner) => owner.id)).toEqual([1]);
  });
});
