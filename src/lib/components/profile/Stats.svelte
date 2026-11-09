<script lang="ts">
  import { count, number, top, trend } from '#lib/format.ts';
  import Tile from './Tile.svelte';
  import Tiles from './Tiles.svelte';

  interface Props {
    owner: { kind: number; stars: number; repos: number };
    rank?: { rank: number; top: number; of: number };
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
    value={rank ? `#${number(rank.rank)}` : 'Not yet'}
    note={moved && trend(moved)}
  >
    {#if rank}
      of {number(rank.of)}
      {owner.kind ? 'organizations' : 'users'}, <strong>{top(rank.top)}</strong>
    {:else}
      Ranked after their first count
    {/if}
  </Tile>
</Tiles>
