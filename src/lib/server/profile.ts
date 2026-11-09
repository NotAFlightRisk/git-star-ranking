import { listing, movement, neighbours, position, readMeta, spread } from './boards.ts';
import { DAY, refreshDays, settings } from './config.ts';
import { portfolio, seconds, type OwnerRow } from './db.ts';
import { bands, marks, milestone, nextUp, rankOf } from './rank.ts';

/** How often an owner's counted, and when it's next due. A visit a day after a count queues one */
export function schedule(owner: OwnerRow) {
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
  const [{ repos, languages, tiers }, latest, owners, all] = await Promise.all([
    portfolio(owner.id),
    readMeta(),
    spread(board),
    spread('repositories')
  ]);
  const counted = owner.refreshed_at > 0;
  const ranked = counted && owner.stars > 0 ? owners : undefined;
  const rank = ranked && position(ranked, owner.stars);
  const near = latest && listing(latest, board);
  return {
    rank,
    next: ranked && nextUp(ranked, owner.stars),
    milestone: ranked && milestone(ranked, owner.stars),
    spread: ranked && { bands: bands(ranked), marks: marks(ranked) },
    neighbours: rank && near ? await neighbours(near, owner.id, rank.rank) : undefined,
    moved: rank ? await movement(board, owner.id) : undefined,
    repos: repos.map((repo) => ({ ...repo, rank: all && rankOf(all, repo.stars) })),
    languages,
    tiers,
    schedule: counted ? schedule(owner) : undefined
  };
}
