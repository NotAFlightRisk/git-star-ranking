import type { Style } from '../badges.ts';
import { STAR } from '../icons.ts';
import { widthOf, type Font } from './widths.ts';

/** A badge ready to draw, its colours as #rrggbb */
export interface Drawn {
  label: string;
  message: string;
  color: string;
  labelColor: string;
  style: Style;
  icon: boolean;
}

const VERDANA = 'Verdana,Geneva,DejaVu Sans,sans-serif';
const HELVETICA = 'Helvetica Neue,Helvetica,Arial,sans-serif';
const ICON = 14;

const escape = (text: string) => text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

/** Text and shadow colours that read on a background, as Shields picks them */
function ink(background: string) {
  const [r, g, b] = [1, 3, 5].map((at) => parseInt(background.slice(at, at + 2), 16));
  return (r * 299 + g * 587 + b * 114) / 255_000 > 0.69 ? ['#333', '#ccc'] : ['#fff', '#010101'];
}

// whole and odd, so text centres on the pixel grid
const odd = (width: number) => Math.floor(width) | 1;
const measure = (font: Font, ...texts: string[]) => texts.map((text) => odd(widthOf(text, font)));

/** The star on its own, or placed inside a badge */
export const star = (fill: string, place = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg"${place} viewBox="0 0 16 16">` +
  `<path fill="${fill}" d="${STAR}"/></svg>`;

const icon = (x: number, y: number, background: string) =>
  star(ink(background)[0], ` x="${x}" y="${y}" width="${ICON}" height="${ICON}"`);

/** The star as Shields should draw it, against the label */
export const logo = ({ style, labelColor }: Drawn) =>
  star(ink(style === 'social' ? '#fcfcfc' : labelColor)[0]);

const text = (x: number, y: number, width: number, content: string, attrs = '') =>
  `<text x="${x}" y="${y}" textLength="${width}"${attrs}>${escape(content)}</text>`;

const font = (family: string, size: number, attrs = '') =>
  `<g font-family="${family}" font-size="${size}" text-anchor="middle" ` +
  `text-rendering="geometricPrecision"${attrs}>`;

const halves = (left: number, width: number, height: number, badge: Drawn) =>
  `<rect width="${left}" height="${height}" fill="${badge.labelColor}"/>` +
  `<rect x="${left}" width="${width - left}" height="${height}" fill="${badge.color}"/>`;

type Stop = [offset: number, colour: string, opacity: number];

const stop = ([offset, colour, opacity]: Stop) =>
  `<stop offset="${offset}" stop-color="${colour}" stop-opacity="${opacity}"/>`;

const sheen = (stops: Stop[]) =>
  `<linearGradient id="s" x2="0" y2="100%">${stops.map(stop).join('')}</linearGradient>`;

function frame(width: number, height: number, { label, message }: Drawn, body: string[]) {
  const title = escape(`${label}: ${message}`);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" role="img" ` +
    `aria-label="${title}"><title>${title}</title>${body.join('')}</svg>`
  );
}

// flat-square alone has no sheen, rounding or shadow
const CLASSIC = {
  flat: {
    height: 20,
    rx: 3,
    stops: [
      [0, '#bbb', 0.1],
      [1, '#000', 0.1]
    ]
  },
  'flat-square': { height: 20, rx: 0, stops: [] },
  plastic: {
    height: 18,
    rx: 4,
    stops: [
      [0, '#fff', 0.7],
      [0.1, '#aaa', 0.1],
      [0.9, '#000', 0.3],
      [1, '#000', 0.5]
    ]
  }
} satisfies Record<string, { height: number; rx: number; stops: Stop[] }>;

