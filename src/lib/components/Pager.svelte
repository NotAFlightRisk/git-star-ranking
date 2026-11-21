<script lang="ts">
  interface Props {
    page: number;
    pages: number;
    // links when each page has its own url, buttons when it flips in place
    href?: (page: number) => string;
    go?: (page: number) => void;
  }

  const { page, pages, href, go }: Props = $props();

  // first, last and two either side, with gaps where pages are skipped
  const shown = $derived(
    [...new Set([1, page - 2, page - 1, page, page + 1, page + 2, pages])]
      .filter((n) => n >= 1 && n <= pages)
      .sort((a, b) => a - b)
  );
</script>

{#snippet label(n: number, rel?: 'prev' | 'next')}
  {#if rel}
    {rel === 'prev' ? 'Previous' : 'Next'}
  {:else}
    <span class="visually-hidden">Page</span>
    {n}
  {/if}
{/snippet}

{#snippet to(n: number, rel?: 'prev' | 'next')}
  {@const current = !rel && n === page ? 'page' : undefined}
  {#if href}
    <a href={href(n)} {rel} class:step={rel} aria-current={current}>{@render label(n, rel)}</a>
  {:else}
    <button type="button" class:step={rel} aria-current={current} onclick={() => go?.(n)}>
      {@render label(n, rel)}
    </button>
  {/if}
{/snippet}

{#if pages > 1}
  <nav class="pager" aria-label="Pages">
    {#if page > 1}{@render to(page - 1, 'prev')}{/if}
    <ol>
      {#each shown as n, i (n)}
        {#if i > 0 && n - shown[i - 1] > 1}<li class="gap" aria-hidden="true">...</li>{/if}
        <li>{@render to(n)}</li>
      {/each}
    </ol>
    {#if page < pages}{@render to(page + 1, 'next')}{/if}
  </nav>
{/if}

<style>
  .pager {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    margin-block-start: var(--space-5);
    font-size: var(--text-sm);
  }

  ol {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  a,
  button {
    display: block;
    min-width: 2.25rem;
    padding: var(--space-1) var(--space-2);
    text-align: center;
    text-decoration: none;
    font-variant-numeric: tabular-nums;
    border: 1px solid var(--border);
    border-radius: var(--radius);

    &:hover {
      background: var(--surface-hover);
    }

    &[aria-current='page'] {
      color: var(--on-accent);
      background: var(--accent);
      border-color: var(--accent);
    }
  }

  button {
    font: inherit;
    color: var(--accent);
    background: none;
    cursor: pointer;
  }

  .gap {
    align-self: end;
    color: var(--text-muted);
  }
</style>
