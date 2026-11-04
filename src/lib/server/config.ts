import { env } from 'cloudflare:workers';

export const BOARD_SIZE = 5_000;
export const PAGE_SIZE = { users: 100, organizations: 100, repositories: 50 } as const;
export const LANGUAGES = 30;
export const LANGUAGE_PAGES = 10;
export const DAY = 86_400;

/** "1000:1,100:7,0:30" reads as: 1,000+ stars daily, 100+ weekly, the rest monthly */
export const parseTiers = (spec: string) =>
  spec
    .split(',')
    .map((pair) => pair.split(':').map(Number) as [number, number])
    .sort((a, b) => b[0] - a[0]);

export const settings = () => ({
  minStars: Number(env.REPO_MIN_STARS),
  tiers: parseTiers(env.REFRESH_TIERS),
  sweepDays: Number(env.SWEEP_DAYS),
  repoPages: Number(env.OWNER_REPO_PAGES),
  streams: Number(env.STREAMS),
  admins: env.ADMINS.toLowerCase().split(',')
});

export const refreshDays = (stars: number, tiers: [number, number][]) =>
  (tiers.find(([least]) => stars >= least) ?? tiers.at(-1)!)[1];
