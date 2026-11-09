<script lang="ts">
  import type { Snippet } from 'svelte';
  import Star from '../Star.svelte';

  interface Props {
    label: string;
    value: string;
    star?: boolean;
    note?: string;
    children?: Snippet;
  }

  const { label, value, star = false, note, children }: Props = $props();
</script>

<div>
  <dt>{label}</dt>
  <dd class="value">
    {#if star}<Star />{/if}
    {value}
  </dd>
  {#if children}<dd>{@render children()}</dd>{/if}
  {#if note}<dd>{note}</dd>{/if}
</div>

<style>
  div {
    display: grid;
    align-content: start;
    gap: var(--space-1);
    min-width: 0;
    padding: var(--space-3) var(--space-4);
    background: var(--surface-raised);
    border: 1px solid var(--border);
    border-radius: var(--radius);
  }

  dt,
  dd {
    margin: 0;
    color: var(--text-muted);
    font-size: var(--text-sm);
  }

  .value {
    color: var(--text);
    font-size: clamp(1.75rem, 1.2rem + 2vw, 2.5rem);
    font-weight: 700;
    line-height: 1.2;
    letter-spacing: -0.02em;
  }

  dd :global(strong) {
    color: var(--text);
    font-weight: 600;
  }
</style>
