import { hex } from '../../badges.ts';
import { STAR } from '../../icons.ts';
import type { WidgetOptions } from '../../widgets.ts';
import { escape } from '../badge-svg.ts';
import { widthOf } from '../widths.ts';

interface Palette {
  surface: string;
  edge: string;
  text: string;
  muted: string;
  accent: string;
  onAccent: string;
  star: string;
  up: string;
  /** Bronze, silver, gold and the top tier, each clear of the others and of the surface */
  levels: readonly string[];
  /** The three biggest languages, as profile pages colour them, then a grey for the rest */
  series: readonly string[];
}

// GitHub's README colours, so a widget sits on either as if it belonged there
const LIGHT: Palette = {
  surface: '#ffffff',
  edge: '#d1d9e0',
  text: '#1f2328',
  muted: '#59636e',
  accent: '#0b5cc4',
  onAccent: '#ffffff',
  star: '#c48a00',
  up: '#1a7f37',
  levels: ['#b0602a', '#5b7598', '#a87b00', '#8250df'],
  series: ['#59636e', '#2a78d6', '#eb6834', '#1baf7a']
};

const DARK: Palette = {
  surface: '#0d1117',
  edge: '#3d444d',
  text: '#f0f6fc',
  muted: '#9198a1',
  accent: '#6cb0ff',
  onAccent: '#0d1117',
  star: '#e3b341',
  up: '#3fb950',
  levels: ['#c2733a', '#7891b5', '#bf8f14', '#9d72ee'],
  series: ['#b1bac4', '#3987e5', '#d95926', '#199e70']
};

// an image can't load fonts, so it takes the reader's, as GitHub's own text does
const FONT = `-apple-system,BlinkMacSystemFont,'Segoe UI','Noto Sans',Helvetica,Arial,sans-serif`;

