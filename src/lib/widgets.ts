import { pick, readColour, type Kind } from './badges.ts';
import { builtFor, pathOf, type Subject } from './names.ts';

// the first of each is the default
export const WIDGETS = ['rank', 'headline', 'trophies', 'star-map', 'podium', 'languages'] as const;
export const LAYOUTS = ['card', 'strip'] as const;
export const CLAIMS = ['auto', 'rank', 'language', 'club'] as const;
export const THEMES = ['auto', 'light', 'dark'] as const;

export type Widget = (typeof WIDGETS)[number];
export type Layout = (typeof LAYOUTS)[number];
export type Claim = (typeof CLAIMS)[number];
export type Theme = (typeof THEMES)[number];

/** A repo has one language and no repos of its own, so it only has the first few */
export const REPO_WIDGETS = ['rank', 'headline', 'trophies'] as const satisfies Widget[];
export const WIDGETS_FOR: Record<Kind, readonly Widget[]> = {
  account: WIDGETS,
  repo: REPO_WIDGETS
};

export interface WidgetOptions {
  /** How a rank card is laid out */
  layout: Layout;
  /** Which claim a headline makes, or auto for the most impressive */
  claim: Claim;
  /** Auto follows the reader's light or dark mode */
  theme: Theme;
  accent?: string;
  /** A background of its own, which the text then picks its colours to suit */
  bg?: string;
  border: boolean;
  radius: number;
}

export const RADIUS = { initial: 6, most: 16 };

const among =
  <T extends string>(names: readonly T[]) =>
  (name: string): name is T =>
    names.some((one) => one === name);

export const isWidget = among(WIDGETS);
export const isRepoWidget = among(REPO_WIDGETS);

/** Widget options from a query, with anything unexpected left at its default */
export function readWidget(query: Pick<URLSearchParams, 'get'>): WidgetOptions {
  const radius = query.get('radius') ?? '';
  return {
    layout: pick(query.get('layout'), LAYOUTS),
    claim: pick(query.get('claim'), CLAIMS),
    theme: pick(query.get('theme'), THEMES),
    accent: readColour(query.get('accent')),
    bg: readColour(query.get('bg')),
    border: query.get('border') !== 'none',
    radius: /^\d{1,2}$/.test(radius) ? Math.min(Number(radius), RADIUS.most) : RADIUS.initial
  };
}

/** The query that gives these options, leaving out defaults and whatever this widget ignores */
export function widgetQuery(widget: Widget, options: WidgetOptions) {
  const query = new URLSearchParams();
  const add = (key: string, value: string | false | undefined) => value && query.set(key, value);
  add('layout', widget === 'rank' && options.layout !== LAYOUTS[0] && options.layout);
  add('claim', widget === 'headline' && options.claim !== CLAIMS[0] && options.claim);
  // a background picks its own text colours, whatever the theme
  add('theme', !options.bg && options.theme !== THEMES[0] && options.theme);
  add('accent', options.accent);
  add('bg', options.bg);
  add('border', !options.border && 'none');
  add('radius', options.radius !== RADIUS.initial && String(options.radius));
  return query;
}

/** Where a widget is drawn, for an account or one of its repos */
export function widgetUrl(origin: string, target: Subject, widget: Widget, options: WidgetOptions) {
  const base = `${origin}/${target.repo ? 'repositories' : 'users'}${pathOf(target)}`;
  const query = widgetQuery(widget, options).toString();
  return `${base}/${widget}.svg${query ? `?${query}` : ''}`;
}

export const widgetsPath = (target?: Subject) => builtFor('/profile-widgets', target);
