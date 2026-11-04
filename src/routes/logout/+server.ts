import { redirect } from '@sveltejs/kit';
import { endSession } from '#lib/server/session.ts';

export const POST = ({ cookies }) => {
  endSession(cookies);
  redirect(303, '/');
};
