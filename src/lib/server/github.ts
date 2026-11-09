import { tidy } from '../format.ts';
import { base64url } from './bytes.ts';

export const API = 'https://api.github.com';
export const AGENT = 'git-star-ranking (+https://git-star-ranking.peng.ly)';

export type Kind = 0 | 1;
export type Resource = 'graphql' | 'search' | 'core';

export interface Seen {
  resource: Resource;
  remaining?: number;
  reset?: number;
  retryAfter?: number;
}

export interface Repo {
  id: number;
  name: string;
  stars: number;
  language: string | null;
  description: string | null;
  created: number | null;
  forks: number | null;
  license: string | null;
  archived: boolean | null;
}

export interface Owner {
  id: number;
  login: string;
  kind: Kind;
  repos: number;
  name: string | null;
  followers: number | null;
  joined: number | null;
  list: Repo[];
  cursor?: string;
}

export interface Found extends Repo {
  owner: { id: number; login: string; kind: Kind };
}

export class GitHubError extends Error {
  constructor(
    readonly status: number,
    detail: string
  ) {
    super(`GitHub said ${status}: ${detail.slice(0, 200)}`);
  }

  get timedOut() {
    return this.status === 502 || this.status === 504 || /timeout/i.test(this.message);
  }
}

/** Rate limit headers from every call, handed to the pool on its next lease */
export const seen: Seen[] = [];

export const headers = (token: string) => ({
  authorization: `Bearer ${token}`,
  accept: 'application/vnd.github+json',
  'user-agent': AGENT,
  'x-github-api-version': '2022-11-28'
});

// a hang or a half-sent answer is GitHub giving up, same as its own 504
const hungUp = (error: Error): never => {
  throw new GitHubError(504, error.message);
};

async function call(resource: Resource, url: string, init: RequestInit) {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(20_000) }).catch(hungUp);
  const header = (name: string) => Number(res.headers.get(name) ?? NaN) || undefined;
  seen.push({
    resource,
    remaining: res.headers.has('x-ratelimit-remaining')
      ? Number(res.headers.get('x-ratelimit-remaining'))
      : undefined,
    reset: header('x-ratelimit-reset'),
    retryAfter: header('retry-after') ?? (res.status === 403 || res.status === 429 ? 60 : undefined)
  });
  if (!res.ok) throw new GitHubError(res.status, await res.text().catch(hungUp));
  return res.json().catch(hungUp);
}

const WIDTHS = [
  [2 ** 8, 0xcc, 1],
  [2 ** 16, 0xcd, 2],
  [2 ** 32, 0xce, 4],
  [Infinity, 0xcf, 8]
] as const;

// msgpack's smallest unsigned int that fits, done in floats so ids past 2^32 survive
const uint = (n: number) => {
  if (!Number.isSafeInteger(n) || n < 0) throw new RangeError(`${n} isn't a GitHub id`);
  if (n < 128) return [n];
  const [, tag, size] = WIDTHS.find(([limit]) => n < limit)!;
  return [
    tag,
    ...Array.from({ length: size }, (_, i) => Math.floor(n / 256 ** (size - 1 - i)) % 256)
  ];
};

/** GitHub's newer node ids are msgpack [0, databaseId] behind a type prefix */
export const nodeId = (kind: Kind, id: number) =>
  `${kind ? 'O' : 'U'}_${base64url(new Uint8Array([0x92, 0, ...uint(id)]))}`;

const repositories = (
  after: string | null
) => `repositories(first: 100, after: ${JSON.stringify(after)},
  ownerAffiliations: OWNER, isFork: false, privacy: PUBLIC,
  orderBy: { field: STARGAZERS, direction: DESC }) {
  totalCount
  pageInfo { hasNextPage endCursor }
  nodes { databaseId name stargazerCount description primaryLanguage { name } createdAt
    forkCount isArchived licenseInfo { spdxId } }
}`;

const PERSON = 'databaseId name createdAt followers { totalCount }';

const fields = (after: string | null = null) => `__typename
  ... on User { ${PERSON} }
  ... on Organization { databaseId name createdAt }
  ... on RepositoryOwner { login ${repositories(after)} }`;

interface RawRepo {
  databaseId: number;
  name: string;
  stargazerCount: number;
  description: string | null;
  primaryLanguage: { name: string } | null;
  createdAt?: string;
  forkCount?: number;
  isArchived?: boolean;
  licenseInfo?: { spdxId: string | null } | null;
}

interface RawOwner {
  __typename: string;
  databaseId: number;
  login: string;
  name?: string | null;
  createdAt?: string;
  followers?: { totalCount: number };
  repositories: {
    totalCount: number;
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
    nodes: RawRepo[];
  };
}

type Answer<T> = { data?: T; errors?: { type?: string; path?: (string | number)[] }[] };

export const short = (text: string | null) => tidy(text);

const epoch = (iso?: string | null) => (iso ? Math.floor(Date.parse(iso) / 1000) : null);

