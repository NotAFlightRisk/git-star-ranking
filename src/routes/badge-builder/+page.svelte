<script lang="ts">
  import { replaceState } from '$app/navigation';
  import { page } from '$app/state';
  import { tick, untrack } from 'svelte';
  import ColourField from '#lib/components/builder/ColourField.svelte';
  import Output from '#lib/components/builder/Output.svelte';
  import Seo from '#lib/components/Seo.svelte';
  import Toggle from '#lib/components/Toggle.svelte';
  import { badgeQuery, badgeUrl, BLUE, defaultLabel, LABEL_GREY, readBadge } from '#lib/badges.ts';
  import { SHOWS, STYLES, type Kind, type Show, type Source, type Style } from '#lib/badges.ts';
  import { LOGIN, pathOf, REPO, split, subject } from '#lib/names.ts';

  const KINDS: { value: Kind; label: string }[] = [
    { value: 'account', label: 'User or org' },
    { value: 'repo', label: 'Repository' }
  ];
  const SHOWN: Record<Show, { label: string; title: string }> = {
    rank: { label: 'Rank', title: 'Its place on the board, like #1,234' },
    language: {
      label: 'Language rank',
      title: 'Its place among repos in its language, like #12 in TypeScript'
    },
    top: { label: 'Top %', title: 'How near the top it sits, like top 1%' },
    stars: { label: 'Stars', title: 'How many stars it has, like 12.3k' }
  };
  const STYLED: Record<Style, string> = {
    flat: 'Flat',
    'flat-square': 'Flat square',
    plastic: 'Plastic',
    'for-the-badge': 'For the badge',
    social: 'Social'
  };
  const SOURCES: { value: Source; label: string; title: string }[] = [
    { value: 'ours', label: 'git-star-ranking', title: 'We draw it, straight from the rankings' },
    {
      value: 'shields',
      label: 'Shields.io',
      title: 'Shields draws it from our numbers, and takes their other options, like &logo=github'
    }
  ];
  const TEXT = {
    type: 'text',
    autocomplete: 'off',
    autocapitalize: 'off',
    spellcheck: false
  } as const;

  const query = page.url.searchParams;
  const start = split(query.get('for') ?? '');
  const startKind: Kind = start.repo ? 'repo' : 'account';

  let owner = $state(start.owner);
  let repo = $state(start.repo ?? '');
  let kind = $state(startKind);
  const options = $state(readBadge(query, startKind));
  let source = $state<Source>(query.get('source') === 'shields' ? 'shields' : 'ours');
  let repoField = $state<HTMLInputElement>();

  const chosen = $derived(subject(owner, kind === 'repo' ? repo : undefined));
  const badOwner = $derived(owner !== '' && !LOGIN.test(owner));
  const badRepo = $derived(kind === 'repo' && repo !== '' && !REPO.test(repo));
  const social = $derived(options.style === 'social');
  const image = $derived(chosen && badgeUrl(page.url.origin, chosen, options, source));
  const address = $derived(
    [
      chosen && `for=${pathOf(chosen).slice(1)}`,
      badgeQuery(options).toString(),
      source === 'shields' && 'source=shields'
    ]
      .filter(Boolean)
      .join('&')
  );

  // waits for typing or a colour drag to settle, so each pause costs one fetch
  let preview = $state(untrack(() => image));
  $effect(() => {
    const [next, here] = [image, address];
    const wait = setTimeout(() => {
      preview = next;
      replaceState(here ? `?${here}` : page.url.pathname, page.state);
    }, 400);
    return () => clearTimeout(wait);
  });

  function choose(next: Kind) {
    if (!SHOWS[next].includes(options.show)) options.show = 'rank';
    kind = next;
  }

  // a link, or a slash after the owner, moves on to the repo
  async function typeOwner(text: string) {
    const found = split(text);
    owner = found.owner;
    if (found.repo === undefined) return;
    repo = found.repo;
    kind = 'repo';
    await tick();
    repoField?.focus();
  }

  function typeRepo(text: string) {
    if (!text.includes('/')) return void (repo = text.trim());
    const found = split(text);
    owner = found.owner;
    repo = found.repo ?? repo;
  }

  // an empty or default label goes back to following what's shown
  function settleLabel() {
    const label = options.label?.trim();
    if (!label || label === defaultLabel(options.show)) options.label = undefined;
  }
</script>

<Seo
  title="Badge builder"
  description="Make an embeddable README badge with the stars or rank of a GitHub account or repo."
/>

<header class="intro">
  <h1>Badge builder</h1>
  <p>
    Create an embeddable badge for your README, showing the stars or rank of your GitHub account or
    repository. Everything can be customised :)
  </p>
</header>

