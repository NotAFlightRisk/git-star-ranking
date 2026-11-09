import { neighbours, position, spread } from './boards.ts';
import { BOARD_SIZE, DAY, refreshDays, settings } from './config.ts';
import { portfolio, seconds, type OwnerRow } from './db.ts';
import { bands, milestone, nextUp, rankOf, starsFor, type Histogram } from './rank.ts';

const SHARES = [0.5, 0.1, 0.01, 0.001];

/** Where "top 50%" and the like start, leaving out any too fine for a board this size */
const marks = (histogram: Histogram) =>
  SHARES.filter((share) => share * histogram.total >= 1)
    .map((share) => ({ share, stars: starsFor(histogram, share) }))
    .filter((mark, i, all) => mark.stars !== all[i - 1]?.stars);

/** How often an owner's counted, and when it's next due. A visit a day after a count queues one */
function schedule(owner: OwnerRow) {
  const now = seconds();
  const waiting = owner.due_at > now && now - owner.refreshed_at < DAY;
  return {
    every: refreshDays(owner.stars, settings().tiers),
    next: waiting ? owner.due_at * 1000 : undefined
  };
}

/** Everything a profile shows, from one trip to D1 and the latest snapshot */
export async function profile(owner: OwnerRow) {
  const board = owner.kind ? 'organizations' : 'users';
  const [{ repos, languages, tiers }, owners, all] = await Promise.all([
    portfolio(owner.id),
    spread(board),
    spread('repositories')
  ]);
  const counted = owner.refreshed_at > 0;
  const ranked = counted && owner.stars > 0 ? owners : undefined;
  const rank = ranked && position(ranked, owner.stars);
  return {
    rank,
    next: ranked && nextUp(ranked, owner.stars),
    milestone: ranked && milestone(ranked, owner.stars),
    spread: ranked && { bands: bands(ranked), marks: marks(ranked) },
    neighbours:
      rank && rank.rank <= BOARD_SIZE ? await neighbours(board, owner.id, rank.rank) : undefined,
    repos: repos.map((repo) => ({ ...repo, rank: all && rankOf(all, repo.stars) })),
    languages,
    tiers,
    schedule: counted ? schedule(owner) : undefined
  };
}
