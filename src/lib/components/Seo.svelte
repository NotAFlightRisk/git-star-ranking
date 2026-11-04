<script lang="ts">
  import { page } from '$app/state';

  const {
    title,
    description,
    path,
    schema,
    noindex = false
  }: {
    title: string;
    description: string;
    path?: string;
    schema?: object;
    noindex?: boolean;
  } = $props();

  const canonical = $derived(new URL(path ?? page.url.pathname, page.url.origin).href);
  const full = $derived(title === 'git-star-ranking' ? title : `${title} | git-star-ranking`);
  // closing tags in a repo description must not end the script early
  const json = $derived(schema && JSON.stringify(schema).replaceAll('<', '\\u003c'));
</script>

<svelte:head>
  <title>{full}</title>
  <meta name="description" content={description} />
  <link rel="canonical" href={canonical} />
  <meta property="og:title" content={full} />
  <meta property="og:description" content={description} />
  <meta property="og:url" content={canonical} />
  {#if noindex}<meta name="robots" content="noindex" />{/if}
  {#if json}
    {@html `<script type="application/ld+json">${json}</script>`}
  {/if}
</svelte:head>
