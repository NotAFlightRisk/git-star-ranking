import { json } from '@sveltejs/kit';
import { standing } from '#lib/server/boards.ts';
import { findOwner } from '#lib/server/db.ts';

/** The shape shields.io's endpoint badge reads, as the original served it */
export const GET = async ({ params }) => {
  const owner = await findOwner(params.login);
  const rank = owner && (await standing(owner.kind ? 'organizations' : 'users', owner.stars));
  return json({
    schemaVersion: 1,
    label: 'git rank',
    message: rank ? String(rank.rank) : 'unranked',
    color: rank ? 'brightgreen' : 'lightgrey',
    cacheSeconds: 3600
  });
};
