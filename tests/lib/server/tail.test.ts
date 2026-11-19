import { describe, expect, it } from 'vitest';
import { ROUGH_BELOW, TAIL } from '../../../src/lib/server/tail.ts';

describe('TAIL', () => {
  it('starts at 1 star and thins out towards the cut', () => {
    for (const tail of Object.values(TAIL)) {
      const stars = tail.map(([at]) => at);
      const times = tail.map(([, by]) => by);
      expect(stars[0]).toBe(1);
      expect(stars.at(-1)).toBeLessThan(ROUGH_BELOW);
      expect(stars).toEqual([...new Set(stars)].sort((a, b) => a - b));
      expect(times).toEqual([...new Set(times)].sort((a, b) => b - a));
      expect(Math.min(...times)).toBeGreaterThan(1);
    }
  });
});
