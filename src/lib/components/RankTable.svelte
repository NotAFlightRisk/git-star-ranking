<script lang="ts">
  import { avatar, number } from '#lib/format.ts';
  import Star from './Star.svelte';

  interface Row {
    rank: number;
    id: number;
    login: string;
    stars: number;
    owner_id?: number;
    name?: string;
    language?: string | null;
    description?: string | null;
  }

  const {
    rows,
    caption,
    heading,
    brief = false,
    owned = false
  }: { rows: Row[]; caption: string; heading: string; brief?: boolean; owned?: boolean } = $props();
  const repos = $derived(rows.some((row) => row.name));
</script>

<table class="ranks" class:brief>
  <caption class="visually-hidden">{caption}</caption>
  <thead>
    <tr>
      <th scope="col" class="numeric">Rank</th>
      <th scope="col">{heading}</th>
      {#if repos && !brief}<th scope="col" class="language">Language</th>{/if}
      <th scope="col" class="numeric">Stars</th>
    </tr>
  </thead>
  <tbody>
    {#each rows as row (row.id)}
      <tr>
        <td class="numeric rank">{number(row.rank)}</td>
        <td class="who">
          <div class="name">
            <img
              src={avatar(row.owner_id ?? row.id)}
              alt=""
              width="24"
              height="24"
              loading="lazy"
            />
            <a href={row.name ? `/${row.login}/${row.name}` : `/${row.login}`}>
              {#if row.name && !owned}<span class="owner">{row.login}/</span><wbr
                />{/if}{row.name ?? row.login}
            </a>
          </div>
          {#if !brief && row.description}<p class="description">{row.description}</p>{/if}
        </td>
        {#if repos && !brief}<td class="language">{row.language ?? ''}</td>{/if}
        <td class="numeric"><Star /> {number(row.stars)}</td>
      </tr>
    {/each}
  </tbody>
</table>

<style>
  .ranks {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--text-sm);
  }

  th {
    padding: var(--space-2) var(--space-3);
    text-align: start;
    font-weight: 600;
    color: var(--text-muted);
    border-block-end: 1px solid var(--border-strong);
    white-space: nowrap;
  }

  td {
    padding: var(--space-2) var(--space-3);
    border-block-end: 1px solid var(--border);
    vertical-align: top;
  }

  th.numeric {
    text-align: end;
  }

  tbody tr {
    &:nth-child(even) {
      background: var(--surface-raised);
    }

    &:hover {
      background: var(--surface-hover);
    }
  }

  .rank {
    width: 1%;
    color: var(--text-muted);
  }

  .name {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-width: 0;

    img {
      width: var(--avatar);
      height: var(--avatar);
      border-radius: 50%;
      flex: none;
      background: var(--surface-hover);
    }

    a {
      font-weight: 600;
      overflow-wrap: break-word;
      text-decoration: none;

      &:hover {
        text-decoration: underline;
      }
    }
  }

  .owner {
    font-weight: 400;
  }

  .description {
    overflow-wrap: anywhere;
    margin-block-start: var(--space-1);
    margin-inline-start: calc(var(--avatar) + var(--space-2));
    color: var(--text-muted);
    max-width: var(--measure);
  }

  .language {
    color: var(--text-muted);
    white-space: nowrap;
  }

  .brief td {
    padding-block: var(--space-1);
  }

  @media (max-width: 40rem) {
    .language {
      display: none;
    }

    th,
    td {
      padding-inline: var(--space-2);
    }
  }
</style>
