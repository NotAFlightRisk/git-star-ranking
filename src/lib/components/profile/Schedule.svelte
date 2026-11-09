<script lang="ts">
  import { day, iso } from '#lib/format.ts';
  import Updated from '../Updated.svelte';

  interface Props {
    counted: number;
    every: number;
    next?: number;
  }

  const { counted, every, next }: Props = $props();
  const often = $derived(
    ({ 1: 'daily', 7: 'weekly', 30: 'monthly' } as Record<number, string>)[every] ??
      `every ${every} days`
  );
</script>

<p class="dotted">
  <span><Updated at={counted} label="Stars counted" inline /></span>
  <span>Recounted {often}</span>
  <span>
    {#if next}
      Next count around <time datetime={iso(next)}>{day(next)}</time>
    {:else}
      Next count queued
    {/if}
  </span>
</p>

<style>
  p {
    color: var(--text-muted);
    font-size: var(--text-sm);
  }
</style>
