<script lang="ts">
  import { tones } from '#lib/charts.ts';
  import Languages from './Languages.svelte';
  import RepoMap from './RepoMap.svelte';
  import Timeline from './Timeline.svelte';

  interface Props {
    owner: { login: string; stars: number };
    repos: {
      id: number;
      name: string;
      stars: number;
      language: string | null;
      created_at: number | null;
    }[];
    languages: { language: string | null; repos: number; stars: number }[];
  }

  const { owner, repos, languages }: Props = $props();
  const tone = $derived(tones(languages));
  const dated = $derived(
    repos.flatMap((repo) => (repo.created_at ? [{ ...repo, created_at: repo.created_at }] : []))
  );
</script>

<div class="pair">
  <RepoMap {owner} {repos} {languages} {tone} />
  {#if languages.some((row) => row.language)}
    <Languages stars={owner.stars} {languages} {tone} />
  {/if}
</div>
{#if dated.length > 1}<Timeline repos={dated} {tone} />{/if}

<style>
  .pair {
    display: grid;
    gap: var(--space-6);
  }

  @container (width > 40rem) {
    .pair {
      grid-template-columns: 3fr 2fr;
    }
  }
</style>
