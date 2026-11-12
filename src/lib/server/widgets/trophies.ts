import { number, short } from '../../format.ts';
import type { WidgetOptions } from '../../widgets.ts';
import { STAR_TIERS } from '../config.ts';
import { BOARD, climb, leads, NOTABLE, NOUNS, tier } from './claims.ts';
import type { Facts } from './facts.ts';
import { fit, frame, icon, sizeFor, text, type Icon } from './svg.ts';

export interface Trophy {
  icon: Icon;
  /** From 1 to 4, bronze to the top tier */
  level: number;
  value: string;
  caption: string;
}

/** How many steps a count has climbed, for stars where more is better */
const over = (count: number, steps: number[]) => steps.filter((step) => count >= step).length;

/** How many steps a rank has made, for places where fewer is better */
const within = (rank: number, steps: number[]) => steps.filter((step) => rank <= step).length;

/** Each one earned, and only on facts that hold: a rank only where we've found all above it */
export function trophies(facts: Facts): Trophy[] {
  const { stars, rank } = facts;
  // a repo is its own top repo, which its stars trophy already covers
  const top = facts.noun === 'repo' ? undefined : facts.repos[0];
  const lead = leads(facts)[0];
  const earned: Trophy[] = [];
  const add = (icon: Icon, level: number, value: string, caption: string) =>
    earned.push({ icon, level, value, caption });

  if (stars >= STAR_TIERS[0]) add('star', over(stars, STAR_TIERS), short(stars), 'stars');
  if (top && top.stars >= STAR_TIERS[1]) {
    add('repo', over(top.stars, STAR_TIERS), top.name, `${short(top.stars)} stars`);
  }
  const band = rank && tier(rank.rank);
  if (rank && band) {
    const caption = `top ${number(band)} ${NOUNS[facts.noun]}s`;
    add('podium', within(rank.rank, [10_000, 1_000, 100, 10]), `#${number(rank.rank)}`, caption);
  }
  if (lead && lead.local.rank <= NOTABLE.local) {
    const level = within(lead.local.rank, [1_000, 100, 10, 1]);
    add('code', level, `#${number(lead.local.rank)}`, `in ${lead.language}`);
  }
  const climbed = climb(facts.moved);
  if (climbed === 'new') add('up', 2, 'New', `in the ${BOARD}`);
  else if (climbed) {
    const caption = `${climbed === 1 ? 'place' : 'places'} this week`;
    add('up', over(climbed, [1, 10, 100, 1_000]), `▲ ${number(climbed)}`, caption);
  }
  return earned;
}

const TILE = { width: 112, height: 118 };
const [GAP, PAD] = [10, 14];

function tile(x: number, y: number, trophy: Trophy, radius: number) {
  const centre = x + TILE.width / 2;
  const size = sizeFor(trophy.value, 18, TILE.width - 14, 12);
  return (
    `<rect class="tile" x="${x}" y="${y}" width="${TILE.width}" height="${TILE.height}" ` +
    `rx="${Math.max(radius - 2, 0)}"/>` +
    // the level colours the medal and its glyph, through currentColor
    `<g class="l${trophy.level}" fill="currentColor">` +
    `<circle cx="${centre}" cy="${y + 36}" r="22" fill-opacity=".14" stroke="currentColor" ` +
    `stroke-width="1.5"/>${icon(trophy.icon, centre - 10, y + 26, 20)}</g>` +
    text(centre, y + 84, fit(trophy.value, size, TILE.width - 14), {
      size,
      weight: 700,
      anchor: 'middle'
    }) +
    text(centre, y + 103, fit(trophy.caption, 11, TILE.width - 12), {
      size: 11,
      tone: 'muted',
      anchor: 'middle'
    })
  );
}

/** A row of the trophies an account or repo has earned, or nothing if it has none yet */
export function trophyCase(facts: Facts, options: WidgetOptions) {
  const earned = trophies(facts);
  if (!earned.length) return undefined;
  const width = PAD * 2 + earned.length * (TILE.width + GAP) - GAP;
  const height = PAD + TILE.height + 26;
  const label = `${facts.name}'s trophies: ${earned.map((t) => `${t.value} ${t.caption}`).join(', ')}`;
  const tiles = earned.map((trophy, i) =>
    tile(PAD + i * (TILE.width + GAP), PAD, trophy, options.radius)
  );
  return frame(width, height, label, options, tiles.join(''));
}
