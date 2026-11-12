<script lang="ts">
  import { onMount } from 'svelte';
  import { lateness } from '#lib/freshness.ts';
  import Updated from './Updated.svelte';

  const { updated }: { updated?: number } = $props();

  // judged in the browser, as the edge cache can hand out a page rendered hours ago
  let now = $state<number>();
  onMount(() => {
    now = Date.now();
  });
  const behind = $derived(updated && now ? lateness(now - updated) : 'fresh');
</script>

<footer class="site-footer">
  <div class="bar">
    <p class="status">
      {#if updated}<span class="dot {behind}" aria-hidden="true"></span>{/if}
      <Updated at={updated} label="Rankings updated" inline />
    </p>
    <nav aria-label="About this site">
      <a href="/about">How it works</a>
      <a href="/badge-builder">Badge builder</a>
      <a href="/about#privacy">Privacy</a>
    </nav>
    <p class="credits">
      Built by <a href="https://github.com/NotAFlightRisk" rel="external">@NotAFlightRisk</a>.
      Licensed under MIT, ©&nbsp;<a href="https://peng.ly" rel="external">peng.ly</a> 2026.
      <a class="source" href="https://github.com/NotAFlightRisk/git-star-ranking" rel="external">
        View source on GitHub
      </a>
    </p>
    <p class="disclaimer">
      git-star-ranking.com is unofficial, and not affiliated with GitHub. All data comes from
      GitHub's public API.
    </p>
  </div>
</footer>

<style>
  .site-footer {
    margin-block-start: auto;
    border-block-start: 1px solid var(--border);
    background: var(--surface-raised);
    color: var(--text-muted);
    font-size: var(--text-sm);

    a {
      color: inherit;

      &:hover {
        color: var(--accent);
      }
    }
  }

  .bar {
    max-width: var(--page);
    margin-inline: auto;
    padding: var(--space-4);
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: start;
    gap: var(--space-1) var(--space-5);
  }

  .credits,
  .disclaimer {
    grid-column: 1 / -1;
    text-wrap: pretty;
  }

  .credits {
    margin-block-start: var(--space-1);
  }

  .source {
    white-space: nowrap;
  }

  .status {
    color: var(--text);
  }

  .status :global(.updated) {
    color: inherit;
  }

  nav {
    justify-self: end;
    color: var(--text);
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1) var(--space-4);

    a {
      text-decoration: none;

      &:hover {
        text-decoration: underline;
      }
    }
  }

  /* inline, so it stays beside the first word when the line wraps */
  .dot {
    position: relative;
    display: inline-block;
    vertical-align: middle;
    margin-inline-end: var(--space-1);
    inline-size: 0.5rem;
    block-size: 0.5rem;
    border-radius: 50%;
    background: var(--live);

    &::after {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: inherit;
      background: inherit;
      animation: pulse 5s ease-out infinite;
    }

    &.late {
      background: var(--late);
    }

    &.stale {
      background: var(--stale);
    }

    /* only a healthy heartbeat pulses */
    &:is(.late, .stale)::after {
      animation: none;
    }
  }

  @keyframes pulse {
    from {
      opacity: 0.7;
      transform: scale(1);
    }

    30%,
    to {
      opacity: 0;
      transform: scale(2.5);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .dot::after {
      animation: none;
    }
  }

  @media (max-width: 48rem) {
    .bar {
      grid-template-columns: 1fr;
      row-gap: var(--space-2);
      text-align: center;
    }

    nav {
      justify-self: center;
      justify-content: center;
    }

    /* centred lines look ragged unless they're roughly even */
    .credits,
    .disclaimer {
      text-wrap: balance;
    }
  }
</style>
