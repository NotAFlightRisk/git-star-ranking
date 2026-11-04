import { describe, expect, it } from 'vitest';
import { competition, histogram, percentile, rankOf } from '../../../src/lib/server/rank.ts';

const spread = histogram([
  { stars: 900, n: 1 },
  { stars: 500, n: 2 },
  { stars: 100, n: 3 }
]);

describe('rankOf', () => {
  it('gives tied accounts the same rank and skips the next', () => {
    expect([900, 500, 100].map((stars) => rankOf(spread, stars))).toEqual([1, 2, 4]);
  });

  it('ranks a count we have never seen between its neighbours', () => {
    expect(rankOf(spread, 600)).toBe(2);
    expect(rankOf(spread, 1_000)).toBe(1);
    expect(rankOf(spread, 50)).toBe(7);
  });
});

describe('competition', () => {
  it('matches the histogram for a sorted top list', () => {
    const rows = [900, 500, 500, 100, 100, 100].map((stars, id) => ({ id, stars }));
    expect(competition(rows).map(({ rank }) => rank)).toEqual([1, 2, 2, 4, 4, 4]);
  });
});

describe('percentile', () => {
  it('counts the account itself, so the leader is in the top sixth of six', () => {
    expect(percentile(spread, 900)).toBeCloseTo(1 / 6);
  });

  it('never goes past everyone', () => {
    expect(percentile(spread, 1)).toBe(1);
    expect(percentile(histogram([]), 10)).toBe(1);
  });
});
