import { env } from 'cloudflare:workers';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { histogram } from '../../../src/lib/server/rank.ts';
import {
  best,
  climb,
  headlineOf,
  leads,
  standout
} from '../../../src/lib/server/widgets/claims.ts';
import { accountFacts, repoFacts } from '../../../src/lib/server/widgets/facts.ts';
import type { Facts, RepoFact } from '../../../src/lib/server/widgets/facts.ts';
import { headline } from '../../../src/lib/server/widgets/headline.ts';
import { widget } from '../../../src/lib/server/widgets/index.ts';
import { languageLeader } from '../../../src/lib/server/widgets/languages.ts';
import { podium } from '../../../src/lib/server/widgets/podium.ts';
import { rankCard, summarise } from '../../../src/lib/server/widgets/rank.ts';
import { pieces, starMap } from '../../../src/lib/server/widgets/star-map.ts';
import { trophies, trophyCase } from '../../../src/lib/server/widgets/trophies.ts';
import { readWidget } from '../../../src/lib/widgets.ts';
import { memoryD1 } from '../../d1.ts';

const options = (query = '') => readWidget(new URLSearchParams(query));

const repo = (name: string, stars: number, language: string, overall: number, local?: number) =>
  ({
    name,
    stars,
    language,
    overall: { rank: overall, of: 400_000 },
    local: local === undefined ? undefined : { rank: local, of: 20_000 }
  }) satisfies RepoFact;

const ranked: Facts = {
  name: 'octocat',
  noun: 'user',
  stars: 50_000,
  counted: true,
  rank: { rank: 2, of: 120_000 },
  moved: { from: 5, to: 2 },
  club: { least: 10_000, members: 21, of: 120_000 },
  repos: [
    repo('hello-world', 42_000, 'Rust', 900, 7),
    repo('spoon-knife', 6_000, 'Go', 2_400, 300),
    repo('linguist', 1_500, 'Rust', 9_000, 60)
  ],
  languages: [
    { language: 'Rust', repos: 2, stars: 43_500 },
    { language: 'Go', repos: 1, stars: 6_000 }
  ]
};
const unranked: Facts = {
  name: 'newcomer',
  noun: 'user',
  stars: 400,
  counted: true,
  repos: [repo('dotfiles', 300, 'Go', 150_000, 900)],
  languages: [{ language: 'Go', repos: 1, stars: 300 }]
};
const project: Facts = {
  name: 'octocat/hello-world',
  noun: 'repo',
  stars: 42_000,
  counted: true,
  rank: { rank: 900, of: 400_000 },
  club: { least: 10_000, members: 2_000, of: 400_000 },
  repos: [ranked.repos[0]],
  languages: []
};

describe('climb', () => {
  it('counts places gained, and marks a newcomer', () => {
    expect(climb({ from: 9, to: 4 })).toBe(5);
    expect(climb({ from: null, to: 4 })).toBe('new');
  });

  it('leaves out a fall, or standing still', () => {
    expect(climb({ from: 4, to: 9 })).toBeUndefined();
    expect(climb({ from: 4, to: 4 })).toBeUndefined();
  });
});

describe('standings', () => {
  it("takes a repo's place in its language when that's the more exclusive", () => {
    expect(best(ranked.repos[0])?.label).toBe('#7 in Rust');
    expect(best(repo('x', 10, 'Go', 3, 2_000))?.label).toBe('#3 of all repos');
  });

  it('only calls a place notable in the top 1,000 of a language or 10,000 overall', () => {
    expect(standout(ranked)?.label).toBe('#7 in Rust');
    expect(standout(unranked)?.label).toBe('#900 in Go');
    expect(standout({ ...unranked, repos: [repo('x', 60, 'Go', 300_000, 5_000)] })).toBeUndefined();
  });

  it("leads with each language's most starred repo, best place first", () => {
    expect(leads(ranked).map((lead) => `${lead.name} ${lead.local.rank}`)).toEqual([
      'hello-world 7',
      'spoon-knife 300'
    ]);
  });
});

