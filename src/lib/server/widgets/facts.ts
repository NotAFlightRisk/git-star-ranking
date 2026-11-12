import { languageListing, movement, readMeta, spread } from '../boards.ts';
import { findOwner, findRepo, portfolio, type LanguageRow, type RepoRow } from '../db.ts';
import { rankOf, type Histogram } from '../rank.ts';
import { club } from '../repo.ts';

export type Noun = 'user' | 'organization' | 'repo';

/** A place on a board, and how many are on it */
export interface Standing {
  rank: number;
  of: number;
}

export interface RepoFact {
  name: string;
  stars: number;
  language: string | null;
  /** Among every repo we track */
  overall?: Standing;
  /** On its language's board, which only the biggest languages have */
  local?: Standing;
}

/** What a widget can say about an account or repo, from our own counts */
export interface Facts {
  /** A login, or owner/repo */
  name: string;
  noun: Noun;
  stars: number;
  /** An account only seen in a search has a partial count */
  counted: boolean;
  /** Its own place, only where we've found everything above it */
  rank?: Standing;
  moved?: { from: number | null; to: number };
  /** The biggest star tier it's reached, how many have reached it, and of how many */
  club?: { least: number; members: number; of: number };
  /** Most starred first: an account's top repos with 50+ stars, or the repo itself */
  repos: RepoFact[];
  /** An account's repos with 50+ stars, totted up by language, most starred first */
  languages: LanguageRow[];
}

const place = (histogram: Histogram | undefined, stars: number): Standing | undefined =>
  histogram && { rank: rankOf(histogram, stars), of: histogram.total };

const membership = (histogram: Histogram | undefined, stars: number) => {
  const found = histogram && club(histogram, stars);
  return found && { least: found.least, members: found.repos, of: histogram.total };
};

/** We only find accounts that own a repo with 50+ stars, so below this many stars an account
 * could have others we haven't found above it. Widgets show it no rank until then */
export const RANKED_FROM = 1_000;

// each language's board is a read, so only those of the first few languages that have one
const LANGUAGES_READ = 6;

/** Repos placed among all repos and on their languages' boards */
async function placed(rows: RepoRow[], all: Histogram | undefined): Promise<RepoFact[]> {
  const latest = await readMeta();
  const languages = [...new Set(rows.flatMap((row) => (row.language ? [row.language] : [])))];
  const listed = languages.flatMap((name) => {
    const board = latest && languageListing(latest, name);
    return board ? [{ name, key: board.key }] : [];
  });
  const boards = new Map(
    await Promise.all(
      listed
        .slice(0, LANGUAGES_READ)
        .map(async ({ name, key }) => [name, await spread(key)] as const)
    )
  );
  return rows.map(({ name, stars, language }) => ({
    name,
    stars,
    language,
    overall: place(all, stars),
    local: place(language ? boards.get(language) : undefined, stars)
  }));
}

/** An account's facts. A star map only needs its repos, so places on boards, its own and its
 * repos', are only read when asked for */
export async function accountFacts(login: string, standings = true): Promise<Facts | undefined> {
  const owner = await findOwner(login);
  if (!owner) return undefined;
  const noun: Noun = owner.kind ? 'organization' : 'user';
  const base = { name: owner.login, noun, stars: owner.stars, repos: [], languages: [] };
  if (owner.refreshed_at <= 0) return { ...base, counted: false };
  const board = owner.kind ? 'organizations' : 'users';
  const [{ repos, languages }, ranked, all] = await Promise.all([
    portfolio(owner.id),
    standings && owner.stars >= RANKED_FROM ? spread(board) : undefined,
    standings ? spread('repositories') : undefined
  ]);
  const [moved, facts] = await Promise.all([
    ranked ? movement(board, owner.id) : undefined,
    standings
      ? placed(repos, all)
      : repos.map(({ name, stars, language }) => ({ name, stars, language }))
  ]);
  return {
    ...base,
    counted: true,
    rank: place(ranked, owner.stars),
    moved,
    club: membership(ranked, owner.stars),
    repos: facts,
    languages
  };
}

/** A repo's facts. Every repo with enough stars to track is found, so its rank always holds */
export async function repoFacts(login: string, name: string): Promise<Facts | undefined> {
  const owner = await findOwner(login);
  const repo = owner && (await findRepo(owner.id, name));
  if (!repo) return undefined;
  const all = await spread('repositories');
  const [[fact], moved] = await Promise.all([
    placed([repo], all),
    movement('repositories', repo.id)
  ]);
  return {
    name: `${owner.login}/${repo.name}`,
    noun: 'repo',
    stars: repo.stars,
    counted: true,
    rank: fact.overall,
    moved,
    club: membership(all, repo.stars),
    repos: [fact],
    languages: []
  };
}
