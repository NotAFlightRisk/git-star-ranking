import type { WidgetOptions } from '../../widgets.ts';
import { headlineOf } from './claims.ts';
import type { Facts } from './facts.ts';
import { fit, frame, icon, sizeFor, text, type Icon } from './svg.ts';

const ICONS = {
  rank: 'podium',
  language: 'code',
  club: 'star',
  stars: 'star'
} as const satisfies Record<string, Icon>;

/** One line in big type: the most impressive true thing we can say, or the one asked for */
export function headline(facts: Facts, options: WidgetOptions) {
  const [width, height] = [600, 100];
  const said = headlineOf(facts, options.claim);
  const [left, room] = [92, width - 112];
  const size = sizeFor(said.line, 24, room, 16);
  return frame(
    width,
    height,
    `${said.line}. ${said.detail}`,
    options,
    // the accent tints the badge and draws its ring and glyph
    `<g class="accent"><circle cx="50" cy="50" r="26" fill-opacity=".14" stroke="currentColor" ` +
      `stroke-width="1.5"/>${icon(ICONS[said.claim], 38, 38, 24)}</g>` +
      text(left, 48, fit(said.line, size, room), { size, weight: 700 }) +
      text(left, 72, fit(said.detail, 13, room), { size: 13, tone: 'muted' })
  );
}
