import { env } from 'cloudflare:workers';
import { settings } from './config.ts';
import {
  addSlices,
  claim,
  due,
  readState,
  retouch,
  saveFound,
  saveOwners,
  seconds,
  sliceDone,
  sliceState,
  snooze,
  sweepProgress,
  writeState
} from './db.ts';
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
import { searchQuery, split, TOP, type Job } from './sweep.ts';
import { meter } from './usage.ts';

export type { Job } from './sweep.ts';

interface Sweep {
  id: string;
  started: number;
  done?: number;
}

type Take = () => Promise<Grant>;
type Due = Awaited<ReturnType<typeof due>>[number];

const DAY_MS = 86_400_000;
// GitHub gets through about 100 repos a second and gives up at 10
const BATCH_REPOS = 400;
const GUESS = 40;
const PER_QUERY = 4;
// a sweep with nothing ticked off for this long has lost messages, so they go round again
const STALLED = 3600;

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

/** The rest of each owner's repos, up to the page cap. A walk cut short isn't returned at all */
export async function finish(list: Owner[], take: Take) {
  const done = new Map(list.map((owner) => [owner.id, owner]));
  const cut = new Set<number>();
  const result = () => [...done.values()].filter((owner) => !cut.has(owner.id));
  for (let page = 2; page <= settings().repoPages; page++) {
    const open = result().filter((owner) => owner.cursor);
    for (let i = 0; i < open.length; i += PER_QUERY) {
      const { token } = await take();
      if (!token) {
        for (const owner of result()) if (owner.cursor) cut.add(owner.id);
        return result();
      }
      const group = open.slice(i, i + PER_QUERY);
      const pages = await nextPages(token, group);
      group.forEach((owner, n) => {
        const next = pages[n];
        if (next) done.set(owner.id, merge(owner, next));
        else cut.add(owner.id);
      });
    }
  }
  return result();
}

async function refresh(batch: Due[], token: string, take: Take) {
  const found = await owners(token, batch);
  const missing = batch.filter((_, i) => found[i] === null);
  const lost = batch.filter((_, i) => found[i] === undefined);
  // turning a user into an org changes the node id, so look under the other one before deleting
  const again = missing.length ? (await take()).token : undefined;
  const flipped = again
    ? await owners(
        again,
        missing.map(({ id, kind }) => ({ id, kind: kind ? 0 : 1 }))
      )
    : missing.map(() => undefined);
  const absent = missing.filter((_, i) => flipped[i] === null);
  lost.push(...missing.filter((_, i) => flipped[i] === undefined));
  if (lost.length) await snooze(lost.map(({ id }) => id));
  // missing two runs running before it counts as gone, as GitHub has the odd bad hour
  const gone = absent.filter((owner) => owner.missed).map(({ id }) => id);
  const once = absent.filter((owner) => !owner.missed).map(({ id }) => id);
  if (once.length) await snooze(once, true);
  const fetched = [...found, ...flipped].filter((owner): owner is Owner => !!owner);
  await saveOwners(await finish(fetched, take), gone);
}

/** Works through the queue; true means it stopped early and the run should too */
async function stream(queue: Due[][], deadline: number) {
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

async function tick(job: Job, sweep: Sweep) {
  await sliceDone(job);
  const progress = await sweepProgress(job.sweep);
  if (!progress?.left) await writeState('sweep', { ...sweep, done: Date.now() });
}

/** One search slice. Returns how long to wait if the pool says not yet */
export async function sweepSlice(job: Job) {
  const [sweep, slice] = await Promise.all([readState<Sweep>('sweep'), sliceState(job)]);
  // a retry of a slice that's already done, or one left over from an older sweep
  if (sweep?.id !== job.sweep || !slice || slice.done) return;
  const probe = await borrow('search', 1)();
  if (!probe.token) return probe.wait;
  await claim(job);
  const query = searchQuery(job);
  const first = await searchRepos(probe.token, query, 1);
  await saveFound(first.items);
  const over = first.total > 1000 || first.incomplete;
  const halves = over ? split(job) : undefined;
  if (over && !halves) await report(new Error(`Search slice ${query} won't split any further`));
  if (halves) {
    await addSlices(halves);
    meter('queue_ops', 3 * halves.length);
    await env.CRAWL.sendBatch(halves.map((body) => ({ body })));
    return tick(job, sweep);
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
  return tick(job, sweep);
}

/** Starts a sweep when the last one's old enough, and nudges one along that's gone quiet */
export async function maybeSweep(now = Date.now()) {
  const { sweepDays, minStars } = settings();
  const sweep = await readState<Sweep>('sweep');
  const progress = sweep && !sweep.done ? await sweepProgress(sweep.id) : undefined;
  // a running sweep with no ledger never got its root written, so it starts again
  if (progress?.slices) {
    if (seconds() - progress.touched < STALLED) return;
    const stuck = await retouch(sweep!.id, 100);
    if (!stuck.length) return writeState('sweep', { ...sweep!, done: now });
    meter('queue_ops', 3 * stuck.length);
    await env.CRAWL.sendBatch(stuck.map((body) => ({ body })));
    return;
  }
  if (sweep?.done && now - sweep.done < sweepDays * DAY_MS) return;
  const root: Job = { type: 'slice', sweep: String(now), min: minStars, max: TOP };
  await addSlices([root]);
  await writeState('sweep', { id: root.sweep, started: now });
  meter('queue_ops', 3);
  await env.CRAWL.send(root);
}

/** For a signed-in visitor asking after someone we've not crawled yet */
export async function lookup(login: string) {
  const take = borrow('graphql', 1 + settings().repoPages, true);
  const { token } = await take();
  if (!token) return undefined;
  const owner = await ownerByLogin(token, login);
  if (!owner) return null;
  const [full] = await finish([owner], take);
  if (!full) return undefined;
  await saveOwners([full]);
  return full;
}

/** Sign-in refresh, on the visitor's own token and only for their own repos */
export async function refreshSelf(token: string) {
  const me = await viewer(token);
  const [full] = await finish([me], async () => ({ token, wait: 0 }));
  if (full) await saveOwners([full]);
  return me;
}
