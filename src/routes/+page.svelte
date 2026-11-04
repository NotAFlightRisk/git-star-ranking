<script lang="ts">
  import RankTable from '#lib/components/RankTable.svelte';
  import Seo from '#lib/components/Seo.svelte';
  import Updated from '#lib/components/Updated.svelte';
  import { BOARDS } from '#lib/format.ts';

  const { data } = $props();

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'git-star-ranking',
    url: 'https://git-star-ranking.peng.ly/',
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://git-star-ranking.peng.ly/search?q={query}',
      'query-input': 'required name=query'
    }
  };
</script>

<Seo
  title="git-star-ranking"
  description="Unofficial GitHub star ranking for users, organizations and repositories. Find where any account or repo sits, updated every six hours."
  path="/"
  {schema}
/>

<section class="intro">
  <h1>Top GitHub users, organizations and repositories</h1>
  <p>Unofficial GitHub star ranking on every public repo</p>
  <form class="search" action="/search" role="search">
    <label for="home-search">GitHub username or repo</label>
    <div class="field">
      <input
        id="home-search"
        type="search"
        name="q"
        placeholder="torvalds or react"
        autocomplete="off"
        spellcheck="false"
        required
      />
      <button type="submit">Search</button>
    </div>
  </form>
  <Updated at={data.at} label="Rankings updated" />
</section>

<div class="tops">
  {#each BOARDS as board (board.key)}
    <section class="top" aria-labelledby="top-{board.key}">
      <h2 id="top-{board.key}"><a href={board.path}>{board.label}</a></h2>
      {#if data.tops[board.key].length}
        <RankTable
          rows={data.tops[board.key]}
          caption="Top 10 {board.label.toLowerCase()} by stars"
          heading={board.noun}
          brief
        />
        <a class="more" href={board.path}>Show more {board.label.toLowerCase()}</a>
      {:else}
        <p class="empty">The first crawl is still going, so check back in a few hours.</p>
      {/if}
    </section>
  {/each}
</div>

<style>
  .intro {
    display: grid;
    gap: var(--space-3);
    margin-block-end: var(--space-7);

    h1 {
      font-size: var(--text-2xl);
      letter-spacing: -0.02em;
      max-width: 24ch;
    }

    > p {
      color: var(--text-muted);
      font-size: var(--text-lg);
      max-width: var(--measure);
    }
  }

  .search {
    display: grid;
    gap: var(--space-2);
    max-width: 36rem;
    margin-block-start: var(--space-3);

    label {
      font-weight: 600;
      font-size: var(--text-sm);
    }
  }

  .field {
    display: flex;
    gap: var(--space-2);

    input {
      flex: 1;
      min-width: 0;
      padding: var(--space-2) var(--space-3);
      font: inherit;
      color: var(--text);
      background: var(--surface);
      border: 1px solid var(--border-strong);
      border-radius: var(--radius);

      &::placeholder {
        color: var(--text-muted);
      }
    }

    button {
      padding: var(--space-2) var(--space-4);
      font: inherit;
      font-weight: 600;
      color: var(--on-accent);
      background: var(--accent);
      border: 1px solid var(--accent);
      border-radius: var(--radius);
      cursor: pointer;

      &:hover {
        background: var(--accent-hover);
        border-color: var(--accent-hover);
      }
    }
  }

  .tops {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 20rem), 1fr));
    gap: var(--space-6) var(--space-5);
  }

  .top {
    display: grid;
    align-content: start;
    gap: var(--space-3);
    min-width: 0;

    h2 {
      font-size: var(--text-xl);

      a {
        color: var(--text);
        text-decoration: none;

        &:hover {
          color: var(--accent);
        }
      }
    }
  }

  .more {
    justify-self: start;
    font-weight: 600;
    font-size: var(--text-sm);
  }

  .empty {
    color: var(--text-muted);
  }
</style>
