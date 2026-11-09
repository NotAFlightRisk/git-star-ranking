<script lang="ts">
  import { count, number, percent, short } from '#lib/format.ts';
  import Language from '../Language.svelte';

  interface Props {
    owner: { login: string; stars: number; repos: number };
    next?: { stars: number; rank: number };
    milestone?: { percent: number; stars: number };
    repos: { name: string; stars: number; rank?: number }[];
    languages: { language: string | null; repos: number; stars: number }[];
    tiers: { least: number; repos: number }[];
  }

  const { owner, next, milestone, repos, languages, tiers }: Props = $props();
  const sum = (key: 'repos' | 'stars') => languages.reduce((total, row) => total + row[key], 0);
  const tracked = $derived(sum('repos'));
  const smaller = $derived(Math.max(owner.stars - sum('stars'), 0));
  const best = $derived(repos[0]);
  const main = $derived(languages.find((row) => row.language));
  const popular = $derived(tiers.filter((tier) => tier.repos).slice(-2));
  const share = (stars: number) => percent(owner.stars ? stars / owner.stars : 0);
</script>

<section aria-labelledby="quick">
  <h2 id="quick">Quick stats</h2>
  <dl>
    {#if next}
      <div>
        <dt>Next rank</dt>
        <dd>
          <strong>+{number(next.stars - owner.stars)}</strong> stars to reach #{number(next.rank)}
        </dd>
      </div>
    {/if}
    {#if milestone}
      <div>
        <dt>Next milestone</dt>
        <dd>
          <strong>+{number(milestone.stars - owner.stars)}</strong> stars to reach the top
          {milestone.percent}%
        </dd>
      </div>
    {/if}
    <div>
      <dt>Public repos</dt>
      <dd><strong>{number(owner.repos)}</strong>, {number(tracked)} with 50+ stars</dd>
    </div>
    {#if popular.length}
      <div>
        <dt>Popular repos</dt>
        <dd>
          {#each popular as tier, i (tier.least)}
            {i ? ', ' : ''}<strong>{number(tier.repos)}</strong> over
            {short(tier.least).toLowerCase()} stars
          {/each}
        </dd>
      </div>
    {/if}
    {#if best}
      <div>
        <dt>Top repo</dt>
        <dd>
          <a href="/{owner.login}/{best.name}">{best.name}</a>,
          {#if best.rank}#{number(best.rank)} of all repos,{/if}
          {share(best.stars)} of stars
        </dd>
      </div>
    {/if}
    {#if main?.language}
      <div>
        <dt>Top language</dt>
        <dd>
          <strong><Language name={main.language} /></strong>, {share(main.stars)} of stars across
          {count(main.repos, 'repo')}
        </dd>
      </div>
    {/if}
    {#if smaller}
      <div>
        <dt>Smaller repos</dt>
        <dd><strong>{number(smaller)}</strong> stars from repos under 50</dd>
      </div>
    {/if}
  </dl>
</section>

<style>
  section {
    display: grid;
    gap: var(--space-3);
  }

  h2 {
    font-size: var(--text-xl);
  }

  dl {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 22rem), 1fr));
    column-gap: var(--space-6);
    margin: 0;
    font-size: var(--text-sm);

    > div {
      display: grid;
      grid-template-columns: 7rem minmax(0, 1fr);
      gap: var(--space-3);
      padding-block: var(--space-2);
      border-block-end: 1px solid var(--border);
    }
  }

  dt {
    color: var(--text-muted);
  }

  dd {
    margin: 0;
    color: var(--text-muted);
    overflow-wrap: anywhere;
  }

  strong,
  a {
    color: var(--text);
    font-weight: 600;
  }

  a {
    text-decoration: none;

    &:hover {
      color: var(--accent);
      text-decoration: underline;
    }
  }
</style>
