import { count, number, short } from '../../format.ts';
import type { WidgetOptions } from '../../widgets.ts';
import { BOARD, climb, NOUNS, standout, tier } from './claims.ts';
import type { Facts } from './facts.ts';
import { chip, fit, frame, heading, line, measure, sizeFor, text } from './svg.ts';

interface Row {
  label: string;
  value: string;
  up?: boolean;
}

/** What a card leads with, its tier, and up to three facts to go beside it */
export function summarise(facts: Facts) {
  const { rank, repos } = facts;
  const noun = NOUNS[facts.noun];
  const climbed = climb(facts.moved);
  const repo = facts.noun === 'repo';
  const local = repo ? repos[0]?.local : undefined;
  const best = repo ? undefined : standout(facts);
  const rows: (Row | false | undefined)[] = [
    rank && { label: 'Stars', value: number(facts.stars) },
    !repo && repos[0] && { label: 'Top repo', value: repos[0].name },
    local && { label: `In ${repos[0].language}`, value: `#${number(local.rank)}` },
    climbed === 'new' && { label: 'This week', value: `New to ${BOARD}`, up: true },
    typeof climbed === 'number' && {
      label: 'This week',
      value: `▲ ${count(climbed, 'place')}`,
      up: true
    },
    best && { label: 'Best place', value: best.label },
    facts.club && {
      label: `${short(facts.club.least)}+ club`,
      value: `1 of ${number(facts.club.members)}`
    }
  ];
  return {
    hero: rank
      ? {
          value: `#${number(rank.rank)}`,
          caption: `most starred GitHub ${noun}`,
          label: `most starred ${noun}`
        }
      : { value: number(facts.stars), caption: 'stars on GitHub', label: 'stars' },
    tier: rank && tier(rank.rank),
    rows: rows.filter((row) => row !== false && row !== undefined).slice(0, 3)
  };
}

type Summary = ReturnType<typeof summarise>;

const describe = (facts: Facts, { hero, rows }: Summary) =>
  [
    `${facts.name}: ${hero.value} ${hero.caption}`,
    ...rows.map((row) => `${row.label} ${row.value}`)
  ].join(', ');

function card(facts: Facts, summary: Summary, options: WidgetOptions) {
  const [width, height] = [440, 156];
  const { hero, rows, tier } = summary;
  // the facts sit right of a divider, centred on the hero
  const [divide, left] = [214, 230];
  const first = 72 + (3 - rows.length) * 13;
  const beside = rows.map((row, i) => {
    const y = first + i * 26;
    const room = width - 20 - left - measure(row.label, 12) - 12;
    const value = { size: 13, weight: 600, tone: row.up ? 'up' : 'text', anchor: 'end' } as const;
    return (
      text(left, y, row.label, { size: 12, tone: 'muted' }) +
      text(width - 20, y, fit(row.value, 13, room), value)
    );
  });
  const pill = tier ? chip(width - 20, 22, `Top ${number(tier)}`) : undefined;
  return frame(
    width,
    height,
    describe(facts, summary),
    options,
    heading(width, facts.name, pill) +
      text(20, 100, hero.value, { size: sizeFor(hero.value, 44, divide - 36, 24), weight: 700 }) +
      text(20, 122, fit(hero.caption, 12, divide - 36), { size: 12, tone: 'muted' }) +
      (rows.length ? line(divide + 0.5, 60, divide + 0.5, 132) : '') +
      beside.join('')
  );
}

function strip(facts: Facts, summary: Summary, options: WidgetOptions) {
  const [width, height] = [560, 84];
  const cells: Row[] = [{ value: summary.hero.value, label: summary.hero.label }, ...summary.rows];
  const each = (width - 24) / cells.length;
  const body = cells.map((cell, i) => {
    const x = 12 + each * (i + 0.5);
    const size = sizeFor(cell.value, i ? 18 : 22, each - 16, 12);
    const tone = cell.up ? 'up' : 'text';
    return (
      (i ? line(12 + each * i, 16, 12 + each * i, 56) : '') +
      text(x, 35, fit(cell.value, size, each - 16), { size, weight: 700, tone, anchor: 'middle' }) +
      text(x, 53, fit(cell.label, 11, each - 12), { size: 11, tone: 'muted', anchor: 'middle' })
    );
  });
  return frame(width, height, describe(facts, summary), options, body.join(''));
}

const LAYOUTS = { card, strip };

/** Where an account or repo ranks, or its stars while it's too low to rank fairly */
export const rankCard = (facts: Facts, options: WidgetOptions) =>
  LAYOUTS[options.layout](facts, summarise(facts), options);
