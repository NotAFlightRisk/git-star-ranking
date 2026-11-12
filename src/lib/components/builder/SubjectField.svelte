<script module lang="ts">
  /** A text input for names and labels, left as typed */
  export const TEXT = {
    type: 'text',
    autocomplete: 'off',
    autocapitalize: 'off',
    spellcheck: false
  } as const;
</script>

<script lang="ts">
  import { tick } from 'svelte';
  import type { Kind } from '#lib/badges.ts';
  import { LOGIN, REPO, split } from '#lib/names.ts';
  import Toggle from '../Toggle.svelte';

  interface Props {
    /** What the choice is for, like "Badge for" */
    label: string;
    kind: Kind;
    owner: string;
    repo: string;
  }

  let { label, kind = $bindable(), owner = $bindable(), repo = $bindable() }: Props = $props();

  const KINDS: { value: Kind; label: string }[] = [
    { value: 'account', label: 'User or org' },
    { value: 'repo', label: 'Repository' }
  ];
  const hint = $props.id();

  let repoField = $state<HTMLInputElement>();
  const badOwner = $derived(owner !== '' && !LOGIN.test(owner));
  const badRepo = $derived(kind === 'repo' && repo !== '' && !REPO.test(repo));

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
</script>

<Toggle {label} options={KINDS} bind:value={kind} />
<div class="names">
  <label class="field">
    <span>{kind === 'repo' ? 'Owner' : 'Username'}</span>
    <input
      {...TEXT}
      bind:value={() => owner, typeOwner}
      placeholder={kind === 'repo' ? 'facebook' : 'torvalds'}
      aria-invalid={badOwner}
      aria-describedby={badOwner ? hint : undefined}
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
        aria-describedby={badRepo ? hint : undefined}
      />
    </label>
  {/if}
</div>
{#if badOwner || badRepo}
  <p id={hint} class="hint">
    {badOwner ? "That isn't a GitHub username." : "That isn't a name GitHub allows."}
  </p>
{/if}

<style>
  .names {
    display: flex;
    align-items: end;
    gap: var(--space-2);
    width: min(100%, 30rem);

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
</style>
