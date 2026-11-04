import { json } from '@sveltejs/kit';
import { budget } from '#lib/server/usage.ts';

/** What the uptime check reads: a 503 once anything passes 70% of its monthly allowance */
export const GET = async () => {
  const { metrics, alert } = await budget();
  return json(
    { ok: !alert.length, alert: alert.map(({ metric }) => metric), metrics },
    { status: alert.length ? 503 : 200 }
  );
};
