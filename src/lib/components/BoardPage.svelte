<script lang="ts">
  import { page } from '$app/state';
  import type { ComponentProps } from 'svelte';
  import { BOARDS, boardPath, number } from '#lib/format.ts';
  import Language from './Language.svelte';
  import Pager from './Pager.svelte';
  import RankTable from './RankTable.svelte';
  import Seo from './Seo.svelte';
  import Updated from './Updated.svelte';

  interface Props {
    data: {
      board: 'users' | 'organizations' | 'repositories';
      page: number;
      pages: number;
      size: number;
      rows: ComponentProps<typeof RankTable>['rows'];
      at?: number;
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
  const summary = $derived.by(() => {
    if (data.language) return `The top 500 ${data.language} repositories, ranked by stars.`;
    const noun = data.board === 'users' ? 'profiles' : subject;
    const scored = data.total ? ` (${number(data.total)} ${noun} scored)` : '';
    return `The top 5k GitHub ${subject}, ranked by ${repos ? 'stars' : 'total stars received'}${scored}.`;
  });
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
  title="{data.language ? `${data.language} repositories` : `GitHub ${subject}`}{data.page > 1
    ? `, page ${data.page}`
    : ''}"
  description="GitHub {subject} ranked by stars, {first} to {first +
    data.rows.length -
    1}{data.total ? ` of ${number(data.total)} ranked` : ''}. Updated every six hours."
  path={href(data.page)}
/>

<header class="head">
  <h1>{data.language ? `${data.language} repositories` : info.label}</h1>
  <p>{summary} <Updated at={data.at} label="Last updated" inline /></p>
</header>

{#if data.languages.length}
  <nav class="languages" aria-label="Languages" {@attach centre}>
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
      font-size: var(--text-2xl);
      letter-spacing: -0.02em;
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
        color: var(--on-accent);
        background: var(--accent);
        border-color: var(--accent);
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
