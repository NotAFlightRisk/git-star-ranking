const HOUR = 3_600_000;

/** Two six-hourly snapshots missed in a row, when the uptime check raises the alarm */
export const SNAPSHOT_LATE = 13 * HOUR;
// a whole day without one
const SNAPSHOT_STALE = 24 * HOUR;

/** How far behind the rankings are, going by how old the last snapshot is */
export const lateness = (age: number) =>
  age > SNAPSHOT_STALE ? 'stale' : age > SNAPSHOT_LATE ? 'late' : 'fresh';
