<script lang="ts">
  import { page } from '$app/state';
  import Copy from '#lib/components/Copy.svelte';
  import RankTable from '#lib/components/RankTable.svelte';
  import Seo from '#lib/components/Seo.svelte';
  import Star from '#lib/components/Star.svelte';
  import Updated from '#lib/components/Updated.svelte';
  import { avatar, number, top } from '#lib/format.ts';

  const { data, form } = $props();
  const owner = $derived(data.owner);
  const noun = $derived(owner.kind ? 'organization' : 'user');
  const counted = $derived(owner.refreshed_at > 0);
  const profile = $derived(`${page.url.origin}/${owner.login}`);
  const badge = $derived(`${page.url.origin}/users/${owner.login}/badge.svg`);
  const shields = $derived(
    `https://img.shields.io/endpoint?url=${encodeURIComponent(`${page.url.origin}/users/${owner.login}/shields`)}`
  );
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

<article class="profile">
  <header class="who">
    <img src={avatar(owner.id, 192)} alt="" width="96" height="96" />
    <div>
      <h1>{owner.login}</h1>
      <p class="kind">
        GitHub {noun} -
        <a href="https://github.com/{owner.login}" rel="external">view on GitHub</a>
      </p>
    </div>
  </header>

  <dl class="stats">
    <div>
      <dt>Stars</dt>
      <dd><Star /> {number(owner.stars)}</dd>
    </div>
    <div>
      <dt>Rank</dt>
      <dd>
        {#if data.rank && counted}
          #{number(data.rank.rank)}
          <span class="of">of {number(data.rank.of)} {noun}s, {top(data.rank.top)}</span>
        {:else}
          <span class="of">Not ranked yet</span>
        {/if}
      </dd>
    </div>
    <div>
      <dt>Public repos</dt>
      <dd>{number(owner.repos)}</dd>
    </div>
  </dl>

  {#if counted}
    <Updated at={owner.refreshed_at * 1000} label="Stars counted" />
  {:else}
    <p class="note">
      We've spotted this account in a search but haven't counted all its stars yet. It's near the
      front of the queue.
    </p>
  {/if}

  {#if data.user}
    <div class="actions">
      {#if data.self}
        <a class="button" href="/login?next=/{owner.login}" data-sveltekit-reload>
          Refresh my stars
        </a>
      {:else}
        <form method="POST" action="?/refresh">
          <button class="button" type="submit">Ask for a refresh</button>
        </form>
        {#if form && 'queued' in form}
          <p class="note" role="status">
            {form.queued
              ? "Queued. It'll be done within ten minutes or so."
              : 'Counted recently, so it can wait.'}
          </p>
        {/if}
      {/if}
    </div>
  {/if}

  {#if counted}
    <section class="badge" aria-labelledby="badge">
      <h2 id="badge">Badge</h2>
      <img src={badge} alt="git rank badge for {owner.login}" height="20" />
      <p>For a README, either our own badge or the Shields one:</p>
      <Copy text="[![git rank]({badge})]({profile})" label="our badge's Markdown" />
      <Copy text="[![git rank]({shields})]({profile})" label="the Shields badge's Markdown" />
    </section>
  {/if}

  <section class="repos" aria-labelledby="repos">
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

  {#if data.self}
    <section class="forget" aria-labelledby="forget">
      <h2 id="forget">Remove me</h2>
      <p>
        This takes you off every ranking for good and stops us crawling your account. Your GitHub
        account isn't touched.
      </p>
      <form method="POST" action="?/forget">
        <label>
          <input type="checkbox" name="sure" required />
          Yes, remove {owner.login}
        </label>
        <button class="button danger" type="submit">Remove me</button>
      </form>
      {#if form && 'unsure' in form}<p class="note" role="alert">Tick the box first.</p>{/if}
    </section>
  {/if}
</article>

<style>
  .profile {
    display: grid;
    gap: var(--space-5);
  }

  .who {
    display: flex;
    align-items: center;
    gap: var(--space-4);

    img {
      border-radius: 50%;
      border: 1px solid var(--border);
      background: var(--surface-hover);
    }

    h1 {
      font-size: var(--text-2xl);
      letter-spacing: -0.02em;
      overflow-wrap: anywhere;
    }
  }

  .kind {
    color: var(--text-muted);
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
    }
  }

  .of {
    display: block;
    font-size: var(--text-sm);
    font-weight: 400;
    color: var(--text-muted);
  }

  .note {
    color: var(--text-muted);
    max-width: var(--measure);
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-3);
  }

  .button {
    display: inline-block;
    padding: var(--space-2) var(--space-4);
    font: inherit;
    font-weight: 600;
    font-size: var(--text-sm);
    color: var(--text);
    text-decoration: none;
    background: var(--surface-raised);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius);
    cursor: pointer;

    &:hover {
      background: var(--surface-hover);
    }

    &.danger {
      color: var(--danger);
    }
  }

  section {
    display: grid;
    gap: var(--space-3);
    min-width: 0;

    h2 {
      font-size: var(--text-xl);
    }
  }

  .forget form {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-3);
  }
</style>
