import * as icons from 'simple-icons';
import { describe, expect, it } from 'vitest';
import { drawn, icon } from '../../src/lib/languages.ts';

describe('language icons', () => {
  it('only maps to glyphs simple-icons still has', () => {
    const slugs = new Set(Object.values(icons).map((glyph) => glyph.slug));
    expect([...drawn].filter((slug) => !slugs.has(slug))).toEqual([]);
  });

  it('leaves languages without a fair match blank', () => {
    expect(icon('C++')).toBe('cplusplus');
    expect(icon('PowerShell')).toBeUndefined();
    expect(icon('constructor')).toBeUndefined();
  });
});
