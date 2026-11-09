<script lang="ts">
  import { month, number, short } from '#lib/format.ts';

  interface Repo {
    id: number;
    name: string;
    stars: number;
    language: string | null;
    created_at: number;
  }

  interface Props {
    repos: Repo[];
    tone: (language: string | null) => string;
  }

  const { repos, tone }: Props = $props();
  const NAMED = 3;
  const start = (year: number) => Date.UTC(year, 0, 1) / 1000;
  const year = (seconds: number) => new Date(seconds * 1000).getUTCFullYear();

  const first = $derived(year(Math.min(...repos.map((repo) => repo.created_at))));
  const last = $derived(year(Math.max(...repos.map((repo) => repo.created_at))));
  const span = $derived(start(last + 1) - start(first));
  const across = (seconds: number) => ((seconds - start(first)) / span) * 100;
  const middle = (year: number) => across((start(year) + start(year + 1)) / 2);

  const low = $derived(Math.floor(Math.log10(Math.min(...repos.map((repo) => repo.stars)))));
  const high = $derived(
    Math.max(Math.ceil(Math.log10(Math.max(...repos.map((repo) => repo.stars)))), low + 1)
  );
  const up = (stars: number) => ((Math.log10(stars) - low) / (high - low)) * 100;
  const powers = $derived(Array.from({ length: high - low + 1 }, (_, i) => 10 ** (low + i)));

  const step = $derived(Math.ceil((last - first + 1) / 7));
  const years = $derived(
    Array.from({ length: Math.floor((last - first) / step) + 1 }, (_, i) => first + i * step)
  );
  const named = $derived(new Set(repos.slice(0, NAMED).map((repo) => repo.id)));
  let hovered = $state<Repo>();
</script>

<figure>
  <figcaption>
    <h2>When they were made</h2>
    <p>
      {#if hovered}
        <strong>{hovered.name}:</strong>
        {number(hovered.stars)} stars, made {month(hovered.created_at * 1000)}
      {:else}
        {number(repos.length)} repos with 50+ stars, made
        {first === last ? `in ${first}` : `between ${first} and ${last}`}
      {/if}
    </p>
  </figcaption>
  <div
    class="plot"
    role="img"
    aria-label="Repos by the date they were made and their stars, from {first} to {last}"
  >
    <div class="area">
      {#each powers as power (power)}
        <span class="grid" style:bottom="{up(power)}%"><span>{short(power)}</span></span>
      {/each}
      {#each repos.toReversed() as repo (repo.id)}
        {@const x = across(repo.created_at)}
        <span
          class="dot"
          class:end={x > 75}
          role="presentation"
          style:left="{x}%"
          style:bottom="{up(repo.stars)}%"
          style:--tone={tone(repo.language)}
          onpointerenter={() => (hovered = repo)}
          onpointerleave={() => (hovered = undefined)}
        >
          {#if named.has(repo.id)}<span class="label">{repo.name}</span>{/if}
        </span>
      {/each}
    </div>
  </div>
  <div class="axis" aria-hidden="true">
    {#each years as year (year)}
      <span style:left="{middle(year)}%">{year}</span>
    {/each}
  </div>
</figure>

<style>
  figure {
    --gutter: 2.25rem;
    display: grid;
    gap: var(--space-2);
    margin: 0;
  }

  figcaption {
    display: grid;
    gap: var(--space-1);

    h2 {
      font-size: var(--text-xl);
    }

    p {
      min-height: 1.5em;
      color: var(--text-muted);
      font-size: var(--text-sm);
    }

    strong {
      color: var(--text);
      font-weight: 600;
    }
  }

  .plot {
    position: relative;
    height: 14rem;
  }

  .area {
    position: absolute;
    inset: var(--space-5) var(--space-3) var(--space-3) var(--gutter);
  }

  .grid {
    position: absolute;
    inset-inline: calc(-1 * var(--gutter)) calc(-1 * var(--space-3));
    border-block-start: 1px solid var(--border);
    color: var(--text-muted);
    font-size: var(--text-xs);

    span {
      position: absolute;
      inset-block-end: 0;
      padding-inline-start: var(--space-1);
    }
  }

  .dot {
    position: absolute;
    display: grid;
    place-items: center;
    width: 1.25rem;
    height: 1.25rem;
    translate: -50% 50%;

    &::before {
      content: '';
      width: 0.6rem;
      height: 0.6rem;
      border-radius: 50%;
      background: var(--tone);
      box-shadow: 0 0 0 2px var(--surface);
    }

    &:hover::before {
      scale: 1.5;
    }
  }

  .label {
    position: absolute;
    inset-block-start: 50%;
    inset-inline-start: 100%;
    translate: 0 -50%;
    color: var(--text);
    font-size: var(--text-xs);
    font-weight: 600;
    white-space: nowrap;
    pointer-events: none;
  }

  .end .label {
    inset-inline: auto 100%;
  }

  .axis {
    position: relative;
    height: 1.25rem;
    margin-inline: var(--gutter) var(--space-3);
    color: var(--text-muted);
    font-size: var(--text-xs);
    font-variant-numeric: tabular-nums;

    span {
      position: absolute;
      translate: -50% 0;
    }
  }
</style>
