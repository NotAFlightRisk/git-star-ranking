<script lang="ts">
  const { login, unsure = false }: { login: string; unsure?: boolean } = $props();
</script>

<section aria-labelledby="forget">
  <h2 id="forget">Remove me</h2>
  <p>
    This takes you off every ranking for good and stops us crawling your account. Your GitHub
    account isn't touched.
  </p>
  <form method="POST" action="?/forget">
    <label>
      <input type="checkbox" name="sure" required />
      Yes, remove {login}
    </label>
    <button class="button danger" type="submit">Remove me</button>
  </form>
  {#if unsure}<p role="alert">Tick the box first.</p>{/if}
</section>

<style>
  section {
    display: grid;
    gap: var(--space-3);
  }

  p {
    color: var(--text-muted);
    font-size: var(--text-sm);
  }

  form {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-3);
  }
</style>
