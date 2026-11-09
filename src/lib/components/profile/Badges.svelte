<script lang="ts">
  import { page } from '$app/state';
  import Copy from '../Copy.svelte';

  const { login }: { login: string } = $props();
  const profile = $derived(`${page.url.origin}/${login}`);
  const badge = $derived(`${page.url.origin}/users/${login}/badge.svg`);
  const shields = $derived(
    `https://img.shields.io/endpoint?url=${encodeURIComponent(`${page.url.origin}/users/${login}/shields`)}`
  );
</script>

<section aria-labelledby="badge">
  <h2 id="badge">Badge</h2>
  <img src={badge} alt="git rank badge for {login}" height="20" />
  <p>Markdown for a README, with our badge or a Shields one you can restyle.</p>
  <h3>Ours</h3>
  <Copy text="[![git rank]({badge})]({profile})" label="our badge's Markdown" />
  <h3>Shields</h3>
  <Copy text="[![git rank]({shields})]({profile})" label="the Shields badge's Markdown" />
</section>

<style>
  section {
    display: grid;
    gap: var(--space-2);
  }

  img {
    justify-self: start;
    margin-block: var(--space-1);
  }

  p,
  h3 {
    color: var(--text-muted);
    font-size: var(--text-sm);
  }

  h3 {
    margin-block-start: var(--space-2);
    font-weight: 600;
  }
</style>
