import { describe, expect, it } from 'vitest';
import { histogram } from '../../../src/lib/server/rank.ts';
import { club } from '../../../src/lib/server/repo.ts';

const board = histogram([
  { stars: 20_000, n: 1 },
  { stars: 5_000, n: 2 },
  { stars: 900, n: 4 }
]);

describe('club', () => {
  it('picks the biggest tier a repo has passed, and counts everyone past it', () => {
    expect(club(board, 5_000)).toEqual({ least: 1_000, repos: 3 });
    expect(club(board, 20_000)).toEqual({ least: 10_000, repos: 1 });
  });

  it('counts a repo that crossed the line since the snapshot', () => {
    expect(club(board, 1_200)).toEqual({ least: 1_000, repos: 4 });
  });

  it('leaves out repos short of the first tier', () => {
    expect(club(board, 90)).toBeUndefined();
  });
});
