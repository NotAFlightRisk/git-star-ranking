import { env } from 'cloudflare:workers';

/** What Workers Paid includes each month, and what we count against it */
export const ALLOWANCES = {
  worker_requests: 10_000_000,
  d1_rows_read: 25_000_000_000,
  d1_rows_written: 50_000_000,
  queue_ops: 1_000_000,
  do_requests: 1_000_000,
  blob_writes: 1_000_000,
  blob_reads: 10_000_000
};
export const ALERT_AT = 0.7;

export type Metric = keyof typeof ALLOWANCES | `github_${string}`;

const counts = new Map<Metric, number>();
let flushed = Date.now();

export const meter = (metric: Metric, amount = 1) =>
  counts.set(metric, (counts.get(metric) ?? 0) + amount);

export function meterD1<T extends D1Result | D1Result[]>(results: T) {
  for (const { meta } of [results].flat()) {
    meter('d1_rows_read', meta.rows_read);
    meter('d1_rows_written', meta.rows_written);
  }
  return results;
}

export const month = (at = new Date()) => at.toISOString().slice(0, 7);

/** One write per flush, and an isolate only flushes once a minute unless told to */
export async function flush(force = false) {
  if (!counts.size || (!force && Date.now() - flushed < 60_000)) return;
  const rows = JSON.stringify([...counts]);
  counts.clear();
  flushed = Date.now();
  await env.DB.prepare(
    `INSERT INTO usage (month, metric, amount)
     SELECT ?1, json_extract(value, '$[0]'), json_extract(value, '$[1]') FROM json_each(?2) WHERE true
     ON CONFLICT (month, metric) DO UPDATE SET amount = amount + excluded.amount`
  )
    .bind(month(), rows)
    .run();
}

export async function budget(at = new Date()) {
  const { results } = await env.DB.prepare('SELECT metric, amount FROM usage WHERE month = ?')
    .bind(month(at))
    .all<{ metric: string; amount: number }>();
  const used = new Map(results.map((row) => [row.metric, row.amount]));
  const days = new Date(at.getUTCFullYear(), at.getUTCMonth() + 1, 0).getDate();
  const elapsed = (at.getUTCDate() - 1 + at.getUTCHours() / 24) / days || 1 / (24 * days);
  const metrics = Object.entries(ALLOWANCES).map(([metric, allowance]) => {
    const amount = used.get(metric) ?? 0;
    return {
      metric,
      amount,
      allowance,
      share: amount / allowance,
      projected: amount / elapsed / allowance
    };
  });
  const github = results.filter((row) => row.metric.startsWith('github_'));
  return { metrics, github, alert: metrics.filter((row) => row.share >= ALERT_AT) };
}
