<script lang="ts">
  import Actions from '#lib/components/profile/Actions.svelte';
  import Badges from '#lib/components/profile/Badges.svelte';
  import Forget from '#lib/components/profile/Forget.svelte';
  import Neighbours from '#lib/components/profile/Neighbours.svelte';
  import Portfolio from '#lib/components/profile/Portfolio.svelte';
  import QuickStats from '#lib/components/profile/QuickStats.svelte';
  import Schedule from '#lib/components/profile/Schedule.svelte';
  import Spread from '#lib/components/profile/Spread.svelte';
  import Stats from '#lib/components/profile/Stats.svelte';
  import RankTable from '#lib/components/RankTable.svelte';
  import Seo from '#lib/components/Seo.svelte';
  import { avatar, number } from '#lib/format.ts';

  const { data, form } = $props();
  const owner = $derived(data.owner);
  const noun = $derived(owner.kind ? 'organization' : 'user');
  const counted = $derived(owner.refreshed_at > 0);
  const side = $derived(counted || data.neighbours || data.self);
  const schema = $derived({
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    mainEntity: {
      '@type': owner.kind ? 'Organization' : 'Person',
      name: owner.login,
      url: `https://github.com/${owner.login}`,
      image: avatar(owner.id, 256)
    }
  });
</script>

<Seo
  title="{owner.login}'s GitHub stars and rank"
  description="{owner.login} has {number(owner.stars)} stars on GitHub{data.rank
    ? `, ranked #${number(data.rank.rank)} of ${number(data.rank.of)} ${noun}s`
    : ''}. See their most starred repositories."
  {schema}
/>

<article class="profile" class:side>
  <header class="who">
    <img src={avatar(owner.id, 192)} alt="" width="96" height="96" />
    <div class="title">
      <h1>{owner.login}</h1>
      <p>
        GitHub {noun} ·
        <a href="https://github.com/{owner.login}" rel="external">View on GitHub</a>
      </p>
    </div>
    {#if data.user}
      <Actions login={owner.login} self={data.self} queued={form?.queued} />
    {/if}
  </header>

  <div class="main">
    {#if !counted}
      <p class="note">
        We've spotted this account in a search but haven't counted all its stars yet. It's near the
        front of the queue.
      </p>
    {/if}

    <Stats {owner} rank={data.rank} />

    <section aria-labelledby="repos">
      <h2 id="repos">Repositories with 50+ stars</h2>
      {#if data.repos.length}
        <RankTable
          rows={data.repos.map((repo) => ({ ...repo, rank: repo.rank ?? 0, login: owner.login }))}
          caption="{owner.login}'s repositories with their overall rank"
          heading="Repository"
          owned
        />
      {:else}
        <p class="note">None yet. Forks don't count, and smaller repos still add to the total.</p>
      {/if}
    </section>

    {#if data.rank && data.spread}
      <Spread {owner} rank={data.rank} {...data.spread} />
    {/if}

    {#if data.repos.length}
      <Portfolio {owner} repos={data.repos} languages={data.languages} />
    {/if}

    <QuickStats
      {owner}
      next={data.next}
      milestone={data.milestone}
      repos={data.repos}
      languages={data.languages}
      tiers={data.tiers}
    />
  </div>

  {#if side}
    <aside>
      {#if counted}<Badges login={owner.login} />{/if}
      {#if data.neighbours}
        <Neighbours
          board={owner.kind ? 'organizations' : 'users'}
          {...data.neighbours}
          me={owner.id}
        />
      {/if}
      {#if data.self}<Forget login={owner.login} unsure={form?.unsure} />{/if}
    </aside>
  {/if}

  {#if data.schedule}
    <footer>
      <Schedule counted={owner.refreshed_at * 1000} {...data.schedule} />
    </footer>
  {/if}
</article>

<style>
  .profile {
    display: grid;
    gap: var(--space-6);
    grid-template-areas: 'who' 'main' 'side' 'foot';
  }

  .who {
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

    h1 {
      font-size: var(--text-2xl);
      letter-spacing: -0.02em;
      overflow-wrap: anywhere;
    }

    p {
      color: var(--text-muted);
    }
  }

  .title {
    flex: 1 1 14rem;
    display: grid;
    gap: var(--space-1);
    min-width: 0;
  }

  .main {
    grid-area: main;
    container-type: inline-size;
    display: grid;
    align-content: start;
    gap: var(--space-7);
    min-width: 0;
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
    .profile.side {
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

  .note {
    color: var(--text-muted);
    max-width: var(--measure);
  }

  section {
    display: grid;
    gap: var(--space-3);
    min-width: 0;
  }

  .main h2 {
    font-size: var(--text-xl);
  }
</style>
