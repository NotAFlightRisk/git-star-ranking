import { json } from '@sveltejs/kit';
import { health } from '#lib/server/health.ts';

/** What the uptime check reads: a 503 when a limit nears, or snapshots or the crawl stall */
export const GET = async () => {
  const { usage, problems } = await health();
  return json(
    { ok: !problems.length, alert: problems, metrics: usage.metrics },
    { status: problems.length ? 503 : 200 }
  );
};
