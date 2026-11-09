import { readFile, writeFile } from 'node:fs/promises';
import { avatar, short } from '../../src/lib/format.ts';
import { LOGIN, REPO } from '../../src/lib/names.ts';

type Row = Record<string, unknown>;

const TOP = 100;
const MOST = 28;
const START = '<!-- leaderboard-start -->';
const END = '<!-- leaderboard-end -->';
const README = new URL('../README.md', import.meta.url);

const { homepage } = JSON.parse(
  await readFile(new URL('../../package.json', import.meta.url), 'utf8')
);
const api = new URL(process.env.LEADERBOARD_API || `${homepage}/api/leaderboard`);
// the edge hands out its stale copy while it refreshes, so ask for today's
api.searchParams.set('day', new Date().toISOString().slice(0, 10));

const isId = (n: unknown): n is number => Number.isSafeInteger(n) && (n as number) > 0;
const isStars = (n: unknown): n is number => Number.isSafeInteger(n) && (n as number) >= 0;
const named = (text: unknown, pattern: RegExp): text is string =>
  typeof text === 'string' && pattern.test(text);
const fit = (text: string) => (text.length > MOST ? `${text.slice(0, MOST - 1)}…` : text);

const cell = (id: number, label: string, href: string, stars: number) =>
  `[<img src="${avatar(id, 32)}" width="16" alt="" /> ${fit(label)}](${href}) (${short(stars)} ⭐)`;

const owner = ({ id, login, stars }: Row) =>
  isId(id) && named(login, LOGIN) && isStars(stars)
    ? cell(id, `@${login}`, `https://github.com/${login}`, stars)
    : undefined;

const repo = ({ owner_id, login, name, stars }: Row) =>
  isId(owner_id) && named(login, LOGIN) && named(name, REPO) && isStars(stars)
    ? cell(owner_id, name, `https://github.com/${login}/${name}`, stars)
    : undefined;

/** Whatever's usable from one board, skipping rows too odd to show */
const column = (rows: unknown, format: (row: Row) => string | undefined) =>
  (Array.isArray(rows) ? rows : [])
    .filter((row): row is Row => typeof row === 'object' && row !== null)
    .map(format)
    .filter((text) => text !== undefined)
    .slice(0, TOP);

const response = await fetch(api, { signal: AbortSignal.timeout(30_000) });
if (!response.ok) throw new Error(`${api} answered ${response.status}`);
const boards = await response.json();
const columns = {
  users: column(boards.users, owner),
  organizations: column(boards.organizations, owner),
  repositories: column(boards.repositories, repo)
};

const empty = Object.keys(columns).filter((key) => !columns[key as keyof typeof columns].length);
if (empty.length) throw new Error(`Nothing usable for ${empty.join(', ')}, so the README stays`);

const { users, organizations, repositories } = columns;
const rows = Array.from(
  { length: Math.max(users.length, organizations.length, repositories.length) },
  (_, i) => `| ${users[i] ?? ''} | ${organizations[i] ?? ''} | ${repositories[i] ?? ''} |`
);
const more = (noun: string, path: string) =>
  `**[View full ${noun} leaderboard →](${homepage}/${path})**`;
const table = [
  '| Top Users | Top Orgs | Top Repos |',
  '|---|---|---|',
  ...rows,
  `| ${more('user', 'users')} | ${more('org', 'organizations')} | ${more('repo', 'repositories')} |`
].join('\n');

const readme = await readFile(README, 'utf8');
const start = readme.indexOf(START);
const end = readme.indexOf(END);
if (start < 0 || end < start) throw new Error(`The README needs ${START} and ${END} in it`);
await writeFile(
  README,
  `${readme.slice(0, start + START.length)}\n\n${table}\n\n${readme.slice(end)}`
);
console.log(`${users.length} users, ${organizations.length} orgs, ${repositories.length} repos`);
