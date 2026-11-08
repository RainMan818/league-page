<!--
  Rest-of-season Power Rankings on the homepage (used in RayHome).
  Our own loader, so the upstream src/lib/PowerRankings/ files can stay untouched.
-->
<script>
  import { loadLeagueBasics } from "../../utils/leagueContext.js";
  import Loading from "../Shared/Loading.svelte";
  import PowerRankingsDisplay from "./PowerRankingsDisplay.svelte";

  let { leagueTeamManagersData = undefined } = $props();

  const basics = loadLeagueBasics({ leagueTeamManagersData });
</script>

{#await basics}
  <Loading message="Calculating power rankings..." />
{:then { nflState, rostersData, managers, leagueData, playersInfo }}
  {#if leagueData.status != "pre_draft" && leagueData.status != "complete"}
    <PowerRankingsDisplay {nflState} {rostersData} leagueTeamManagers={managers} {leagueData} {playersInfo} />
  {/if}
{:catch error}
  <Loading message="Something went wrong: {error.message}" progress={false} />
{/await}
