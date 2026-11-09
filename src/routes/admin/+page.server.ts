import { error } from '@sveltejs/kit';
import { env } from 'cloudflare:workers';
import { DAY, settings } from '#lib/server/config.ts';
import { maybeSweep } from '#lib/server/crawl.ts';
import { readState, seconds, sweepProgress, writeState } from '#lib/server/db.ts';
import { health } from '#lib/server/health.ts';
import { snapshot } from '#lib/server/snapshot.ts';
import { meterD1 } from '#lib/server/usage.ts';

const admin = (login?: string) => {
  if (!login || !settings().admins.includes(login.toLowerCase())) error(404, 'Not found');
};

interface Count {
  kind: number;
  accounts: number;
  counted: number;
  recent: number;
  hidden: number;
  missing: number;
}

export const load = async ({ locals }) => {
  admin(locals.user?.login);
  const now = seconds();
  const [[counts, backlog], sweep, vitals, pool] = await Promise.all([
    env.DB.batch([
      env.DB.prepare(
        `SELECT kind, COUNT(*) AS accounts, SUM(refreshed_at > 0) AS counted,
         SUM(refreshed_at > ?1) AS recent, SUM(hidden) AS hidden,
         SUM(missed AND hidden = 0) AS missing FROM owners GROUP BY kind ORDER BY kind`
      ).bind(now - DAY),
      env.DB.prepare(
        `SELECT (SELECT COUNT(*) FROM repos) AS repos,
         (SELECT COUNT(*) FROM owners WHERE due_at <= ?1 AND hidden = 0) AS due`
      ).bind(now)
    ]).then(meterD1),
    readState<{ id: string; started: number; done?: number }>('sweep'),
    health(),
    env.POOL.getByName('github').status()
  ]);
  return {
    ...vitals,
    now: Date.now(),
    sweep,
    progress: sweep ? await sweepProgress(sweep.id) : null,
    counts: counts.results as Count[],
    backlog: backlog.results[0] as { repos: number; due: number },
    pool
  };
};

export const actions = {
  snapshot: async ({ locals }) => {
    admin(locals.user?.login);
    const meta = await snapshot();
    return { done: `Snapshot taken at ${new Date(meta.at).toISOString()}` };
  },
  sweep: async ({ locals }) => {
    admin(locals.user?.login);
    await writeState('sweep', { id: 'reset', started: 0, done: 1 });
    await maybeSweep();
    return { done: 'Sweep started' };
  }
};
