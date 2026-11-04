<script lang="ts">
  import { page } from '$app/state';
  import { BOARDS } from '#lib/format.ts';
  import Logo from './Logo.svelte';

  const { user }: { user?: { login: string } } = $props();
  const here = $derived(page.url.pathname);
</script>

<header class="site-header">
  <div class="bar">
    <a class="brand" href="/" aria-label="git-star-ranking home">
      <Logo />
      <span class="wordmark">git-star-ranking</span>
    </a>
    <nav aria-label="Rankings">
      <ul>
        {#each BOARDS as board (board.key)}
          <li>
            <a href={board.path} aria-current={here === board.path ? 'page' : undefined}>
              {board.label}
            </a>
          </li>
        {/each}
      </ul>
    </nav>
    {#if here !== '/' && here !== '/search'}
      <form class="search" action="/search" role="search">
        <label class="visually-hidden" for="header-search">Search accounts and repositories</label>
        <input
          id="header-search"
          type="search"
          name="q"
          placeholder="Search"
          value={page.url.searchParams.get('q') ?? ''}
          autocomplete="off"
          spellcheck="false"
        />
      </form>
    {/if}
    <div class="account">
      {#if user}
        <a href="/{user.login}">{user.login}</a>
        <form method="POST" action="/logout">
          <button type="submit">Sign out</button>
        </form>
      {:else}
        <a href="/login?next={encodeURIComponent(here)}" data-sveltekit-reload>Sign in</a>
      {/if}
    </div>
  </div>
</header>

<style>
  .site-header {
    border-block-end: 1px solid var(--border);
    background: var(--surface-raised);
  }

  .bar {
    max-width: var(--page);
    margin-inline: auto;
    padding: var(--space-3) var(--space-4);
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-3) var(--space-5);
  }

  .brand {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    color: var(--text);
    text-decoration: none;
    font-weight: 700;
    font-size: var(--text-lg);
    letter-spacing: -0.01em;
  }

  nav ul {
    display: flex;
    gap: var(--space-1);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  nav a {
    display: block;
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius);
    color: var(--text-muted);
    text-decoration: none;
    font-weight: 500;

    &:hover {
      color: var(--text);
      background: var(--surface-hover);
    }

    &[aria-current='page'] {
      color: var(--accent);
      background: var(--accent-soft);
    }
  }

  .search {
    flex: 1 1 12rem;
    max-width: 22rem;

    input {
      width: 100%;
      padding: var(--space-1) var(--space-3);
      font: inherit;
      font-size: var(--text-sm);
      color: var(--text);
      background: var(--surface);
      border: 1px solid var(--border-strong);
      border-radius: var(--radius);

      &::placeholder {
        color: var(--text-muted);
      }
    }
  }

  .account {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    margin-inline-start: auto;
    font-size: var(--text-sm);

    button {
      font: inherit;
      color: var(--text-muted);
      background: none;
      border: 0;
      padding: 0;
      cursor: pointer;
      text-decoration: underline;
      text-underline-offset: 0.2em;

      &:hover {
        color: var(--text);
      }
    }
  }

  @media (max-width: 40rem) {
    .wordmark {
      font-size: var(--text-base);
    }

    nav {
      order: 3;
      flex-basis: 100%;
    }

    .search {
      order: 4;
      max-width: none;
    }
  }
</style>
