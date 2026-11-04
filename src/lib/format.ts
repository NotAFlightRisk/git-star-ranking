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

export const number = (n: number) => whole.format(n);
export const short = (n: number) => compact.format(n);
export const date = (ms: number) => when.format(ms);
export const iso = (ms: number) => new Date(ms).toISOString();

/** "top 0.4%" reads better than a long decimal, and nobody is in the top 0% */
export const top = (share: number) => {
  const percent = share * 100;
  if (percent < 0.01) return 'top 0.01%';
  if (percent < 1) return `top ${percent.toPrecision(1)}%`;
  return `top ${Math.ceil(percent)}%`;
};

/** GitHub's :emoji: shortcodes only mean something on GitHub, and a cut lands on a whole word */
export function tidy(text: string | null | undefined, most = 200) {
  const clean = (text ?? '')
    .replace(/:(?:[a-z][a-z0-9_+-]*|[+-]1):/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (clean.length <= most) return clean || null;
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
