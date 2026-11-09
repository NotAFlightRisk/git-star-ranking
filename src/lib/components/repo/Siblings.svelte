<script lang="ts">
  import { count, number } from '#lib/format.ts';
  import Star from '../Star.svelte';

  interface Props {
    login: string;
    name: string;
    place: number;
    of: number;
    rows: { id: number; name: string; stars: number }[];
  }

  const { login, name, place, of, rows }: Props = $props();
  const most = $derived(Math.max(...rows.map((row) => row.stars)));
  const where = $derived(place === 1 ? 'top repo' : `#${number(place)}`);
</script>

<section aria-labelledby="siblings">
  <h2 id="siblings">More from {login}</h2>
  <p>{name} is their {where} of {count(of, 'repo')} with 50+ stars</p>
  <ol>
    {#each rows as row (row.id)}
      <li style:--share={row.stars / most}>
        <a href="/{login}/{row.name}">{row.name}</a>
        <span class="stars"><Star /> {number(row.stars)}</span>
        <span class="bar"></span>
      </li>
    {/each}
  </ol>
  <a class="more" href="/{login}">See all of {login}'s repos</a>
</section>

<style>
  section {
    display: grid;
    gap: var(--space-3);
  }

  p {
    color: var(--text-muted);
    font-size: var(--text-sm);
    overflow-wrap: anywhere;
  }

  ol {
    display: grid;
    gap: var(--space-3);
    margin: 0;
    padding: 0;
    list-style: none;
    font-size: var(--text-sm);
  }

  li {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: var(--space-1) var(--space-3);
    min-width: 0;
  }

  li a {
    flex: 1 1 0;
    min-width: 0;
    overflow: hidden;
    font-weight: 600;
    text-decoration: none;
    text-overflow: ellipsis;
    white-space: nowrap;

    &:hover {
      text-decoration: underline;
    }
  }

  .stars {
    color: var(--text-muted);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .bar {
    flex-basis: 100%;
    height: 4px;
    border-radius: 2px;
    background: var(--surface-hover);

    &::after {
      content: '';
      display: block;
      width: max(calc(var(--share) * 100%), 4px);
      height: 100%;
      border-radius: inherit;
      background: color-mix(in oklab, var(--text-muted) 55%, var(--surface));
    }
  }

  .more {
    justify-self: start;
    font-size: var(--text-sm);
    font-weight: 600;
  }
</style>
