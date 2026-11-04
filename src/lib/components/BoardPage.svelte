<script lang="ts">
  import { page } from '$app/state';
  import type { ComponentProps } from 'svelte';
  import { BOARDS, number } from '#lib/format.ts';
  import Pager from './Pager.svelte';
  import RankTable from './RankTable.svelte';
  import Seo from './Seo.svelte';
  import Updated from './Updated.svelte';

  interface Props {
    data: {
      board: 'users' | 'organizations' | 'repositories';
      page: number;
      pages: number;
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
  const href = (page: number) => {
    const params = new URLSearchParams();
    if (data.language) params.set('language', data.language.toLowerCase());
    if (page > 1) params.set('page', String(page));
    return `${info.path}${params.size ? `?${params}` : ''}`;
  };
  const first = $derived((data.page - 1) * 50 + 1);

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
    1}{data.total ? ` of ${number(data.total)} ranked` : ''}. Updated every night."
  path={href(data.page)}
/>

<header class="head">
  <h1>{data.language ? `${data.language} repositories` : info.label}</h1>
  <p>
    {#if data.total && !data.language}{number(data.total)} ranked by stars, top 5,000 listed.{/if}
    {#if data.language}The top 500 {data.language} repositories by stars.{/if}
  </p>
  <Updated at={data.at} />
</header>

{#if data.languages.length}
  <nav class="languages" aria-label="Languages" {@attach centre}>
    <a href="/repositories" aria-current={data.language ? undefined : 'page'}>All</a>
    {#each data.languages as language (language.slug)}
      <a
        href="/repositories?language={language.slug}"
        aria-current={language.name === data.language ? 'page' : undefined}>{language.name}</a
      >
    {/each}
  </nav>
{/if}

{#if data.rows.length}
  <div class="board" class:owners={data.board !== 'repositories'}>
    <RankTable
      rows={data.rows}
      caption="{subject} ranked by stars, page {data.page} of {data.pages}"
      heading={info.noun}
      languages={!data.language}
      me={page.data.user?.id}
    />
  </div>
  <Pager page={data.page} pages={data.pages} {href} />
{:else}
  <p class="empty">Nothing ranked here yet. The first crawl is still going.</p>
{/if}

<style>
  .head {
    display: grid;
    gap: var(--space-2);
    margin-block-end: var(--space-5);

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
    max-width: 44rem;
  }

  .empty {
    color: var(--text-muted);
  }

  @media (max-width: 40rem) {
    .languages {
      flex-wrap: nowrap;
      overflow-x: auto;
      padding-block-end: var(--space-1);
      scrollbar-width: thin;

      a {
        flex: none;
      }
    }
  }
</style>
