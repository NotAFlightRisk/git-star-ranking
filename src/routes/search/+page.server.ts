import { error } from '@sveltejs/kit';
import { search } from '#lib/server/db.ts';

// people paste all sorts: @handles, profile links, owner/repo pairs
const tidy = (query: string) =>
  query
    .trim()
    .replace(/^https?:\/\/(www\.)?github\.com\//i, '')
    .replace(/^@/, '')
    .replace(/\/+$/, '');

export const load = async ({ url }) => {
  const q = tidy(url.searchParams.get('q') ?? '');
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
