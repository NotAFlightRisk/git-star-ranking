import { error } from '@sveltejs/kit';
import { waitUntil } from 'cloudflare:workers';
import { REPO } from '../../names.ts';
import { readWidget, type Widget, type WidgetOptions } from '../../widgets.ts';
import { SVG } from '../badge.ts';
import { report } from '../report.ts';
import { accountFacts, repoFacts, type Facts } from './facts.ts';
import { headline } from './headline.ts';
import { languageLeader } from './languages.ts';
import { podium } from './podium.ts';
import { rankCard } from './rank.ts';
import { starMap } from './star-map.ts';
import { notice } from './svg.ts';
import { trophyCase } from './trophies.ts';

interface Spec {
  /** Nothing drawn means the account doesn't have what the widget needs */
  draw: (facts: Facts, options: WidgetOptions) => string | undefined | Promise<string | undefined>;
  /** What to say instead, pointing to a widget that would suit */
  unfit?: string;
  /** Whether it needs repos placed on boards, which costs a few reads */
  standings?: false;
}

const SPECS: Record<Widget, Spec> = {
  rank: { draw: rankCard },
  headline: { draw: headline },
  trophies: { draw: trophyCase, unfit: 'No trophies yet. The first comes at 100 stars' },
  'star-map': {
    draw: starMap,
    unfit: 'A star map needs two repos with 50+ stars. Try the rank card',
    standings: false
  },
  podium: { draw: podium, unfit: 'A podium needs two repos with 50+ stars. Try the rank card' },
  languages: {
    draw: languageLeader,
    unfit: 'Not in the top 1,000 of a language yet. Try the trophies'
  }
};

// ranks only move when a snapshot lands, every six hours, so a README can hold on to one
// that long. One with nothing to show may have something after the next count
const KEEP = 6 * 3600;
const RETRY = 300;

const HEADERS = {
  ...SVG,
  // its colours come in a style block, which has to apply when it's opened on its own
  'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'"
};

function why(facts: Facts | undefined, spec: Spec) {
  if (!facts) return "Not found. We haven't counted it yet";
  if (!facts.counted) return "We haven't counted all its stars yet";
  return spec.unfit ?? 'Nothing to show yet';
}

interface Asked {
  widget: Widget;
  login: string;
  repo?: string;
  /** Its full name as asked for, until we know how it's written */
  full: string;
  options: WidgetOptions;
}

/** The widget, or a notice saying why it can't be drawn, and how long a browser can keep it */
async function render({ widget, login, repo, full, options }: Asked) {
  const spec = SPECS[widget];
  const facts = repo
    ? await repoFacts(login, repo)
    : await accountFacts(login, spec.standings ?? true);
  const drawn = facts?.counted ? await spec.draw(facts, options) : undefined;
  if (drawn) return { svg: drawn, seconds: KEEP };
  return { svg: notice(facts?.name ?? full, why(facts, spec), options), seconds: RETRY };
}

/** A widget for an account or one of its repos, from our own counts. It never asks GitHub,
 * nor hurries a recount, as each README view would otherwise cost us one */
export async function widget(request: Request, name: Widget, login: string, repo?: string) {
  // a name GitHub wouldn't allow can't have been counted, so it's neither looked up nor drawn
  if (repo !== undefined && !REPO.test(repo)) error(404, 'Not found');
  const asked: Asked = {
    widget: name,
    login,
    repo,
    full: repo ? `${login}/${repo}` : login,
    options: readWidget(new URL(request.url).searchParams)
  };
  try {
    const { svg, seconds } = await render(asked);
    return new Response(svg, {
      headers: { ...HEADERS, 'x-browser-cache': `public, max-age=${seconds}` }
    });
  } catch (error) {
    // a broken image says nothing, so it says so itself, and isn't kept anywhere
    waitUntil(report(error, request, 'widget'));
    const { full, options } = asked;
    return new Response(notice(full, "Couldn't draw this just now. Try again soon", options), {
      status: 503,
      headers: { ...HEADERS, 'cache-control': 'no-store' }
    });
  }
}
