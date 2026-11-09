import { BOARDS } from '#lib/format.ts';
import { entries, readMeta } from './boards.ts';
import type { RepoEntry } from './snapshot.ts';

export const SITEMAPS = ['pages', 'users', 'organizations', 'repositories'] as const;

const xml = (path: string) => path.replaceAll('&', '&amp;');

/** Every board page, then one sitemap per board for the profiles and repos on it */
export async function paths(name: (typeof SITEMAPS)[number]) {
  const meta = await readMeta();
  if (!meta) return ['/', '/about', '/badge-builder'];
  if (name === 'pages') {
    const pages = (path: string, count: number) =>
      Array.from({ length: count }, (_, i) =>
        i ? `${path}${path.includes('?') ? '&' : '?'}page=${i + 1}` : path
      );
    return [
      '/',
      '/about',
      '/badge-builder',
      ...BOARDS.flatMap((board) => pages(board.path, meta.boards[board.key].pages)),
      ...meta.languages.flatMap((language) =>
        pages(`/repositories?language=${language.slug}`, language.pages)
      )
    ].map(xml);
  }
  const boards = await Promise.all(
    Array.from({ length: meta.boards[name].pages }, (_, i) => entries<RepoEntry>(name, i + 1))
  );
  return boards
    .flatMap(({ rows }) => rows)
    .map((row) =>
      xml(row.name ? `/${row.login}/${encodeURIComponent(row.name)}` : `/${row.login}`)
    );
}
