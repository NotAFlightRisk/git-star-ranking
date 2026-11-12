import { env } from 'cloudflare:workers';
import { number, short } from '../../format.ts';
import { icon as slugOf } from '../../languages.ts';
import type { WidgetOptions } from '../../widgets.ts';
import { leads, NOTABLE } from './claims.ts';
import type { Facts } from './facts.ts';
import { aside, at, fit, frame, heading, line, measure, text } from './svg.ts';

const SYMBOL = /<symbol id="([^"]+)" viewBox="0 0 24 24"><path d="([^"]+)"\/><\/symbol>/g;

let sprite: Promise<Map<string, string>> | undefined;

/** The language glyphs the site already draws, read once per isolate from its own static file */
function glyphs() {
  sprite ??= (async () => {
    const response = await env.ASSETS?.fetch('https://assets.local/languages.svg');
    if (!response?.ok) throw new Error('No language sprite');
    const symbols = (await response.text()).matchAll(SYMBOL);
    return new Map([...symbols].map(([, slug, path]) => [slug, path]));
  })();
  // a failed read is tried again next time, rather than kept
  return sprite.catch(() => {
    sprite = undefined;
    return new Map<string, string>();
  });
}

const MOST = 5;
const [ROW, TOP] = [44, 56];

/** An account's best place on each language's board, best first, where it's in the top 1,000 */
export async function languageLeader(facts: Facts, options: WidgetOptions) {
  const places = leads(facts)
    .filter((lead) => lead.local.rank <= NOTABLE.local)
    .slice(0, MOST);
  if (!places.length) return undefined;
  const paths = await glyphs();
  const width = 400;
  const height = TOP + places.length * ROW + 24;
  const rows = places.map((lead, i) => {
    const y = TOP + i * ROW;
    const path = paths.get(slugOf(lead.language) ?? '');
    const mark = path
      ? `<svg class="text" x="20" y="${y + 12}" width="20" height="20" viewBox="0 0 24 24">` +
        `<path d="${path}"/></svg>`
      : `<circle class="muted" cx="30" cy="${y + 22}" r="5"/>`;
    const rank = `#${number(lead.local.rank)}`;
    const room = width - 72 - measure(rank, 20) - 12;
    return (
      (i ? line(20, at(y) + 0.5, width - 20, at(y) + 0.5) : '') +
      mark +
      text(52, y + 20, fit(lead.language, 14, room), { size: 14, weight: 600 }) +
      text(52, y + 35, fit(`${lead.name} · ${short(lead.stars)} stars`, 11, room), {
        size: 11,
        tone: 'muted'
      }) +
      text(width - 20, y + 29, rank, { size: 20, weight: 700, anchor: 'end' })
    );
  });
  const label = `${facts.name}'s best places by language: ${places
    .map((lead) => `#${number(lead.local.rank)} in ${lead.language} with ${lead.name}`)
    .join(', ')}`;
  return frame(
    width,
    height,
    label,
    options,
    heading(width, facts.name, aside(width - 20, 'Language ranks')) + rows.join('')
  );
}