<div class="builder">
  <div class="steps">
    <section aria-labelledby="for">
      <h2 id="for">Badge for</h2>
      <Toggle label="Badge for" options={KINDS} bind:value={() => kind, choose} />
      <div class="names">
        <label class="field">
          <span>{kind === 'repo' ? 'Owner' : 'Username'}</span>
          <input
            {...TEXT}
            bind:value={() => owner, typeOwner}
            placeholder={kind === 'repo' ? 'facebook' : 'torvalds'}
            aria-invalid={badOwner}
            aria-describedby={badOwner ? 'for-hint' : undefined}
          />
        </label>
        {#if kind === 'repo'}
          <span class="slash" aria-hidden="true">/</span>
          <label class="field">
            <span>Repository</span>
            <input
              {...TEXT}
              bind:this={repoField}
              bind:value={() => repo, typeRepo}
              placeholder="react"
              aria-invalid={badRepo}
              aria-describedby={badRepo ? 'for-hint' : undefined}
            />
          </label>
        {/if}
      </div>
      {#if badOwner || badRepo}
        <p id="for-hint" class="hint">
          {badOwner ? "That isn't a GitHub username." : "That isn't a name GitHub allows."}
        </p>
      {/if}
    </section>

    <section aria-labelledby="show">
      <h2 id="show">Data to show</h2>
      <Toggle
        label="Data to show"
        options={SHOWS[kind].map((value) => ({ value, ...SHOWN[value] }))}
        bind:value={options.show}
      />
    </section>

    <section aria-labelledby="style">
      <h2 id="style">Badge style</h2>
      <Toggle
        label="Badge style"
        options={STYLES.map((value) => ({ value, label: STYLED[value] }))}
        bind:value={options.style}
      />
      <label class="field">
        <span>Label</span>
        <input
          {...TEXT}
          bind:value={
            () => options.label ?? defaultLabel(options.show), (text) => (options.label = text)
          }
          onblur={settleLabel}
          placeholder={defaultLabel(options.show)}
          maxlength="40"
        />
      </label>
      <div class="settings">
        <ColourField label="Colour" bind:value={options.color} fallback={BLUE} disabled={social} />
        <ColourField
          label="Label colour"
          bind:value={options.labelColor}
          fallback={LABEL_GREY}
          disabled={social}
        />
        <label class="checkbox">
          <input
            type="checkbox"
            bind:checked={
              () => Boolean(options.icon), (on) => (options.icon = on ? 'star' : undefined)
            }
          />
          Star icon
        </label>
      </div>
      {#if social}<p class="hint">Social badges keep to grey and white.</p>{/if}
    </section>

    <section aria-labelledby="source">
      <h2 id="source">Served from</h2>
      <Toggle label="Served from" options={SOURCES} bind:value={source} />
    </section>
  </div>

  <Output
    {image}
    {preview}
    alt={options.label?.trim() || defaultLabel(options.show)}
    target={chosen}
  />
</div>

<style>
  .intro {
    display: grid;
    gap: var(--space-2);
    max-width: var(--measure);
    margin-block-end: var(--space-6);

    h1 {
      font-size: var(--text-2xl);
      letter-spacing: -0.02em;
    }

    p {
      color: var(--text-muted);
    }
  }

  .builder {
    display: grid;
    align-items: start;
    gap: var(--space-6);
  }

  @media (min-width: 60rem) {
    .builder {
      grid-template-columns: minmax(0, 1fr) minmax(0, 32rem);
    }
  }

  .steps {
    display: grid;
    gap: var(--space-5);
    min-width: 0;
  }

  section {
    display: grid;
    justify-items: start;
    gap: var(--space-3);

    & + & {
      padding-block-start: var(--space-5);
      border-block-start: 1px solid var(--border);
    }

    h2 {
      font-size: var(--text-lg);
    }
  }

  .names,
  .field {
    width: min(100%, 30rem);
  }

  .names {
    display: flex;
    align-items: end;
    gap: var(--space-2);

    .field {
      flex: 1;
      min-width: 0;
    }
  }

  .slash {
    padding-block-end: var(--space-2);
    color: var(--text-muted);
    font-size: var(--text-lg);
  }

  .field {
    display: grid;
    gap: var(--space-1);

    span {
      font-size: var(--text-sm);
      font-weight: 600;
    }

    input {
      min-width: 0;
      padding: var(--space-2) var(--space-3);
      font: inherit;
      color: var(--text);
      background: var(--surface);
      border: 1px solid var(--border-strong);
      border-radius: var(--radius);

      &::placeholder {
        color: var(--text-muted);
      }

      &[aria-invalid='true'] {
        border-color: var(--danger);
      }
    }
  }

  .settings {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-3) var(--space-5);
  }
</style>
