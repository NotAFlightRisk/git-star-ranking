import { SNAPSHOT_LATE } from '../freshness.ts';
import { readMeta } from './boards.ts';
import { oldestDue } from './db.ts';
import { ALERT_AT, budget } from './usage.ts';

const HOUR = 3_600_000;
// a day past due means the crawl isn't keeping up
const CRAWL_LATE = 24 * HOUR;

export interface Vitals {
  /** Metrics past their alert share */
  metrics: string[];
  /** How full the database is */
  database: number;
  /** When the last snapshot landed */
  snapshot?: number;
  /** When the longest-waiting account fell due */
  overdue?: number;
}

/** What needs a look, by name */
export function problems({ metrics, database, snapshot, overdue }: Vitals, now = Date.now()) {
  return [
    ...metrics,
    ...(database >= ALERT_AT ? ['database'] : []),
    ...(now - (snapshot ?? 0) > SNAPSHOT_LATE ? ['snapshot'] : []),
    ...(overdue && now - overdue > CRAWL_LATE ? ['crawl'] : [])
  ];
}

/** Usage, snapshots and the crawl, as both the uptime check and the admin page read them */
export async function health(now = Date.now()) {
  const [usage, meta, due] = await Promise.all([budget(new Date(now)), readMeta(), oldestDue()]);
  const overdue = due && due * 1000;
  const vitals = {
    metrics: usage.alert.map(({ metric }) => metric),
    database: usage.database.share,
    snapshot: meta?.at,
    overdue
  };
  return { usage, meta, overdue, problems: problems(vitals, now) };
}
