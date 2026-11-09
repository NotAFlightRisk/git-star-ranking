<script lang="ts">
  import Seo from '#lib/components/Seo.svelte';
  import Updated from '#lib/components/Updated.svelte';
  import { count, date, number, span } from '#lib/format.ts';

  const { data, form } = $props();
  const percent = (share: number) => `${(share * 100).toFixed(share < 0.01 ? 2 : 1)}%`;
  const ISSUES: Record<string, string> = {
    database: 'the database is filling up',
    snapshot: 'snapshots are late',
    crawl: 'the crawl is falling behind'
  };
  const issue = (name: string) =>
    ISSUES[name] ?? `${name.replaceAll('_', ' ')} is near its allowance`;
  const late = $derived(data.overdue ? data.now - data.overdue : 0);
  const waiting = $derived(late >= 60_000 ? `, the longest waiting ${span(late)} overdue` : '');
  const disk = $derived(data.usage.database);
  const until = (at: number | null) => (at ? span(at - data.now) : '–');
</script>

<Seo title="Admin" description="Crawl and budget numbers." noindex />

<h1>Admin</h1>

<p class="health" class:alert={data.problems.length > 0} role="status">
  {data.problems.length ? `Needs a look: ${data.problems.map(issue).join(', ')}.` : 'All clear.'}
</p>

{#if form?.done}<p class="note" role="status">{form.done}</p>{/if}

<section aria-labelledby="budget">
  <h2 id="budget">Cloud usage</h2>
  <table>
    <thead>
      <tr>
        <th scope="col">Metric</th>
        <th scope="col" class="numeric">Used</th>
        <th scope="col" class="numeric">Allowance</th>
        <th scope="col" class="numeric">Share</th>
        <th scope="col" class="numeric">At this pace</th>
        <th scope="col" class="numeric">Last month</th>
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
          <td class="numeric">{number(row.last)}</td>
        </tr>
      {/each}
    </tbody>
  </table>
  <p class="note" class:alert={disk.share >= 0.7}>
    Database: {(disk.bytes / 1e9).toFixed(2)} GB, {percent(disk.share)} of the 10 GB D1 allows.
  </p>
  <p class="note">
    GitHub calls this month:
    {data.usage.github.map((row) => `${row.metric.slice(7)} ${number(row.amount)}`).join(', ') ||
      'none yet'}.
  </p>
</section>

<section aria-labelledby="crawl">
  <h2 id="crawl">Crawl</h2>
  <ul>
    {#each data.counts as row (row.kind)}
      <li>
        {row.kind ? 'Organizations' : 'Users'}: {number(row.accounts)} known,
        {number(row.counted)} counted ({number(row.recent)} in the last day),
        {number(row.hidden)} removed, {number(row.missing)} not found on their last try
      </li>
    {/each}
    <li>Repositories tracked: {number(data.backlog.repos)}</li>
    <li>Accounts due a refresh: {number(data.backlog.due)}{waiting}</li>
    <li>Put off a day this month, as GitHub didn't return them: {number(data.usage.snoozed)}</li>
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
  <div class="actions">
    <form method="POST" action="?/snapshot">
      <button class="button" type="submit">Take a snapshot now</button>
    </form>
    <form method="POST" action="?/sweep">
      <button class="button" type="submit">Start a fresh sweep</button>
    </form>
  </div>
</section>

<section aria-labelledby="github">
  <h2 id="github">GitHub rate limits</h2>
  {#if data.pool.buckets.length}
    <table>
      <thead>
        <tr>
          <th scope="col">Resource</th>
          <th scope="col" class="numeric">Left</th>
          <th scope="col">Resets in</th>
          <th scope="col" class="numeric">This minute</th>
          <th scope="col">Blocked for</th>
        </tr>
      </thead>
      <tbody>
        {#each data.pool.buckets as row (row.resource)}
          <tr class:alert={row.blocked !== null}>
            <th scope="row">{row.resource}</th>
            <td class="numeric">{row.remaining === null ? '–' : number(row.remaining)}</td>
            <td>{until(row.reset)}</td>
            <td class="numeric">{number(row.minute)} of {number(row.perMinute)}</td>
            <td>{until(row.blocked)}</td>
          </tr>
        {/each}
      </tbody>
    </table>
    <p class="note">
      As GitHub last reported, with {count(data.pool.leases, 'lease')} open in the last minute.
    </p>
  {:else}
    <p class="note">No GitHub calls since the token pool last started.</p>
  {/if}
</section>

<style>
  h1 {
    font-size: var(--text-2xl);
    margin-block-end: var(--space-3);
  }

  .health {
    margin-block-end: var(--space-5);
    font-weight: 600;
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

  .note {
    color: var(--text-muted);
    max-width: var(--measure);
  }

  .alert {
    color: var(--danger);
    font-weight: 600;
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
  }
</style>
