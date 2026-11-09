<script lang="ts">
  import { number, percent, short } from '#lib/format.ts';
  import Climb from './Climb.svelte';
  import Fact from './Fact.svelte';
  import Facts from './Facts.svelte';

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
  const popular = $derived(tiers.filter((tier) => tier.repos).slice(-2));
  const share = (stars: number) => percent(owner.stars ? stars / owner.stars : 0);
</script>

<Facts>
  <Climb stars={owner.stars} {next} {milestone} />
  <Fact label="Public repos">
    <strong>{number(owner.repos)}</strong>, {number(tracked)} with 50+ stars
  </Fact>
  {#if popular.length}
    <Fact label="Popular repos">
      {#each popular as tier, i (tier.least)}
        {i ? ', ' : ''}<strong>{number(tier.repos)}</strong> over
        {short(tier.least).toLowerCase()} stars
      {/each}
    </Fact>
  {/if}
  {#if best}
    <Fact label="Top repo">
      <a href="/{owner.login}/{best.name}">{best.name}</a>,
      {#if best.rank}#{number(best.rank)} of all repos,{/if}
      {share(best.stars)} of stars
    </Fact>
  {/if}
  {#if smaller}
    <Fact label="Smaller repos">
      <strong>{number(smaller)}</strong> stars from repos under 50
    </Fact>
  {/if}
</Facts>
