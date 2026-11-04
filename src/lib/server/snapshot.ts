import { env } from 'cloudflare:workers';
import { BOARD_SIZE, LANGUAGES, LANGUAGE_PAGES, PAGE_SIZE } from './config.ts';
import { competition, histogram } from './rank.ts';
import { readState } from './db.ts';
import { get, put } from './store.ts';
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
  boards: Record<Board, { total: number; pages: number }>;
  languages: { name: string; slug: string; pages: number }[];
}

const OWNERS = 'FROM owners WHERE kind = ?1 AND hidden = 0 AND refreshed_at > 0 AND stars > 0';
const REPOS = 'FROM repos r JOIN owners o ON o.id = r.owner_id WHERE o.hidden = 0';
const REPO_COLUMNS = 'r.id, r.owner_id, o.login, r.name, r.stars, r.language, r.description';

export const slug = (language: string) => encodeURIComponent(language.toLowerCase());

async function publish(key: string, rows: { stars: number }[], size: number) {
  const ranked = competition(rows);
  const pages = Math.ceil(ranked.length / size);
  await Promise.all(
    Array.from({ length: pages }, (_, page) =>
      put(`${key}/${page + 1}`, ranked.slice(page * size, (page + 1) * size))
    )
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
  return { total: spread.total, pages: await publish(`board/${name}`, ranked, PAGE_SIZE[name]) };
}

async function languageBoards() {
  const { results: languages } = meterD1(
    await env.DB.prepare(
      `SELECT r.language AS name, COUNT(*) AS n ${REPOS} AND r.language IS NOT NULL
       GROUP BY r.language ORDER BY n DESC LIMIT ?1`
    )
      .bind(LANGUAGES)
      .all<{ name: string }>()
  );
  const { results } = meterD1(
    await env.DB.prepare(
      `SELECT id, owner_id, login, name, stars, language, description FROM (
         SELECT ${REPO_COLUMNS},
           ROW_NUMBER() OVER (PARTITION BY r.language ORDER BY r.stars DESC, r.id) AS pos
         ${REPOS} AND r.language IN (SELECT value FROM json_each(?1))
       ) WHERE pos <= ?2 ORDER BY language, pos`
    )
      .bind(
        JSON.stringify(languages.map(({ name }) => name)),
        LANGUAGE_PAGES * PAGE_SIZE.repositories
      )
      .all<Omit<RepoEntry, 'rank'>>()
  );
  return Promise.all(
    languages.map(async ({ name }) => ({
      name,
      slug: slug(name),
      pages: await publish(
        `board/repositories/${slug(name)}`,
        results.filter((row) => row.language === name),
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
      env.DB.prepare(`SELECT ${REPO_COLUMNS} ${REPOS} ORDER BY r.stars DESC, r.id LIMIT ?1`).bind(
        BOARD_SIZE
      ),
      env.DB.prepare(
        `SELECT r.stars, COUNT(*) AS n ${REPOS} GROUP BY r.stars ORDER BY r.stars DESC`
      )
    )
  };
  const meta: Meta = { at, boards, languages: await languageBoards() };
  await put('meta', meta);
  return meta;
}

/** On top of the cron's own slots: hourly while the first sweep is still filling the tables */
export async function filling() {
  const [meta, sweep] = await Promise.all([
    get<Meta>('meta'),
    readState<{ done?: number }>('sweep')
  ]);
  return !meta || (!sweep?.done && Date.now() - meta.at > 3_600_000);
}
