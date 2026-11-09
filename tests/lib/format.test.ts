import { describe, expect, it } from 'vitest';
import { trend } from '../../src/lib/format.ts';

describe('trend', () => {
  it('says which way an entry moved, and how far', () => {
    expect(trend({ from: 20, to: 6 })).toBe('Up 14 places this week');
    expect(trend({ from: 6, to: 7 })).toBe('Down 1 place this week');
  });

  it('notices newcomers and those standing still', () => {
    expect(trend({ from: null, to: 4_999 })).toBe('New on the board this week');
    expect(trend({ from: 3, to: 3 })).toBe('Same place as a week ago');
  });
});
