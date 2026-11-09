import { shields } from '#lib/server/badge.ts';

export const GET = ({ params, url }) => shields(url, params.login);
