import { json } from '@sveltejs/kit';
import {
  BLUE,
  defaultLabel,
  GREY,
  hex,
  LABEL_GREY,
  readBadge,
  type BadgeOptions,
  type Show
} from '../badges.ts';
import { number, short, top } from '../format.ts';
import { logo, render, type Drawn } from './badge-svg.ts';
import { languageListing, readMeta, standing } from './boards.ts';
import { findOwner, findRepo, type RepoRow } from './db.ts';

type Place = Awaited<ReturnType<typeof standing>>;

/** What a badge can say about an account or repo */
export interface Facts {
  stars: number;
  rank?: Place;
  language?: string | null;
  inLanguage?: Place;
}

async function ownerFacts(login: string): Promise<Facts | undefined> {
  const owner = await findOwner(login);
  if (!owner) return undefined;
  // until its first count, an account only has the stars a search turned up
  const counted = owner.refreshed_at > 0;
  const board = owner.kind ? 'organizations' : 'users';
  return { stars: owner.stars, rank: counted ? await standing(board, owner.stars) : undefined };
}

async function languageRank({ language, stars }: RepoRow) {
  const latest = await readMeta();
  const board = latest && languageListing(latest, language);
  return board ? standing(board.key, stars) : undefined;
}

async function repoFacts(login: string, name: string, show: Show): Promise<Facts | undefined> {
  const owner = await findOwner(login);
  const repo = owner && (await findRepo(owner.id, name));
  if (!repo) return undefined;
  const [rank, inLanguage] = await Promise.all([
    standing('repositories', repo.stars),
    show === 'language' ? languageRank(repo) : undefined
  ]);
  return { stars: repo.stars, rank, language: repo.language, inLanguage };
}

const VALUES: Record<Show, (facts: Facts) => string | undefined> = {
  rank: ({ rank }) => rank && `#${number(rank.rank)}`,
  language: ({ inLanguage, language }) =>
    inLanguage && `#${number(inLanguage.rank)} in ${language}`,
  top: ({ rank }) => rank && top(rank.top),
  stars: ({ stars }) => short(stars)
};

const valueOf = (facts: Facts | undefined, show: Show) => facts && VALUES[show](facts);

/** What a badge says and looks like. Missing values are always grey */
export function draw(facts: Facts | undefined, options: BadgeOptions): Drawn {
  const value = valueOf(facts, options.show);
  return {
    label: options.label ?? defaultLabel(options.show),
    message: value ?? (facts ? 'unranked' : 'not found'),
    color: hex(value ? (options.color ?? BLUE) : GREY),
    labelColor: hex(options.labelColor ?? LABEL_GREY),
    style: options.style,
    icon: Boolean(options.icon)
  };
}

async function describe(url: URL, login: string, repo?: string) {
  const options = readBadge(url.searchParams, repo ? 'repo' : 'account');
  const facts = repo ? await repoFacts(login, repo, options.show) : await ownerFacts(login);
  // read on every README view, and a rank only moves when a snapshot lands,
  // though a badge with nothing to show may have something after the next count
  const seconds = valueOf(facts, options.show) ? 3600 : 300;
  const headers = { 'x-browser-cache': `public, max-age=${seconds}` };
  return { drawn: draw(facts, options), seconds, headers };
}

export const SVG = {
  'content-type': 'image/svg+xml; charset=utf-8',
  // labels come from the URL, so nothing in one may run if opened directly
  'content-security-policy': "default-src 'none'",
  'x-content-type-options': 'nosniff'
};

/** Our own badge for an account, or for one of its repos */
export async function badge(url: URL, login: string, repo?: string) {
  const { drawn, headers } = await describe(url, login, repo);
  return new Response(render(drawn), { headers: { ...SVG, ...headers } });
}

/** The same badge as Shields' endpoint reads it, for them to draw */
export const endpoint = (drawn: Drawn, cacheSeconds = 3600) => ({
  schemaVersion: 1,
  label: drawn.label,
  message: drawn.message,
  color: drawn.color,
  labelColor: drawn.labelColor,
  style: drawn.style,
  logoSvg: drawn.icon ? logo(drawn) : undefined,
  cacheSeconds
});

export async function shields(url: URL, login: string, repo?: string) {
  const { drawn, seconds, headers } = await describe(url, login, repo);
  return json(endpoint(drawn, seconds), { headers });
}
