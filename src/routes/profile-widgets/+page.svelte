<script lang="ts">
  import { page } from '$app/state';
  import Builder from '#lib/components/builder/Builder.svelte';
  import ColourField from '#lib/components/builder/ColourField.svelte';
  import Output from '#lib/components/builder/Output.svelte';
  import { settled } from '#lib/components/builder/settled.svelte.ts';
  import SubjectField from '#lib/components/builder/SubjectField.svelte';
  import Seo from '#lib/components/Seo.svelte';
  import Toggle from '#lib/components/Toggle.svelte';
  import { BLUE, pick, type Kind } from '#lib/badges.ts';
  import { pathOf, split, subject } from '#lib/names.ts';
  import { CLAIMS, LAYOUTS, RADIUS, readWidget, THEMES } from '#lib/widgets.ts';
  import { WIDGETS, WIDGETS_FOR, widgetQuery, widgetUrl } from '#lib/widgets.ts';
  import type { Claim, Layout, Theme, Widget } from '#lib/widgets.ts';

  interface Choice {
    label: string;
    title: string;
  }

  const NAMED: Record<Widget, Choice & { alt: string; hint: string }> = {
    rank: {
      label: 'Rank card',
      title: 'Where it ranks on GitHub by stars',
      alt: 'GitHub star rank',
      hint: 'Its rank by stars, with a few of its best facts beside it.'
    },
    headline: {
      label: 'Headline',
      title: 'The most impressive thing we can say about it',
      alt: 'GitHub stars headline',
      hint: "One line in big type: its rank, its place among a language's repos, or the club it's in. Auto picks the most impressive, and a choice it doesn't have yet falls back to that."
    },
    trophies: {
      label: 'Trophies',
      title: 'Trophies for its stars, top repo, rank and more',
      alt: 'GitHub star trophies',
      hint: "Trophies come for stars, a big repo, a high rank, a place on a language's board and a climb this week. Only those earned are shown."
    },
    'star-map': {
      label: 'Star map',
      title: 'Its repos, sized by stars',
      alt: 'GitHub star map',
      hint: 'Its repos as tiles sized by their stars and coloured by language. Needs two repos with 50+ stars.'
    },
    podium: {
      label: 'Podium',
      title: 'Its top three repos',
      alt: 'Top GitHub repos',
      hint: "Its three most starred repos, each with its best place, overall or among its language's repos. Needs two repos with 50+ stars."
    },
    languages: {
      label: 'Languages',
      title: 'Its best place in each language',
      alt: 'GitHub language ranks',
      hint: "Its best place among each language's repos, where it's in the top 1,000. Only the 30 biggest languages are ranked."
    }
  };
  const LAID: Record<Layout, Choice> = {
    card: { label: 'Card', title: 'The rank, with a few facts beside it' },
    strip: { label: 'Strip', title: 'One slim row, for the top of a README' }
  };
  const CLAIMED: Record<Claim, Choice> = {
    auto: { label: 'Auto', title: 'Whichever is most impressive' },
    rank: { label: 'Rank', title: 'Its place among all accounts or repos' },
    language: { label: 'Language', title: "Its place among a language's repos" },
    club: { label: 'Club', title: 'How few have as many stars, like one of 151 repos with 100k+' }
  };
  const THEMED: Record<Theme, Choice> = {
    auto: { label: 'Auto', title: "Follows the reader's light or dark mode" },
    light: { label: 'Light', title: 'Always light' },
    dark: { label: 'Dark', title: 'Always dark' }
  };
  const choices = <T extends string>(values: readonly T[], named: Record<T, Choice>) =>
    values.map((value) => ({ value, ...named[value] }));

  const query = page.url.searchParams;
  const start = split(query.get('for') ?? '');
  const startKind: Kind = start.repo ? 'repo' : 'account';

  let owner = $state(start.owner);
  let repo = $state(start.repo ?? '');
  let kind = $state(startKind);
  let widget = $state<Widget>(pick(query.get('widget'), WIDGETS_FOR[startKind]));
  const options = $state(readWidget(query));

  const chosen = $derived(subject(owner, kind === 'repo' ? repo : undefined));
  const image = $derived(chosen && widgetUrl(page.url.origin, chosen, widget, options));
  // auto follows the reader's theme, which a preview can't, so each background asks for its own
  const previews = $derived.by(() => {
    if (!chosen || options.theme !== 'auto' || options.bg) return image;
    const themed = (theme: Theme) =>
      widgetUrl(page.url.origin, chosen, widget, { ...options, theme });
    return { light: themed('light'), dark: themed('dark') };
  });
  const address = $derived(
    [
      chosen && `for=${pathOf(chosen).slice(1)}`,
      widget !== WIDGETS[0] && `widget=${widget}`,
      widgetQuery(widget, options).toString()
    ]
      .filter(Boolean)
      .join('&')
  );

  const preview = settled(
    () => previews,
    () => address
  );

  // a repo only has some of the widgets, so one it lacks goes back to the first
  function choose(next: Kind) {
    if (!WIDGETS_FOR[next].includes(widget)) widget = WIDGETS[0];
    kind = next;
  }
</script>

<Seo
  title="Profile widgets"
  description="Show off your GitHub stars in your README, with a rank card, headline, trophies, star map and more for your account or repo."
/>

<Builder
  title="Profile widgets"
  intro="Generate personalised, embeddable widgets for your GitHub README, ready to paste straight into your profile or project's Markdown."
>
  <section aria-labelledby="for">
    <h2 id="for">Widget for</h2>
    <SubjectField label="Widget for" bind:kind={() => kind, choose} bind:owner bind:repo />
  </section>

  <section aria-labelledby="widget">
    <h2 id="widget">Widget</h2>
    <Toggle label="Widget" options={choices(WIDGETS_FOR[kind], NAMED)} bind:value={widget} />
    {#if widget === 'rank'}
      <Toggle label="Layout" options={choices(LAYOUTS, LAID)} bind:value={options.layout} />
    {:else if widget === 'headline'}
      <Toggle label="Claim" options={choices(CLAIMS, CLAIMED)} bind:value={options.claim} />
    {/if}
    <p class="hint">{NAMED[widget].hint}</p>
  </section>

  <section aria-labelledby="look">
    <h2 id="look">Look</h2>
    <Toggle
      label="Theme"
      options={choices(THEMES, THEMED)}
      bind:value={options.theme}
      disabled={Boolean(options.bg)}
    />
    <div class="settings">
      <ColourField label="Accent" bind:value={options.accent} fallback={BLUE} />
      <ColourField label="Background" bind:value={options.bg} fallback="ffffff" />
      <label class="checkbox">
        <input type="checkbox" bind:checked={options.border} />
        Border
      </label>
      <label class="range">
        Corners
        <input type="range" min="0" max={RADIUS.most} bind:value={options.radius} />
        <output>{options.radius}px</output>
      </label>
    </div>
    {#if options.bg}
      <p class="hint">With a background of your own, the text picks colours to suit it.</p>
    {/if}
  </section>

  {#snippet output()}
    <Output
      noun="widget"
      {image}
      preview={preview.current}
      alt={NAMED[widget].alt}
      target={chosen}
      wide
      optionalLink={false}
    />
  {/snippet}
</Builder>

<style>
  .range {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--text-sm);
    font-weight: 600;

    input {
      width: 7rem;
      margin: 0;
    }

    output {
      min-width: 3ch;
      color: var(--text-muted);
      font-weight: 400;
      font-variant-numeric: tabular-nums;
    }
  }
</style>
