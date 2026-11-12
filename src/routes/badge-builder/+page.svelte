<script lang="ts">
  import { page } from '$app/state';
  import Builder from '#lib/components/builder/Builder.svelte';
  import ColourField from '#lib/components/builder/ColourField.svelte';
  import Output from '#lib/components/builder/Output.svelte';
  import { settled } from '#lib/components/builder/settled.svelte.ts';
  import SubjectField, { TEXT } from '#lib/components/builder/SubjectField.svelte';
  import Seo from '#lib/components/Seo.svelte';
  import Toggle from '#lib/components/Toggle.svelte';
  import { badgeQuery, badgeUrl, BLUE, defaultLabel, LABEL_GREY, readBadge } from '#lib/badges.ts';
  import { SHOWS, STYLES, type Kind, type Show, type Source, type Style } from '#lib/badges.ts';
  import { pathOf, split, subject } from '#lib/names.ts';

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

  const query = page.url.searchParams;
  const start = split(query.get('for') ?? '');
  const startKind: Kind = start.repo ? 'repo' : 'account';

  let owner = $state(start.owner);
  let repo = $state(start.repo ?? '');
  let kind = $state(startKind);
  const options = $state(readBadge(query, startKind));
  let source = $state<Source>(query.get('source') === 'shields' ? 'shields' : 'ours');

  const chosen = $derived(subject(owner, kind === 'repo' ? repo : undefined));
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

  const preview = settled(
    () => image,
    () => address
  );

  function choose(next: Kind) {
    if (!SHOWS[next].includes(options.show)) options.show = 'rank';
    kind = next;
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

<Builder
  title="Badge builder"
  intro="Create an embeddable badge for your README, showing the stars or rank of your GitHub account or repository. Everything can be customised :)"
>
  <section aria-labelledby="for">
    <h2 id="for">Badge for</h2>
    <SubjectField label="Badge for" bind:kind={() => kind, choose} bind:owner bind:repo />
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

  {#snippet output()}
    <Output
      {image}
      preview={preview.current}
      alt={options.label?.trim() || defaultLabel(options.show)}
      target={chosen}
    />
  {/snippet}
</Builder>
