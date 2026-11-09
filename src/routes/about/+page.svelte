<script lang="ts">
  import Seo from '#lib/components/Seo.svelte';

  const counting = Boolean(import.meta.env.PUBLIC_PLAUSIBLE_SCRIPT);
  const reporting = Boolean(import.meta.env.PUBLIC_SENTRY_DSN);
</script>

<Seo
  title="How the ranking works"
  description="How git-star-ranking counts GitHub stars, how often it updates, and what it keeps about you."
/>

<article class="about">
  <h1>How the ranking works</h1>

  <section aria-labelledby="counting">
    <h2 id="counting">What gets counted</h2>
    <p>
      An account's stars are the stars on every public repo it owns, added up. Forks don't count,
      and nor does anything you've only contributed to. For accounts with more than 1,000 repos we
      count the 1,000 most starred, which covers nearly all of it.
    </p>
    <p>
      Ties share a rank, so two accounts on the same count are both 7th and the next one is 9th.
      Users and organizations are ranked separately. The tables list the top 5,000 of each, 50 to a
      page, and every profile shows its rank and how near the top it sits, wherever that is.
    </p>
  </section>

  <section aria-labelledby="freshness">
    <h2 id="freshness">How fresh it is</h2>
    <p>
      We find accounts through GitHub's search, by looking for every repo with 50 or more stars,
      about once a week. Accounts with 1,000+ stars are recounted daily, 100+ weekly and the rest
      monthly. The rankings themselves are rebuilt every six hours, and each page says when its
      numbers were last updated.
    </p>
    <p>
      Not here yet? Sign in and visit your own page, and you're counted on the spot. Opening any
      profile that's more than a day old also moves it to the front of the queue.
    </p>
  </section>

  <section aria-labelledby="privacy">
    <h2 id="privacy">Privacy</h2>
    <p>
      Everything here is public data GitHub already shows. Signing in asks GitHub for no extra
      permissions: we use the token once to count your own public repos, then hand it straight back.
      It's never stored. Your session cookie only holds your GitHub id and login.
    </p>
    <p>
      Want off the list? Sign in, open your page and use "Remove me". That deletes your repos, name
      and follower count from our tables and stops us crawling you again. If you change your mind
      later,
      <a href="https://github.com/NotAFlightRisk/git-star-ranking/issues">open an issue</a>.
    </p>
    {#if counting}
      <p>Pages load a cookie-free visit counter from our own Plausible.</p>
    {/if}
    {#if reporting}
      <p>Crashes go to our own error tracker, with sign-in codes stripped out first.</p>
    {/if}
  </section>

  <section aria-labelledby="credit">
    <h2 id="credit">Where it came from</h2>
    <p>
      This is a rebuild of
      <a href="https://github.com/k0kubun/gitstar-ranking">gitstar-ranking</a>, which ran for years
      until it shut down in November 2026. Same idea and layout, new code. It's open source too, at
      <a href="https://github.com/NotAFlightRisk/git-star-ranking"
        >NotAFlightRisk/git-star-ranking</a
      >.
    </p>
  </section>
</article>

<style>
  .about {
    display: grid;
    gap: var(--space-6);
    max-width: var(--measure);

    h1 {
      font-size: var(--text-2xl);
      letter-spacing: -0.02em;
    }
  }

  section {
    display: grid;
    gap: var(--space-3);

    h2 {
      font-size: var(--text-xl);
    }
  }
</style>
