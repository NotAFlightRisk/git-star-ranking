<script lang="ts">
  import { hex } from '#lib/badges.ts';

  interface Props {
    label: string;
    fallback: string;
    disabled?: boolean;
    value?: string;
  }

  let { label, fallback, disabled = false, value = $bindable() }: Props = $props();
</script>

<div class="colour">
  <label>
    <input
      type="color"
      value={hex(value ?? fallback)}
      {disabled}
      oninput={(event) => (value = event.currentTarget.value.slice(1))}
    />
    {label}
  </label>
  {#if value && !disabled}
    <button type="button" onclick={() => (value = undefined)}>
      Reset<span class="visually-hidden"> {label.toLowerCase()}</span>
    </button>
  {/if}
</div>

<style>
  .colour {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--text-sm);
  }

  label {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-weight: 600;

    &:has(:disabled) {
      color: var(--text-muted);
    }
  }

  input {
    width: 2rem;
    height: 2rem;
    padding: 2px;
    background: var(--surface);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius);
    cursor: pointer;

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  }

  button {
    padding: 0;
    font: inherit;
    color: var(--accent);
    background: none;
    border: 0;
    text-decoration: underline;
    text-underline-offset: 0.2em;
    cursor: pointer;

    &:hover {
      color: var(--accent-hover);
    }
  }
</style>
