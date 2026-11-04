<script lang="ts">
  import { avatar, number, tidy } from '#lib/format.ts';
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

  interface Props {
    rows: Row[];
    caption: string;
    heading: string;
    brief?: boolean;
    owned?: boolean;
    languages?: boolean;
    me?: number;
  }

  const {
    rows,
    caption,
    heading,
    brief = false,
    owned = false,
    languages = true,
    me
  }: Props = $props();
  const repos = $derived(rows.some((row) => row.name));
  const language = $derived(repos && languages && !brief);
</script>

<table class="ranks" class:brief class:owned>
  <caption class="visually-hidden">{caption}</caption>
  <thead>
    <tr>
      <th scope="col" class="numeric">Rank</th>
      <th scope="col">{heading}</th>
      {#if language}<th scope="col" class="language">Language</th>{/if}
      <th scope="col" class="numeric">Stars</th>
    </tr>
  </thead>
  <tbody>
    {#each rows as row (row.id)}
      {@const mine = !row.name && row.id === me}
      <tr class:mine aria-current={mine ? 'true' : undefined}>
        <td class="numeric rank">{number(row.rank)}</td>
        <td class="who">
          <div class="name">
            {#if !owned}
              <img
                src={avatar(row.owner_id ?? row.id)}
                alt=""
                width="24"
                height="24"
                loading="lazy"
              />
            {/if}
            <a
              href={row.name ? `/${row.login}/${row.name}` : `/${row.login}`}
              title={row.name && brief ? `${row.login}/${row.name}` : undefined}
            >
              {#if row.name && !owned && !brief}<span class="owner">{row.login}/</span><wbr
                />{/if}{row.name ?? row.login}
            </a>
          </div>
          {#if !brief && row.description}
            <p class="description">{tidy(row.description)}</p>
          {/if}
        </td>
        {#if language}<td class="language">{row.language ?? ''}</td>{/if}
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
    position: sticky;
    inset-block-start: 0;
    z-index: 1;
    padding: var(--space-2) var(--space-3);
    text-align: start;
    font-weight: 600;
    color: var(--text-muted);
    background: var(--surface);
    box-shadow: inset 0 -1px var(--border-strong);
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

    &.mine {
      background: var(--accent-soft);
    }
  }

  .rank {
    width: 1%;
    color: var(--text-muted);
  }

  .name {
    display: flex;
    align-items: flex-start;
    gap: var(--space-2);
    min-width: 0;

    img {
      width: var(--avatar);
      height: var(--avatar);
      margin-block: -0.125rem;
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

  .owned .description {
    margin-inline-start: 0;
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
