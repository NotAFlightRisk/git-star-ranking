import { count, number, short } from '../../format.ts';
import { squarify, type Tile } from '../../treemap.ts';
import type { WidgetOptions } from '../../widgets.ts';
import type { Facts } from './facts.ts';
import { aside, at, fit, frame, heading, measure, text } from './svg.ts';

interface Piece {
  label: string;
  stars: number;
  /** Its colour: the three biggest languages first, then 0 for any other. Repos lumped
   * together have none, and only a tint */
  slot?: number;
}

// as many as the profile page's map, past which a tile's too thin to see and joins the rest
const MOST = 24;
const LEAST = 0.004;

/** The three biggest languages, which get a colour each */
const coloured = ({ languages }: Facts) =>
  languages.flatMap(({ language }) => (language ? [language] : [])).slice(0, 3);

/** The repos to draw, then the rest of the stars in a tile or two, biggest first, as the
 * profile page's map has them */
export function pieces(facts: Facts): Piece[] {
  const { repos, languages, stars } = facts;
  const named = coloured(facts);
  const slot = (language: string | null) => (language ? named.indexOf(language) + 1 : 0);
  const shown = repos.filter((repo, i) => i < MOST && repo.stars >= stars * LEAST);
  const tracked = languages.reduce((sum, row) => sum + row.stars, 0);
  const listed = shown.reduce((sum, repo) => sum + repo.stars, 0);
  const others = languages.reduce((sum, row) => sum + row.repos, 0) - shown.length;
  const rest = [
    { label: count(others, 'more repo'), stars: tracked - listed },
    { label: 'Smaller repos', stars: stars - tracked }
  ];
  return [
    ...shown.map((repo) => ({ label: repo.name, stars: repo.stars, slot: slot(repo.language) })),
    ...rest.filter((piece) => piece.stars > 0)
  ].sort((a, b) => b.stars - a.stars);
}

const MAP = { x: 20, y: 54, width: 400, height: 176 };

/** A tile, with its name and stars when there's room, in whichever ink reads on it */
function tile({ item, x, y, width, height }: Tile<Piece>) {
  const [left, top] = [MAP.x + x + 1, MAP.y + y + 1];
  const [w, h] = [width - 2, height - 2];
  const [fill, ink] =
    item.slot === undefined ? ['rest', 'muted'] : [`s${item.slot}`, `i${item.slot}`];
  const name = fit(item.label, 12, w - 12);
  const labels =
    w >= 40 && h >= 34 && name !== '…'
      ? text(left + 6, top + 17, name, { size: 12, weight: 600, tone: ink }) +
        text(left + 6, top + 31, short(item.stars), { size: 11, tone: ink })
      : w >= 30 && h >= 18
        ? text(left + 5, top + 14, short(item.stars), { size: 10, tone: ink })
        : '';
  return (
    `<rect class="${fill}" x="${at(left)}" y="${at(top)}" width="${at(Math.max(w, 0))}" ` +
    `height="${at(Math.max(h, 0))}" rx="3"/>${labels}`
  );
}

/** A key to the colours drawn, as colour alone can't say which language is which */
function legend(drawn: Piece[], named: string[], y: number) {
  const keys = [...named.map((name, i) => ({ name, slot: i + 1 })), { name: 'Other', slot: 0 }];
  let x = MAP.x;
  return keys
    .filter((key) => drawn.some((piece) => piece.slot === key.slot))
    .map(({ name, slot }) => {
      const key =
        `<rect class="s${slot}" x="${at(x)}" y="${y - 9}" width="10" height="10" rx="2"/>` +
        text(x + 14, y, name, { size: 11, tone: 'muted' });
      x += 28 + measure(name, 11);
      return key;
    })
    .join('');
}

/** An account's repos as a treemap, sized by stars and coloured by language */
export function starMap(facts: Facts, options: WidgetOptions) {
  if (facts.repos.length < 2) return undefined;
  const all = pieces(facts);
  const tiles = squarify(all, (piece) => piece.stars, MAP.width, MAP.height);
  const [width, height] = [440, MAP.y + MAP.height + 46];
  const label = `${facts.name}'s ${number(facts.stars)} stars by repo: ${all
    .map((piece) => `${piece.label} ${number(piece.stars)}`)
    .join(', ')}`;
  return frame(
    width,
    height,
    label,
    options,
    heading(width, facts.name, aside(width - 20, `${number(facts.stars)} stars`)) +
      tiles.map(tile).join('') +
      legend(all, coloured(facts), MAP.y + MAP.height + 20)
  );
}
