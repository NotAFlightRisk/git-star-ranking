<script lang="ts">
  import { about, count, number, place, top, trend } from '#lib/format.ts';
  import Tile from './Tile.svelte';
  import Tiles from './Tiles.svelte';

  interface Props {
    owner: { kind: number; stars: number; repos: number };
    rank?: { rank: number; top: number; of: number; rough: boolean; roughOf: boolean };
    moved?: { from: number | null; to: number };
  }

  const { owner, rank, moved }: Props = $props();
</script>

<Tiles>
  <Tile label="Stars" value={number(owner.stars)} star>
    {#if owner.repos}across {count(owner.repos, 'public repo')}{/if}
  </Tile>
  <Tile
    label="Rank"
    value={rank ? place(rank.rank, rank.rough) : 'Not yet'}
    note={moved && trend(moved)}
  >
    {#if rank}
      of {about(rank.of, rank.roughOf)}
      {owner.kind ? 'organizations' : 'users'} with stars, <strong>{top(rank.top)}</strong>
    {:else}
      Ranked after their first count
    {/if}
  </Tile>
</Tiles>
