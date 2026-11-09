import { describe, expect, it } from 'vitest';
import { PAGE_SIZE } from '../../../src/lib/server/config.ts';
import { byLanguage, outOfShape, type Meta } from '../../../src/lib/server/snapshot.ts';

const cut = (size: (board: keyof typeof PAGE_SIZE) => number | undefined): Meta => ({
  at: 0,
  boards: {
    users: { total: 1, pages: 1, size: size('users') },
    organizations: { total: 1, pages: 1, size: size('organizations') },
    repositories: { total: 1, pages: 1, size: size('repositories') }
  },
  languages: []
});

describe('outOfShape', () => {
  it('rebuilds a snapshot cut before it said how big its pages were', () => {
    expect(outOfShape(cut(() => undefined))).toBe(true);
  });

  it('rebuilds one cut at another page size, and leaves one cut at this one', () => {
    expect(outOfShape(cut((board) => (board === 'users' ? 50 : PAGE_SIZE[board])))).toBe(true);
    expect(outOfShape(cut((board) => PAGE_SIZE[board]))).toBe(false);
  });
});

describe('byLanguage', () => {
  it('splits one tally into a histogram per language, most repos first', () => {
    const languages = byLanguage([
      { language: 'Go', stars: 900, n: 1 },
      { language: 'Rust', stars: 800, n: 1 },
      { language: 'Rust', stars: 60, n: 2 },
      { language: 'Zig', stars: 70, n: 1 }
    ]);
    expect(languages.map(({ name }) => name)).toEqual(['Rust', 'Go', 'Zig']);
    expect(languages[0].histogram).toEqual({ stars: [800, 60], above: [0, 1], total: 3 });
  });
});
