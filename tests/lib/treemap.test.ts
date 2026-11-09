import { describe, expect, it } from 'vitest';
import { squarify } from '../../src/lib/treemap.ts';

const sizes = [500, 300, 120, 50, 20, 6, 3, 1];
const tiles = squarify(sizes, (n) => n, 3, 2);

describe('squarify', () => {
  it('gives each item its share of the area, and fills the lot', () => {
    for (const tile of tiles) {
      expect(tile.width * tile.height).toBeCloseTo((tile.item / 1_000) * 6);
    }
    expect(tiles.reduce((sum, t) => sum + t.width * t.height, 0)).toBeCloseTo(6);
  });

  it('keeps every tile inside the box without overlapping another', () => {
    for (const [i, a] of tiles.entries()) {
      expect(a.x).toBeGreaterThanOrEqual(-1e-9);
      expect(a.y).toBeGreaterThanOrEqual(-1e-9);
      expect(a.x + a.width).toBeLessThanOrEqual(3 + 1e-9);
      expect(a.y + a.height).toBeLessThanOrEqual(2 + 1e-9);
      for (const b of tiles.slice(i + 1)) {
        const apart =
          a.x + a.width <= b.x + 1e-9 ||
          b.x + b.width <= a.x + 1e-9 ||
          a.y + a.height <= b.y + 1e-9 ||
          b.y + b.height <= a.y + 1e-9;
        expect(apart).toBe(true);
      }
    }
  });

  it('leaves out anything with nothing to show', () => {
    expect(squarify([5, 0], (n) => n).map(({ item }) => item)).toEqual([5]);
    expect(squarify([], (n: number) => n)).toEqual([]);
  });
});
