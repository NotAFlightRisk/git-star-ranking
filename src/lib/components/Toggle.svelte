<script lang="ts" generics="T extends string">
  interface Props {
    label: string;
    options: { value: T; label: string; title?: string }[];
    value: T;
    disabled?: boolean;
  }

  let { label, options, value = $bindable(), disabled = false }: Props = $props();
  const name = $props.id();
</script>

<fieldset {disabled}>
  <legend class="visually-hidden">{label}</legend>
  {#each options as option (option.value)}
    <label title={option.title}>
      <input type="radio" {name} value={option.value} bind:group={value} />
      {option.label}
    </label>
  {/each}
</fieldset>

<style>
  fieldset {
    display: inline-flex;
    flex-wrap: wrap;
    margin: 0;
    padding: 2px;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--surface-raised);
    font-size: var(--text-sm);
  }

  label {
    position: relative;
    padding: var(--space-1) var(--space-3);
    border-radius: calc(var(--radius) - 2px);
    color: var(--text-muted);
    white-space: nowrap;
    cursor: pointer;

    &:hover {
      color: var(--text);
    }

    &:has(:checked) {
      background: var(--surface);
      box-shadow: 0 0 0 1px var(--border-strong);
      color: var(--text);
      font-weight: 600;
    }

    &:has(:focus-visible) {
      outline: 2px solid var(--accent);
      outline-offset: 1px;
    }

    &:has(:disabled) {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }
</style>
