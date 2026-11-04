import { env } from 'cloudflare:workers';
import { settings } from './config.ts';
import { due, readState, saveFound, saveOwners, snooze, writeState } from './db.ts';
import {
  GitHubError,
  merge,
  nextPages,
  ownerByLogin,
  owners,
  searchRepos,
  seen,
  viewer,
  type Owner,
  type Resource
} from './github.ts';
import type { Grant } from './pool.ts';
import { report } from './report.ts';
import { meter } from './usage.ts';

export interface Job {
  type: 'slice';
  sweep: string;
  min: number;
  max: number;
  from?: string;
  to?: string;
}

interface Sweep {
  id: string;
  started: number;
  pending: number;
  done?: number;
}

type Take = () => Promise<Grant>;

const DAY_MS = 86_400_000;
const TOP = 10_000_000;
const EPOCH = Date.parse('2007-10-01T00:00:00Z');
// GitHub gets through about 100 repos a second and gives up at 10
const BATCH_REPOS = 400;
const GUESS = 40;
const PER_QUERY = 4;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Borrows calls from the pool a few at a time, so it's one pool request per handful */
export function borrow(resource: Resource, chunk: number, urgent = false): Take {
  let token: string | undefined;
  let left = 0;
  return async () => {
    if (left === 0) {
      meter('do_requests');
      const grant = await env.POOL.getByName('github').lease({
        resource,
        calls: chunk,
        seen: seen.splice(0),
        urgent
      });
      if (!grant.token) return grant;
      ({ token } = grant);
      left = chunk;
    }
    left--;
    meter(`github_${resource}`);
    return { token, wait: 0 };
  };
}

export function pack<T extends { repos: number; refreshed_at: number }>(list: T[]) {
  const batches: T[][] = [];
  let weight = Infinity;
  for (const owner of list) {
    const cost = owner.refreshed_at ? Math.min(Math.max(owner.repos, 1), 100) : GUESS;
    if (weight + cost > BATCH_REPOS) {
      batches.push([]);
      weight = 0;
    }
    batches.at(-1)!.push(owner);
    weight += cost;
  }
  return batches;
}

/** Fetches the rest of each owner's repos, up to the page cap. Whatever's left stays partial */
async function finish(list: Owner[], take: Take) {
  const done = new Map(list.map((owner) => [owner.id, owner]));
  for (let page = 2; page <= settings().repoPages; page++) {
    const open = [...done.values()].filter((owner) => owner.cursor);
    for (let i = 0; i < open.length; i += PER_QUERY) {
      const { token } = await take();
      if (!token) return [...done.values()];
      const group = open.slice(i, i + PER_QUERY);
      const pages = await nextPages(token, group);
      group.forEach((owner, n) => done.set(owner.id, merge(owner, pages[n])));
    }
  }
  return [...done.values()];
}

async function refresh(batch: Awaited<ReturnType<typeof due>>, token: string, take: Take) {
  const found = await owners(token, batch);
  const gone = batch.filter((_, i) => found[i] === null).map(({ id }) => id);
  const lost = batch.filter((_, i) => found[i] === undefined).map(({ id }) => id);
  if (lost.length) await snooze(lost);
  await saveOwners(
    await finish(
      found.filter((owner) => !!owner),
      take
    ),
    gone
  );
}

/** Works through the queue; true means it stopped early and the run should too */
async function stream(queue: Awaited<ReturnType<typeof due>>[], deadline: number) {
  const take = borrow('graphql', 10);
  while (Date.now() < deadline) {
    const batch = queue.shift();
    if (!batch) return false;
    const { token, wait } = await take();
    if (!token) {
      queue.unshift(batch);
      if (Date.now() + wait > deadline) return true;
      await sleep(wait);
      continue;
    }
    try {
      await refresh(batch, token, take);
    } catch (error) {
      if (!(error instanceof GitHubError)) throw error;
      if (!error.timedOut) {
        await report(error, undefined, 'crawl');
        return true;
      }
      if (batch.length === 1) await snooze([batch[0].id]);
      else queue.unshift(batch.slice(0, batch.length / 2), batch.slice(batch.length / 2));
    }
  }
  return true;
}

