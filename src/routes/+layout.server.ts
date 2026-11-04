import { readMeta } from '#lib/server/boards.ts';

export const load = async ({ locals }) => ({
  user: locals.user,
  updated: (await readMeta())?.at
});