// GitHub's word for a licence file it can't match to a known one
const licence = (spdx?: string | null) => (spdx === 'NOASSERTION' ? 'Other' : (spdx ?? null));

const toRepo = (raw: RawRepo): Repo => ({
  id: raw.databaseId,
  name: raw.name,
  stars: raw.stargazerCount,
  language: raw.primaryLanguage?.name ?? null,
  description: short(raw.description),
  created: epoch(raw.createdAt),
  forks: raw.forkCount ?? null,
  license: licence(raw.licenseInfo?.spdxId),
  archived: raw.isArchived ?? null
});

const toOwner = (raw: RawOwner): Owner => ({
  id: raw.databaseId,
  login: raw.login,
  kind: raw.__typename === 'Organization' ? 1 : 0,
  repos: raw.repositories.totalCount,
  name: raw.name?.trim() || null,
  followers: raw.followers?.totalCount ?? null,
  joined: epoch(raw.createdAt),
  list: raw.repositories.nodes.map(toRepo),
  cursor: raw.repositories.pageInfo.hasNextPage
    ? (raw.repositories.pageInfo.endCursor ?? undefined)
    : undefined
});

async function graphql<T>(token: string, query: string, variables: object = {}) {
  const answer = (await call('graphql', `${API}/graphql`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({ query, variables })
  })) as Answer<T>;
  if (!answer.data) throw new GitHubError(502, JSON.stringify(answer.errors ?? 'no data'));
  return { data: answer.data, missing: new Set(missingPaths(answer)) };
}

const missingPaths = ({ errors = [] }: Answer<unknown>) =>
  errors.filter((error) => error.type === 'NOT_FOUND').map((error) => String(error.path?.[1]));

/** One query for the lot, in the order asked. null means GitHub has no such account any more */
export async function owners(token: string, batch: { id: number; kind: Kind }[]) {
  const { data, missing } = await graphql<{ nodes: (RawOwner | null)[] }>(
    token,
    `query($ids: [ID!]!) { nodes(ids: $ids) { ${fields()} } }`,
    { ids: batch.map(({ id, kind }) => nodeId(kind, id)) }
  );
  return data.nodes.map((raw, i) => {
    if (raw?.repositories) return toOwner(raw);
    return missing.has(String(i)) ? null : undefined;
  });
}

/** The next page for each owner that has one, in a single aliased query */
export async function nextPages(token: string, batch: Owner[]) {
  const query = batch
    .map(
      ({ id, kind, cursor }, i) => `o${i}: node(id: "${nodeId(kind, id)}") { ${fields(cursor)} }`
    )
    .join('\n');
  const { data } = await graphql<Record<string, RawOwner | null>>(token, `query { ${query} }`);
  return batch.map((_, i) => (data[`o${i}`]?.repositories ? data[`o${i}`] : null));
}

export const merge = (owner: Owner, raw: RawOwner): Owner => ({
  ...owner,
  list: [...owner.list, ...raw.repositories.nodes.map(toRepo)],
  cursor: toOwner(raw).cursor
});

export async function ownerByLogin(token: string, login: string) {
  const { data } = await graphql<{ repositoryOwner: RawOwner | null }>(
    token,
    `query($login: String!) { repositoryOwner(login: $login) { ${fields()} } }`,
    { login }
  );
  return data.repositoryOwner?.repositories ? toOwner(data.repositoryOwner) : null;
}

export async function viewer(token: string) {
  const { data } = await graphql<{ viewer: RawOwner }>(
    token,
    `query { viewer { __typename ${PERSON} login ${repositories(null)} } }`
  );
  return toOwner(data.viewer);
}

interface RawFound {
  id: number;
  name: string;
  stargazers_count: number;
  language: string | null;
  description: string | null;
  created_at: string;
  forks_count: number;
  license: { spdx_id: string | null } | null;
  archived: boolean;
  owner: { id: number; login: string; type: string };
}

export async function searchRepos(token: string, q: string, page: number) {
  const params = new URLSearchParams({ q, sort: 'stars', order: 'desc', per_page: '100' });
  params.set('page', String(page));
  const body = (await call('search', `${API}/search/repositories?${params}`, {
    headers: headers(token)
  })) as { total_count: number; incomplete_results: boolean; items: RawFound[] };
  const items = body.items
    .filter(({ owner }) => owner.type === 'User' || owner.type === 'Organization')
    .map((raw): Found => ({
      id: raw.id,
      name: raw.name,
      stars: raw.stargazers_count,
      language: raw.language,
      description: short(raw.description),
      created: epoch(raw.created_at),
      forks: raw.forks_count,
      license: licence(raw.license?.spdx_id),
      archived: raw.archived,
      owner: { id: raw.owner.id, login: raw.owner.login, kind: raw.owner.type === 'User' ? 0 : 1 }
    }));
  return { total: body.total_count, incomplete: body.incomplete_results, items };
}
