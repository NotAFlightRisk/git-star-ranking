import { describe, expect, it } from 'vitest';
import { around, languageListing, listing } from '../../../src/lib/server/boards.ts';
import type { Meta } from '../../../src/lib/server/snapshot.ts';

const rows = Array.from({ length: 10 }, (_, id) => ({ id }));
const ids = (list?: { id: number }[]) => list?.map(({ id }) => id);

describe('around', () => {
  it('centres on the row asked for', () => {
    expect(ids(around(rows, 5))).toEqual([3, 4, 5, 6, 7]);
  });

  it('slides along at either end rather than coming up short', () => {
    expect(ids(around(rows, 0))).toEqual([0, 1, 2, 3, 4]);
    expect(ids(around(rows, 9))).toEqual([5, 6, 7, 8, 9]);
    expect(ids(around(rows.slice(0, 3), 1))).toEqual([0, 1, 2]);
  });

  it('gives nothing for someone not on the page', () => {
    expect(around(rows, 42)).toBeUndefined();
  });
});

describe('listing', () => {
  const meta: Meta = {
    at: 0,
    boards: {
      users: { total: 250, pages: 3 },
      organizations: { total: 10, pages: 1, size: 100 },
      repositories: { total: 900, pages: 18, size: 50 }
    },
    languages: [{ name: 'C++', slug: 'c%2B%2B', pages: 3 }]
  };

  it("finds a board's pages, at today's size when the snapshot didn't say", () => {
    expect(listing(meta, 'users')).toEqual({ key: 'users', size: 100, pages: 3 });
    expect(listing(meta, 'repositories')).toEqual({ key: 'repositories', size: 50, pages: 18 });
  });

  it('finds a language by name, and only one with a board', () => {
    expect(languageListing(meta, 'C++')).toEqual({
      key: 'repositories/c%2B%2B',
      size: 50,
      pages: 3
    });
    expect(languageListing(meta, 'Zig')).toBeUndefined();
    expect(languageListing(meta, null)).toBeUndefined();
  });
});
