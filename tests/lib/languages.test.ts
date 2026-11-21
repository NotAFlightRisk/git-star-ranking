import * as icons from 'simple-icons';
import { describe, expect, it } from 'vitest';
import { drawn, icon, tone } from '../../src/lib/languages.ts';

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

describe('language colours', () => {
  it("uses GitHub's own colour for a language it knows", () => {
    expect(tone('TypeScript')).toBe('#3178c6');
    expect(tone('PowerShell')).toBe('#012456');
  });

  it('greys out unknown languages, repos with none and Object builtins', () => {
    expect(tone('Brainfuck')).toBe('var(--series-other)');
    expect(tone(null)).toBe('var(--series-other)');
    expect(tone('constructor')).toBe('var(--series-other)');
  });
});