/** WCAG's relative luminance of a #rrggbb colour */
function luminance(colour: string) {
  const [r, g, b] = [1, 3, 5].map((at) => {
    const channel = parseInt(colour.slice(at, at + 2), 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const contrast = (a: string, b: string) => {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
};

/** White or near-black text, whichever reads better on a colour */
const ink = (colour: string) =>
  contrast(colour, '#ffffff') >= contrast(colour, LIGHT.text) ? '#ffffff' : LIGHT.text;

// tints are see-through, so they suit any background
const rules = (p: Palette) =>
  `.surface{fill:${p.surface}}.edge{stroke:${p.edge}}.text{fill:${p.text}}` +
  `.muted{fill:${p.muted}}.tile{fill:${p.text};fill-opacity:.04}` +
  `.rest{fill:${p.text};fill-opacity:.08}` +
  `.accent{fill:${p.accent};color:${p.accent}}.on-accent{fill:${p.onAccent}}` +
  `.star{fill:${p.star}}.up{fill:${p.up}}` +
  p.levels.map((colour, i) => `.l${i + 1}{color:${colour}}`).join('') +
  p.series.map((colour, i) => `.s${i}{fill:${colour}}.i${i}{fill:${ink(colour)}}`).join('');

function own(palette: Palette, { accent, bg }: WidgetOptions): Palette {
  const colour = accent && hex(accent);
  return {
    ...palette,
    ...(bg && { surface: hex(bg) }),
    ...(colour && { accent: colour, onAccent: ink(colour) })
  };
}

/** Colours for the theme, or for a background of its own, with the accent asked for */
export function style(options: WidgetOptions) {
  const look = (palette: Palette) => rules(own(palette, options));
  const font = `svg{font-family:${FONT}}`;
  if (options.bg) return font + look(ink(hex(options.bg)) === '#ffffff' ? DARK : LIGHT);
  if (options.theme !== 'auto') return font + look(options.theme === 'light' ? LIGHT : DARK);
  return `${font}${look(LIGHT)}@media (prefers-color-scheme:dark){${look(DARK)}}`;
}

/** Coordinates to a tenth, which is finer than a screen shows */
export const at = (n: number) => Math.round(n * 10) / 10;

// the reader's font varies, so text is measured as Helvetica Bold with room to spare
const SLACK = 1.1;
export const measure = (content: string, size: number) =>
  widthOf(content, 'helvetica bold', size) * SLACK;

/** Text cut down to fit a width, ending in an ellipsis */
export function fit(content: string, size: number, width: number) {
  if (measure(content, size) <= width) return content;
  const chars = [...content];
  while (chars.length && measure(`${chars.join('')}…`, size) > width) chars.pop();
  return `${chars.join('').trimEnd()}…`;
}

/** The biggest size, up to this one, that text fits a width at */
export const sizeFor = (content: string, size: number, width: number, least = 10) =>
  Math.max(least, Math.min(size, Math.floor((size * width) / measure(content, size))));

interface Type {
  size?: number;
  weight?: number;
  tone?: string;
  anchor?: 'middle' | 'end';
}

export function text(x: number, y: number, content: string, type: Type = {}) {
  const { size = 12, weight, tone = 'text', anchor } = type;
  const attrs = [
    `x="${at(x)}" y="${at(y)}" font-size="${size}"`,
    weight && `font-weight="${weight}"`,
    anchor && `text-anchor="${anchor}"`,
    `class="${tone}"`
  ];
  return `<text ${attrs.filter(Boolean).join(' ')}>${escape(content)}</text>`;
}

// glyphs on a 16 by 16 grid
const ICONS = {
  star: STAR,
  repo: 'M1 3.5C1 2.7 1.7 2 2.5 2H6l2 2h5.5c.8 0 1.5.7 1.5 1.5v7c0 .8-.7 1.5-1.5 1.5h-11C1.7 14 1 13.3 1 12.5z',
  podium: 'M6 2h4v12H6zM1 7h4v7H1zm10 2h4v5h-4z',
  code: 'M5.3 3.3l1.4 1.4L3.4 8l3.3 3.3-1.4 1.4L.6 8zm5.4 0L15.4 8l-4.7 4.7-1.4-1.4L12.6 8 9.3 4.7z',
  up: 'M8 1.5L14 8h-4v6.5H6V8H2z'
};

export type Icon = keyof typeof ICONS;

/** A glyph, coloured by its tone or by whatever it sits in */
export const icon = (name: Icon, x: number, y: number, size: number, tone?: string) =>
  `<svg${tone ? ` class="${tone}"` : ''} x="${at(x)}" y="${at(y)}" width="${size}" ` +
  `height="${size}" viewBox="0 0 16 16"><path d="${ICONS[name]}"/></svg>`;

export const line = (x1: number, y1: number, x2: number, y2: number) =>
  `<line class="edge" x1="${at(x1)}" y1="${at(y1)}" x2="${at(x2)}" y2="${at(y2)}"/>`;

/** A column rounded at the top and square on its baseline */
export function column(x: number, base: number, width: number, height: number, attrs: string) {
  if (height <= 0) return '';
  const r = Math.min(4, width / 2, height);
  return (
    `<path ${attrs} d="M${at(x)} ${base}V${at(base - height + r)}` +
    `a${at(r)} ${at(r)} 0 0 1 ${at(r)}-${at(r)}H${at(x + width - r)}` +
    `a${at(r)} ${at(r)} 0 0 1 ${at(r)} ${at(r)}V${base}z"/>`
  );
}

/** A pill in the accent colour, set against its right edge */
export function chip(right: number, top: number, label: string) {
  const width = Math.ceil(measure(label, 11) + 18);
  const x = right - width;
  const body =
    `<rect class="accent" x="${at(x)}" y="${top}" width="${width}" height="20" rx="10"/>` +
    text(x + width / 2, top + 14, label, {
      size: 11,
      weight: 600,
      tone: 'on-accent',
      anchor: 'middle'
    });
  return { width, body };
}

/** Muted text set against its right edge, to go at the end of a heading */
export function aside(right: number, label: string) {
  const width = Math.ceil(measure(label, 12));
  return { width, body: text(right, 37, label, { size: 12, tone: 'muted', anchor: 'end' }) };
}

/** A starred name along the top, with a pill or note at the far end */
export function heading(width: number, name: string, end?: { width: number; body: string }) {
  const room = width - 62 - (end ? end.width + 12 : 0);
  return (
    icon('star', 20, 24, 16, 'star') +
    text(42, 38, fit(name, 15, room), { size: 15, weight: 600 }) +
    (end?.body ?? '')
  );
}

const BRAND = 'git-star-ranking.com';

/** A widget's card, described for screen readers, signed in the bottom corner */
export function frame(
  width: number,
  height: number,
  label: string,
  options: WidgetOptions,
  body: string
) {
  const title = escape(label);
  const outline = options.border ? 'surface edge' : 'surface';
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" ` +
    `viewBox="0 0 ${width} ${height}" role="img" aria-label="${title}">` +
    `<title>${title}</title><style>${style(options)}</style>` +
    `<rect class="${outline}" x=".5" y=".5" width="${width - 1}" height="${height - 1}" ` +
    `rx="${options.radius}"/>${body}` +
    text(width - 12, height - 10, BRAND, { size: 10, tone: 'muted', anchor: 'end' }) +
    '</svg>'
  );
}

/** A card with only a line to say, when there's nothing yet to show */
export function notice(name: string, note: string, options: WidgetOptions) {
  const [width, height] = [400, 100];
  return frame(
    width,
    height,
    `${name}: ${note}`,
    options,
    heading(width, name) + text(20, 64, fit(note, 13, width - 40), { size: 13, tone: 'muted' })
  );
}
