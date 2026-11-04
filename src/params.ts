import { defineParams } from '@sveltejs/kit/params';

// letters, digits and hyphens, as older accounts can have doubled or trailing ones
const LOGIN = /^[a-z\d][a-z\d-]{0,38}$/i;

export const params = defineParams({
  login: (param) => (LOGIN.test(param) ? param : undefined)
});
