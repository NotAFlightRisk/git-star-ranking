<script lang="ts">
  import { tones } from '#lib/charts.ts';
  import Languages from './Languages.svelte';
  import RepoMap from './RepoMap.svelte';

  interface Props {
    owner: { login: string; stars: number };
    repos: { name: string; stars: number; language: string | null }[];
    languages: { language: string | null; repos: number; stars: number }[];
  }

  const { owner, repos, languages }: Props = $props();
  const tone = $derived(tones(languages));
</script>

<div class="portfolio">
  <RepoMap {owner} {repos} {languages} {tone} />
  {#if languages.some((row) => row.language)}
    <Languages stars={owner.stars} {languages} {tone} />
  {/if}
</div>

<style>
  .portfolio {
    display: grid;
    gap: var(--space-6);
  }

  @container (width > 40rem) {
    .portfolio {
      grid-template-columns: 3fr 2fr;
    }
  }
</style>
