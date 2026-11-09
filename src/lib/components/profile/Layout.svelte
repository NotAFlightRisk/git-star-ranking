<script lang="ts">
  import type { Snippet } from 'svelte';
  import { avatar } from '#lib/format.ts';

  interface Props {
    avatarId: number;
    title: Snippet;
    actions?: Snippet;
    children: Snippet;
    aside?: Snippet;
    footer?: Snippet;
  }

  const { avatarId, title, actions, children, aside, footer }: Props = $props();
</script>

<article class:side={!!aside}>
  <header>
    <img src={avatar(avatarId, 192)} alt="" width="96" height="96" />
    <div class="title">{@render title()}</div>
    {@render actions?.()}
  </header>
  <div class="main">{@render children()}</div>
  {#if aside}<aside>{@render aside()}</aside>{/if}
  {#if footer}<footer>{@render footer()}</footer>{/if}
</article>

<style>
  article {
    display: grid;
    gap: var(--space-6);
    grid-template-areas: 'who' 'main' 'side' 'foot';
  }

  header {
    grid-area: who;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-4);

    img {
      width: clamp(4rem, 3rem + 4vw, 6rem);
      height: auto;
      border-radius: 50%;
      border: 1px solid var(--border);
      background: var(--surface-hover);
    }
  }

  .title {
    flex: 1 1 14rem;
    display: grid;
    gap: var(--space-1);
    min-width: 0;

    :global(h1) {
      font-size: var(--text-2xl);
      letter-spacing: -0.02em;
      overflow-wrap: anywhere;
    }

    :global(p) {
      color: var(--text-muted);
    }
  }

  .main {
    grid-area: main;
    container-type: inline-size;
    display: grid;
    align-content: start;
    gap: var(--space-7);
    min-width: 0;

    :global(h2) {
      font-size: var(--text-xl);
    }
  }

  aside {
    grid-area: side;
    display: grid;
    align-content: start;
    gap: var(--space-6);
    min-width: 0;
    padding-block-start: var(--space-5);
    border-block-start: 1px solid var(--border);

    :global(h2) {
      font-size: var(--text-lg);
    }
  }

  @media (min-width: 64rem) {
    article.side {
      grid-template-columns: minmax(0, 1fr) 20rem;
      grid-template-areas: 'who who' 'main side' 'foot foot';
      column-gap: var(--space-6);
    }

    aside {
      padding-block-start: 0;
      padding-inline-start: var(--space-6);
      border-block-start: 0;
      border-inline-start: 1px solid var(--border);
    }
  }

  footer {
    grid-area: foot;
  }
</style>
