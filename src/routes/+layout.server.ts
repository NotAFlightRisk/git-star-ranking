import { readMeta } from '#lib/server/boards.ts';

export const load = async ({ locals }) => {
  const latest = await readMeta();
  return {
    user: locals.user,
    updated: latest?.at,
    languageBoards: latest?.languages.map(({ name }) => name) ?? []
  };
};
