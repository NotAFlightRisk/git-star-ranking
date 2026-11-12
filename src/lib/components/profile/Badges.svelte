<script lang="ts">
  import { page } from '$app/state';
  import { badgeUrl, builderPath, defaultLabel, FORMATS } from '#lib/badges.ts';
  import { pathOf } from '#lib/names.ts';
  import Copy from '../Copy.svelte';

  const { login, repo }: { login: string; repo?: string } = $props();
  const target = $derived({ login, repo });
  const alt = defaultLabel('rank');
  const markdown = $derived(
    FORMATS.markdown.write(
      badgeUrl(page.url.origin, target),
      alt,
      `${page.url.origin}${pathOf(target)}`
    )
  );
</script>

<section aria-labelledby="badge">
  <h2 id="badge">Badge</h2>
  <img src={badgeUrl('', target)} alt="{alt} badge for {pathOf(target).slice(1)}" height="20" />
  <p>Put this rank in a README with the Markdown below.</p>
  <Copy text={markdown} label="the badge's Markdown" />
  <a href={builderPath(target)} rel="nofollow">Customise it in the badge builder</a>
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
  a {
    font-size: var(--text-sm);
  }

  p {
    color: var(--text-muted);
  }
</style>
