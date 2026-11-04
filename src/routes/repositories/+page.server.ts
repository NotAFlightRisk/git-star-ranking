import { boardLoad } from '#lib/server/boards.ts';

export const load = ({ url }) => boardLoad('repositories', url);
