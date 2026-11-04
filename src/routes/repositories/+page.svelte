<script lang="ts">
  import BoardPage from '#lib/components/BoardPage.svelte';

  const { data } = $props();
</script>

<BoardPage {data} />
