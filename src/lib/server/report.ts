import { env } from 'cloudflare:workers';

interface Exception {
  type: string;
  value: string;
  stacktrace: { frames: object[] };
}

// Workers are V8, so there's one stack format. Sentry wants the oldest call first
const frames = (stack = '') =>
  stack
    .split('\n')
    .slice(1)
    .reverse()
    .flatMap((line) => {
      const [, fn, filename, lineno, colno] =
        /at (?:(.+?) \()?(.+?):(\d+):(\d+)\)?$/.exec(line) ?? [];
      return filename
        ? [{ function: fn, filename, lineno: +lineno, colno: +colno, in_app: true }]
        : [];
    });

// each cause is its own exception, root cause first
const chain = (error: unknown): Exception[] => {
  const err = error instanceof Error ? error : new Error(String(error));
  const self = { type: err.name, value: err.message, stacktrace: { frames: frames(err.stack) } };
  return err.cause ? [...chain(err.cause), self] : [self];
};

// sign-in codes aren't anyone's business but GitHub's
const scrub = (href: string) => {
  const url = new URL(href);
  url.searchParams.delete('code');
  url.searchParams.delete('state');
  return url.href;
};

// the same error within the hour is the same problem, so a broken route can't flood Bugsink
const QUIET = 60 * 60_000;
const sent = new Map<string, number>();

/** Sends one error straight to Bugsink, as the Sentry SDK would nearly double the Worker */
export async function report(error: unknown, request?: Request, where = 'server') {
  const key = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  const dsn = env.SENTRY_DSN;
  if (!dsn || Date.now() - (sent.get(key) ?? 0) < QUIET) return;
  sent.set(key, Date.now());
  const { origin, pathname, username } = new URL(dsn);
  const body = {
    platform: 'javascript',
    level: 'error',
    tags: { runtime: where },
    request: request && {
      url: scrub(request.url),
      method: request.method,
      headers: { 'User-Agent': request.headers.get('user-agent') }
    },
    exception: { values: chain(error) }
  };
  await fetch(`${origin}/api${pathname}/store/?sentry_key=${username}&sentry_version=7`, {
    method: 'POST',
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(5_000)
  }).catch(() => {});
}
