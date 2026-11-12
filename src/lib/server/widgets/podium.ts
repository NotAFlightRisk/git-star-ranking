import { number } from '../../format.ts';
import type { WidgetOptions } from '../../widgets.ts';
import { best } from './claims.ts';
import type { Facts, RepoFact } from './facts.ts';
import { aside, column, fit, frame, heading, sizeFor, text } from './svg.ts';

// fixed heights, so a step says first, second or third and never how far behind it is
const STEPS = [
  { height: 64, level: 3 },
  { height: 46, level: 2 },
  { height: 34, level: 1 }
];
const [STEP, GAP] = [124, 8];

/** A step in its medal's colour, with the repo, its stars and its best place above it */
function step(repo: RepoFact, place: number, x: number, base: number) {
  const { height, level } = STEPS[place];
  const [centre, roof] = [x + STEP / 2, base - height];
  const standing = best(repo);
  const above = (y: number, content: string, most: number, tone = 'text', weight?: number) => {
    const size = sizeFor(content, most, STEP - 8, 10);
    return text(centre, y, fit(content, size, STEP - 8), { size, tone, weight, anchor: 'middle' });
  };
  return (
    `<g class="l${level}" fill="currentColor">${column(x, base, STEP, height, 'fill-opacity=".18"')}` +
    `${column(x, roof + 3, STEP, 3, '')}</g>` +
    text(centre, roof + 29, String(place + 1), { size: 20, weight: 700, anchor: 'middle' }) +
    above(roof - 46, repo.name, 13, 'text', 700) +
    above(roof - 29, `${number(repo.stars)} stars`, 12, 'muted') +
    (standing?.notable ? above(roof - 12, standing.label, 12, 'text', 600) : '')
  );
}

/** An account's top three repos on a podium, each with its best place on GitHub */
export function podium(facts: Facts, options: WidgetOptions) {
  const top = facts.repos.slice(0, 3);
  if (top.length < 2) return undefined;
  const [width, height] = [440, 210];
  const base = height - 30;
  // second, first, third, from the left
  const order = [1, 0, 2].filter((place) => place < top.length);
  const start = (width - order.length * (STEP + GAP) + GAP) / 2;
  const steps = order.map((place, i) => step(top[place], place, start + i * (STEP + GAP), base));
  const said = top.map((repo, i) =>
    [`${i + 1}. ${repo.name}`, `${number(repo.stars)} stars`, best(repo)?.label]
      .filter(Boolean)
      .join(', ')
  );
  const label = `${facts.name}'s top repos: ${said.join('; ')}`;
  return frame(
    width,
    height,
    label,
    options,
    heading(width, facts.name, aside(width - 20, 'Top repos')) + steps.join('')
  );
}
