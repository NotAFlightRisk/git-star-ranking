import {
  languageListing,
  listing,
  neighbours,
  position,
  readMeta,
  spread,
  type Listing
} from './boards.ts';
import { DAY, STAR_TIERS } from './config.ts';
import { seconds, siblings, type OwnerRow, type RepoRow } from './db.ts';
import { schedule } from './profile.ts';
import { atLeast, bands, marks, milestone, nextUp, rankOf, type Histogram } from './rank.ts';
import type { RepoEntry } from './snapshot.ts';

/** Where a repo stands on one board, and that board's spread for the chart */
const among = (histogram: Histogram, stars: number) => ({
  rank: position(histogram, stars),
  spread: { bands: bands(histogram), marks: marks(histogram) }
});

/** The biggest star tier a repo has reached, and how many repos have reached it */
export function club(histogram: Histogram, stars: number) {
  const least = STAR_TIERS.findLast((tier) => stars >= tier);
  if (!least) return undefined;
  // it may have crossed since the snapshot, so it counts at least itself and those above
  return { least, repos: Math.max(atLeast(histogram, least), rankOf(histogram, stars)) };
}

/** Average stars a year since it was made, once it's old enough for that to mean much */
export function yearly(
  { stars, created_at }: Pick<RepoRow, 'stars' | 'created_at'>,
  now = seconds()
) {
  const years = created_at ? (now - created_at) / (365.25 * DAY) : 0;
  return years >= 1 ? Math.round(stars / years) : undefined;
}

/** Repos either side of this one, from the first board it's on */
async function nearby(id: number, boards: { on?: Listing; rank?: number; language?: string }[]) {
  for (const { on, rank, language } of boards) {
    const found = on && rank && (await neighbours<RepoEntry>(on, id, rank));
    if (found) return { ...found, language };
  }
}

/** Everything a repo page shows beyond the repo, from D1 and the latest snapshot */
export async function details(owner: OwnerRow, repo: RepoRow) {
  const latest = await readMeta();
  const local = latest && languageListing(latest, repo.language);
  const [all, mine, family] = await Promise.all([
    spread('repositories'),
    local && spread(local.key),
    siblings(repo)
  ]);
  const overall = all && among(all, repo.stars);
  const language = mine && { name: repo.language!, ...among(mine, repo.stars) };
  return {
    ...overall,
    language,
    next: all && nextUp(all, repo.stars),
    milestone: all && milestone(all, repo.stars),
    club: all && club(all, repo.stars),
    yearly: yearly(repo),
    neighbours: await nearby(repo.id, [
      { on: local, rank: language?.rank.rank, language: language?.name },
      { on: latest && listing(latest, 'repositories'), rank: overall?.rank.rank }
    ]),
    siblings: family,
    schedule: owner.refreshed_at > 0 ? schedule(owner) : undefined
  };
}
