import { env } from 'cloudflare:workers';
import { DAY, refreshDays, settings } from './config.ts';
import { searchQuery, type Job } from './sweep.ts';
import type { Found, Kind, Owner } from './github.ts';
import { meterD1 } from './usage.ts';

export interface OwnerRow {
  id: number;
  login: string;
  kind: Kind;
  stars: number;
  repos: number;
  refreshed_at: number;
  due_at: number;
  missed: number;
}

export interface RepoRow {
  id: number;
  owner_id: number;
  name: string;
  stars: number;
  language: string | null;
  description: string | null;
}

export const seconds = () => Math.floor(Date.now() / 1000);

const each = (column: number) => `json_extract(value, '$[${column}]')`;

const UPSERT_REPOS = `
  INSERT INTO repos (id, owner_id, name, stars, language, description)
  SELECT ${[0, 1, 2, 3, 4, 5].map(each).join(', ')} FROM json_each(?1)
  WHERE NOT EXISTS (SELECT 1 FROM owners WHERE id = ${each(1)} AND hidden = 1)
  ON CONFLICT (id) DO UPDATE SET owner_id = excluded.owner_id, name = excluded.name,
    stars = excluded.stars, language = excluded.language, description = excluded.description
  WHERE repos.stars <> excluded.stars OR repos.owner_id <> excluded.owner_id
    OR repos.name <> excluded.name COLLATE BINARY OR repos.language IS NOT excluded.language
    OR repos.description IS NOT excluded.description`;

const UPSERT_OWNERS = `
  INSERT INTO owners (id, login, kind, stars, repos, refreshed_at, due_at)
  SELECT ${[0, 1, 2, 3, 4].map(each).join(', ')}, ?2, ${each(5)} FROM json_each(?1) WHERE true
  ON CONFLICT (id) DO UPDATE SET login = excluded.login, kind = excluded.kind,
    stars = excluded.stars, repos = excluded.repos, refreshed_at = excluded.refreshed_at,
    due_at = excluded.due_at, missed = 0
  WHERE owners.hidden = 0`;

// a stub waits on its first refresh, biggest first, as due_at sorts below everyone else
const STUB_OWNERS = `
  INSERT INTO owners (id, login, kind, stars, due_at)
  SELECT ${[0, 1, 2, 3].map(each).join(', ')}, -${each(3)} FROM json_each(?1) WHERE true
  ON CONFLICT (id) DO UPDATE SET login = excluded.login
  WHERE owners.hidden = 0 AND owners.login <> excluded.login COLLATE BINARY`;

const PRUNE_REPOS = `
  DELETE FROM repos WHERE owner_id IN (SELECT value FROM json_each(?1))
  AND id NOT IN (SELECT value FROM json_each(?2))`;

const DROP_OWNERS = `
  DELETE FROM owners WHERE id IN (SELECT value FROM json_each(?1))`;

const DROP_THEIR_REPOS = `
  DELETE FROM repos WHERE owner_id IN (SELECT value FROM json_each(?1))`;

const sql = (text: string, ...values: unknown[]) => env.DB.prepare(text).bind(...values);

/** Reads go through here so the budget sees them, which first() alone wouldn't */
export const many = async <T>(statement: D1PreparedStatement) =>
  meterD1(await statement.all<T>()).results;

export const one = async <T>(statement: D1PreparedStatement) =>
  (await many<T>(statement))[0] ?? null;

const jitter = () => 0.9 + Math.random() * 0.2;

/** Writes what a refresh found, touching only rows that changed */
export async function saveOwners(fetched: Owner[], gone: number[] = []) {
  const { minStars, tiers } = settings();
  const now = seconds();
  const owners = fetched.map((owner) => {
    const stars = owner.list.reduce((sum, repo) => sum + repo.stars, 0);
    const due = now + Math.round(refreshDays(stars, tiers) * DAY * jitter());
    return [owner.id, owner.login, owner.kind, stars, owner.repos, due];
  });
  const repos = fetched.flatMap((owner) =>
    owner.list
      .filter((repo) => repo.stars >= minStars)
      .map((repo) => [repo.id, owner.id, repo.name, repo.stars, repo.language, repo.description])
  );
  const complete = fetched.filter((owner) => !owner.cursor).map((owner) => owner.id);
  const statements = [
    sql(UPSERT_OWNERS, JSON.stringify(owners), now),
    sql(UPSERT_REPOS, JSON.stringify(repos)),
    sql(PRUNE_REPOS, JSON.stringify(complete), JSON.stringify(repos.map(([id]) => id)))
  ];
  if (gone.length) {
    const ids = JSON.stringify(gone);
    statements.push(sql(DROP_THEIR_REPOS, ids), sql(DROP_OWNERS, ids));
  }
  meterD1(await env.DB.batch(statements));
}

