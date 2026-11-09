<script lang="ts">
  import { count, percent, short } from '#lib/format.ts';
  import Language from '../Language.svelte';

  interface Props {
    stars: number;
    languages: { language: string | null; repos: number; stars: number }[];
    tone: (language: string | null) => string;
  }

  const { stars, languages, tone }: Props = $props();
  const MOST = 8;
  const named = $derived(languages.filter((row) => row.language));
  const share = (part: number) => (stars ? part / stars : 0);
</script>

<section aria-labelledby="languages">
  <h2 id="languages">Languages</h2>
  <ol>
    {#each named.slice(0, MOST) as row (row.language)}
      <li style:--tone={tone(row.language)}>
        <Language name={row.language!} />
        <span class="figures">
          {short(row.stars)} stars, {percent(share(row.stars))}
          <span class="repos">· {count(row.repos, 'repo')}</span>
        </span>
        <span class="track"><span class="bar" style:width="{share(row.stars) * 100}%"></span></span>
      </li>
    {/each}
  </ol>
  {#if named.length > MOST}
    <p>and {count(named.length - MOST, 'more language')}</p>
  {/if}
</section>

<style>
  section {
    display: grid;
    align-content: start;
    gap: var(--space-3);
    min-width: 0;
  }

  h2 {
    font-size: var(--text-xl);
  }

  ol {
    display: grid;
    gap: var(--space-3);
    margin: 0;
    padding: 0;
    list-style: none;
    font-size: var(--text-sm);
  }

  li {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: var(--space-1) var(--space-3);
  }

  .figures {
    color: var(--text-muted);
    font-variant-numeric: tabular-nums;
  }

  .repos {
    white-space: nowrap;
  }

  .track {
    flex-basis: 100%;
    height: 6px;
    border-radius: 3px;
    background: var(--surface-hover);
  }

  .bar {
    display: block;
    height: 100%;
    min-width: 6px;
    border-radius: 3px;
    background: var(--tone);
  }

  p {
    color: var(--text-muted);
    font-size: var(--text-sm);
  }
</style>
