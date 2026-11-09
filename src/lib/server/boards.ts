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
export async function spread(key: string) {
  const latest = await readMeta();
  const histogram = latest && (await cached<Histogram>(`hist/${key}`, latest.at));
  return histogram?.total ? histogram : undefined;
}

export const position = (histogram: Histogram, stars: number) => ({
  rank: rankOf(histogram, stars),
  top: percentile(histogram, stars),
  of: histogram.total
});

/** Rank and percentile for a star count on a board, as of the last snapshot */
export async function standing(key: string, stars: number) {
  const histogram = await spread(key);
  return histogram && stars > 0 ? position(histogram, stars) : undefined;
}

/** A few rows either side of this one, shifted along rather than cut off at the ends */
export function around<T extends { id: number }>(rows: T[], id: number, count = 5) {
  const at = rows.findIndex((row) => row.id === id);
  if (at < 0) return undefined;
  const start = Math.max(0, Math.min(at - (count >> 1), rows.length - count));
  return rows.slice(start, start + count);
}

export interface Listing {
  key: string;
  size: number;
  pages: number;
}

/** Where a board's pages are in this snapshot */
export function listing(latest: Meta, board: Board): Listing {
  const { pages, size = PAGE_SIZE[board] } = latest.boards[board];
  return { key: board, size, pages };
}

/** Where one language's repo pages are, if it's big enough to have them */
export function languageListing(latest: Meta, language: string | null): Listing | undefined {
  const cut = latest.languages.find(({ name }) => name === language);
  const { size } = listing(latest, 'repositories');
  return cut && { key: `repositories/${cut.slug}`, size, pages: cut.pages };
}

/** Who sits near an entry on its board, for those in the pages we keep */
export async function neighbours<T extends OwnerEntry>(board: Listing, id: number, rank: number) {
  const page = Math.ceil(rank / board.size);
  if (page > board.pages) return undefined;
  const rows = around((await entries<T>(board.key, page)).rows, id);
  return rows && { page, rows };
}

/** Where an entry sits in two of a board's daily lists, counting from one */
export function shift(now: number[], then: number[], id: number) {
  const to = now.indexOf(id) + 1;
  const from = then.indexOf(id) + 1;
  return to ? { from: from || null, to } : undefined;
}

const WEEK = 7 * 86_400_000;
const day = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** How far an entry has moved on its board since a week before the latest snapshot */
export async function movement(board: Board, id: number) {
  const latest = await readMeta();
  if (!latest) return undefined;
  const list = (ms: number) => cached<number[]>(`history/${board}/${day(ms)}`, latest.at);
  const [now, then] = await Promise.all([list(latest.at), list(latest.at - WEEK)]);
  return now && then ? shift(now, then, id) : undefined;
}
