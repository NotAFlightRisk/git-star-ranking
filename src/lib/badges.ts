import { pathOf, type Subject } from './names.ts';

export type Kind = 'account' | 'repo';
export type Show = 'rank' | 'language' | 'top' | 'stars';
export type Source = 'ours' | 'shields';

// the first of each is the default
export const SHOWS: Record<Kind, readonly Show[]> = {
  account: ['rank', 'top', 'stars'],
  repo: ['rank', 'language', 'top', 'stars']
};
export const STYLES = ['flat', 'flat-square', 'plastic', 'for-the-badge', 'social'] as const;
export type Style = (typeof STYLES)[number];

export interface BadgeOptions {
  show: Show;
  style: Style;
  label?: string;
  color?: string;
  labelColor?: string;
  icon?: 'star';
}

const DEFAULTS: Partial<BadgeOptions> = { show: 'rank', style: 'flat' };

export const BLUE = '0b5cc4';
export const GREY = '6e7781';
export const LABEL_GREY = '555555';

// Shields' named colours, so a URL written for theirs looks the same on ours
const COLOURS: Record<string, string> = {
  brightgreen: '44bb00',
  green: '67ac09',
  yellowgreen: '95991a',
  yellow: 'd8b800',
  orange: 'ea7233',
  red: 'dd4343',
  blue: '007ec6',
  grey: '555555',
  gray: '555555',
  lightgrey: '939393',
  lightgray: '939393'
};
const HEX = /^([\da-f]{3}){1,2}$/;
const named = (colour: string) => (Object.hasOwn(COLOURS, colour) ? COLOURS[colour] : undefined);

/** A hex or named colour as #rrggbb, as SVG and colour inputs want it */
export function hex(colour: string) {
  const digits = named(colour) ?? colour;
  return `#${digits.length === 3 ? digits.replace(/./g, '$&$&') : digits}`;
}

export const defaultLabel = (show: Show = 'rank') => (show === 'stars' ? 'stars' : 'git rank');

/** Badge options from a query, with anything unexpected left at its default */
export function readBadge(query: Pick<URLSearchParams, 'get'>, kind: Kind): BadgeOptions {
  const pick = <T extends string>(key: string, allowed: readonly T[]) =>
    allowed.find((value) => value === query.get(key)) ?? allowed[0];
  const colour = (key: string) => {
    const value = query.get(key)?.toLowerCase().replace(/^#/, '');
    return value && (HEX.test(value) || named(value)) ? value : undefined;
  };
  const label = (query.get('label') ?? '').replace(/\p{C}/gu, '').trim();
  return {
    show: pick('show', SHOWS[kind]),
    style: pick('style', STYLES),
    label: [...label].slice(0, 40).join('').trim() || undefined,
    color: colour('color'),
    labelColor: colour('labelColor'),
    icon: query.get('icon') === 'star' ? 'star' : undefined
  };
}

/** The query that gives these options, leaving out defaults */
export function badgeQuery(options: Partial<BadgeOptions>) {
  const defaults = { ...DEFAULTS, label: defaultLabel(options.show) };
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(options)) {
    const text = value?.trim();
    if (text && text !== defaults[key as keyof BadgeOptions]) query.set(key, text);
  }
  return query;
}

/** Where a badge is drawn, by us or by Shields from our endpoint */
export function badgeUrl(
  origin: string,
  target: Subject,
  options: Partial<BadgeOptions> = {},
  source: Source = 'ours'
) {
  const base = `${origin}/${target.repo ? 'repositories' : 'users'}${pathOf(target)}`;
  const query = badgeQuery(options).toString();
  const tail = query ? `?${query}` : '';
  if (source === 'ours') return `${base}/badge.svg${tail}`;
  return `https://img.shields.io/endpoint?url=${encodeURIComponent(`${base}/shields${tail}`)}`;
}

export const builderPath = (target?: Subject) =>
  target ? `/badge-builder?for=${pathOf(target).slice(1)}` : '/badge-builder';

interface Embed {
  label: string;
  write: (image: string, alt: string, link?: string) => string;
}

const attr = (text: string) => text.replaceAll('&', '&amp;').replaceAll('"', '&quot;');

export type Format = 'markdown' | 'html' | 'url' | 'rst' | 'asciidoc';

/** Each way of embedding a badge, with or without a link */
export const FORMATS: Record<Format, Embed> = {
  markdown: {
    label: 'Markdown',
    write: (image, alt, link) => {
      const img = `![${alt.replace(/[[\]]/g, '\\$&')}](${image})`;
      return link ? `[${img}](${link})` : img;
    }
  },
  html: {
    label: 'HTML',
    write: (image, alt, link) => {
      const img = `<img src="${attr(image)}" alt="${attr(alt)}">`;
      return link ? `<a href="${attr(link)}">${img}</a>` : img;
    }
  },
  url: { label: 'URL', write: (image) => image },
  rst: {
    label: 'rST',
    write: (image, alt, link) =>
      [`.. image:: ${image}`, `   :alt: ${alt}`, link && `   :target: ${link}`]
        .filter(Boolean)
        .join('\n')
  },
  asciidoc: {
    label: 'AsciiDoc',
    write: (image, alt, link) => {
      const attrs = [`alt="${alt.replaceAll('"', '')}"`, link && `link="${link}"`];
      return `image:${image}[${attrs.filter(Boolean).join(',')}]`;
    }
  }
};
