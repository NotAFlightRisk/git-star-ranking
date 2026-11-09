/** Distinct star counts, most first, with how many accounts sit above each */
export interface Histogram {
  stars: number[];
  above: number[];
  total: number;
}

export function histogram(counts: { stars: number; n: number }[]): Histogram {
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

/** The next count up from this one, and the rank it would bring */
export function nextUp({ stars, above }: Histogram, count: number) {
  const at = place(stars, count);
  return at ? { stars: stars[at - 1], rank: 1 + above[at - 1] } : undefined;
}

/** The fewest stars that still make the top share, so where "top 1%" starts */
export function starsFor({ stars, above, total }: Histogram, share: number) {
  const rank = Math.max(1, Math.floor(share * total));
  return stars[first(stars.length, (i) => above[i] >= rank) - 1];
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
  const atLeast = (stars: number) => rankOf(histogram, stars - 1) - 1;
  return edges
    .slice(0, -1)
    .map((from, i) => ({ from, to: edges[i + 1], count: atLeast(from) - atLeast(edges[i + 1]) }))
    .filter(({ from, to }) => to > least && from <= most);
}

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
