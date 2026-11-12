import { describe, expect, it } from 'vitest';
import { lateness } from '../../src/lib/freshness.ts';

const HOUR = 3_600_000;

describe('lateness', () => {
  it('is fresh through a single missed snapshot', () => {
    expect(lateness(0)).toBe('fresh');
    expect(lateness(12 * HOUR)).toBe('fresh');
  });

  it('is late once two in a row have gone missing, same as the uptime check', () => {
    expect(lateness(14 * HOUR)).toBe('late');
    expect(lateness(23 * HOUR)).toBe('late');
  });

  it('is stale after a whole day without one', () => {
    expect(lateness(25 * HOUR)).toBe('stale');
  });
});
