<script lang="ts">
  const { page, pages, href }: { page: number; pages: number; href: (page: number) => string } =
    $props();

  // first, last and two either side, with gaps where pages are skipped
  const shown = $derived(
    [...new Set([1, page - 2, page - 1, page, page + 1, page + 2, pages])]
      .filter((n) => n >= 1 && n <= pages)
      .sort((a, b) => a - b)
  );
</script>

{#if pages > 1}
  <nav class="pager" aria-label="Pages">
    {#if page > 1}<a class="step" href={href(page - 1)} rel="prev">Previous</a>{/if}
    <ol>
      {#each shown as n, i (n)}
        {#if i > 0 && n - shown[i - 1] > 1}<li class="gap" aria-hidden="true">...</li>{/if}
        <li>
          <a href={href(n)} aria-current={n === page ? 'page' : undefined}>
            <span class="visually-hidden">Page</span>
            {n}
          </a>
        </li>
      {/each}
    </ol>
    {#if page < pages}<a class="step" href={href(page + 1)} rel="next">Next</a>{/if}
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

  a {
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

  .gap {
    align-self: end;
    color: var(--text-muted);
  }
</style>
