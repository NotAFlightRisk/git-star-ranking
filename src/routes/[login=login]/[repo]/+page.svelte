<script lang="ts">
  import Seo from '#lib/components/Seo.svelte';
  import Star from '#lib/components/Star.svelte';
  import Updated from '#lib/components/Updated.svelte';
  import { avatar, number, tidy, top } from '#lib/format.ts';

  const { data } = $props();
  const { owner, repo } = $derived(data);
  const full = $derived(`${owner.login}/${repo.name}`);
  const schema = $derived({
    '@context': 'https://schema.org',
    '@type': 'SoftwareSourceCode',
    name: repo.name,
    codeRepository: `https://github.com/${full}`,
    programmingLanguage: repo.language ?? undefined,
    description: tidy(repo.description) ?? undefined,
    author: { '@type': owner.kind ? 'Organization' : 'Person', name: owner.login }
  });
</script>

<Seo
  title="{full} GitHub stars and rank"
  description="{full} has {number(repo.stars)} stars on GitHub{data.rank
    ? `, ranked #${number(data.rank.rank)} of ${number(data.rank.of)} repositories`
    : ''}.{repo.description ? ` ${tidy(repo.description)}` : ''}"
  {schema}
/>

<article class="repo">
  <header>
    <h1>
      <img src={avatar(owner.id, 96)} alt="" width="40" height="40" />
      <span><a href="/{owner.login}">{owner.login}</a>/<wbr />{repo.name}</span>
    </h1>
    {#if repo.description}<p class="description">{tidy(repo.description)}</p>{/if}
  </header>

  <dl class="stats">
    <div>
      <dt>Stars</dt>
      <dd><Star /> {number(repo.stars)}</dd>
    </div>
    <div>
      <dt>Rank</dt>
      <dd>
        {#if data.rank}
          #{number(data.rank.rank)}
          <span class="of">of {number(data.rank.of)} repositories, {top(data.rank.top)}</span>
        {:else}
          <span class="of">Not ranked yet</span>
        {/if}
      </dd>
    </div>
    {#if repo.language}
      <div>
        <dt>Language</dt>
        <dd class="plain">
          <a href="/repositories?language={encodeURIComponent(repo.language.toLowerCase())}">
            {repo.language}
          </a>
        </dd>
      </div>
    {/if}
  </dl>

  <Updated at={owner.refreshed_at ? owner.refreshed_at * 1000 : undefined} label="Stars counted" />
  <p><a href="https://github.com/{full}" rel="external">View {full} on GitHub</a></p>
</article>

<style>
  .repo {
    display: grid;
    gap: var(--space-5);

    header {
      display: grid;
      gap: var(--space-2);
    }

    h1 {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      font-size: var(--text-2xl);
      letter-spacing: -0.02em;
      overflow-wrap: break-word;

      img {
        flex: none;
        border-radius: 50%;
      }

      a {
        font-weight: 400;
        text-decoration: none;

        &:hover {
          text-decoration: underline;
        }
      }
    }
  }

  .description {
    color: var(--text-muted);
    font-size: var(--text-lg);
    max-width: var(--measure);
  }

  .stats {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-4) var(--space-6);
    margin: 0;
    padding-block: var(--space-4);
    border-block: 1px solid var(--border);

    dt {
      color: var(--text-muted);
      font-size: var(--text-sm);
    }

    dd {
      margin: 0;
      font-size: var(--text-xl);
      font-weight: 700;
      font-variant-numeric: tabular-nums;

      &.plain {
        font-size: var(--text-base);
        font-weight: 400;
      }
    }
  }

  .of {
    display: block;
    font-size: var(--text-sm);
    font-weight: 400;
    color: var(--text-muted);
  }
</style>
