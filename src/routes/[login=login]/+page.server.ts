import { error, fail, redirect } from '@sveltejs/kit';
import { waitUntil } from 'cloudflare:workers';
import { lookup } from '#lib/server/crawl.ts';
import { findOwner, forget, hurry } from '#lib/server/db.ts';
import { profile } from '#lib/server/profile.ts';
import { endSession } from '#lib/server/session.ts';

export const load = async ({ params, locals }) => {
  let owner = await findOwner(params.login);
  if (!owner && locals.user) {
    const found = await lookup(params.login);
    if (found === undefined) error(503, 'GitHub is busy just now. Give it a minute and try again.');
    if (found) owner = await findOwner(found.login);
  }
  if (!owner) error(404, `We don't have "${params.login}" yet.`);
  if (owner.login !== params.login) redirect(301, `/${owner.login}`);
  waitUntil(hurry(owner));
  return { owner, ...(await profile(owner)), self: locals.user?.id === owner.id };
};

export const actions = {
  refresh: async ({ params, locals }) => {
    if (!locals.user) redirect(303, `/login?next=/${params.login}`);
    const owner = await findOwner(params.login);
    if (!owner) error(404, `We don't have ${params.login} yet.`);
    if (locals.user.id === owner.id) redirect(303, `/login?next=/${params.login}`);
    return { queued: await hurry(owner, 3600) };
  },
  forget: async ({ params, locals, cookies, request }) => {
    const owner = await findOwner(params.login);
    if (!owner || locals.user?.id !== owner.id) error(403, 'You can only remove yourself.');
    if (!(await request.formData()).has('sure')) return fail(400, { unsure: true });
    await forget(owner.id);
    endSession(cookies);
    redirect(303, '/?removed');
  }
};
