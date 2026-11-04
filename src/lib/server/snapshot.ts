import { env } from 'cloudflare:workers';
import { BOARD_SIZE, LANGUAGES, LANGUAGE_PAGES, PAGE_SIZE } from './config.ts';
import { competition, histogram } from './rank.ts';
import { readState } from './db.ts';
import { get, put, putAll } from './store.ts';
import { meterD1 } from './usage.ts';

export type Board = 'users' | 'organizations' | 'repositories';

export interface OwnerEntry {
  rank: number;
  id: number;
  login: string;
  stars: number;
}

export interface RepoEntry extends OwnerEntry {
  owner_id: number;
  name: string;
  language: string | null;
  description: string | null;
}

export interface Meta {
  at: number;
  boards: Record<Board, { total: number; pages: number; size?: number }>;
  languages: { name: string; slug: string; pages: number }[];
}

const OWNERS = 'FROM owners WHERE kind = ?1 AND hidden = 0 AND refreshed_at > 0 AND stars > 0';
// hiding an owner deletes their repos, so only the rows we publish need the join
const WITH_OWNER = 'JOIN owners o ON o.id = r.owner_id WHERE o.hidden = 0';
const REPO_COLUMNS = 'r.id, r.owner_id, o.login, r.name, r.stars, r.language, r.description';

export const slug = (language: string) => encodeURIComponent(language.toLowerCase());

async function publish(key: string, rows: { stars: number }[], size: number) {
  const ranked = competition(rows);
  const pages = Math.ceil(ranked.length / size);
  await putAll(
    Array.from({ length: pages }, (_, page) => [
      `${key}/${page + 1}`,
      ranked.slice(page * size, (page + 1) * size)
    ])
  );
  return pages;
}

async function board(name: Board, top: D1PreparedStatement, counts: D1PreparedStatement) {
  const [rows, tally] = meterD1(await env.DB.batch([top, counts]));
  const ranked = rows.results as { id: number; stars: number }[];
  const spread = histogram(tally.results as { stars: number; n: number }[]);
  const date = new Date().toISOString().slice(0, 10);
  await put(`hist/${name}`, spread);
  await put(
    `history/${name}/${date}`,
    ranked.map(({ id }) => id)
  );
  const size = PAGE_SIZE[name];
  return { total: spread.total, pages: await publish(`board/${name}`, ranked, size), size };
}

async function languageBoards() {
  const { results: languages } = meterD1(
    await env.DB.prepare(
      `SELECT language AS name, COUNT(*) AS n FROM repos WHERE language IS NOT NULL
       GROUP BY language ORDER BY n DESC LIMIT ?1`
    )
      .bind(LANGUAGES)
      .all<{ name: string }>()
  );
  if (!languages.length) return [];
  const tops = meterD1(
    await env.DB.batch(
      languages.map(({ name }) =>
        env.DB.prepare(
          `SELECT ${REPO_COLUMNS} FROM repos r ${WITH_OWNER} AND r.language = ?1
           ORDER BY r.stars DESC, r.id LIMIT ?2`
        ).bind(name, LANGUAGE_PAGES * PAGE_SIZE.repositories)
      )
    )
  );
  return Promise.all(
    languages.map(async ({ name }, i) => ({
      name,
      slug: slug(name),
      pages: await publish(
        `board/repositories/${slug(name)}`,
        tops[i].results as Omit<RepoEntry, 'rank'>[],
        PAGE_SIZE.repositories
      )
    }))
  );
}

/** Leaderboards, rank histograms and a day of history, every six hours */
export async function snapshot() {
  const at = Date.now();
  const owners = (kind: number) =>
    [
      env.DB.prepare(`SELECT id, login, stars ${OWNERS} ORDER BY stars DESC, id LIMIT ?2`).bind(
        kind,
        BOARD_SIZE
      ),
      env.DB.prepare(
        `SELECT stars, COUNT(*) AS n ${OWNERS} GROUP BY stars ORDER BY stars DESC`
      ).bind(kind)
    ] as const;
  const boards = {
    users: await board('users', ...owners(0)),
    organizations: await board('organizations', ...owners(1)),
    repositories: await board(
      'repositories',
      env.DB.prepare(
        `SELECT ${REPO_COLUMNS} FROM (SELECT * FROM repos ORDER BY stars DESC, id LIMIT ?1) r
         ${WITH_OWNER} ORDER BY r.stars DESC, r.id`
      ).bind(BOARD_SIZE),
      env.DB.prepare('SELECT stars, COUNT(*) AS n FROM repos GROUP BY stars ORDER BY stars DESC')
    )
  };
  const meta: Meta = { at, boards, languages: await languageBoards() };
  await put('meta', meta);
  return meta;
}

/** A snapshot cut into pages of another size, say by an older deploy */
export const outOfShape = (meta: Meta) =>
  Object.entries(PAGE_SIZE).some(([board, size]) => meta.boards[board as Board].size !== size);

/** On top of the cron's own slots: when the last one's out of shape, and on the hour while the first sweep fills the tables */
export async function filling() {
  const [meta, sweep] = await Promise.all([
    get<Meta>('meta'),
    readState<{ done?: number }>('sweep')
  ]);
  return !meta || outOfShape(meta) || (!sweep?.done && new Date().getUTCMinutes() < 10);
}
