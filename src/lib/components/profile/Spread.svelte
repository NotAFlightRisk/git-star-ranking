<script lang="ts">
  import type { Snippet } from 'svelte';
  import { avatar, count, number, short, top } from '#lib/format.ts';

  interface Band {
    from: number;
    to: number;
    count: number;
  }

  interface Props {
    name: string;
    avatarId: number;
    stars: number;
    noun: string;
    rank: { rank: number; top: number; of: number };
    bands: Band[];
    marks: { share: number; stars: number }[];
    controls?: Snippet;
  }

  const { name, avatarId, stars, noun, rank, bands, marks, controls }: Props = $props();
  const most = $derived(Math.max(...bands.map(({ count }) => count)));
  const place = (value: number) =>
    Math.max(
      bands.findLastIndex(({ from }) => from <= value),
      0
    );
  const mine = $derived(place(stars));
  let hovered = $state<number>();
  const shown = $derived(bands[hovered ?? mine]);

  // log heights, as a power law leaves everything past the first few bands at nothing
  const height = (count: number) =>
    count ? Math.max((Math.log10(count + 1) / Math.log10(most + 1)) * 100, 3) : 0;

  const across = (value: number) => {
    const i = place(value);
    const { from, to } = bands[i];
    const within = Math.min(Math.max(Math.log(value / from) / Math.log(to / from), 0), 1);
    return ((i + within) / bands.length) * 100;
  };

  const summary = $derived(
    `${count(rank.of, noun)} by stars, on a log scale. ` +
      `${name} is #${number(rank.rank)}, in the ${top(rank.top)}.`
  );

  const decades = $derived(
    bands.flatMap((band, i) => (/^10*$/.test(String(band.from)) ? [{ i, from: band.from }] : []))
  );
</script>

<figure>
  <figcaption>
    <div class="head">
      <h2>Among {count(rank.of, noun)}</h2>
      {@render controls?.()}
    </div>
    <p>
      <strong>{short(shown.from)}–{short(shown.to)} stars:</strong>
      {count(shown.count, noun)}{#if shown === bands[mine]}, including {name}{/if}
    </p>
  </figcaption>
  <div class="plot" role="img" aria-label={summary}>
    {#each marks as mark, i (mark.share)}
      {@const x = across(mark.stars)}
      <span class="mark" class:low={i % 2} class:end={x > 80} style:left="{x}%">
        {top(mark.share)}
      </span>
    {/each}
    <div class="bars" role="presentation" onpointerleave={() => (hovered = undefined)}>
      {#each bands as band, i (band.from)}
        <div
          class="column"
          class:mine={i === mine}
          role="presentation"
          onpointerenter={() => (hovered = i)}
        >
          <div class="bar" style:height="{height(band.count)}%"></div>
        </div>
      {/each}
      <img
        class="pin"
        src={avatar(avatarId, 48)}
        alt=""
        width="24"
        height="24"
        style:left="{((mine + 0.5) / bands.length) * 100}%"
        style:bottom="{height(bands[mine].count)}%"
      />
    </div>
  </div>
  <div class="axis" aria-hidden="true">
    {#each decades as { i, from } (from)}
      <span class:first={!i} style:left="{(i / bands.length) * 100}%">{short(from)}</span>
    {/each}
  </div>
  <p class="scale">Stars along the bottom, and {noun}s in each band on a log scale</p>
</figure>

<style>
  figure {
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

    .head {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-2) var(--space-4);
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
    padding-block-start: 2.75rem;
  }

  .mark {
    position: absolute;
    inset-block: 0;
    padding-inline-start: var(--space-1);
    border-inline-start: 1px solid var(--border-strong);
    color: var(--text-muted);
    font-size: var(--text-xs);
    line-height: 1.2;
    white-space: nowrap;
    pointer-events: none;

    &.low {
      padding-block-start: 1.2em;
    }

    &.end {
      translate: -100% 0;
      padding-inline: 0 var(--space-1);
      border-inline-start: 0;
      border-inline-end: 1px solid var(--border-strong);
    }
  }

  .bars {
    position: relative;
    display: flex;
    gap: 2px;
    height: 8rem;
    border-block-end: 1px solid var(--border-strong);
  }

  .column {
    flex: 1;
    display: flex;
    align-items: flex-end;
  }

  .bar {
    width: 100%;
    border-radius: 3px 3px 0 0;
    background: color-mix(in oklab, var(--text-muted) 35%, var(--surface));
  }

  .column:hover .bar {
    background: color-mix(in oklab, var(--text-muted) 65%, var(--surface));
  }

  .mine .bar,
  .mine:hover .bar {
    background: var(--accent);
  }

  .pin {
    position: absolute;
    width: 1.5rem;
    height: 1.5rem;
    margin-block-end: var(--space-1);
    translate: -50% 0;
    border-radius: 50%;
    box-shadow:
      0 0 0 2px var(--surface),
      0 0 0 4px var(--accent);
    background: var(--surface-hover);
    pointer-events: none;
  }

  .scale {
    color: var(--text-muted);
    font-size: var(--text-xs);
  }

  .axis {
    position: relative;
    height: 1.25rem;
    color: var(--text-muted);
    font-size: var(--text-xs);
    font-variant-numeric: tabular-nums;

    span {
      position: absolute;
      translate: -50% 0;
    }

    .first {
      translate: 0;
    }
  }
</style>
