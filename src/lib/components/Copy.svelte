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
  <pre><code>{text}</code></pre>
  <button type="button" onclick={copy} aria-label="Copy {label}">Copy</button>
  <span class="done" role="status">{copied ? 'Copied' : ''}</span>
</div>

<style>
  .copy {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-2) var(--space-3);
  }

  pre {
    flex: 1 1 20rem;
    min-width: 0;
    margin: 0;
    padding: var(--space-3);
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    background: var(--surface-raised);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    font-size: var(--text-xs);
  }

  button {
    padding: var(--space-1) var(--space-3);
    font: inherit;
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--text);
    background: var(--surface-raised);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius);
    cursor: pointer;

    &:hover {
      background: var(--surface-hover);
    }
  }

  .done {
    min-width: 4em;
    color: var(--text-muted);
    font-size: var(--text-sm);
  }
</style>
