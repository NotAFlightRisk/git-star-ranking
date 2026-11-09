<script lang="ts">
  import { icon } from '#lib/languages.ts';

  const { name }: { name: string } = $props();
  const slug = $derived(icon(name));
</script>

<span class="language">
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    {#if slug}
      <use href="/languages.svg#{slug}" />
    {:else}
      <circle cx="12" cy="12" r="5" />
    {/if}
  </svg>{name}
</span>

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
