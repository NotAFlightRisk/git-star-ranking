import { number, short } from '../../format.ts';
import type { Claim } from '../../widgets.ts';
import { BOARD_SIZE } from '../config.ts';
import type { Facts, Noun, RepoFact, Standing } from './facts.ts';

export const NOUNS: Record<Noun, string> = { user: 'user', organization: 'org', repo: 'repo' };

export const BOARD = `top ${number(BOARD_SIZE)}`;

/** Places worth showing off: in a language's top 1,000, or the top 10,000 overall */
export const NOTABLE = { local: 1_000, overall: 10_000 };

const TIERS = [10, 100, 1_000, 10_000];

/** The round number a rank is within, like the top 100, if it's in the top 10,000 */
export const tier = (rank: number) => TIERS.find((top) => rank <= top);

/** Places climbed up the board in a week, or new to it. A fall isn't worth showing off */
export function climb(moved: Facts['moved']): number | 'new' | undefined {
  if (!moved) return undefined;
  if (moved.from === null) return 'new';
  const places = moved.from - moved.to;
  return places > 0 ? places : undefined;
}

/** How exclusive a place is, to weigh one against another. Never shown, as our boards
 * aren't all of GitHub */
const share = ({ rank, of }: Standing) => rank / of;

/** Where a repo stands best: on its language's board, or among every repo */
export function best({ overall, local, language }: RepoFact) {
  if (local && language && (!overall || share(local) <= share(overall))) {
    return {
      ...local,
      notable: local.rank <= NOTABLE.local,
      label: `#${number(local.rank)} in ${language}`
    };
  }
  if (!overall) return undefined;
  const label = `#${number(overall.rank)} of all repos`;
  return { ...overall, notable: overall.rank <= NOTABLE.overall, label };
}

/** The account's repo that stands out most, if any does */
export function standout({ repos }: Facts) {
  const places = repos.flatMap((repo) => {
    const found = best(repo);
    return found?.notable ? [found] : [];
  });
  return places.sort((a, b) => share(a) - share(b))[0];
}

/** Each language's leading repo and its place there, best first. Repos come most starred
 * first, and the most starred in a language places best on its board */
export function leads({ repos }: Facts) {
  const firsts = new Map<string, RepoFact & { language: string; local: Standing }>();
  for (const repo of repos) {
    const { language, local } = repo;
    if (language && local && !firsts.has(language))
      firsts.set(language, { ...repo, language, local });
  }
  return [...firsts.values()].sort((a, b) => a.local.rank - b.local.rank);
}

interface Said {
  claim: Exclude<Claim, 'auto'>;
  line: string;
  detail: string;
  /** How exclusive it is, for picking between them */
  share: number;
}

/** Everything true and worth saying in a headline */
export function claims(facts: Facts): Said[] {
  const { name, noun, stars, rank, club } = facts;
  const repo = noun === 'repo';
  const pool = repo ? 'repos' : `GitHub ${NOUNS[noun]}s`;
  const detail = `${name} · ${number(stars)} stars`;
  const said: Said[] = [];
  if (rank) {
    const line = repo
      ? `#${number(rank.rank)} most starred repo on GitHub`
      : `#${number(rank.rank)} most starred GitHub ${NOUNS[noun]}`;
    said.push({ claim: 'rank', line, detail, share: share(rank) });
  }
  const lead = leads(facts)[0];
  if (lead) {
    const place = `#${number(lead.local.rank)}`;
    said.push({
      claim: 'language',
      line: repo
        ? `${place} most starred ${lead.language} repo on GitHub`
        : `Home of the ${place} ${lead.language} repo on GitHub`,
      detail: repo ? detail : `${name}/${lead.name} · ${number(lead.stars)} stars`,
      share: share(lead.local)
    });
  }
  if (club) {
    const line = `One of ${number(club.members)} ${pool} with ${short(club.least)}+ stars`;
    said.push({ claim: 'club', line, detail, share: club.members / club.of });
  }
  return said;
}

/** The claim asked for, or the most exclusive, or the stars it has when there's nothing else.
 * A club holds at least as many as the rank it's from, so it's only ever said when asked for */
export function headlineOf(facts: Facts, asked: Claim) {
  const said = claims(facts);
  const chosen =
    said.find((one) => one.claim === asked) ?? said.sort((a, b) => a.share - b.share)[0];
  return (
    chosen ?? {
      claim: 'stars' as const,
      line: `${number(facts.stars)} stars on GitHub`,
      detail: facts.name,
      share: 1
    }
  );
}
