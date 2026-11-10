<!--
  All custom homepage content, used in src/routes/+page.svelte (standingsData comes from src/routes/+page.js):
  weekly recap and season awards, then rest-of-season Power Rankings, then the insights
  (playoff projection + Team Breakdown). Roster Analysis lives at the top of the /rosters page.

  When things show (seasonPhase in utils/seasonData.js):
   - regular season: weekly recap only
   - playoffs (regular season fully scored): weekly recap (now with playoff weeks), then regular-season awards
   - championship decided: awards first (post-season + regular season), recap below until NFL week 18 ends
   - after that: awards only
-->
<script>
  import { onMount } from "svelte";
  import RecapPanel from "../Insights/RecapPanel.svelte";
  import PowerRankings from "../RayPowerRankings/index.svelte";
  import Insights from "../Insights/index.svelte";
  import HomeAwards from "../SeasonAwards/HomeAwards.svelte";
  import { loadLeagueBasics } from "../../utils/leagueContext.js";
  import { seasonPhase } from "../../utils/seasonData.js";

  let { standingsData, leagueTeamManagersData } = $props();

  // until league settings load, show the recap (its own loader shows progress)
  let phase = $state({ regularDone: false, showRecap: true });
  let postReady = $state(false);

  onMount(async () => {
    try {
      const { leagueData, nflState } = await loadLeagueBasics({ leagueTeamManagersData });
      phase = seasonPhase(leagueData, nflState);
    } catch (err) {
      console.error(err);
    }
  });
</script>

{#snippet recap()}
  {#if phase.showRecap}
    <div class="rr-recapCol">
      <RecapPanel {standingsData} {leagueTeamManagersData} />
    </div>
  {/if}
{/snippet}

<div class="rr-recapRankings">
  {#if phase.regularDone}
    {#if !postReady}{@render recap()}{/if}
    <div class="rr-awardsCol">
      <HomeAwards {standingsData} {leagueTeamManagersData} bind:postReady />
    </div>
    {#if postReady}{@render recap()}{/if}
  {:else}
    {@render recap()}
  {/if}
  <div class="rr-rankingsCol">
    <PowerRankings {leagueTeamManagersData} />
  </div>
</div>

<div>
  <br />
  <Insights {standingsData} {leagueTeamManagersData} />
</div>

<style>
  /* recap / awards on top, Power Rankings below, at every screen size */
  .rr-recapRankings {
    display: flex;
    flex-direction: column;
    gap: 48px;
    max-width: 1100px;
    margin: 0 auto;
    padding: 0 16px;
    box-sizing: border-box;
  }

  .rr-recapCol,
  .rr-awardsCol,
  .rr-rankingsCol {
    min-width: 0;
  }

  .rr-recapCol:empty,
  .rr-rankingsCol:empty {
    display: none;
  }
</style>