/** Search results: repos as they stand, plus a stub for any owner we've not met */
export async function saveFound(found: Found[]) {
  const owners = new Map<number, [number, string, Kind, number]>();
  for (const { owner, stars } of found) {
    const row = owners.get(owner.id) ?? [owner.id, owner.login, owner.kind, 0];
    row[3] += stars;
    owners.set(owner.id, row);
  }
  const repos = found.map((repo) => [
    repo.id,
    repo.owner.id,
    repo.name,
    repo.stars,
    repo.language,
    repo.description
  ]);
  meterD1(
    await env.DB.batch([
      sql(STUB_OWNERS, JSON.stringify([...owners.values()])),
      sql(UPSERT_REPOS, JSON.stringify(repos))
    ])
  );
}

export const due = (limit: number) =>
  many<Pick<OwnerRow, 'id' | 'kind' | 'login' | 'repos' | 'refreshed_at' | 'missed'>>(
    sql(
      `SELECT id, kind, login, repos, refreshed_at, missed FROM owners
       WHERE due_at <= ?1 AND hidden = 0 ORDER BY due_at LIMIT ?2`,
      seconds(),
      limit
    )
  );

/** Leaves an owner GitHub wouldn't give us for a day, so one bad account can't wedge the queue */
export async function snooze(ids: number[], missed = false) {
  meterD1(
    await sql(
      `UPDATE owners SET due_at = ?2, missed = missed OR ?3
       WHERE id IN (SELECT value FROM json_each(?1))`,
      JSON.stringify(ids),
      seconds() + DAY,
      Number(missed)
    ).run()
  );
}

export async function readState<T>(key: string) {
  const row = await one<{ value: string }>(sql('SELECT value FROM state WHERE key = ?', key));
  return row ? (JSON.parse(row.value) as T) : undefined;
}

export async function writeState(key: string, value: unknown) {
  meterD1(
    await sql(
      'INSERT INTO state (key, value) VALUES (?1, ?2) ON CONFLICT (key) DO UPDATE SET value = ?2',
      key,
      JSON.stringify(value)
    ).run()
  );
}

/** Pushes an owner to the front of the refresh queue, once per refresh */
export async function hurry(owner: OwnerRow, after = DAY) {
  if (owner.due_at <= 0 || seconds() - owner.refreshed_at < after) return false;
  const { meta } = meterD1(
    await sql(
      'UPDATE owners SET due_at = 0 WHERE id = ?1 AND due_at > 0 AND refreshed_at <= ?2',
      owner.id,
      seconds() - after
    ).run()
  );
  return meta.changes > 0;
}

export const findOwner = (login: string) =>
  one<OwnerRow>(
    sql(
      `SELECT id, login, kind, stars, repos, refreshed_at, due_at, missed FROM owners
       WHERE login = ? AND hidden = 0 ORDER BY refreshed_at DESC LIMIT 1`,
      login
    )
  );

export interface LanguageRow {
  language: string | null;
  repos: number;
  stars: number;
}

/** An owner's top repos, plus all of them totted up by language, in one trip */
export async function portfolio(ownerId: number) {
  const [repos, languages] = meterD1(
    await env.DB.batch([
      sql(
        `SELECT id, owner_id, name, stars, language, description FROM repos
         WHERE owner_id = ? ORDER BY stars DESC, id LIMIT 100`,
        ownerId
      ),
      sql(
        `SELECT language, COUNT(*) AS repos, SUM(stars) AS stars FROM repos
         WHERE owner_id = ? GROUP BY language ORDER BY stars DESC`,
        ownerId
      )
    ])
  );
  return { repos: repos.results as RepoRow[], languages: languages.results as LanguageRow[] };
}

export const findRepo = (ownerId: number, name: string) =>
  one<RepoRow>(
    sql(
      `SELECT id, owner_id, name, stars, language, description FROM repos
       WHERE owner_id = ? AND name = ? LIMIT 1`,
      ownerId,
      name
    )
  );

