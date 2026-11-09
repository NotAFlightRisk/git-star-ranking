import { describe, expect, it } from 'vitest';
import {
  bands,
  competition,
  histogram,
  nextUp,
  percentile,
  rankOf,
  starsFor
} from '../../../src/lib/server/rank.ts';

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

describe('nextUp', () => {
  it('points at the next count up and the rank it brings', () => {
    expect(nextUp(spread, 100)).toEqual({ stars: 500, rank: 2 });
    expect(nextUp(spread, 600)).toEqual({ stars: 900, rank: 1 });
    expect(nextUp(spread, 10)).toEqual({ stars: 100, rank: 4 });
  });

  it('has nowhere to go from the top', () => {
    expect(nextUp(spread, 900)).toBeUndefined();
    expect(nextUp(spread, 2_000)).toBeUndefined();
  });
});

describe('starsFor', () => {
  it('finds the fewest stars that still rank inside the share', () => {
    expect(starsFor(spread, 0.5)).toBe(500);
    expect(starsFor(spread, 1)).toBe(100);
  });

  it('always lets the leader in, however small the share', () => {
    expect(starsFor(spread, 0.001)).toBe(900);
  });
});

describe('bands', () => {
  it('counts every account once, in log steps from the least to the most', () => {
    const steps = bands(spread);
    expect(steps.map(({ from }) => from)).toEqual([100, 160, 250, 400, 630]);
    expect(steps.at(-1)).toEqual({ from: 630, to: 1000, count: 1 });
    expect(steps.find(({ from }) => from === 400)?.count).toBe(2);
    expect(steps.reduce((sum, { count }) => sum + count, 0)).toBe(spread.total);
  });

  it('starts at one star and stays whole', () => {
    const small = histogram([
      { stars: 7, n: 1 },
      { stars: 1, n: 4 }
    ]);
    expect(bands(small).map(({ from, to }) => [from, to])).toEqual([
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 6],
      [6, 10]
    ]);
    expect(bands(histogram([]))).toEqual([]);
  });
});
