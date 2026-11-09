<script lang="ts">
  import { month, number, short } from '#lib/format.ts';
  import Climb from '../profile/Climb.svelte';
  import Fact from '../profile/Fact.svelte';
  import Facts from '../profile/Facts.svelte';

  interface Props {
    repo: { stars: number; created_at: number | null };
    next?: { stars: number; rank: number };
    milestone?: { percent: number; stars: number };
    club?: { least: number; repos: number };
    yearly?: number;
  }

  const { repo, next, milestone, club, yearly }: Props = $props();
</script>

{#if next || milestone || club || yearly}
  <Facts>
    <Climb stars={repo.stars} {next} {milestone} />
    {#if club}
      <Fact label="Popular">
        {#if club.repos > 1}One of <strong>{number(club.repos)}</strong> repos{:else}The only repo{/if}
        with {short(club.least).toLowerCase()}+ stars
      </Fact>
    {/if}
    {#if yearly && repo.created_at}
      <Fact label="Yearly average">
        <strong>{number(yearly)}</strong> stars a year since {month(repo.created_at * 1000)}
      </Fact>
    {/if}
  </Facts>
{/if}
