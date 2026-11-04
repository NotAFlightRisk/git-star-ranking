import { describe, expect, it } from 'vitest';
import { pack, searchQuery, split, type Job } from '../../../src/lib/server/crawl.ts';

const root: Job = { type: 'slice', sweep: 'test', min: 50, max: 10_000_000 };

describe('split', () => {
  it('halves a star range geometrically, highest stars first, with no gap or overlap', () => {
    const [high, low] = split(root)!;
    expect(high.max).toBe(root.max);
    expect(low.min).toBe(root.min);
    expect(high.min).toBe(low.max + 1);
    expect(low.max).toBe(Math.floor(Math.sqrt(50 * 10_000_000)));
  });

  it('always makes progress on a range of two', () => {
    const [high, low] = split({ ...root, min: 50, max: 51 })!;
    expect([low.min, low.max, high.min, high.max]).toEqual([50, 50, 51, 51]);
  });

  it('falls back to creation dates once a slice is one star count', () => {
    const now = Date.parse('2026-11-04T00:00:00Z');
    const [early, late] = split({ ...root, min: 50, max: 50 }, now)!;
    expect(early.from).toBe('2007-10-01T00:00:00Z');
    expect(late.to).toBe('2026-11-04T00:00:00Z');
    expect(Date.parse(late.from!) - Date.parse(early.to!)).toBe(1000);
  });

  it('gives up on a single star count inside two hours', () => {
    const job = {
      ...root,
      min: 50,
      max: 50,
      from: '2020-01-01T00:00:00Z',
      to: '2020-01-01T01:00:00Z'
    };
    expect(split(job)).toBeUndefined();
  });
});

describe('searchQuery', () => {
  it('adds the date window only when there is one', () => {
    expect(searchQuery(root)).toBe('stars:50..10000000');
    expect(searchQuery({ ...root, from: '2020-01-01T00:00:00Z', to: '2020-02-01T00:00:00Z' })).toBe(
      'stars:50..10000000 created:2020-01-01T00:00:00Z..2020-02-01T00:00:00Z'
    );
  });
});

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
