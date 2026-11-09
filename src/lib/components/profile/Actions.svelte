<script lang="ts">
  interface Props {
    login: string;
    self: boolean;
    queued?: boolean;
  }

  const { login, self, queued }: Props = $props();
</script>

<div class="actions">
  {#if self}
    <a class="button" href="/login?next=/{login}" data-sveltekit-reload>Refresh my stars</a>
  {:else}
    <form method="POST" action="?/refresh">
      <button class="button" type="submit">Ask for a refresh</button>
    </form>
    {#if queued !== undefined}
      <p role="status">
        {queued
          ? "Queued. It'll be done within ten minutes or so."
          : 'Counted recently, so it can wait.'}
      </p>
    {/if}
  {/if}
</div>

<style>
  .actions {
    display: grid;
    justify-items: start;
    gap: var(--space-2);
    max-width: 20rem;
  }

  p {
    color: var(--text-muted);
    font-size: var(--text-sm);
  }
</style>
