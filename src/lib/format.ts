const whole = new Intl.NumberFormat('en-GB');
const compact = new Intl.NumberFormat('en-GB', { notation: 'compact', maximumFractionDigits: 1 });
const when = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'UTC',
  timeZoneName: 'short'
});

const calendar = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC'
});

const monthly = new Intl.DateTimeFormat('en-GB', {
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC'
});

export const number = (n: number) => whole.format(n);
export const count = (n: number, noun: string) => `${number(n)} ${noun}${n === 1 ? '' : 's'}`;
/** A share as a whole percent, without rounding a sliver down to nothing */
export const percent = (share: number) =>
  share > 0 && share < 0.005 ? '<1%' : `${Math.round(share * 100)}%`;
export const short = (n: number) => compact.format(n);
export const date = (ms: number) => when.format(ms);
export const day = (ms: number) => calendar.format(ms);
export const month = (ms: number) => monthly.format(ms);
export const iso = (ms: number) => new Date(ms).toISOString();

/** "top 0.4%" reads better than a long decimal, and nobody is in the top 0% */
export const top = (share: number) => {
  const percent = share * 100;
  if (percent < 0.01) return 'top 0.01%';
  if (percent < 1) return `top ${percent.toPrecision(1)}%`;
  return `top ${Math.ceil(percent)}%`;
};

/** A week's movement on a board, from where an entry sat to where it sits now */
export function trend({ from, to }: { from: number | null; to: number }) {
  if (from === null) return 'New on the board this week';
  const places = from - to;
  if (!places) return 'Same place as a week ago';
  return `${places > 0 ? 'Up' : 'Down'} ${count(Math.abs(places), 'place')} this week`;
}

/** GitHub's :emoji: shortcodes only mean something on GitHub, and a cut lands on a whole word.
 * Anything already at the limit is treated as cut, as older rows were chopped at exactly 200 */
export function tidy(text: string | null | undefined, most = 200) {
  const clean = (text ?? '')
    .replace(/:(?:[a-z][a-z0-9_+-]*|[+-]1):/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (clean.length < most) return clean || null;
  const cut = clean.slice(0, most - 3);
  const space = cut.lastIndexOf(' ');
  return `${space > most / 2 ? cut.slice(0, space) : cut}...`;
}

export const avatar = (id: number, size = 48) =>
  `https://avatars.githubusercontent.com/u/${id}?s=${size}&v=4`;

export const BOARDS = [
  { key: 'users', path: '/users', label: 'Users', noun: 'User' },
  { key: 'organizations', path: '/organizations', label: 'Organizations', noun: 'Organization' },
  { key: 'repositories', path: '/repositories', label: 'Repositories', noun: 'Repository' }
] as const;

/** A board page's address, leaving out the first page and any language not asked for.
 * The language is spelt as the snapshot's slugs are, so each board has the one address */
export function boardPath(path: string, page = 1, language?: string | null) {
  const query = [
    language && `language=${encodeURIComponent(language.toLowerCase())}`,
    page > 1 && `page=${page}`
  ].filter(Boolean);
  return query.length ? `${path}?${query.join('&')}` : path;
}