/** The cron's share of work: refresh whoever's due, until the deadline */
export async function refreshDue(deadline: number) {
  const { streams } = settings();
  while (Date.now() < deadline) {
    const queue = pack(await due(300 * streams));
    if (!queue.length) return;
    const stopped = await Promise.all(
      Array.from({ length: streams }, () => stream(queue, deadline))
    );
    if (stopped.some(Boolean)) return;
  }
}

export const searchQuery = ({ min, max, from, to }: Job) =>
  `stars:${min}..${max}${from ? ` created:${from}..${to}` : ''}`;

const iso = (ms: number) => new Date(ms).toISOString().replace('.000', '');

/** Halves a slice by stars while it can, then by creation date */
export function split(job: Job, now = Date.now()): Job[] | undefined {
  if (job.min < job.max) {
    const middle = Math.min(job.max - 1, Math.floor(Math.sqrt(job.min * job.max)));
    return [
      { ...job, min: middle + 1 },
      { ...job, max: middle }
    ];
  }
  const from = job.from ? Date.parse(job.from) : EPOCH;
  const to = job.to ? Date.parse(job.to) : now;
  if (to - from < 7_200_000) return undefined;
  const middle = from + Math.floor((to - from) / 2000) * 1000;
  return [
    { ...job, from: iso(from), to: iso(middle) },
    { ...job, from: iso(middle + 1000), to: iso(to) }
  ];
}

async function progress(job: Job, delta: number) {
  const sweep = await readState<Sweep>('sweep');
  if (sweep?.id !== job.sweep) return;
  const pending = sweep.pending + delta;
  await writeState('sweep', { ...sweep, pending, done: pending > 0 ? undefined : Date.now() });
}

/** One search slice. Returns how long to wait if the pool says not yet */
export async function sweepSlice(job: Job) {
  const probe = await borrow('search', 1)();
  if (!probe.token) return probe.wait;
  const query = searchQuery(job);
  const first = await searchRepos(probe.token, query, 1);
  await saveFound(first.items);
  const halves = first.total > 1000 ? split(job) : undefined;
  if (halves) {
    meter('queue_ops', 3 * halves.length);
    await env.CRAWL.sendBatch(halves.map((body) => ({ body })));
    return progress(job, halves.length - 1);
  }
  const pages = Math.min(10, Math.ceil(first.total / 100));
  const take = borrow('search', Math.max(pages - 1, 1));
  for (let page = 2; page <= pages; page++) {
    const { token, wait } = await take();
    if (token) await saveFound((await searchRepos(token, query, page)).items);
    else {
      await sleep(wait);
      page--;
    }
  }
  return progress(job, -1);
}

/** Starts a sweep when the last one's done and old enough, or has clearly stalled */
export async function maybeSweep(now = Date.now()) {
  const { sweepDays, minStars } = settings();
  const sweep = await readState<Sweep>('sweep');
  const running = sweep && sweep.pending > 0 && now - sweep.started < 2 * sweepDays * DAY_MS;
  const recent = sweep?.done && now - sweep.done < sweepDays * DAY_MS;
  if (running || recent) return;
  const id = String(now);
  await writeState('sweep', { id, started: now, pending: 1 });
  meter('queue_ops', 3);
  await env.CRAWL.send({ type: 'slice', sweep: id, min: minStars, max: TOP });
}

/** For a signed-in visitor asking after someone we've not crawled yet */
export async function lookup(login: string) {
  const take = borrow('graphql', 1 + settings().repoPages, true);
  const { token } = await take();
  if (!token) return undefined;
  const owner = await ownerByLogin(token, login);
  if (!owner) return null;
  const [full] = await finish([owner], take);
  await saveOwners([full]);
  return full;
}

/** Sign-in refresh, on the visitor's own token and only for their own repos */
export async function refreshSelf(token: string) {
  const [me] = await finish([await viewer(token)], async () => ({ token, wait: 0 }));
  await saveOwners([me]);
  return me;
}