describe('headlineOf', () => {
  it('picks the most exclusive claim', () => {
    expect(headlineOf(ranked, 'auto').line).toBe('#2 most starred GitHub user');
    expect(headlineOf(project, 'auto').line).toBe('#7 most starred Rust repo on GitHub');
    expect(headlineOf(unranked, 'auto')).toMatchObject({
      line: 'Home of the #900 Go repo on GitHub',
      detail: 'newcomer/dotfiles · 300 stars'
    });
  });

  it('says what was asked for, or the best it has when it lacks that', () => {
    expect(headlineOf(ranked, 'club').line).toBe('One of 21 GitHub users with 10k+ stars');
    expect(headlineOf(project, 'rank').line).toBe('#900 most starred repo on GitHub');
    expect(headlineOf(unranked, 'rank').claim).toBe('language');
  });

  it('falls back to its stars', () => {
    expect(headlineOf({ ...unranked, repos: [] }, 'auto').line).toBe('400 stars on GitHub');
  });
});

describe('summarise', () => {
  const labels = (facts: Facts) => summarise(facts).rows.map((row) => row.label);

  it('leads with the rank, and its tier', () => {
    expect(summarise(ranked)).toMatchObject({ hero: { value: '#2' }, tier: 10 });
    expect(labels(ranked)).toEqual(['Stars', 'Top repo', 'This week']);
    expect(labels(project)).toEqual(['Stars', 'In Rust', '10k+ club']);
  });

  it('leads with stars and its best place when an account is too small to rank fairly', () => {
    const { hero, tier, rows } = summarise(unranked);
    expect(hero).toMatchObject({ value: '400', caption: 'stars on GitHub' });
    expect(tier).toBeUndefined();
    expect(rows.at(-1)).toEqual({ label: 'Best place', value: '#900 in Go' });
  });
});

describe('trophies', () => {
  const earned = (facts: Facts) => trophies(facts).map(({ icon, level }) => `${icon}${level}`);

  it('levels each one by how far it went', () => {
    expect(earned(ranked)).toEqual(['star3', 'repo3', 'podium4', 'code3', 'up1']);
    expect(earned(project)).toEqual(['star3', 'podium2', 'code3']);
  });

  it('has none until 100 stars', () => {
    expect(trophies({ ...unranked, stars: 99, repos: [] })).toEqual([]);
    expect(trophyCase({ ...unranked, stars: 99, repos: [] }, options())).toBeUndefined();
  });
});

describe('star map', () => {
  it('covers every star, with the rest in tiles of their own', () => {
    const drawn = pieces({ ...ranked, stars: 52_000 });
    expect(drawn.map((piece) => piece.label)).toEqual([
      'hello-world',
      'spoon-knife',
      'Smaller repos',
      'linguist'
    ]);
    expect(drawn.reduce((sum, piece) => sum + piece.stars, 0)).toBe(52_000);
  });

  it('colours the biggest languages, greys any other, and keys them', () => {
    expect(pieces(ranked).map((piece) => piece.slot)).toEqual([1, 2, 1, undefined]);
    const svg = starMap(ranked, options())!;
    expect(svg).toContain('>Rust</text>');
    expect(svg).not.toContain('>Other</text>');
    const zig = { ...ranked, repos: [...ranked.repos, repo('ziggy', 1_000, 'Zig', 12_000)] };
    expect(starMap(zig, options())).toContain('>Other</text>');
  });

  it('needs two repos', () => {
    expect(starMap(unranked, options())).toBeUndefined();
  });
});

describe('podium', () => {
  it('puts first in the middle, each with its best place', () => {
    const svg = podium(ranked, options())!;
    const names = [
      ...svg.matchAll(/font-weight="700" text-anchor="middle" class="text">([a-z-]+)</g)
    ];
    expect(names.map(([, name]) => name)).toEqual(['spoon-knife', 'hello-world', 'linguist']);
    expect(svg).toContain('>#7 in Rust</text>');
  });

  it('needs two repos', () => {
    expect(podium(unranked, options())).toBeUndefined();
  });
});

describe('language leader', () => {
  it("lists each language's best place in the top 1,000, best first", async () => {
    const svg = (await languageLeader(ranked, options()))!;
    expect(svg.indexOf('>Rust</text>')).toBeLessThan(svg.indexOf('>Go</text>'));
    // with no sprite to hand, each language gets a dot
    expect(svg).toContain('<circle class="muted"');
  });

  it('has nothing for an account outside every top 1,000', async () => {
    const far = { ...unranked, repos: [repo('x', 60, 'Go', 300_000, 5_000)] };
    expect(await languageLeader(far, options())).toBeUndefined();
  });
});

