<script lang="ts">
  import Seo from '#lib/components/Seo.svelte';
  import Star from '#lib/components/Star.svelte';
  import { avatar, number } from '#lib/format.ts';

  const { data } = $props();
</script>

<Seo
  title={data.q ? `Search for ${data.q}` : 'Search'}
  description="Search GitHub users, organizations and repositories by name."
  noindex
/>

<h1>{data.q ? `Results for "${data.q}"` : 'Search'}</h1>

<form class="search" action="/search" role="search">
  <label for="search-page">GitHub username or repo</label>
  <input
    id="search-page"
    type="search"
    name="q"
    value={data.q}
    placeholder="torvalds, or facebook/react"
    autocomplete="off"
    spellcheck="false"
  />
</form>

{#if data.q}
  <div class="results">
    <section aria-labelledby="accounts">
      <h2 id="accounts">Accounts</h2>
      {#if data.owners.length}
        <ul>
          {#each data.owners as owner (owner.id)}
            <li>
              <img src={avatar(owner.id)} alt="" width="24" height="24" loading="lazy" />
              <div class="name">
                <a href="/{owner.login}">{owner.login}</a>
                <span class="kind">{owner.kind ? 'Organization' : 'User'}</span>
              </div>
              <span class="stars"><Star /> {number(owner.stars)}</span>
            </li>
          {/each}
        </ul>
      {:else}
        <p class="empty">
          No accounts start with that. If it's real and we haven't reached it yet, signing in and
          visiting <code>/{data.q.split('/')[0]}</code> adds it.
        </p>
      {/if}
    </section>
    <section aria-labelledby="repositories">
      <h2 id="repositories">Repositories</h2>
      {#if data.repos.length}
        <ul>
          {#each data.repos as repo (repo.id)}
            <li>
              <div class="name">
                <a href="/{repo.login}/{repo.name}">{repo.login}/<wbr />{repo.name}</a>
                {#if repo.language}<span class="kind">{repo.language}</span>{/if}
              </div>
              <span class="stars"><Star /> {number(repo.stars)}</span>
            </li>
          {/each}
        </ul>
      {:else}
        <p class="empty">No repos with 50+ stars start with that.</p>
      {/if}
    </section>
  </div>
{/if}

<style>
  h1 {
    font-size: var(--text-2xl);
    letter-spacing: -0.02em;
    overflow-wrap: anywhere;
  }

  .search {
    display: grid;
    gap: var(--space-2);
    max-width: 36rem;
    margin-block: var(--space-4) var(--space-6);

    label {
      font-weight: 600;
      font-size: var(--text-sm);
    }

    input {
      padding: var(--space-2) var(--space-3);
      font: inherit;
      color: var(--text);
      background: var(--surface);
      border: 1px solid var(--border-strong);
      border-radius: var(--radius);
    }
  }

  .results {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 22rem), 1fr));
    gap: var(--space-6);
  }

  section {
    display: grid;
    align-content: start;
    gap: var(--space-3);
    min-width: 0;

    h2 {
      font-size: var(--text-xl);
    }
  }

  ul {
    margin: 0;
    padding: 0;
    list-style: none;
    border-block-start: 1px solid var(--border);
  }

  li {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-1);
    border-block-end: 1px solid var(--border);
    font-size: var(--text-sm);

    img {
      border-radius: 50%;
    }
  }

  .name {
    display: grid;
    min-width: 0;

    a {
      font-weight: 600;
      overflow-wrap: break-word;
    }
  }

  .kind {
    color: var(--text-muted);
    font-size: var(--text-xs);
  }

  .stars {
    margin-inline-start: auto;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .empty {
    color: var(--text-muted);
  }
</style>
