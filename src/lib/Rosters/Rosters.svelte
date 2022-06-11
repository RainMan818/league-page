<script>
  import { loadPlayers } from "$lib/utils/helper";
  import RosterSorter from "./RosterSorter.svelte";

  export let leagueData, rosterData, users, playersInfo;

  let players = playersInfo.players;

  const refreshPlayers = async () => {
    const newPlayersInfo = await loadPlayers(true);
    players = newPlayersInfo.players;
  };

  if (playersInfo.stale) {
    refreshPlayers();
  }
</script>

<div class="rosters">
  <RosterSorter
    rosters={rosterData.rosters}
    {players}
    {users}
    startersAndReserve={rosterData.startersAndReserve}
    {leagueData}
  />
</div>

<style>
  .rosters {
    position: relative;
    z-index: 1;
  }
</style>
