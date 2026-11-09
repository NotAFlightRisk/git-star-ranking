import { describe, expect, it } from 'vitest';
import { boardPath, span, trend } from '../../src/lib/format.ts';

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

describe('boardPath', () => {
  it('leaves out the first page and a language not asked for', () => {
    expect(boardPath('/users')).toBe('/users');
    expect(boardPath('/users', 3, null)).toBe('/users?page=3');
  });

  it('spells a language the way the sitemap and language links do', () => {
    expect(boardPath('/repositories', 2, 'Jupyter Notebook')).toBe(
      '/repositories?language=jupyter%20notebook&page=2'
    );
    expect(boardPath('/repositories', 1, 'C++')).toBe('/repositories?language=c%2B%2B');
  });
});

describe('span', () => {
  it('reads in its biggest whole unit', () => {
    expect(span(30_000)).toBe('0 minutes');
    expect(span(60_000)).toBe('1 minute');
    expect(span(3 * 3_600_000 + 59 * 60_000)).toBe('3 hours');
    expect(span(47 * 3_600_000)).toBe('47 hours');
    expect(span(3 * 86_400_000)).toBe('3 days');
  });

  it('treats time already passed as none', () => {
    expect(span(-5_000)).toBe('0 minutes');
  });
});
