<script lang="ts">
  import { page } from '$app/state';
  import { boardPath } from '#lib/format.ts';
  import { icon } from '#lib/languages.ts';

  const { name, link = false }: { name: string; link?: boolean } = $props();
  const slug = $derived(icon(name));
  const href = $derived(
    link && page.data.languageBoards.includes(name)
      ? boardPath('/repositories', 1, name)
      : undefined
  );
</script>

<svelte:element this={href ? 'a' : 'span'} class="language" {href}>
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    {#if slug}
      <use href="/languages.svg#{slug}" />
    {:else}
      <circle cx="12" cy="12" r="5" />
    {/if}
  </svg>{name}
</svelte:element>

<style>
  .language {
    white-space: nowrap;
  }

  svg {
    width: 1em;
    height: 1em;
    margin-inline-end: 0.35em;
    vertical-align: -0.125em;
    fill: currentColor;
  }
</style>
