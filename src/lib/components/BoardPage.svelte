<script lang="ts">
  import { page } from '$app/state';
  import type { ComponentProps } from 'svelte';
  import { BOARDS, boardPath, number } from '#lib/format.ts';
  import { icon, swatch } from '#lib/languages.ts';
  import Language from './Language.svelte';
  import Pager from './Pager.svelte';
  import RankTable from './RankTable.svelte';
  import Seo from './Seo.svelte';

  interface Props {
    data: {
      board: 'users' | 'organizations' | 'repositories';
      page: number;
      pages: number;
      size: number;
      rows: ComponentProps<typeof RankTable>['rows'];
      total: number;
      language?: string;
      languages: { name: string; slug: string }[];
    };
  }

  const { data }: Props = $props();
  const info = $derived(BOARDS.find((board) => board.key === data.board)!);
  const subject = $derived(
    data.language ? `${data.language} repositories` : info.label.toLowerCase()
  );
  const href = (page: number) => boardPath(info.path, page, data.language);
  const repos = $derived(data.board === 'repositories');
  const title = $derived(data.language ? `Top ${subject}` : info.label);
  const summary = $derived(
    data.language
      ? `The 500 ${subject} on GitHub with the most stars`
      : `The top 10k GitHub ${subject}, ranked by ${repos ? 'stars' : 'total stars received'}`
  );
  const paint = $derived(data.language ? swatch(data.language) : undefined);
  const glyph = $derived(data.language && icon(data.language));
  const first = $derived((data.page - 1) * data.size + 1);
  // a hundred owners sit side by side as two fifties on a wide screen
  const COLUMN = 50;
  const columns = $derived(
    Array.from({ length: Math.ceil(data.rows.length / COLUMN) }, (_, i) =>
      data.rows.slice(i * COLUMN, (i + 1) * COLUMN)
    )
  );
  const caption = (column: number, count: number) => {
    const from = first + column * COLUMN;
    return `${subject} ranked by stars, ${number(from)} to ${number(from + count - 1)}, page ${data.page} of ${data.pages}`;
  };

  // on a phone the chips are one scrolling row, so start it on the one you're looking at
  const centre = (nav: HTMLElement) => {
    const current = nav.querySelector<HTMLElement>('[aria-current]');
    if (current) nav.scrollLeft = current.offsetLeft - (nav.clientWidth - current.offsetWidth) / 2;
  };
</script>

<Seo
  title="{data.language ? title : `GitHub ${subject}`}{data.page > 1 ? `, page ${data.page}` : ''}"
  description="GitHub {subject} ranked by stars, {first} to {first +
    data.rows.length -
    1}{data.total ? ` of ${number(data.total)} counted` : ''}. Updated every six hours."
  path={href(data.page)}
/>

<header class="head" style:--tone={paint?.colour} style:--on-tone={paint?.ink}>
  <h1>
    {#if data.language}
      <span class="tile">
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          {#if glyph}
            <use href="/languages.svg#{glyph}" />
          {:else}
            <circle cx="12" cy="12" r="5" />
          {/if}
        </svg>
      </span>
    {/if}
    {title}
  </h1>
  <p>{summary}</p>
</header>

{#if data.languages.length}
  <nav
    class="languages"
    aria-label="Languages"
    style:--tone={paint?.colour}
    style:--on-tone={paint?.ink}
    {@attach centre}
  >
    <a href="/repositories" aria-current={data.language ? undefined : 'page'}>All</a>
    {#each data.languages as language (language.slug)}
      <a
        href="/repositories?language={language.slug}"
        aria-current={language.name === data.language ? 'page' : undefined}
      >
        <Language name={language.name} />
      </a>
    {/each}
  </nav>
{/if}

{#if data.rows.length}
  <div class="board" class:owners={!repos}>
    {#each columns as rows, i (i)}
      <RankTable
        {rows}
        caption={caption(i, rows.length)}
        heading={info.noun}
        languages={!data.language}
        me={page.data.user?.id}
      />
    {/each}
  </div>
  <Pager page={data.page} pages={data.pages} {href} />
{:else}
  <p class="empty">Nothing ranked here yet. The first crawl is still going.</p>
{/if}

<style>
  .head {
    display: grid;
    gap: var(--space-1);
    margin-block-end: var(--space-4);

    h1 {
      display: flex;
      gap: var(--space-3);
      align-items: start;
      font-size: var(--text-2xl);
      letter-spacing: -0.02em;
    }

    .tile {
      display: grid;
      flex: none;
      place-items: center;
      width: 1.25em;
      aspect-ratio: 1;
      color: var(--on-tone, var(--on-accent));
      background: var(--tone, var(--accent));
      border-radius: var(--radius);

      svg {
        width: 0.75em;
        height: 0.75em;
        fill: currentColor;
      }
    }

    p {
      color: var(--text-muted);
    }
  }

  .languages {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    margin-block-end: var(--space-5);
    font-size: var(--text-sm);

    a {
      padding: var(--space-1) var(--space-2);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      text-decoration: none;

      &:hover {
        background: var(--surface-hover);
      }

      &[aria-current='page'] {
        color: var(--on-tone, var(--on-accent));
        background: var(--tone, var(--accent));
        border-color: var(--tone, var(--accent));
      }
    }
  }

  .board.owners {
    display: grid;
    gap: var(--space-5) var(--space-6);
    align-items: start;
    max-width: 44rem;
  }

  .empty {
    color: var(--text-muted);
  }

  @media (min-width: 64rem) {
    .board.owners {
      grid-template-columns: 1fr 1fr;
      max-width: none;
    }
  }

  @media (max-width: 40rem) {
    .languages {
      flex-wrap: nowrap;
      overflow-x: auto;
      padding-block-end: var(--space-1);
      scrollbar-width: thin;
      mask-image: linear-gradient(to right, #000 80%, transparent);

      a {
        flex: none;
      }
    }
  }
</style>
