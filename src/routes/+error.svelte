<script lang="ts">
  import { page } from '$app/state';
  import Seo from '#lib/components/Seo.svelte';

  const lost = $derived(page.status === 404);
</script>

<Seo
  title={lost ? 'Not found' : 'Something broke'}
  description="This page isn't one we can show."
  noindex
/>

<section class="error">
  <h1>{lost ? 'Not found' : 'Something broke'}</h1>
  <p>{page.error?.message}</p>
  {#if lost && page.params.login && !page.data.user}
    <p>
      If that's a real GitHub account we haven't reached yet,
      <a href="/login?next={encodeURIComponent(page.url.pathname)}" data-sveltekit-reload>sign in</a
      >
      and we'll add it.
    </p>
  {/if}
  <p><a href="/">Back to the rankings</a></p>
</section>

<style>
  .error {
    display: grid;
    gap: var(--space-3);
    max-width: var(--measure);
  }

  h1 {
    font-size: var(--text-2xl);
  }
</style>
