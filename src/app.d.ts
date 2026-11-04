import type { Job } from '#lib/server/crawl.ts';
import type { TokenPool } from '#lib/server/pool.ts';
import type { Session } from '#lib/server/session.ts';

declare global {
  namespace Cloudflare {
    interface Env {
      DB: D1Database;
      CRAWL: Queue<Job>;
      POOL: DurableObjectNamespace<TokenPool>;
      SNAPSHOTS?: R2Bucket;
      APP_URL: string;
      ADMINS: string;
      REPO_MIN_STARS: string;
      REFRESH_TIERS: string;
      SWEEP_DAYS: string;
      OWNER_REPO_PAGES: string;
      STREAMS: string;
      GITHUB_APP_ID: string;
      GITHUB_CLIENT_ID: string;
      GITHUB_CLIENT_SECRET: string;
      GITHUB_INSTALLATION_ID: string;
      GITHUB_PRIVATE_KEY: string;
      SESSION_SECRET: string;
      SENTRY_DSN?: string;
    }
  }

  namespace App {
    interface Locals {
      user?: Session;
    }
  }
}

export {};
