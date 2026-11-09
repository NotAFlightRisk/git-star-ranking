<script lang="ts">
  import { avatar, BOARDS, number } from '#lib/format.ts';
  import Star from '../Star.svelte';

  interface Props {
    board: 'users' | 'organizations';
    page: number;
    rows: { rank: number; id: number; login: string; stars: number }[];
    me: number;
  }

  const { board, page, rows, me }: Props = $props();
  const path = $derived(BOARDS.find(({ key }) => key === board)!.path);
</script>

<section aria-labelledby="nearby">
  <h2 id="nearby">Nearby</h2>
  <ol>
    {#each rows as row (row.id)}
      {@const mine = row.id === me}
      <li class:mine aria-current={mine ? 'true' : undefined}>
        <span class="rank">#{number(row.rank)}</span>
        <img src={avatar(row.id)} alt="" width="24" height="24" loading="lazy" />
        {#if mine}
          <strong class="login">{row.login}</strong>
        {:else}
          <a class="login" href="/{row.login}">{row.login}</a>
        {/if}
        <span class="stars"><Star /> {number(row.stars)}</span>
      </li>
    {/each}
  </ol>
  <a class="more" href="{path}{page > 1 ? `?page=${page}` : ''}">See the full board</a>
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

  .login {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  a.login {
    font-weight: 600;
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
