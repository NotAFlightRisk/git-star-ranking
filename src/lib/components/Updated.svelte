<script lang="ts">
  import { date, iso } from '#lib/format.ts';

  const {
    at,
    label = 'Updated',
    inline = false
  }: { at?: number; label?: string; inline?: boolean } = $props();
</script>

<svelte:element this={inline ? 'span' : 'p'} class="updated">
  {#if at}
    {label} <time datetime={iso(at)}>{date(at)}</time>
  {:else}
    Not crawled yet
  {/if}
</svelte:element>

<style>
  .updated {
    color: var(--text-muted);
    font-size: var(--text-sm);
  }

  time {
    white-space: nowrap;
  }
</style>
