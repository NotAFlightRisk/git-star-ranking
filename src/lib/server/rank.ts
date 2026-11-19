/** Distinct star counts, most first, with how many accounts sit above each */
export interface Histogram {
  stars: number[];
  above: number[];
  total: number;
  /** Counts under this many stars are estimated */
  roughBelow?: number;
}

type Count = { stars: number; n: number };

/** Accounts with at least so many stars, as multiples of those at the cut and above, from 1 star up */
export type Tail = [stars: number, times: number][];

export function histogram(counts: Count[]): Histogram {
  const above: number[] = [];
  let total = 0;
  for (const { n } of counts) {
    above.push(total);
    total += n;
  }
  return { stars: counts.map(({ stars }) => stars), above, total };
}

// binary search for the first index that passes, given everything after it passes too
function first(length: number, passes: (i: number) => boolean) {
  let low = 0;
  let high = length;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (passes(middle)) high = middle;
    else low = middle + 1;
  }
  return low;
}

const place = (stars: number[], count: number) => first(stars.length, (i) => stars[i] <= count);

/** Competition ranking: ties share a rank and the next one skips, so 1, 2, 2, 4 */
export const rankOf = ({ stars, above, total }: Histogram, count: number) =>
  1 + (above[place(stars, count)] ?? total);

/** How many sit at this count or above */
export const atLeast = (histogram: Histogram, count: number) => rankOf(histogram, count - 1) - 1;

// straight between the points either side, on a log-log scale
function along(points: Tail, stars: number) {
  const i = points.findIndex(([at]) => at >= stars);
  const [[s0, t0], [s1, t1]] = [points[Math.max(i - 1, 0)], points[i]];
  return s1 === stars ? t1 : t0 * (t1 / t0) ** (Math.log(stars / s0) / Math.log(s1 / s0));
}

/** The tally with everything under `below` stars swapped for the tail, scaled to the count at `below` */
export function withTail(counts: Count[], tail: Tail, below: number): Histogram {
  const real = histogram(counts);
  const edge = atLeast(real, below);
  if (!edge) return real;
  const points: Tail = [...tail.filter(([stars]) => stars < below), [below, 1]];
  const curve = (stars: number) =>
    Math.round(Math.max(edge * along(points, stars), atLeast(real, stars)));
  const rows = Array.from({ length: below - 1 }, (_, i) => below - 1 - i)
    .map((stars) => ({ stars, n: curve(stars) - curve(stars + 1) }))
    .filter(({ n }) => n);
  return {
    ...histogram([...counts.filter(({ stars }) => stars >= below), ...rows]),
    roughBelow: below
  };
}

/** The next count up from this one, the rank it would bring and how many places that jumps */
export function nextUp({ stars, above, total, roughBelow = 0 }: Histogram, count: number) {
  const at = place(stars, count);
  if (!at) return undefined;
  const rank = 1 + above[at - 1];
  const places = (above[at] ?? total) + 1 - rank;
  return { stars: stars[at - 1], rank, places, rough: stars[at - 1] < roughBelow };
}

/** The fewest stars that still make the top share, so where "top 1%" starts */
export function starsFor({ stars, above, total }: Histogram, share: number) {
  const rank = Math.max(1, Math.floor(share * total));
  return stars[first(stars.length, (i) => above[i] >= rank) - 1];
}

const GRADES = [90, 80, 70, 60, 50, 40, 30, 20, 10, 1, 0.1, 0.01, 0.001];

/** The next "top X%" up from this count and where it starts, if the board's big enough for it */
export function milestone(histogram: Histogram, count: number) {
  const within = (percent: number) => Math.floor((percent / 100) * histogram.total);
  const rank = rankOf(histogram, count);
  const percent = GRADES.find((grade) => rank > within(grade));
  if (!percent || within(percent) < 1) return undefined;
  return { percent, stars: starsFor(histogram, percent / 100) };
}

const STEPS = [1, 1.6, 2.5, 4, 6.3];

/** Accounts counted in even steps on a log scale: 1, 2, 3, 4, 6, 10, 16, 25, 40, 63, 100... */
export function bands(histogram: Histogram) {
  if (!histogram.total) return [];
  const [most, least] = [histogram.stars[0], histogram.stars.at(-1)!];
  const edges: number[] = [];
  for (let scale = 1; !edges.length || edges.at(-1)! <= most; scale *= 10) {
    edges.push(...STEPS.map((step) => Math.round(step * scale)));
  }
  const between = (from: number, to: number) => atLeast(histogram, from) - atLeast(histogram, to);
  const rough = (from: number) => from < (histogram.roughBelow ?? 0);
  return edges
    .slice(0, -1)
    .map((from, i) => ({
      from,
      to: edges[i + 1],
      count: between(from, edges[i + 1]),
      rough: rough(from)
    }))
    .filter(({ from, to }) => to > least && from <= most);
}

const SHARES = [0.5, 0.1, 0.01, 0.001];

/** Where "top 50%" and the like start, leaving out any too fine for a board this size */
export const marks = (histogram: Histogram) =>
  SHARES.filter((share) => share * histogram.total >= 1)
    .map((share) => ({ share, stars: starsFor(histogram, share) }))
    .filter((mark, i, all) => mark.stars !== all[i - 1]?.stars);

/** Ranks a list that's already sorted most stars first, the same way */
export function competition<T extends { stars: number }>(rows: T[]) {
  let rank = 0;
  return rows.map((row, i) => {
    if (i === 0 || row.stars !== rows[i - 1].stars) rank = i + 1;
    return { rank, ...row };
  });
}

/** The share of ranked accounts at or above this count, for "top 3%" */
export const percentile = (histogram: Histogram, count: number) =>
  histogram.total ? Math.min(rankOf(histogram, count) / histogram.total, 1) : 1;
