<!-- 
 Component used in "src\routes\+page.svelte" in combination with src\routes\+page.js to load the standingsData
 -->
<script>
  import Tankathon from "../../../Tankathon/index.svelte";
  import RosterAnalysis from "../../../RosterAnalysis/index.svelte";

  export let standingsData, leagueTeamManagersData;
</script>

<span>
  <br />
  <Tankathon {standingsData} {leagueTeamManagersData} />
  <br />
  <RosterAnalysis {standingsData} />
</span>

<style></style>
