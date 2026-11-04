import { describe, expect, it } from 'vitest';
import { PAGE_SIZE } from '../../../src/lib/server/config.ts';
import { outOfShape, type Meta } from '../../../src/lib/server/snapshot.ts';

const cut = (size: (board: keyof typeof PAGE_SIZE) => number | undefined): Meta => ({
  at: 0,
  boards: {
    users: { total: 1, pages: 1, size: size('users') },
    organizations: { total: 1, pages: 1, size: size('organizations') },
    repositories: { total: 1, pages: 1, size: size('repositories') }
  },
  languages: []
});

describe('outOfShape', () => {
  it('rebuilds a snapshot cut before it said how big its pages were', () => {
    expect(outOfShape(cut(() => undefined))).toBe(true);
  });

  it('rebuilds one cut at another page size, and leaves one cut at this one', () => {
    expect(outOfShape(cut((board) => (board === 'users' ? 50 : PAGE_SIZE[board])))).toBe(true);
    expect(outOfShape(cut((board) => PAGE_SIZE[board]))).toBe(false);
  });
});
