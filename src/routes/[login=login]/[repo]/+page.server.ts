import { error, redirect } from '@sveltejs/kit';
import { findOwner, findRepo } from '#lib/server/db.ts';
import { settings } from '#lib/server/config.ts';
import { details } from '#lib/server/repo.ts';

export const load = async ({ params }) => {
  const owner = await findOwner(params.login);
  const repo = owner && (await findRepo(owner.id, params.repo));
  if (!owner || !repo) {
    error(404, `We only track repos with ${settings().minStars}+ stars, and this isn't one yet.`);
  }
  if (owner.login !== params.login || repo.name !== params.repo) {
    redirect(301, `/${owner.login}/${repo.name}`);
  }
  return { owner, repo, ...(await details(owner, repo)) };
};
