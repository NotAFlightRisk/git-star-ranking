<script lang="ts">
  import { builderPath } from '#lib/badges.ts';
  import { pathOf, type Subject } from '#lib/names.ts';
  import { widgetsPath } from '#lib/widgets.ts';

  const { target }: { target: Subject } = $props();
</script>

<section aria-labelledby="embed">
  <h2 id="embed">Embed in a README</h2>
  <p>Show off {pathOf(target).slice(1)}'s stars with a badge or a widget, kept up to date.</p>
  <div class="ctas">
    <a class="button" href={builderPath(target)}>Make a badge</a>
    <a class="button" href={widgetsPath(target)}>Make a widget</a>
  </div>
</section>

<style>
  section {
    display: grid;
    gap: var(--space-3);
  }

  p {
    color: var(--text-muted);
    max-width: var(--measure);
  }

  .ctas {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
  }
</style>
