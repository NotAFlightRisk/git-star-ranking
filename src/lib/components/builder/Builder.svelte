<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    title: string;
    /** A line on what it makes, under the title */
    intro: string;
    /** The steps, each a section with its own heading */
    children: Snippet;
    /** What it makes, beside the steps on a wide screen */
    output: Snippet;
  }

  const { title, intro, children, output }: Props = $props();
</script>

<header>
  <h1>{title}</h1>
  <p>{intro}</p>
</header>

<div class="builder">
  <div class="steps">{@render children()}</div>
  {@render output()}
</div>

<style>
  header {
    display: grid;
    gap: var(--space-2);
    max-width: var(--measure);
    margin-block-end: var(--space-6);

    h1 {
      font-size: var(--text-2xl);
      letter-spacing: -0.02em;
    }

    p {
      color: var(--text-muted);
    }
  }

  .builder {
    display: grid;
    align-items: start;
    gap: var(--space-6);
  }

  @media (min-width: 60rem) {
    .builder {
      grid-template-columns: minmax(0, 1fr) minmax(0, 32rem);
    }
  }

  .steps {
    display: grid;
    gap: var(--space-5);
    min-width: 0;
  }

  .steps > :global(section) {
    display: grid;
    justify-items: start;
    gap: var(--space-3);
  }

  .steps > :global(section + section) {
    padding-block-start: var(--space-5);
    border-block-start: 1px solid var(--border);
  }

  .steps :global(h2) {
    font-size: var(--text-lg);
  }

  .steps :global(.hint) {
    max-width: var(--measure);
  }

  /* a row of small settings, which wraps on a narrow screen */
  .steps :global(.settings) {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-3) var(--space-5);
  }
</style>
