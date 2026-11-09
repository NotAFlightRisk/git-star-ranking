import { badge } from '#lib/server/badge.ts';

export const GET = ({ params, url }) => badge(url, params.login);
