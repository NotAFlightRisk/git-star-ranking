<script lang="ts">
  import { count, number } from '#lib/format.ts';
  import Fact from './Fact.svelte';

  interface Props {
    stars: number;
    next?: { stars: number; rank: number; places: number; rough: boolean };
    milestone?: { percent: number; stars: number };
  }

  const { stars, next, milestone }: Props = $props();
</script>

{#snippet more(gap: number)}<strong>+{number(gap)}</strong> {gap === 1 ? 'star' : 'stars'}{/snippet}

{#if next}
  <Fact label="Next rank">
    {@render more(next.stars - stars)}
    {next.rough ? `to jump ${count(next.places, 'place', true)}` : `to reach #${number(next.rank)}`}
  </Fact>
{/if}
{#if milestone}
  <Fact label="Next milestone">
    {@render more(milestone.stars - stars)} to reach the top {milestone.percent}%
  </Fact>
{/if}
