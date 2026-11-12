import { describe, expect, it } from 'vitest';
import {
  isRepoWidget,
  isWidget,
  readWidget,
  widgetQuery,
  widgetUrl
} from '../../src/lib/widgets.ts';
import type { Widget } from '../../src/lib/widgets.ts';

const read = (query = '') => readWidget(new URLSearchParams(query));

describe('readWidget', () => {
  it('starts from an auto-themed card', () => {
    expect(read()).toEqual({
      layout: 'card',
      claim: 'auto',
      theme: 'auto',
      accent: undefined,
      bg: undefined,
      border: true,
      radius: 6
    });
  });

  it('leaves anything unexpected at its default', () => {
    expect(read('layout=chart&claim=all&theme=neon&accent=nope&bg=url(x)&radius=-3')).toEqual(
      read()
    );
    expect(read('radius=1e3').radius).toBe(6);
  });

  it('keeps the corners within reason', () => {
    expect(read('radius=0').radius).toBe(0);
    expect(read('radius=99').radius).toBe(16);
  });

  it('takes colours by hex or name, and a border left off', () => {
    expect(read('accent=%23F80&bg=green&border=none')).toMatchObject({
      accent: 'f80',
      bg: 'green',
      border: false
    });
  });
});

describe('widgetQuery', () => {
  const query = (widget: Widget, text: string) => widgetQuery(widget, read(text)).toString();

  it('leaves out defaults', () => {
    expect(query('rank', 'layout=card&theme=auto&radius=6')).toBe('');
  });

  it('gives back what it read', () => {
    const text = 'theme=dark&accent=f80&border=none&radius=0';
    expect(query('rank', text)).toBe(text);
    expect(query('headline', 'claim=club')).toBe('claim=club');
  });

  it('drops what a widget ignores', () => {
    expect(query('trophies', 'layout=strip&claim=club&theme=dark')).toBe('theme=dark');
    expect(query('star-map', 'layout=strip&claim=rank')).toBe('');
    expect(query('rank', 'theme=dark&bg=fff')).toBe('bg=fff');
  });
});

describe('which widgets there are', () => {
  it('gives a repo only those about one repo', () => {
    expect(isWidget('podium') && isWidget('star-map')).toBe(true);
    expect(isRepoWidget('headline')).toBe(true);
    expect(isRepoWidget('podium') || isRepoWidget('star-map') || isRepoWidget('languages')).toBe(
      false
    );
    expect(isWidget('chart') || isWidget('badge')).toBe(false);
  });
});

describe('widgetUrl', () => {
  const origin = 'https://git-star-ranking.com';

  it('draws accounts and repos beside their badges', () => {
    expect(widgetUrl(origin, { login: 'torvalds' }, 'rank', read())).toBe(
      `${origin}/users/torvalds/rank.svg`
    );
    expect(
      widgetUrl(origin, { login: 'facebook', repo: 'react' }, 'trophies', read('theme=dark'))
    ).toBe(`${origin}/repositories/facebook/react/trophies.svg?theme=dark`);
  });
});
