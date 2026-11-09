import { describe, expect, it } from 'vitest';
import { readBadge, type BadgeOptions } from '../../../src/lib/badges.ts';
import { render } from '../../../src/lib/server/badge-svg.ts';
import { draw, endpoint, type Facts } from '../../../src/lib/server/badge.ts';

const ranked: Facts = {
  stars: 12_345,
  rank: { rank: 1_234, top: 0.004, of: 300_000 },
  language: 'TypeScript',
  inLanguage: { rank: 12, top: 0.001, of: 9_000 }
};
const options = (query = '') => readBadge(new URLSearchParams(query), 'repo');
const svg = (facts: Facts | undefined, query = '') => render(draw(facts, options(query)));

describe('draw', () => {
  it('shows each kind of value', () => {
    const says = (query: string) => {
      const { label, message } = draw(ranked, options(query));
      return `${label}: ${message}`;
    };
    expect(says('')).toBe('git rank: #1,234');
    expect(says('show=top')).toBe('git rank: top 0.4%');
    expect(says('show=stars')).toBe('stars: 12.3k');
    expect(says('show=language')).toBe('git rank: #12 in TypeScript');
  });

  it('greys out what it has no value for, whatever colour was asked', () => {
    const unranked = draw({ stars: 3 }, options('color=red'));
    expect(unranked).toMatchObject({ message: 'unranked', color: '#6e7781' });
    expect(draw(undefined, options('show=stars'))).toMatchObject({ message: 'not found' });
  });

  it('takes colours by hex or by Shields name', () => {
    expect(draw(ranked, options('color=f80&labelColor=green'))).toMatchObject({
      color: '#ff8800',
      labelColor: '#67ac09'
    });
  });
});

describe('render', () => {
  it('sizes each style as Shields does', () => {
    const height = (style: string) => svg(ranked, `style=${style}`).match(/height="(\d+)"/)?.[1];
    expect(height('flat')).toBe('20');
    expect(height('plastic')).toBe('18');
    expect(height('for-the-badge')).toBe('28');
    expect(svg(ranked, 'style=for-the-badge')).toContain('>#1,234</text>');
    expect(svg(ranked, 'style=social&label=git rank')).toContain('>Git rank</text>');
  });

  it('measures text rather than counting letters', () => {
    const width = (label: string) =>
      Number(svg(ranked, `label=${label}`).match(/width="(\d+)"/)?.[1]);
    expect(width('WWWW')).toBeGreaterThan(width('iiii') + 20);
  });

  it('escapes labels, so a URL cannot write markup', () => {
    const drawn = svg(ranked, `label=${encodeURIComponent('<script>"x"</script>')}`);
    expect(drawn).not.toContain('<script>');
    expect(drawn).toContain('&#60;script&#62;&#34;x&#34;');
  });

  it('puts dark text on light colours', () => {
    expect(svg(ranked, 'color=ffeb3b')).toContain('fill="#333"');
    expect(svg(ranked)).not.toContain('fill="#333"');
  });

  it('adds the star only when asked', () => {
    expect(svg(ranked, 'icon=star')).toContain('viewBox="0 0 16 16"');
    expect(svg(ranked)).not.toContain('viewBox');
  });
});

describe('endpoint', () => {
  it('hands Shields what it needs to draw the same badge', () => {
    const drawn = draw(ranked, options('style=flat-square&icon=star'));
    expect(endpoint(drawn)).toMatchObject({
      schemaVersion: 1,
      label: 'git rank',
      message: '#1,234',
      color: '#0b5cc4',
      style: 'flat-square',
      logoSvg: expect.stringContaining('<svg')
    });
    const plain: BadgeOptions = { show: 'rank', style: 'flat' };
    expect(endpoint(draw(ranked, plain)).logoSvg).toBeUndefined();
  });

  it('keeps for an hour, or less when asked', () => {
    const drawn = draw(undefined, options());
    expect(endpoint(drawn).cacheSeconds).toBe(3600);
    expect(endpoint(drawn, 300).cacheSeconds).toBe(300);
  });
});