describe('drawing', () => {
  const all = async (facts: Facts, query = '') => {
    const drawn = [
      rankCard(facts, options(query)),
      rankCard(facts, options(`layout=strip&${query}`)),
      headline(facts, options(query)),
      trophyCase(facts, options(query)),
      starMap(facts, options(query)),
      podium(facts, options(query)),
      await languageLeader(facts, options(query))
    ];
    return drawn.filter((svg) => svg !== undefined);
  };

  it('scales cleanly, and always signs itself', async () => {
    const drawn = await all(ranked);
    expect(drawn).toHaveLength(7);
    for (const svg of drawn) {
      const [, width, height, box] = svg.match(/width="(\d+)" height="(\d+)" viewBox="([^"]+)"/)!;
      expect(box).toBe(`0 0 ${width} ${height}`);
      expect(svg).toContain('>git-star-ranking.com</text>');
    }
  });

  it('follows the reader into dark mode only when auto', () => {
    expect(rankCard(ranked, options())).toContain('@media (prefers-color-scheme:dark)');
    expect(rankCard(ranked, options('theme=dark'))).not.toContain('@media');
  });

  it('picks text colours to suit a background of its own', () => {
    expect(rankCard(ranked, options('bg=fff8e7'))).toContain('.text{fill:#1f2328}');
    expect(rankCard(ranked, options('bg=1a1b27'))).toContain('.text{fill:#f0f6fc}');
    expect(rankCard(ranked, options('accent=ffeb3b'))).toContain('.on-accent{fill:#1f2328}');
  });

  it('escapes what it says, so no name can write markup', async () => {
    const sly = {
      ...ranked,
      name: '<script>"x"</script>',
      repos: [repo('<b>"x"</b>', 42_000, 'Rust', 90, 7), ...ranked.repos]
    };
    for (const svg of await all(sly)) {
      expect(svg).not.toMatch(/<script>|<b>/);
    }
  });

  it('squares every corner when asked', () => {
    expect(trophyCase(ranked, options('radius=0'))).not.toMatch(/rx="[1-9]/);
  });

  it('cuts a long name short rather than running over', () => {
    const svg = rankCard({ ...ranked, name: 'a'.repeat(39) }, options());
    expect(svg).toMatch(/>a+…<\/text>/);
  });
});

