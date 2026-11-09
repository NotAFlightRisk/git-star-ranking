<script lang="ts">
  import { avatar, BOARDS, boardPath, number } from '#lib/format.ts';
  import Star from '../Star.svelte';

  interface Row {
    rank: number;
    id: number;
    login: string;
    stars: number;
    owner_id?: number;
    name?: string;
  }

  interface Props {
    board: (typeof BOARDS)[number]['key'];
    page: number;
    rows: Row[];
    me: number;
    language?: string;
  }

  const { board, page, rows, me, language }: Props = $props();
  const path = $derived(BOARDS.find(({ key }) => key === board)!.path);
  const href = (row: Row) => `/${row.login}${row.name ? `/${row.name}` : ''}`;
</script>

<section aria-labelledby="nearby">
  <h2 id="nearby">Nearby{language ? ` in ${language}` : ''}</h2>
  <ol>
    {#each rows as row (row.id)}
      {@const mine = row.id === me}
      {@const label = row.name ?? row.login}
      <li class:mine aria-current={mine ? 'true' : undefined}>
        <span class="rank">#{number(row.rank)}</span>
        <img src={avatar(row.owner_id ?? row.id)} alt="" width="24" height="24" loading="lazy" />
        <svelte:element
          this={mine ? 'strong' : 'a'}
          class="label"
          href={mine ? undefined : href(row)}
        >
          {#if row.name}<span class="visually-hidden">{row.login}/</span>{/if}{label}
        </svelte:element>
        <span class="stars"><Star /> {number(row.stars)}</span>
      </li>
    {/each}
  </ol>
  <a class="more" href={boardPath(path, page, language)}>See the full board</a>
</section>

<style>
  section {
    display: grid;
    gap: var(--space-3);
  }

  ol {
    display: grid;
    grid-template-columns: auto auto minmax(0, 1fr) auto;
    margin: 0;
    padding: 0;
    list-style: none;
    font-size: var(--text-sm);
  }

  li {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: subgrid;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2);
    border-radius: var(--radius);

    &.mine {
      background: var(--accent-soft);
    }
  }

  .rank,
  .stars {
    color: var(--text-muted);
    font-variant-numeric: tabular-nums;
    text-align: end;
    white-space: nowrap;
  }

  img {
    width: var(--avatar);
    height: var(--avatar);
    border-radius: 50%;
    background: var(--surface-hover);
  }

  .label {
    overflow: hidden;
    font-weight: 600;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  a.label {
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }

  .more {
    justify-self: start;
    font-size: var(--text-sm);
    font-weight: 600;
  }
</style>
