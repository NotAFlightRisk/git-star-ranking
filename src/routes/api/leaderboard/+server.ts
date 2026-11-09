import { error, json } from '@sveltejs/kit';
import { entries, listing, readMeta } from '#lib/server/boards.ts';
import type { Board, Meta } from '#lib/server/snapshot.ts';

const TOP = 100;

async function top(latest: Meta, board: Board) {
  const { key, size, pages } = listing(latest, board);
  const wanted = Math.min(pages, Math.ceil(TOP / size));
  const lists = await Promise.all(
    Array.from({ length: wanted }, (_, page) => entries(key, page + 1))
  );
  if (lists.some(({ rows }) => !rows.length)) error(503, `The ${board} snapshot is missing a page`);
  return lists.flatMap(({ rows }) => rows).slice(0, TOP);
}

/** The first hundred on each board, as of the last snapshot */
export const GET = async () => {
  const latest = await readMeta();
  if (!latest) error(503, "There's no snapshot yet");
  const [users, organizations, repositories] = await Promise.all(
    (['users', 'organizations', 'repositories'] as const).map((board) => top(latest, board))
  );
  return json({ updated: new Date(latest.at).toISOString(), users, organizations, repositories });
};
