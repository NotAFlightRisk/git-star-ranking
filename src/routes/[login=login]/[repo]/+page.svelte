<script lang="ts">
  import Language from '#lib/components/Language.svelte';
  import Badges from '#lib/components/profile/Badges.svelte';
  import Layout from '#lib/components/profile/Layout.svelte';
  import Neighbours from '#lib/components/profile/Neighbours.svelte';
  import Schedule from '#lib/components/profile/Schedule.svelte';
  import Spread from '#lib/components/profile/Spread.svelte';
  import Tile from '#lib/components/profile/Tile.svelte';
  import Tiles from '#lib/components/profile/Tiles.svelte';
  import QuickStats from '#lib/components/repo/QuickStats.svelte';
  import Siblings from '#lib/components/repo/Siblings.svelte';
  import Seo from '#lib/components/Seo.svelte';
  import Toggle from '#lib/components/Toggle.svelte';
  import { boardPath, count, month, number, percent, tidy, top } from '#lib/format.ts';

  const { data } = $props();
  const { owner, repo, rank, spread, language, siblings } = $derived(data);
  const full = $derived(`${owner.login}/${repo.name}`);
  const counted = $derived(owner.refreshed_at > 0);
  const share = $derived(owner.stars ? Math.min(repo.stars / owner.stars, 1) : 0);
  let scope = $state<'all' | 'language'>('all');
  const among = $derived(
    scope === 'language' && language
      ? { noun: `${language.name} repo`, ...language }
      : rank && spread && { noun: 'repo', rank, spread }
  );
  const schema = $derived({
    '@context': 'https://schema.org',
    '@type': 'SoftwareSourceCode',
    name: repo.name,
    codeRepository: `https://github.com/${full}`,
    programmingLanguage: repo.language ?? undefined,
    description: tidy(repo.description) ?? undefined,
    dateCreated: repo.created_at ? new Date(repo.created_at * 1000).toISOString() : undefined,
    author: { '@type': owner.kind ? 'Organization' : 'Person', name: owner.name ?? owner.login }
  });
</script>

<Seo
  title="{full} GitHub stars and rank"
  description="{full} has {number(repo.stars)} stars on GitHub{rank
    ? `, ranked #${number(rank.rank)} of ${number(rank.of)} repositories`
    : ''}.{repo.description ? ` ${tidy(repo.description)}` : ''}"
  {schema}
/>

{#snippet title()}
  <h1><a href="/{owner.login}">{owner.login}</a>/<wbr />{repo.name}</h1>
  {#if repo.description}<p class="description">{tidy(repo.description)}</p>{/if}
  <p class="dotted">
    {#if repo.archived}<span class="archived">Archived</span>{/if}
    {#if owner.name}<span>by <a href="/{owner.login}">{owner.name}</a></span>{/if}
    {#if repo.language}
      <span>
        <a href={boardPath('/repositories', 1, repo.language)}><Language name={repo.language} /></a>
      </span>
    {/if}
    {#if repo.license}<span>{repo.license} licence</span>{/if}
    {#if repo.forks !== null}<span>{count(repo.forks, 'fork')}</span>{/if}
    {#if repo.created_at}<span>Created {month(repo.created_at * 1000)}</span>{/if}
    <span><a href="https://github.com/{full}" rel="external">View on GitHub</a></span>
  </p>
{/snippet}

{#snippet aside()}
  {#if rank}<Badges name={full} path="/{full}" badges="/repositories/{full}" />{/if}
  {#if data.neighbours}
    <Neighbours board="repositories" {...data.neighbours} me={repo.id} />
  {/if}
  {#if siblings.rows.length}
    <Siblings login={owner.login} name={repo.name} {...siblings} />
  {/if}
{/snippet}

{#snippet scopes()}
  {#if language}
    <Toggle
      label="Compare with"
      options={[
        { value: 'all', label: 'All repos' },
        { value: 'language', label: language.name }
      ]}
      bind:value={scope}
    />
  {/if}
{/snippet}

{#snippet footer()}
  {#if data.schedule}<Schedule counted={owner.refreshed_at * 1000} {...data.schedule} />{/if}
{/snippet}

<Layout
  avatarId={owner.id}
  {title}
  aside={rank || data.neighbours || siblings.rows.length ? aside : undefined}
  footer={data.schedule ? footer : undefined}
>
  <Tiles>
    <Tile label="Stars" value={number(repo.stars)} star>
      {#if counted && share}{percent(share)} of {owner.login}'s stars{/if}
    </Tile>
    <Tile label="Rank" value={rank ? `#${number(rank.rank)}` : 'Not yet'}>
      {#if rank}
        of {number(rank.of)} repos, <strong>{top(rank.top)}</strong>
      {:else}
        Ranked after the next snapshot
      {/if}
    </Tile>
    {#if language}
      <Tile label="In {language.name}" value="#{number(language.rank.rank)}">
        of {number(language.rank.of)} repos, <strong>{top(language.rank.top)}</strong>
      </Tile>
    {/if}
  </Tiles>

  {#if among}
    <Spread
      name={repo.name}
      avatarId={owner.id}
      stars={repo.stars}
      noun={among.noun}
      rank={among.rank}
      {...among.spread}
      controls={scopes}
    />
  {/if}

  <QuickStats
    {repo}
    next={data.next}
    milestone={data.milestone}
    club={data.club}
    yearly={data.yearly}
  />
</Layout>

<style>
  h1 a {
    font-weight: 400;
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }

  .archived {
    padding-inline: var(--space-2);
    border: 1px solid var(--border-strong);
    border-radius: 2em;
    color: var(--text);
    font-size: var(--text-xs);
    font-weight: 600;
  }

  .description {
    font-size: var(--text-lg);
    max-width: var(--measure);
  }
</style>
