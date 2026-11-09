<script lang="ts">
  import { page } from '$app/state';
  import { FORMATS, type Format } from '#lib/badges.ts';
  import { pathOf, type Subject } from '#lib/names.ts';
  import Copy from '../Copy.svelte';
  import Toggle from '../Toggle.svelte';

  interface Props {
    /** What the snippet embeds */
    image?: string;
    /** The same once typing settles, so it isn't fetched every keystroke */
    preview?: string;
    alt: string;
    /** The account or repo it's for, which it links to */
    target?: Subject;
  }

  const { image, preview, alt, target }: Props = $props();
  const link = $derived(target && `${page.url.origin}${pathOf(target)}`);
  const small = $derived(target?.repo ? ' (repos need 50+ stars)' : '');

  const formats = Object.entries(FORMATS).map(([value, { label }]) => ({
    value: value as Format,
    label
  }));
  let format = $state<Format>('markdown');
  let linked = $state(true);
  const code = $derived(image && FORMATS[format].write(image, alt, linked ? link : undefined));
</script>

<section class="output" aria-labelledby="output">
  <h2 id="output">Your badge</h2>
  <div class="previews">
    {#each ['light', 'dark'] as theme (theme)}
      <div class="preview {theme}">
        {#if preview}
          <img src={preview} alt="The badge on a {theme} background" />
        {:else}
          <span>Shows here</span>
        {/if}
      </div>
    {/each}
  </div>
  {#if code && target}
    <div class="controls">
      <Toggle label="Format" options={formats} bind:value={format} />
      <label class="checkbox">
        <input type="checkbox" bind:checked={linked} disabled={format === 'url'} />
        As link
      </label>
    </div>
    <Copy text={code} label="the badge's {FORMATS[format].label}" />
    <p class="hint">
      If it says "not found", we just haven't counted it yet{small}.
      {#if page.data.user}
        <a href="/{target.login}">Open its page</a> to fetch the data.
      {:else}
        <a href="/login?next=/{target.login}" data-sveltekit-reload>Sign in</a> to fetch the data.
      {/if}
    </p>
  {:else}
    <p class="hint">Enter an account or repo to get the code for it.</p>
  {/if}
</section>

<style>
  .output {
    position: sticky;
    inset-block-start: var(--space-4);
    display: grid;
    gap: var(--space-3);
    min-width: 0;
    padding: var(--space-5);
    background: var(--surface-raised);
    border: 1px solid var(--border);
    border-radius: var(--radius);
  }

  h2 {
    font-size: var(--text-lg);
  }

  .previews {
    display: grid;
    grid-template-columns: 1fr 1fr;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
  }

  /* the backgrounds GitHub shows a README on, whatever this site's theme */
  .preview {
    display: grid;
    place-items: center;
    min-height: 6rem;
    padding: var(--space-4) var(--space-3);
    font-size: var(--text-sm);
  }

  .light {
    background: #ffffff;
    color: #57606a;
  }

  .dark {
    background: #0d1117;
    color: #9198a1;
  }

  .controls {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2) var(--space-3);
    margin-block-start: var(--space-2);
  }
</style>
