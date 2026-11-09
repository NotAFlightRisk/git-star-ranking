import { describe, expect, it } from 'vitest';
import { around } from '../../../src/lib/server/boards.ts';

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
