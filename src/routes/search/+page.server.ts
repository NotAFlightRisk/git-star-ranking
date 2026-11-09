import { error } from '@sveltejs/kit';
import { bare } from '#lib/names.ts';
import { search } from '#lib/server/db.ts';

export const load = async ({ url }) => {
  const q = bare(url.searchParams.get('q') ?? '');
  if (q.length > 140) error(400, "That's a bit long for a GitHub name");
  if (!q) return { q, owners: [], repos: [] };
  const found = await search(q);
  const exact = (login: string) => login.toLowerCase() === q.toLowerCase();
  return {
    q,
    owners: found.owners.toSorted((a, b) => Number(exact(b.login)) - Number(exact(a.login))),
    repos: found.repos
  };
};
