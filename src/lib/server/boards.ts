import { error } from '@sveltejs/kit';
import { PAGE_SIZE } from './config.ts';
import { percentile, rankOf, type Histogram } from './rank.ts';
import { slug, type Board, type Meta, type OwnerEntry, type RepoEntry } from './snapshot.ts';
import { cached, get } from './store.ts';

let meta: { value?: Meta; read: number } = { read: 0 };

/** The latest snapshot's summary, re-read at most once a minute per isolate */
export async function readMeta() {
  if (Date.now() - meta.read > 60_000) meta = { value: await get<Meta>('meta'), read: Date.now() };
  return meta.value;
}

export async function entries<T extends OwnerEntry | RepoEntry>(key: string, page = 1) {
  const latest = await readMeta();
  if (!latest) return { at: undefined, rows: [] as T[] };
  return { at: latest.at, rows: (await cached<T[]>(`board/${key}/${page}`, latest.at)) ?? [] };
}

export function pageNumber(url: URL, pages: number) {
  const raw = url.searchParams.get('page') ?? '1';
  const page = Number(raw);
  if (!/^\d+$/.test(raw) || page < 1 || page > Math.max(pages, 1)) {
    error(404, 'There are no more pages of this one');
  }
  return page;
}

/** Everything a leaderboard page needs, from the snapshot alone */
export async function boardLoad(board: Board, url: URL) {
  const latest = await readMeta();
  const asked = board === 'repositories' ? url.searchParams.get('language') : null;
  const language = asked
    ? latest?.languages.find((option) => option.slug === slug(asked))
    : undefined;
  if (asked && !language) error(404, 'We only keep boards for the 30 biggest languages');
  const pages = language?.pages ?? latest?.boards[board].pages ?? 0;
  const page = pageNumber(url, pages);
  const { at, rows } = await entries<OwnerEntry | RepoEntry>(
    language ? `repositories/${language.slug}` : board,
    page
  );
  return {
    board,
    page,
    pages,
    size: latest?.boards[board].size ?? PAGE_SIZE[board],
    rows,
    at,
    total: latest?.boards[board].total ?? 0,
    language: language?.name,
    languages: board === 'repositories' ? (latest?.languages ?? []) : []
  };
}

/** A board's rank histogram from the last snapshot, if it has anyone in it */
export async function spread(board: Board) {
  const latest = await readMeta();
  const histogram = latest && (await cached<Histogram>(`hist/${board}`, latest.at));
  return histogram?.total ? histogram : undefined;
}

export const position = (histogram: Histogram, stars: number) => ({
  rank: rankOf(histogram, stars),
  top: percentile(histogram, stars),
  of: histogram.total
});

/** Rank and percentile for a star count, as of the last snapshot */
export async function standing(board: Board, stars: number) {
  const histogram = await spread(board);
  return histogram && stars > 0 ? position(histogram, stars) : undefined;
}

/** A few rows either side of this one, shifted along rather than cut off at the ends */
export function around<T extends { id: number }>(rows: T[], id: number, count = 5) {
  const at = rows.findIndex((row) => row.id === id);
  if (at < 0) return undefined;
  const start = Math.max(0, Math.min(at - (count >> 1), rows.length - count));
  return rows.slice(start, start + count);
}

/** Who sits near an owner on its board, for those in the top pages */
export async function neighbours(board: 'users' | 'organizations', id: number, rank: number) {
  const latest = await readMeta();
  const page = Math.ceil(rank / (latest?.boards[board].size ?? PAGE_SIZE[board]));
  if (!latest || page > latest.boards[board].pages) return undefined;
  return around((await entries<OwnerEntry>(board, page)).rows, id);
}