describe('loading and serving', () => {
  const at = Date.UTC(2026, 10, 12);
  const users = histogram([
    { stars: 300_000, n: 1 },
    { stars: 50_000, n: 20 },
    { stars: 400, n: 2_000 }
  ]);
  const files: Record<string, unknown> = {
    meta: {
      at,
      boards: {
        users: { total: 2, pages: 1 },
        organizations: { total: 0, pages: 0 },
        repositories: { total: 51, pages: 1 }
      },
      languages: [{ name: 'Rust', slug: 'rust', pages: 1 }]
    },
    'hist/users': users,
    'hist/repositories': histogram([
      { stars: 9_000, n: 1 },
      { stars: 500, n: 50 }
    ]),
    'hist/repositories/rust': histogram([{ stars: 9_000, n: 1 }]),
    'history/users/2026-11-12': [7, 1],
    'history/users/2026-11-05': [7, 9, 1]
  };

  beforeAll(() => {
    const d1 = memoryD1();
    d1.db.exec(`
      INSERT INTO owners (id, login, kind, stars, repos, refreshed_at, hidden) VALUES
        (1, 'big', 0, 50000, 3, 1, 0), (2, 'small', 0, 400, 2, 1, 0),
        (3, 'stub', 0, 2000, 0, 0, 0), (4, 'gone', 0, 9000, 1, 1, 1),
        (5, 'polyglot', 0, 7000, 7, 1, 0);
      INSERT INTO repos (id, owner_id, name, stars, language) VALUES
        (10, 1, 'engine', 9000, 'Rust'), (11, 1, 'site', 500, 'HTML'),
        (20, 2, 'dotfiles', 300, NULL),
        (30, 5, 'a', 1000, 'Nix'), (31, 5, 'b', 1000, 'TeX'), (32, 5, 'c', 1000, 'Lua'),
        (33, 5, 'd', 1000, 'Elm'), (34, 5, 'e', 1000, 'Vue'), (35, 5, 'f', 1000, 'Zig'),
        (36, 5, 'oxide', 900, 'Rust');
    `);
    const get = async (key: string) => (key in files ? { json: async () => files[key] } : null);
    Object.assign(env, { DB: d1, SNAPSHOTS: { get } });
  });

  it('ranks an account big enough to rank fairly, and places its repos', async () => {
    const facts = await accountFacts('big');
    expect(facts).toMatchObject({
      rank: { rank: 2, of: 2_021 },
      moved: { from: 3, to: 2 },
      club: { least: 10_000, members: 21 }
    });
    expect(facts?.repos[0]).toMatchObject({
      name: 'engine',
      overall: { rank: 1, of: 51 },
      local: { rank: 1, of: 1 }
    });
    // HTML has no board of its own
    expect(facts?.repos[1].local).toBeUndefined();
  });

  it('only reads the boards when asked', async () => {
    const facts = await accountFacts('big', false);
    expect(facts?.repos[0]).toEqual({ name: 'engine', stars: 9_000, language: 'Rust' });
    expect(facts?.rank).toBeUndefined();
  });

  it('spends its board reads only on languages that have a board', async () => {
    const facts = await accountFacts('polyglot');
    expect(facts?.repos.find((repo) => repo.name === 'oxide')?.local).toMatchObject({ rank: 2 });
  });

  it("gives a smaller account no rank, though it's on the board", async () => {
    const facts = await accountFacts('small');
    expect(facts).toMatchObject({ stars: 400, counted: true });
    expect(facts?.rank).toBeUndefined();
    expect(facts?.club).toBeUndefined();
  });

  it("knows an account it hasn't counted, and nothing of a hidden one", async () => {
    expect(await accountFacts('stub')).toMatchObject({ counted: false });
    expect(await accountFacts('gone')).toBeUndefined();
  });

  it('ranks a repo overall and in its language', async () => {
    expect(await repoFacts('big', 'engine')).toMatchObject({
      name: 'big/engine',
      rank: { rank: 1 },
      club: { least: 1_000, members: 1 },
      repos: [{ local: { rank: 1 } }]
    });
  });

  const request = (path: string) => new Request(`https://git-star-ranking.com${path}`);

  it('serves a drawn widget for six hours, and a placeholder for five minutes', async () => {
    const drawn = await widget(request('/users/big/rank.svg'), 'rank', 'big');
    expect(drawn.headers.get('content-type')).toBe('image/svg+xml; charset=utf-8');
    expect(drawn.headers.get('content-security-policy')).toContain("style-src 'unsafe-inline'");
    expect(drawn.headers.get('x-browser-cache')).toBe('public, max-age=21600');

    const missing = await widget(request('/users/nobody/trophies.svg'), 'trophies', 'nobody');
    expect(await missing.text()).toContain('Not found');
    expect(missing.headers.get('x-browser-cache')).toBe('public, max-age=300');

    const thin = await widget(request('/users/small/podium.svg'), 'podium', 'small');
    expect(await thin.text()).toContain('A podium needs two repos');
  });

  it("won't look up or draw a repo name GitHub wouldn't allow", async () => {
    const odd = 'x\u0001'.repeat(3);
    await expect(
      widget(request('/repositories/big/x/rank.svg'), 'rank', 'big', odd)
    ).rejects.toMatchObject({ status: 404 });
  });

  it("says so when it can't draw, keeps nothing, and logs why", async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { DB } = env;
    const down = () => {
      throw new Error('D1 is down');
    };
    Object.assign(env, { DB: { prepare: down } });
    try {
      const failed = await widget(request('/users/big/rank.svg?theme=dark'), 'rank', 'big');
      expect(failed.status).toBe(503);
      expect(failed.headers.get('cache-control')).toBe('no-store');
      expect(await failed.text()).toContain('Couldn&#39;t draw this just now');
      expect(logged).toHaveBeenCalledWith(
        'widget',
        expect.objectContaining({ message: 'D1 is down' })
      );
    } finally {
      Object.assign(env, { DB });
      logged.mockRestore();
    }
  });
});