/** Hides an account for good, and leaves a tombstone so a crawl can't bring it back */
export async function forget(id: number) {
  meterD1(
    await env.DB.batch([
      env.DB.prepare(
        `UPDATE owners SET hidden = 1, login = '', stars = 0, repos = 0, due_at = 9e15 WHERE id = ?`
      ).bind(id),
      env.DB.prepare('DELETE FROM repos WHERE owner_id = ?').bind(id)
    ])
  );
}

/** A lowercased prefix as an index-friendly range, as LIKE won't always use one */
export const range = (prefix: string) => {
  const low = prefix.toLowerCase();
  return low
    ? [low, low.slice(0, -1) + String.fromCharCode(low.charCodeAt(low.length - 1) + 1)]
    : ['', '￿'];
};

export async function search(query: string) {
  const scoped = query.includes('/');
  const [login, name] = scoped ? query.split('/', 2) : [query, query];
  const owners = sql(
    `SELECT id, login, kind, stars FROM owners
     WHERE login >= ?1 AND login < ?2 AND hidden = 0 AND refreshed_at > 0
     ORDER BY stars DESC LIMIT 20`,
    ...range(login)
  );
  const repos = scoped
    ? sql(
        `SELECT r.id, o.login, r.name, r.stars, r.language, r.description
         FROM owners o JOIN repos r ON r.owner_id = o.id
         WHERE o.login = ?1 AND o.hidden = 0 AND r.name >= ?2 AND r.name < ?3
         ORDER BY r.stars DESC LIMIT 20`,
        login,
        ...range(name)
      )
    : sql(
        `SELECT r.id, o.login, r.name, r.stars, r.language, r.description
         FROM repos r JOIN owners o ON o.id = r.owner_id
         WHERE r.name >= ?1 AND r.name < ?2 AND o.hidden = 0 ORDER BY r.stars DESC LIMIT 20`,
        ...range(name)
      );
  const [found, matched] = meterD1(await env.DB.batch([owners, repos]));
  return {
    owners: found.results as Pick<OwnerRow, 'id' | 'login' | 'kind' | 'stars'>[],
    repos: matched.results as (Omit<RepoRow, 'owner_id'> & { login: string })[]
  };
}

/** The sweep's ledger, so a retried or duplicated queue message can't count twice */
export async function addSlices(jobs: Job[]) {
  const rows = jobs.map((job) => [job.sweep, searchQuery(job), JSON.stringify(job)]);
  meterD1(
    await sql(
      `INSERT INTO slices (sweep, query, job, touched_at)
       SELECT ${[0, 1, 2].map(each).join(', ')}, ?2 FROM json_each(?1) WHERE true
       ON CONFLICT (sweep, query) DO NOTHING`,
      JSON.stringify(rows),
      seconds()
    ).run()
  );
}

export const sliceDone = async (job: Job) =>
  meterD1(
    await sql(
      'UPDATE slices SET done = 1, touched_at = ?3 WHERE sweep = ?1 AND query = ?2',
      job.sweep,
      searchQuery(job),
      seconds()
    ).run()
  );

export const sliceState = (job: Job) =>
  one<{ done: number }>(
    sql('SELECT done FROM slices WHERE sweep = ? AND query = ?', job.sweep, searchQuery(job))
  );

export const sweepProgress = (sweep: string) =>
  one<{ slices: number; left: number; touched: number }>(
    sql(
      `SELECT COUNT(*) AS slices, SUM(done = 0) AS left, MAX(touched_at) AS touched
       FROM slices WHERE sweep = ?`,
      sweep
    )
  );

/** A worker's started on this one, so the stall check knows the queue's still moving */
export const claim = async (job: Job) =>
  meterD1(
    await sql(
      'UPDATE slices SET touched_at = ?3 WHERE sweep = ?1 AND query = ?2',
      job.sweep,
      searchQuery(job),
      seconds()
    ).run()
  );

/** The longest-waiting slices still to do, touched so the same ones aren't sent again next time */
export async function retouch(sweep: string, limit: number) {
  const rows = await many<{ query: string; job: string }>(
    sql(
      `SELECT query, job FROM slices WHERE sweep = ? AND done = 0
       ORDER BY touched_at, query LIMIT ?`,
      sweep,
      limit
    )
  );
  meterD1(
    await sql(
      `UPDATE slices SET touched_at = ?3
       WHERE sweep = ?1 AND query IN (SELECT value FROM json_each(?2))`,
      sweep,
      JSON.stringify(rows.map((row) => row.query)),
      seconds()
    ).run()
  );
  return rows.map((row) => JSON.parse(row.job) as Job);
}