function classic(badge: Drawn) {
  const { height, rx, stops } = CLASSIC[badge.style as keyof typeof CLASSIC];
  const [labelWidth, messageWidth] = measure('verdana', badge.label, badge.message);
  const logo = badge.icon ? ICON + 3 : 0;
  const left = labelWidth + logo + 10;
  const width = left + messageWidth + 10;
  const y = height / 2 + 4;
  const words = (x: number, size: number, content: string, background: string) => {
    const [fill, shadow] = ink(background);
    const under = ` fill="${shadow}" fill-opacity=".3" aria-hidden="true"`;
    return (
      (rx ? text(x, y + 1, size, content, under) : '') +
      text(x, y, size, content, ` fill="${fill}"`)
    );
  };
  return frame(width, height, badge, [
    rx ? sheen(stops) : '',
    rx ? `<clipPath id="r"><rect width="${width}" height="${height}" rx="${rx}"/></clipPath>` : '',
    `<g ${rx ? 'clip-path="url(#r)"' : 'shape-rendering="crispEdges"'}>`,
    halves(left, width, height, badge),
    rx ? `<rect width="${width}" height="${height}" fill="url(#s)"/>` : '',
    '</g>',
    badge.icon ? icon(5, (height - ICON) / 2, badge.labelColor) : '',
    font(VERDANA, 11),
    words(logo + 6 + labelWidth / 2, labelWidth, badge.label, badge.labelColor),
    words(left + 4 + messageWidth / 2, messageWidth, badge.message, badge.color),
    '</g>'
  ]);
}

function forTheBadge(badge: Drawn) {
  const [label, message] = [badge.label.toUpperCase(), badge.message.toUpperCase()];
  // letters sit 1.25px apart, which textLength spreads them out to
  const spaced = (content: string, face: Font) =>
    Math.floor(widthOf(content, face, 10)) + 1.25 * [...content].length;
  const [labelWidth, messageWidth] = [spaced(label, 'verdana'), spaced(message, 'verdana bold')];
  const start = badge.icon ? 9 + ICON + 6 : 12;
  const left = start + labelWidth + 12;
  const width = left + messageWidth + 24;
  const fill = (background: string) => ` fill="${ink(background)[0]}"`;
  const bold = `${fill(badge.color)} font-weight="bold"`;
  return frame(width, 28, badge, [
    `<g shape-rendering="crispEdges">${halves(left, width, 28, badge)}</g>`,
    badge.icon ? icon(9, 7, badge.labelColor) : '',
    font(VERDANA, 10),
    text(start + labelWidth / 2, 17.5, labelWidth, label, fill(badge.labelColor)),
    text(left + 12 + messageWidth / 2, 17.5, messageWidth, message, bold),
    '</g>'
  ]);
}

function social(badge: Drawn) {
  const label = badge.label.charAt(0).toUpperCase() + badge.label.slice(1);
  const [labelWidth, messageWidth] = measure('helvetica bold', label, badge.message);
  const logo = badge.icon ? ICON + 3 : 0;
  const left = labelWidth + logo + 10;
  const bubble = messageWidth + 8;
  const box = `x=".5" y=".5" width="${left}" height="19" rx="2"`;
  const raised = (x: number, size: number, content: string) =>
    text(x, 15, size, content, ' fill="#fff" aria-hidden="true"') + text(x, 14, size, content);
  return frame(left + 7 + bubble, 20, badge, [
    sheen([
      [0, '#fcfcfc', 0],
      [1, '#000', 0.1]
    ]),
    `<g stroke="#d5d5d5" fill="#fafafa"><rect ${box} fill="#fcfcfc" stroke="none"/>`,
    `<rect x="${left + 6.5}" y=".5" width="${bubble}" height="19" rx="2"/>`,
    `<rect x="${left + 6}" y="7.5" width=".5" height="5" stroke="#fafafa"/>`,
    `<path d="M${left + 6.5} 6.5l-3 3v1l3 3"/></g>`,
    badge.icon ? icon(5, 3, '#fcfcfc') : '',
    `<rect ${box} fill="url(#s)" stroke="#d5d5d5"/>`,
    font(HELVETICA, 11, ' fill="#333" font-weight="700"'),
    raised(logo + 5 + labelWidth / 2, labelWidth, label),
    raised(left + 6 + bubble / 2, messageWidth, badge.message),
    '</g>'
  ]);
}

const STYLED: Record<Style, (badge: Drawn) => string> = {
  flat: classic,
  'flat-square': classic,
  plastic: classic,
  'for-the-badge': forTheBadge,
  social
};

/** A badge drawn the way Shields would, without the trip to Shields */
export const render = (badge: Drawn) => STYLED[badge.style](badge);
