<!--
  A slim line under the header while a visitor is on their own league (Settings page switch, experimental), so
  nobody forgets the site isn't showing its usual league. Mounted in src/routes/+layout.svelte.
-->
<script>
  import { page } from "$app/state";
  import { leagueOverridden } from "$lib/utils/leagueInfo";
</script>

{#if leagueOverridden}
  <div class="rr-leagueBanner" role="status">
    <span class="material-icons" aria-hidden="true">swap_calls</span>
    <span class="rr-lbText">Viewing <b>{page.data.site?.name ?? "your league"}</b><span class="rr-lbTag"> · experimental</span></span>
    <a href="/settings">Settings</a>
  </div>
{/if}

<style>
  .rr-leagueBanner {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 7px 14px;
    font-size: 0.8rem;
    color: var(--or-toggle-text);
    background: var(--or-toggle-bg);
    border-bottom: 1px solid var(--or-cyan);
    text-align: center;
  }

  .rr-lbText {
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .rr-leagueBanner a {
    flex: none;
  }

  /* phones: one line; the Settings page carries the experimental warning */
  @media (max-width: 480px) {
    .rr-lbTag {
      display: none;
    }
  }

  .rr-leagueBanner b {
    color: var(--or-heading);
  }

  .rr-leagueBanner .material-icons {
    flex: none;
    font-size: 16px;
    color: var(--or-cyan);
  }

  .rr-leagueBanner a {
    color: var(--or-cyan);
    font-weight: 600;
  }
</style>
