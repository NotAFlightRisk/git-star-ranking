import { readMeta } from '#lib/server/boards.ts';
import { settings } from '#lib/server/config.ts';

export const load = async ({ locals }) => {
  const latest = await readMeta();
  return {
    user: locals.user,
    updated: latest?.at,
    minStars: settings().minStars,
    languageBoards: latest?.languages.map(({ name }) => name) ?? []
  };
};
