export interface Job {
  type: 'slice';
  sweep: string;
  min: number;
  max: number;
  from?: string;
  to?: string;
}

export const TOP = 10_000_000;
const EPOCH = Date.parse('2007-10-01T00:00:00Z');

export const searchQuery = ({ min, max, from, to }: Job) =>
  `stars:${min}..${max}${from ? ` created:${from}..${to}` : ''}`;

const iso = (ms: number) => new Date(ms).toISOString().replace('.000', '');

/** Halves a slice by stars while it can, then by creation date, down to a single second */
export function split(job: Job, now = Date.now()): Job[] | undefined {
  if (job.min < job.max) {
    const middle = Math.min(job.max - 1, Math.floor(Math.sqrt(job.min * job.max)));
    return [
      { ...job, min: middle + 1 },
      { ...job, max: middle }
    ];
  }
  const from = job.from ? Date.parse(job.from) : EPOCH;
  const to = job.to ? Date.parse(job.to) : Math.floor(now / 1000) * 1000;
  if (to - from < 1000) return undefined;
  const middle = from + Math.floor((to - from) / 2000) * 1000;
  return [
    { ...job, from: iso(from), to: iso(middle) },
    { ...job, from: iso(middle + 1000), to: iso(to) }
  ];
}
