<script lang="ts">
  import { count, number, top } from '#lib/format.ts';
  import Star from '../Star.svelte';

  interface Props {
    owner: { kind: number; stars: number; repos: number };
    rank?: { rank: number; top: number; of: number };
  }

  const { owner, rank }: Props = $props();
</script>

<dl class="stats">
  <div>
    <dt>Stars</dt>
    <dd class="value"><Star /> {number(owner.stars)}</dd>
    {#if owner.repos}<dd>across {count(owner.repos, 'public repo')}</dd>{/if}
  </div>
  <div>
    <dt>Rank</dt>
    {#if rank}
      <dd class="value">#{number(rank.rank)}</dd>
      <dd>
        of {number(rank.of)}
        {owner.kind ? 'organizations' : 'users'}, <strong>{top(rank.top)}</strong>
      </dd>
    {:else}
      <dd class="value">Not yet</dd>
      <dd>Ranked after their first count</dd>
    {/if}
  </div>
</dl>

<style>
  .stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 15rem), 1fr));
    gap: var(--space-3);
    margin: 0;

    > div {
      display: grid;
      align-content: start;
      gap: var(--space-1);
      min-width: 0;
      padding: var(--space-3) var(--space-4);
      background: var(--surface-raised);
      border: 1px solid var(--border);
      border-radius: var(--radius);
    }
  }

  dt,
  dd {
    color: var(--text-muted);
    font-size: var(--text-sm);
  }

  dd {
    margin: 0;
  }

  .value {
    color: var(--text);
    font-size: clamp(1.75rem, 1.2rem + 2vw, 2.5rem);
    font-weight: 700;
    line-height: 1.2;
    letter-spacing: -0.02em;
  }

  strong {
    color: var(--text);
    font-weight: 600;
  }
</style>
