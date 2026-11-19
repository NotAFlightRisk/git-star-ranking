import type { Tail } from './rank.ts';

/** Under this many stars the sweep misses people, so counts there are estimated */
export const ROUGH_BELOW = 250;

/** Sampled from 200k random GitHub account IDs in November 2026 */
export const TAIL: Record<'users' | 'organizations', Tail> = {
  users: [
    [1, 69.1],
    [2, 38.5],
    [160, 1.5]
  ],
  organizations: [
    [1, 16.1],
    [30, 3.2]
  ]
};
