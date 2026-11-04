<script lang="ts">
  import '../app.css';
  import Footer from '#lib/components/Footer.svelte';
  import Header from '#lib/components/Header.svelte';

  const { data, children } = $props();
</script>

<a class="skip" href="#main">Skip to the rankings</a>
<Header user={data.user} />
<main id="main" tabindex="-1">
  {@render children()}
</main>
<Footer updated={data.updated} />

<style>
  .skip {
    position: absolute;
    inset-inline-start: var(--space-4);
    inset-block-start: calc(-1 * var(--space-7));
    padding: var(--space-2) var(--space-3);
    background: var(--accent);
    color: var(--on-accent);
    border-radius: var(--radius);
    z-index: 1;

    &:focus {
      inset-block-start: var(--space-2);
    }
  }

  main {
    width: 100%;
    max-width: var(--page);
    margin-inline: auto;
    padding: var(--space-6) var(--space-4) var(--space-7);

    &:focus {
      outline: none;
    }
  }
</style>
