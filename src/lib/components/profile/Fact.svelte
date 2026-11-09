<script lang="ts">
  import type { Snippet } from 'svelte';

  const { label, children }: { label: string; children: Snippet } = $props();
</script>

<div>
  <dt>{label}</dt>
  <dd>{@render children()}</dd>
</div>

<style>
  div {
    display: grid;
    grid-template-columns: 7rem minmax(0, 1fr);
    gap: var(--space-3);
    padding-block: var(--space-2);
    border-block-end: 1px solid var(--border);
  }

  dt {
    color: var(--text-muted);
  }

  dd {
    margin: 0;
    color: var(--text-muted);
    overflow-wrap: anywhere;
  }

  dd :global(:is(strong, a)) {
    color: var(--text);
    font-weight: 600;
  }

  dd :global(a) {
    text-decoration: none;

    &:hover {
      color: var(--accent);
      text-decoration: underline;
    }
  }
</style>
