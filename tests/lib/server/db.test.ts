import { describe, expect, it } from 'vitest';
import { range } from '../../../src/lib/server/db.ts';

// how a NOCASE column sees a login against the bounds
const within = (login: string, [low, high]: string[]) =>
  login.toLowerCase() >= low.toLowerCase() && login.toLowerCase() < high.toLowerCase();

describe('range', () => {
  it('finds a login whatever case the search was typed in', () => {
    for (const typed of ['jazz', 'JAZZ', 'JazZ', 'bobz', 'BobZ']) {
      expect(within(`${typed}band`, range(typed))).toBe(true);
    }
  });

  it('leaves out logins that only share the start of the prefix', () => {
    expect(within('jazy', range('JAZZ'))).toBe(false);
    expect(within('jb', range('JAZZ'))).toBe(false);
  });
});
