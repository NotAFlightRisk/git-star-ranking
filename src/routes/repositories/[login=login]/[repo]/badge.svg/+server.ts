import { badge, repoRank } from '#lib/server/badge.ts';

export const GET = async ({ params }) => badge(await repoRank(params.login, params.repo));
