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

/** Competition ranking: ties share a rank and the next one skips, so 1, 2, 2, 4 */
export function rankOf({ stars, above, total }: Histogram, count: number) {
  let low = 0;
  let high = stars.length;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (stars[middle] > count) low = middle + 1;
    else high = middle;
  }
  return 1 + (above[low] ?? total);
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
