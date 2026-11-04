<script lang="ts">
  import { date, iso } from '#lib/format.ts';

  const { at, label = 'Updated' }: { at?: number; label?: string } = $props();
</script>

<p class="updated">
  {#if at}
    {label} <time datetime={iso(at)}>{date(at)}</time>
  {:else}
    Not crawled yet
  {/if}
</p>

<style>
  .updated {
    color: var(--text-muted);
    font-size: var(--text-sm);
  }
</style>
