import { repoRank, shields } from '#lib/server/badge.ts';

export const GET = async ({ params }) => shields(await repoRank(params.login, params.repo));
