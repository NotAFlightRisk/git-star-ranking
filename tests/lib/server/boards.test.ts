import { env } from 'cloudflare:workers';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  around,
  languageListing,
  listing,
  neighbours,
  shift
} from '../../../src/lib/server/boards.ts';
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

describe('shift', () => {
  const now = [5, 3, 9, 1];

  it('gives where an entry was and where it is, counting from one', () => {
    expect(shift(now, [3, 1, 5, 9], 9)).toEqual({ from: 4, to: 3 });
    expect(shift(now, [5, 3, 9, 1], 5)).toEqual({ from: 1, to: 1 });
  });

  it("marks an entry that wasn't on the board a week ago", () => {
    expect(shift(now, [3, 5], 9)).toEqual({ from: null, to: 3 });
  });

  it('has nothing for one that has dropped off', () => {
    expect(shift(now, [7, 5], 7)).toBeUndefined();
  });
});

describe('neighbours', () => {
  const entry = (id: number, rank: number) => ({ id, rank, login: `user-${id}`, stars: 0 });
  // pages of three, with three tied at #3 across the break
  const files: Record<string, unknown> = {
    meta: { at: 1, boards: {}, languages: [] },
    'board/users/1': [entry(1, 1), entry(2, 2), entry(3, 3)],
    'board/users/2': [entry(4, 3), entry(5, 3), entry(6, 6)]
  };
  const board = { key: 'users', size: 3, pages: 2 };
  const pageOf = async (id: number, rank: number) => (await neighbours(board, id, rank))?.page;

  beforeAll(() => {
    const get = async (key: string) => (key in files ? { json: async () => files[key] } : null);
    Object.assign(env, { SNAPSHOTS: { get } });
  });

  it('finds an entry on the page its rank points to', async () => {
    expect(await pageOf(2, 2)).toBe(1);
    expect(await pageOf(6, 6)).toBe(2);
  });

  it('looks a page either side when a tie or a later count moved it', async () => {
    expect(await pageOf(5, 3)).toBe(2);
    expect(await pageOf(3, 4)).toBe(1);
  });

  it('gives nothing for an entry off the board', async () => {
    expect(await pageOf(99, 5)).toBeUndefined();
    expect(await pageOf(99, 40)).toBeUndefined();
  });
});
