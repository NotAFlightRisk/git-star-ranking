import { describe, expect, it } from 'vitest';
import { badgeQuery, badgeUrl, FORMATS, hex, readBadge } from '../../src/lib/badges.ts';
import { bare, split, subject } from '../../src/lib/names.ts';

const read = (query: string, kind: 'account' | 'repo' = 'repo') =>
  readBadge(new URLSearchParams(query), kind);

describe('readBadge', () => {
  it('starts from the plain rank badge', () => {
    expect(read('')).toEqual({ show: 'rank', style: 'flat' });
  });

  it('falls back on anything it does not know', () => {
    expect(read('show=forks&style=neon&color=nope&icon=heart')).toEqual({
      show: 'rank',
      style: 'flat'
    });
    expect(read('show=language', 'account').show).toBe('rank');
  });

  it('keeps labels short and printable', () => {
    expect(read(`label=${'a'.repeat(50)}`).label).toHaveLength(40);
    expect(read('label=%20git%0Arank%20').label).toBe('gitrank');
    expect(read('label=%20%20').label).toBeUndefined();
  });

  it('takes colours with or without a hash', () => {
    expect(read('color=%23ABC&labelColor=green')).toMatchObject({
      color: 'abc',
      labelColor: 'green'
    });
  });
});

describe('badgeQuery', () => {
  it('leaves out defaults, so the same badge has one address', () => {
    expect(badgeQuery({ show: 'rank', style: 'flat', label: ' ' }).toString()).toBe('');
    expect(badgeQuery({ show: 'stars', label: 'stars' }).toString()).toBe('show=stars');
  });

  it('round-trips through readBadge', () => {
    const options = read('show=stars&style=social&label=my stars&color=f80&icon=star');
    expect(read(badgeQuery(options).toString())).toEqual(options);
  });
});

describe('badgeUrl', () => {
  const origin = 'https://example.com';

  it('points at our badge, or at Shields reading our endpoint', () => {
    expect(badgeUrl(origin, { login: 'torvalds' })).toBe(`${origin}/users/torvalds/badge.svg`);
    const shields = badgeUrl(origin, { login: 'a', repo: 'b' }, { style: 'plastic' }, 'shields');
    expect(decodeURIComponent(shields)).toBe(
      `https://img.shields.io/endpoint?url=${origin}/repositories/a/b/shields?style=plastic`
    );
  });
});

describe('hex', () => {
  it('spells out short and named colours in full', () => {
    expect(hex('abc')).toBe('#aabbcc');
    expect(hex('blue')).toBe('#007ec6');
    expect(hex('0b5cc4')).toBe('#0b5cc4');
  });
});

describe('FORMATS', () => {
  const image = 'https://example.com/b.svg?a=1&b=2';
  const link = 'https://example.com/me';

  it('writes each format with a link', () => {
    expect(FORMATS.markdown.write(image, 'git rank', link)).toBe(
      `[![git rank](${image})](${link})`
    );
    expect(FORMATS.html.write(image, 'git rank', link)).toBe(
      `<a href="${link}"><img src="https://example.com/b.svg?a=1&amp;b=2" alt="git rank"></a>`
    );
    expect(FORMATS.rst.write(image, 'git rank', link)).toBe(
      `.. image:: ${image}\n   :alt: git rank\n   :target: ${link}`
    );
    expect(FORMATS.asciidoc.write(image, 'git rank', link)).toBe(
      `image:${image}[alt="git rank",link="${link}"]`
    );
  });

  it('leaves the link off when not wanted', () => {
    expect(FORMATS.markdown.write(image, 'a [b]')).toBe(`![a \\[b\\]](${image})`);
    expect(FORMATS.url.write(image, 'git rank', link)).toBe(image);
  });
});

describe('split', () => {
  it('reads names, handles, pairs and links', () => {
    expect(split('@torvalds')).toEqual({ owner: 'torvalds', repo: undefined });
    expect(split('https://github.com/torvalds/')).toEqual({ owner: 'torvalds', repo: undefined });
    expect(split('github.com/facebook/react.git')).toEqual({ owner: 'facebook', repo: 'react' });
    expect(split('https://github.com/a/b/tree/main/src')).toEqual({ owner: 'a', repo: 'b' });
    expect(bare('github.com/sveltejs')).toBe('sveltejs');
  });

  it('keeps a typed slash, as the repo is still to come', () => {
    expect(split('facebook/')).toEqual({ owner: 'facebook', repo: '' });
  });
});

describe('subject', () => {
  it('turns down names GitHub would not allow', () => {
    expect(subject('torvalds')).toEqual({ login: 'torvalds' });
    expect(subject('-bad')).toBeUndefined();
    expect(subject('a', '')).toBeUndefined();
    expect(subject('a', 'b c')).toBeUndefined();
  });
});
