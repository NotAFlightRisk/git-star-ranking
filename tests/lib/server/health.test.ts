import { describe, expect, it } from 'vitest';
import { problems } from '../../../src/lib/server/health.ts';

const HOUR = 3_600_000;
const now = Date.UTC(2026, 10, 9, 12);
const well = { metrics: [], database: 0.1, snapshot: now - HOUR, overdue: now - HOUR };

describe('problems', () => {
  it('has nothing to say while all is well', () => {
    expect(problems(well, now)).toEqual([]);
  });

  it('names metrics past their alert share, and a database filling up', () => {
    expect(problems({ ...well, metrics: ['d1_rows_written'], database: 0.7 }, now)).toEqual([
      'd1_rows_written',
      'database'
    ]);
  });

  it('notices two snapshots in a row gone missing, or none at all', () => {
    expect(problems({ ...well, snapshot: now - 12 * HOUR }, now)).toEqual([]);
    expect(problems({ ...well, snapshot: now - 14 * HOUR }, now)).toEqual(['snapshot']);
    expect(problems({ ...well, snapshot: undefined }, now)).toEqual(['snapshot']);
  });

  it('notices the crawl a day behind, but not an empty queue', () => {
    expect(problems({ ...well, overdue: now - 25 * HOUR }, now)).toEqual(['crawl']);
    expect(problems({ ...well, overdue: undefined }, now)).toEqual([]);
  });
});
