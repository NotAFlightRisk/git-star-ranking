import { describe, expect, it } from 'vitest';
import { searchQuery, split, type Job } from '../../../src/lib/server/sweep.ts';

const root: Job = { type: 'slice', sweep: 'test', min: 50, max: 10_000_000 };
const single = { ...root, min: 50, max: 50 };

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
    const now = Date.parse('2026-11-04T00:00:00.400Z');
    const [early, late] = split(single, now)!;
    expect(early.from).toBe('2007-10-01T00:00:00Z');
    expect(late.to).toBe('2026-11-04T00:00:00Z');
    expect(Date.parse(late.from!) - Date.parse(early.to!)).toBe(1000);
  });

  it('keeps splitting down to single seconds, then stops', () => {
    const two = { ...single, from: '2020-01-01T00:00:00Z', to: '2020-01-01T00:00:01Z' };
    expect(split(two)).toEqual([
      { ...two, to: '2020-01-01T00:00:00Z' },
      { ...two, from: '2020-01-01T00:00:01Z' }
    ]);
    expect(split({ ...two, to: two.from })).toBeUndefined();
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
