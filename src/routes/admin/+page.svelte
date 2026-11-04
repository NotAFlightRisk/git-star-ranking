<script lang="ts">
  import Seo from '#lib/components/Seo.svelte';
  import Updated from '#lib/components/Updated.svelte';
  import { date, number } from '#lib/format.ts';

  const { data, form } = $props();
  const percent = (share: number) => `${(share * 100).toFixed(share < 0.01 ? 2 : 1)}%`;
</script>

<Seo title="Admin" description="Crawl and budget numbers." noindex />

<h1>Admin</h1>

{#if form?.done}<p class="note" role="status">{form.done}</p>{/if}

<section aria-labelledby="budget">
  <h2 id="budget">This month against Workers Paid</h2>
  <table>
    <thead>
      <tr>
        <th scope="col">Metric</th>
        <th scope="col" class="numeric">Used</th>
        <th scope="col" class="numeric">Allowance</th>
        <th scope="col" class="numeric">Share</th>
        <th scope="col" class="numeric">At this pace</th>
      </tr>
    </thead>
    <tbody>
      {#each data.usage.metrics as row (row.metric)}
        <tr class:alert={row.share >= 0.7}>
          <th scope="row">{row.metric.replaceAll('_', ' ')}</th>
          <td class="numeric">{number(row.amount)}</td>
          <td class="numeric">{number(row.allowance)}</td>
          <td class="numeric">{percent(row.share)}</td>
          <td class="numeric">{percent(row.projected)}</td>
        </tr>
      {/each}
    </tbody>
  </table>
  <p class="note">
    Self-metered, so it runs a little under Cloudflare's own count. CPU time isn't measured here:
    check the Workers dashboard for that. GitHub calls this month:
    {data.usage.github.map((row) => `${row.metric.slice(7)} ${number(row.amount)}`).join(', ') ||
      'none yet'}.
  </p>
</section>

<section aria-labelledby="crawl">
  <h2 id="crawl">Crawl</h2>
  <ul>
    {#each data.counts as row (row.kind)}
      <li>
        {row.kind ? 'Organizations' : 'Users'}: {number(row.accounts)} known, {number(row.counted)} counted,
        {number(row.hidden)} removed
      </li>
    {/each}
    <li>Repositories tracked: {number(data.backlog.repos)}</li>
    <li>Accounts due a refresh: {number(data.backlog.due)}</li>
    <li>
      Sweep:
      {#if data.sweep && !data.sweep.done}
        running since {date(data.sweep.started)}, {number(data.progress?.left ?? 0)} slices left
      {:else if data.sweep?.done}
        last finished {date(data.sweep.done)}
      {:else}
        not started
      {/if}
    </li>
  </ul>
  <Updated at={data.meta?.at} label="Last snapshot" />
  <details>
    <summary>Token pool</summary>
    <pre>{JSON.stringify(data.pool, null, 2)}</pre>
  </details>
  <div class="actions">
    <form method="POST" action="?/snapshot">
      <button type="submit">Take a snapshot now</button>
    </form>
    <form method="POST" action="?/sweep"><button type="submit">Start a fresh sweep</button></form>
  </div>
</section>

<style>
  h1 {
    font-size: var(--text-2xl);
    margin-block-end: var(--space-5);
  }

  section {
    display: grid;
    gap: var(--space-3);
    margin-block-end: var(--space-6);

    h2 {
      font-size: var(--text-xl);
    }
  }

  table {
    border-collapse: collapse;
    font-size: var(--text-sm);
  }

  th,
  td {
    padding: var(--space-1) var(--space-3);
    border-block-end: 1px solid var(--border);
    text-align: start;
  }

  .alert {
    color: var(--danger);
    font-weight: 600;
  }

  .note {
    color: var(--text-muted);
    max-width: var(--measure);
  }

  pre {
    overflow-x: auto;
    font-size: var(--text-xs);
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);

    button {
      padding: var(--space-2) var(--space-4);
      font: inherit;
      font-size: var(--text-sm);
      color: var(--text);
      background: var(--surface-raised);
      border: 1px solid var(--border-strong);
      border-radius: var(--radius);
      cursor: pointer;

      &:hover {
        background: var(--surface-hover);
      }
    }
  }
</style>
