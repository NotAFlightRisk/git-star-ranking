import { badge, ownerRank } from '#lib/server/badge.ts';

export const GET = async ({ params }) => badge(await ownerRank(params.login));
