<!--
  All custom homepage content, used in src/routes/+page.svelte (standingsData comes from src/routes/+page.js):
  weekly recap, then rest-of-season Power Rankings, then the insights (playoff projection + Team Breakdown).
  Roster Analysis lives at the top of the /rosters page.
-->
<script>
  import RecapPanel from "../Insights/RecapPanel.svelte";
  import PowerRankings from "../RayPowerRankings/index.svelte";
  import Insights from "../Insights/index.svelte";

  let { standingsData, leagueTeamManagersData } = $props();
</script>

<div class="rr-recapRankings">
  <div class="rr-recapCol">
    <RecapPanel {standingsData} {leagueTeamManagersData} />
  </div>
  <div class="rr-rankingsCol">
    <PowerRankings {leagueTeamManagersData} />
  </div>
</div>

<div>
  <br />
  <Insights {standingsData} {leagueTeamManagersData} />
</div>

<style>
  /* recap on top, Power Rankings below, at every screen size */
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
  .rr-rankingsCol {
    min-width: 0;
  }

  .rr-recapCol:empty,
  .rr-rankingsCol:empty {
    display: none;
  }
</style>
