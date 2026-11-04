import { entries } from '#lib/server/boards.ts';
import type { OwnerEntry, RepoEntry } from '#lib/server/snapshot.ts';

export const load = async () => {
  const [users, organizations, repositories] = await Promise.all([
    entries<OwnerEntry>('users'),
    entries<OwnerEntry>('organizations'),
    entries<RepoEntry>('repositories')
  ]);
  return {
    at: users.at,
    tops: {
      users: users.rows.slice(0, 10),
      organizations: organizations.rows.slice(0, 10),
      repositories: repositories.rows.slice(0, 10)
    }
  };
};
