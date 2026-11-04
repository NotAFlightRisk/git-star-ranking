import { describe, expect, it } from 'vitest';
import { parseTiers, refreshDays } from '../../../src/lib/server/config.ts';

describe('refreshDays', () => {
  const tiers = parseTiers('0:30,1000:1,100:7');

  it('sorts the tiers so the biggest threshold wins', () => {
    expect(refreshDays(250_000, tiers)).toBe(1);
    expect(refreshDays(1_000, tiers)).toBe(1);
    expect(refreshDays(999, tiers)).toBe(7);
    expect(refreshDays(0, tiers)).toBe(30);
  });
});
