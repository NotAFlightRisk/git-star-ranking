import { defineParams } from '@sveltejs/kit/params';
import { LOGIN } from '#lib/names.ts';

export const params = defineParams({
  login: (param) => (LOGIN.test(param) ? param : undefined)
});
