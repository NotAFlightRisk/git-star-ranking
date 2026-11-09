<script lang="ts">
  import type { Snippet } from 'svelte';

  const { children }: { children: Snippet } = $props();
</script>

<section aria-labelledby="quick">
  <h2 id="quick">Quick stats</h2>
  <dl>{@render children()}</dl>
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
  }
</style>
