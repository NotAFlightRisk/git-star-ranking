<script lang="ts">
  import Updated from './Updated.svelte';

  const { updated }: { updated?: number } = $props();
</script>

<footer class="site-footer">
  <div class="bar">
    <div class="about">
      <p>Unofficial, and not affiliated with GitHub. Stars come from GitHub's public API.</p>
      <Updated at={updated} label="Rankings updated" />
    </div>
    <nav aria-label="About this site">
      <a href="/about">How it works</a>
      <a href="/badge-builder">Badge builder</a>
      <a href="/about#privacy">Privacy</a>
      <a href="https://github.com/NotAFlightRisk/git-star-ranking">Source</a>
    </nav>
  </div>
</footer>

<style>
  .site-footer {
    margin-block-start: auto;
    border-block-start: 1px solid var(--border);
    color: var(--text-muted);
    font-size: var(--text-sm);
  }

  .bar {
    max-width: var(--page);
    margin-inline: auto;
    padding: var(--space-5) var(--space-4);
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: var(--space-3) var(--space-5);
  }

  .about {
    display: grid;
    gap: var(--space-1);
  }

  nav {
    display: flex;
    gap: var(--space-4);
  }
</style>
