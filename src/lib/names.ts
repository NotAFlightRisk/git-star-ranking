// letters, digits and hyphens, doubled or trailing on some older accounts
export const LOGIN = /^[a-z\d][a-z\d-]{0,38}$/i;
export const REPO = /^[\w.-]{1,100}$/;

const GITHUB = /^(https?:\/\/)?(www\.)?github\.com\//i;

/** People paste all sorts: @handles, profile links, owner/repo pairs */
export const bare = (text: string) =>
  text.trim().replace(GITHUB, '').replace(/^@/, '').replace(/\/+$/, '');

/** Owner and repo from a name, @handle, pair, or a link anywhere into a repo */
export function split(text: string) {
  // a slash typed after a name stays, as the repo is on its way
  const path = GITHUB.test(text.trim()) ? bare(text) : text.trim().replace(/^@/, '');
  const [owner, repo] = path.split('/');
  return { owner, repo: repo?.replace(/\.git$/, '') };
}

export interface Subject {
  login: string;
  repo?: string;
}

/** An account, or one of its repos, if GitHub would allow the names */
export function subject(login: string, repo?: string): Subject | undefined {
  if (!LOGIN.test(login)) return undefined;
  if (repo === undefined) return { login };
  return REPO.test(repo) ? { login, repo } : undefined;
}

export const pathOf = ({ login, repo }: Subject) => (repo ? `/${login}/${repo}` : `/${login}`);

/** A builder's page, set up for an account or repo when there is one */
export const builtFor = (page: string, target?: Subject) =>
  target ? `${page}?for=${pathOf(target).slice(1)}` : page;
