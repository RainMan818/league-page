<script>
  import Button, { Group, Label } from "@smui/button";
  import BarChart from "$lib/BarChart.svelte";
  import {
    generateGraph,
    round,
    predictScores,
    loadPlayers,
  } from "$lib/utils/helper";
  export let nflState, rostersData, users, playersInfo, leagueData;

  const weeksInSeason = 18;
  const weeksRemaining = weeksInSeason - nflState.week;

  const rosters = rostersData.rosters;

  const currentManagers = {};

  for (const roster of rosters) {
    const user = users[roster.owner_id];
    currentManagers[roster.roster_id] = {
      avatar: `https://sleepercdn.com/avatars/thumbs/${user.avatar}`,
      name: user.metadata.team_name
        ? user.metadata.team_name
        : user.display_name,
    };
  }

  let validGraph = false;

  let baselineGraphs = [];
  let rawGraphs = [];
  let avgGraphs = [];

  const buildRankings = () => {
    const rosterPowers = [];
    let week = nflState.week;
    if (week == 0) {
      week = 1;
    }
    let max = 0;

    for (const roster of rosters) {
      // make sure the roster has players on it
      if (!roster.players) continue;
      // if at least one team has players, create the graph
      validGraph = true;

      const rosterPlayers = [];

      for (const rosterPlayer of roster.players) {
        rosterPlayers.push({
          name: players[rosterPlayer].ln,
          pos: players[rosterPlayer].pos,
          positions: players[rosterPlayer].positions,
          wi: players[rosterPlayer].wi,
        });
      }

      const rosterPower = {
        rosterID: roster.roster_id,
        manager: currentManagers[roster.roster_id],
        powerScore: 0,
        rawScore: 0,
        avgRawScore: 0,
        weeks: {},
      };
      for (let i = week; i < weeksInSeason; i++) {
        const { powerScore, powerScores } = predictScores(
          rosterPlayers,
          i,
          leagueData,
          currentManagers[roster.roster_id].name
        );
        rosterPower.powerScore += powerScore;
        rosterPower.rawScore += powerScore;
        rosterPower.weeks[i] = powerScores;
      }
      if (rosterPower.powerScore > max) {
        max = rosterPower.powerScore;
      }
      rosterPowers.push(rosterPower);
    }

    for (const rosterPower of rosterPowers) {
      rosterPower.powerScore = round((rosterPower.powerScore / max) * 100);
      rosterPower.avgRawScore = rosterPower.rawScore / weeksRemaining;
    }

    const powerGraph = {
      stats: rosterPowers,
      x: "Manager",
      y: "Power Ranking",
      stat: "",
      header: "Rest of Season Power Rankings",
      field: "powerScore",
      short: "ROS Power Ranking",
    };
    const rawGraph = {
      stats: rosterPowers,
      x: "Manager",
      y: "Power Ranking",
      stat: "",
      header: "Rest of Season Power Rankings",
      field: "rawScore",
      short: "ROS Power Ranking",
    };
    const avgGraph = {
      stats: rosterPowers,
      x: "Manager",
      y: "Power Ranking",
      stat: "",
      header: "Rest of Season Power Rankings",
      field: "avgRawScore",
      short: "ROS Power Ranking",
    };

    baselineGraphs = [generateGraph(powerGraph, 10)];
    rawGraphs = [generateGraph(rawGraph, 10, true)];
    avgGraphs = [generateGraph(avgGraph, 10, true)];
  };
  let players = playersInfo.players;
  buildRankings();

  const refreshPlayers = async () => {
    const newPlayersInfo = await loadPlayers(true);
    players = newPlayersInfo.players;
    buildRankings();
  };
  if (playersInfo.stale) {
    refreshPlayers();
  }

  let curGraph = 0;
  let el;
  let maxWidth = 620;
  const resize = (w) => {
    const left = el?.getBoundingClientRect()
      ? el?.getBoundingClientRect().left
      : 0;
    const right = el?.getBoundingClientRect()
      ? el?.getBoundingClientRect().right
      : 0;

    maxWidth = right - left;
  };
  let innerWidth;
  $: resize(innerWidth);

  let dataType = "scaled"; // "raw", "average"
  const changeDataType = (type) => {
    dataType = type;
  };
</script>

<svelte:window bind:innerWidth />

{#if validGraph}
  <div>
    <div class="float-left">
      <Group variant="outlined" class="vertical-align">
        {#if dataType == "scaled"}
          <Button
            disabled
            class="selectionButtons"
            on:click={() => changeDataType("scaled")}
            variant="outlined"
          >
            <Label>Scaled</Label>
          </Button>
        {:else}
          <Button
            class="selectionButtons"
            on:click={() => changeDataType("scaled")}
            variant="outlined"
          >
            <Label>Scaled</Label>
          </Button>
        {/if}
        {#if dataType == "raw"}
          <Button
            disabled
            class="selectionButtons"
            on:click={() => changeDataType("raw")}
            variant="outlined"
          >
            <Label>Raw</Label>
          </Button>
        {:else}
          <Button
            class="selectionButtons"
            on:click={() => changeDataType("raw")}
            variant="outlined"
          >
            <Label>Raw</Label>
          </Button>
        {/if}
        {#if dataType == "average"}
          <Button
            disabled
            class="selectionButtons"
            on:click={() => changeDataType("average")}
            variant="outlined"
          >
            <Label>Average</Label>
          </Button>
        {:else}
          <Button
            class="selectionButtons"
            on:click={() => changeDataType("average")}
            variant="outlined"
          >
            <Label>Average</Label>
          </Button>
        {/if}
      </Group>
    </div>
    <h6 class="float-right">
      Weeks remaining: {weeksRemaining}
    </h6>
    <div style="clear: both;" />
  </div>
  <div class="enclosure" bind:this={el}>
    {#if dataType == "scaled"}
      <BarChart {maxWidth} graphs={baselineGraphs} bind:curGraph />
    {:else if dataType == "raw"}
      <BarChart {maxWidth} graphs={rawGraphs} bind:curGraph />
    {:else}
      <BarChart {maxWidth} graphs={avgGraphs} bind:curGraph />
    {/if}
  </div>
{/if}

<style>
  .enclosure {
    display: block;
    position: relative;
    width: 100%;
  }

  .float-left {
    float: left;
  }
  .float-right {
    padding: 10px 20px;
    float: right;
  }
</style>
