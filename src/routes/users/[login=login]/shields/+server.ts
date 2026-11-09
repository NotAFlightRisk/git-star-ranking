import { ownerRank, shields } from '#lib/server/badge.ts';

export const GET = async ({ params }) => shields(await ownerRank(params.login));
