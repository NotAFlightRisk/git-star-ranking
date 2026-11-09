<script lang="ts">
  import { count, number, percent, short } from '#lib/format.ts';
  import { squarify, type Tile } from '#lib/treemap.ts';

  interface Piece {
    label: string;
    stars: number;
    tone: string;
    href?: string;
    detail: string;
  }

  interface Props {
    owner: { login: string; stars: number };
    repos: { name: string; stars: number; language: string | null }[];
    languages: { repos: number; stars: number }[];
    tone: (language: string | null) => string;
  }

  const { owner, repos, languages, tone }: Props = $props();
  const MOST = 24;
  // past this share a tile's too thin to read, so it joins the rest
  const LEAST = 0.004;

  const pieces = $derived.by(() => {
    const shown = repos.filter((repo, i) => i < MOST && repo.stars >= owner.stars * LEAST);
    const tracked = languages.reduce((sum, row) => sum + row.stars, 0);
    const listed = shown.reduce((sum, repo) => sum + repo.stars, 0);
    const others = languages.reduce((sum, row) => sum + row.repos, 0) - shown.length;
    const list: Piece[] = shown.map((repo) => ({
      label: repo.name,
      stars: repo.stars,
      tone: tone(repo.language),
      href: `/${owner.login}/${repo.name}`,
      detail: repo.language ?? 'No language'
    }));
    const rest = [
      { label: `${count(others, 'more repo')}`, stars: tracked - listed, detail: '50+ stars each' },
      { label: 'Smaller repos', stars: owner.stars - tracked, detail: 'under 50 stars each' }
    ];
    for (const piece of rest) if (piece.stars > 0) list.push({ ...piece, tone: '' });
    return list.sort((a, b) => b.stars - a.stars);
  });

  const tiles = $derived(squarify(pieces, (piece) => piece.stars, 3, 2));
  // a 3:2 layout in percentages, each pulled in a pixel so neighbours have a gap between
  const box = ({ x, y, width, height }: Tile<Piece>) =>
    [
      `left: calc(${(x / 3) * 100}% + 1px)`,
      `top: calc(${(y / 2) * 100}% + 1px)`,
      `width: max(calc(${(width / 3) * 100}% - 2px), 0px)`,
      `height: max(calc(${(height / 2) * 100}% - 2px), 0px)`
    ].join('; ');
  const share = (stars: number) => percent(owner.stars ? stars / owner.stars : 0);
</script>

<figure>
  <figcaption><h2>Where the stars are</h2></figcaption>
  <div class="map">
    {#each tiles as tile (tile.item.label)}
      {@const { item } = tile}
      <svelte:element
        this={item.href ? 'a' : 'div'}
        href={item.href}
        class="tile"
        class:rest={!item.tone}
        style={box(tile)}
        style:--tone={item.tone || 'var(--series-other)'}
        title="{item.label}: {number(item.stars)} stars, {share(item.stars)} ({item.detail})"
      >
        <span class="label">
          <span class="name">{item.label}</span>
          <span class="stars">{short(item.stars)}, {share(item.stars)}</span>
        </span>
      </svelte:element>
    {/each}
  </div>
</figure>

<style>
  figure {
    display: grid;
    gap: var(--space-3);
    margin: 0;
    min-width: 0;
  }

  h2 {
    font-size: var(--text-xl);
  }

  .map {
    position: relative;
    aspect-ratio: 3 / 2;
  }

  .tile {
    position: absolute;
    container-type: size;
    overflow: hidden;
    color: var(--text);
    font-size: var(--text-xs);
    text-decoration: none;
    background: color-mix(in oklab, var(--tone) 22%, var(--surface));
    border-radius: 4px;
    box-shadow: inset 0 4px var(--tone);
  }

  .label {
    display: grid;
    gap: 0.125rem;
    padding: calc(var(--space-2) + 4px) var(--space-2) var(--space-2);
  }

  a.tile:hover {
    background-color: color-mix(in oklab, var(--tone) 36%, var(--surface));
  }

  .tile.rest {
    box-shadow: none;
    background:
      repeating-linear-gradient(
        45deg,
        transparent 0 5px,
        color-mix(in oklab, var(--tone) 18%, transparent) 5px 6px
      ),
      color-mix(in oklab, var(--tone) 12%, var(--surface));
  }

  .name {
    overflow: hidden;
    font-weight: 600;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .stars {
    color: var(--text-muted);
    white-space: nowrap;
  }

  @container (width < 4.5rem) or (height < 2.5rem) {
    .name,
    .stars {
      display: none;
    }
  }

  @container (height < 3.5rem) {
    .stars {
      display: none;
    }
  }
</style>
