import { error } from '@sveltejs/kit';
import { env } from 'cloudflare:workers';
import { readMeta } from '#lib/server/boards.ts';
import { settings } from '#lib/server/config.ts';
import { maybeSweep } from '#lib/server/crawl.ts';
import { readState, seconds, sweepProgress, writeState } from '#lib/server/db.ts';
import { snapshot } from '#lib/server/snapshot.ts';
import { budget, meterD1 } from '#lib/server/usage.ts';

const admin = (login?: string) => {
  if (!login || !settings().admins.includes(login.toLowerCase())) error(404, 'Not found');
};

export const load = async ({ locals }) => {
  admin(locals.user?.login);
  const [counts, backlog] = meterD1(
    await env.DB.batch([
      env.DB.prepare(
        `SELECT kind, COUNT(*) AS accounts, SUM(refreshed_at > 0) AS counted, SUM(hidden) AS hidden
       FROM owners GROUP BY kind ORDER BY kind`
      ),
      env.DB.prepare(
        `SELECT (SELECT COUNT(*) FROM repos) AS repos,
         (SELECT COUNT(*) FROM owners WHERE due_at <= ?1 AND hidden = 0) AS due`
      ).bind(seconds())
    ])
  );
  const sweep = await readState<{ id: string; started: number; done?: number }>('sweep');
  return {
    sweep,
    progress: sweep ? await sweepProgress(sweep.id) : null,
    counts: counts.results as { kind: number; accounts: number; counted: number; hidden: number }[],
    backlog: backlog.results[0] as { repos: number; due: number },
    usage: await budget(),
    meta: await readMeta(),
    pool: await env.POOL.getByName('github').status()
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
