<h1 align="center">git-star-ranking</h1>
<p align="center">
<i>GitHub star ranking for users, organizations and repositories</i>
<br />
<b>🌐 <a href="https://git-star-ranking.peng.ly/">git-star-ranking.peng.ly</a></b><br />
</p>

<details>
  <summary>Contents</summary>

- [About](#about)
- [Badges](#badges)
- [How it works](#how-it-works)
- [Deployment](#deployment)
- [Configuration](#configuration)
- [Development](#development)
- [Credits](#credits)

</details>

## About

Where does an account sit on GitHub by stars? This ranks every user, organization and repo we can find, with the top 5,000 of each in paged tables, and a profile page for everyone else showing their rank and how near the top they are. It's a rebuild of [gitstar-ranking](https://github.com/k0kubun/gitstar-ranking), which shut down in November 2026, with the same layout and URLs (`/users`, `/organizations`, `/repositories`, `/:login`, `/:login/:repo`).

An account's stars are the stars on every public repo it owns, added up. Forks don't count. Ties share a rank, so two accounts on the same count are both 7th and the next one is 9th. Accounts with over 1,000 repos get their 1,000 most starred counted.

Sign in with GitHub and your page is counted on the spot. It asks for no permissions, uses the token once on your own public repos and hands it straight back. You can also remove yourself from there.

---

## Badges

Our own one, which is just an image:

```markdown
![git rank](https://git-star-ranking.peng.ly/users/<login>/badge.svg)
```

Or the Shields endpoint the original had, if you'd rather style it yourself:

```markdown
![git rank](https://img.shields.io/endpoint?url=https%3A%2F%2Fgit-star-ranking.peng.ly%2Fusers%2F<login>%2Fshields)
```

---

## How it works

It's one Cloudflare Worker: a SvelteKit site, plus a cron, a queue consumer and a Durable Object, over D1. Everything's sized to stay inside the Workers Paid allowances and GitHub's limits.

- Discovery is a search sweep, about weekly. Search only ever returns 1,000 results, so the sweep splits `stars:50..10000000` in half (geometrically, as stars follow a power law) until each slice is under 1,000, then splits single star counts by creation date, down to the second if it has to. Each slice is one queue message, ticked off in a `slices` table so a retried message can't count twice, and a sweep that goes quiet for an hour gets its missing slices sent round again. A full sweep of the ~850k repos with 50+ stars is around 3,500 messages, so well under 3% of the queue allowance a month.
- Counting is batched GraphQL. Node ids are worked out from GitHub's numeric ids, so one `nodes(ids:)` query covers a whole batch for a point. GitHub's 10 second timeout bites long before the points do (it manages about 100 repos a second), so batches are packed to about 400 repos and halved if one times out.
- Refreshes are tiered: 1,000+ stars daily, 100+ weekly, the rest monthly, plus anyone whose page gets visited when they're over a day old. A cron every ten minutes works through whoever's due for eight minutes.
- A single Durable Object is the token pool. It mints the app's installation token, hands out calls in batches of ten so it's one request per batch rather than per call, and holds back for the primary limit, the per-minute limits (2,000 GraphQL and 900 REST points, 30 searches), `retry-after`, `x-ratelimit-reset` and 100 concurrent leases. Crawls leave 500 points an hour for sign-ins and visitors.
- Rows are thin and keyed on GitHub's numeric ids, with no index on stars, since one full scan a snapshot is far cheaper than an index write on every star change. Repo rows are only written when something changed, and an owner gets one write per refresh for its schedule. A count that gets cut short (the pool says wait, or a page errors) isn't saved at all, so nobody's total drops for a month because of a blip.
- Leaderboards and rank histograms are snapshots, rebuilt every six hours (hourly while the first sweep is still filling up). A rank is worked out from the histogram, never stored per row. A day of history is kept with each one.
- Pages are rendered on the Worker and cached per data centre for ten minutes, then served stale while they refresh.
- `/admin` shows this month's usage against each allowance, and `/api/budget` answers 503 once anything passes 70%, which is what the uptime check watches.

---

## Deployment

### Option 1: Cloudflare Workers

This is how the live site runs, and it's sized to fit inside Workers Paid. You'll also need a GitHub App of your own, with no permissions at all, the callback URL set to `https://<your domain>/auth/callback`, installed on your own account. Fork the repo, then:

```bash
npm install
npx wrangler d1 create git-star-ranking
npx wrangler queues create git-star-ranking-crawl
```

Pop the database id into `wrangler.jsonc`, and change `APP_URL`, `ADMINS` and `routes` to your own. Then create the tables, add the secrets (see [Configuration](#configuration)) and deploy:

```bash
npx wrangler d1 migrations apply DB --remote
npx wrangler secret put GITHUB_PRIVATE_KEY
npm run deploy
```

The first sweep starts on the next cron, and the tables start filling an hour or so later.

### Option 2: From a release or from source

Grab the source from the [latest release](https://github.com/NotAFlightRisk/git-star-ranking/releases/latest) (or clone it), then follow the steps above. There's no Docker image, as it leans on D1, Queues and Durable Objects throughout.

---

## Configuration

Secrets, set with `npx wrangler secret put <name>` (or in `.dev.vars` locally):

| Name                                       | What it is                                                         |
| ------------------------------------------ | ------------------------------------------------------------------ |
| `GITHUB_APP_ID`                            | Your GitHub App's id                                               |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | The app's OAuth credentials, for sign-in                           |
| `GITHUB_INSTALLATION_ID`                   | The id from installing the app on your account                     |
| `GITHUB_PRIVATE_KEY`                       | The app's private key, as GitHub gave it or base64'd onto one line |
| `SESSION_SECRET`                           | Any long random string, for signing the session cookie             |
| `SENTRY_DSN`                               | Optional, sends server errors to Sentry or Bugsink                 |

Settings, in `vars` in `wrangler.jsonc`:

| Name               | Default             | What it does                                              |
| ------------------ | ------------------- | --------------------------------------------------------- |
| `REPO_MIN_STARS`   | `50`                | The smallest repo the sweep looks for and the tables keep |
| `REFRESH_TIERS`    | `1000:1,100:7,0:30` | Stars to refresh interval in days                         |
| `SWEEP_DAYS`       | `7`                 | How often the search sweep goes round again               |
| `OWNER_REPO_PAGES` | `10`                | Pages of 100 repos counted per account                    |
| `STREAMS`          | `2`                 | GraphQL queries the cron runs side by side                |
| `ADMINS`           |                     | Comma-separated logins that can see `/admin`              |

Snapshots go in D1. Bind an R2 bucket as `SNAPSHOTS` and they go there instead.

The client build reads `PUBLIC_PLAUSIBLE_SCRIPT` and `PUBLIC_SENTRY_DSN` at build time. Both are empty unless you set them, so nothing phones home.

---

## Development

You'll need [Node](https://nodejs.org/) 22.18 or newer. It's a [SvelteKit](https://svelte.dev/docs/kit) app that runs on [Wrangler](https://developers.cloudflare.com/workers/wrangler/) locally, D1, queue and all.

```bash
git clone git@github.com:NotAFlightRisk/git-star-ranking.git
cd git-star-ranking
npm install
npx wrangler d1 migrations apply DB --local
npm run dev
```

Put the secrets in `.dev.vars` first, as the crawler talks to the real GitHub API. It's then on [localhost:8787](http://localhost:8787), and [/__scheduled](http://localhost:8787/__scheduled) runs the cron by hand. The other scripts you'll want are `npm run check` (types), `npm test` and `npm run format`.

---

## Credits

Built on the idea, layout and URLs of [gitstar-ranking](https://github.com/k0kubun/gitstar-ranking) by [@k0kubun](https://github.com/k0kubun), which kept the ranking going for years. Star counts come from the [GitHub API](https://docs.github.com/en/rest).

##### Contributors

[![contributors badge](https://readme-contribs.as93.net/contributors/NotAFlightRisk/git-star-ranking?shape=squircle)](https://github.com/NotAFlightRisk/git-star-ranking/graphs/contributors)

---

<!-- License + Copyright -->
<p  align="center">
  <a href="https://github.com/NotAFlightRisk"><img width="64" src="https://pixelflare.cc/iain/gif/penguin-dance.gif" /></a><br>
  <sup>
    <i>Licensed under <a href="../LICENSE">MIT</a>, © <a href="https://peng.ly">NotAFlightRisk</a> 2026</i>
  </sup>
</p>

<!--
oooh, hello there! hope you're having a nice day :)
   |\__      |\___
 (:> __)X  (:o ___(
   |/        |/
-->
