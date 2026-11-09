<script lang="ts">
  const { text, label }: { text: string; label: string } = $props();

  let copied = $state(false);

  async function copy() {
    await navigator.clipboard.writeText(text);
    copied = true;
    setTimeout(() => (copied = false), 2000);
  }
</script>

<div class="copy">
  <code>{text}</code>
  <button type="button" onclick={copy} aria-label="Copy {label}">
    {copied ? 'Copied' : 'Copy'}
  </button>
  <span class="visually-hidden" role="status">{copied ? 'Copied' : ''}</span>
</div>

<style>
  .copy {
    display: flex;
    min-width: 0;
    background: var(--surface-raised);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
  }

  code {
    flex: 1;
    min-width: 0;
    padding: var(--space-2) var(--space-3);
    font-size: var(--text-xs);
    white-space: nowrap;
    overflow-x: auto;
    scrollbar-width: thin;
  }

  button {
    flex: none;
    min-width: 5.5em;
    padding: var(--space-1) var(--space-3);
    font: inherit;
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--text);
    background: var(--surface);
    border: 0;
    border-inline-start: 1px solid var(--border);
    cursor: pointer;

    &:hover {
      background: var(--surface-hover);
    }
  }
</style>
