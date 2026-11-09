<script lang="ts">
  import Actions from '#lib/components/profile/Actions.svelte';
  import Badges from '#lib/components/profile/Badges.svelte';
  import Forget from '#lib/components/profile/Forget.svelte';
  import Layout from '#lib/components/profile/Layout.svelte';
  import Neighbours from '#lib/components/profile/Neighbours.svelte';
  import Portfolio from '#lib/components/profile/Portfolio.svelte';
  import QuickStats from '#lib/components/profile/QuickStats.svelte';
  import Schedule from '#lib/components/profile/Schedule.svelte';
  import Spread from '#lib/components/profile/Spread.svelte';
  import Stats from '#lib/components/profile/Stats.svelte';
  import RankTable from '#lib/components/RankTable.svelte';
  import Seo from '#lib/components/Seo.svelte';
  import { avatar, count, month, number } from '#lib/format.ts';

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
      name: owner.name ?? owner.login,
      alternateName: owner.name ? owner.login : undefined,
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

{#snippet title()}
  <h1>{owner.login}</h1>
  <p class="dotted">
    {#if owner.name}<span class="name">{owner.name}</span>{/if}
    {#if owner.joined_at}<span>Joined {month(owner.joined_at * 1000)}</span>{/if}
    {#if owner.followers !== null}<span>{count(owner.followers, 'follower')}</span>{/if}
    <span><a href="https://github.com/{owner.login}" rel="external">View on GitHub</a></span>
  </p>
{/snippet}

{#snippet actions()}
  <Actions login={owner.login} self={data.self} queued={form?.queued} />
{/snippet}

{#snippet aside()}
  {#if counted}<Badges login={owner.login} />{/if}
  {#if data.neighbours}
    <Neighbours board={owner.kind ? 'organizations' : 'users'} {...data.neighbours} me={owner.id} />
  {/if}
  {#if data.self}<Forget login={owner.login} unsure={form?.unsure} />{/if}
{/snippet}

{#snippet footer()}
  {#if data.schedule}<Schedule counted={owner.refreshed_at * 1000} {...data.schedule} />{/if}
{/snippet}

<Layout
  avatarId={owner.id}
  {title}
  actions={data.user ? actions : undefined}
  aside={side ? aside : undefined}
  footer={data.schedule ? footer : undefined}
>
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
    <Spread
      name={owner.login}
      avatarId={owner.id}
      stars={owner.stars}
      {noun}
      rank={data.rank}
      {...data.spread}
    />
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
</Layout>

<style>
  .name {
    color: var(--text);
    font-weight: 600;
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
</style>
