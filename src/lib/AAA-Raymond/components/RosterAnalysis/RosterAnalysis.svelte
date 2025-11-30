<script>
  import Button, { Group, Label } from "@smui/button";
  import { onMount } from "svelte";
  import Chart from "svelte-frappe-charts";
  import LinearProgress from "@smui/linear-progress";

  import TeamTable from "./TeamTable.svelte";
  import {
    getAgeData,
    getCountData,
    getColorScales,
    digestData,
  } from "./utils";

  export let rostersData,
    leagueData,
    playersInfo,
    nflState,
    leagueTeamManagers,
    standingsData;

  let loading = true;
  let playerScores = {};

  let maxAges = {
    Team: 0,
    Off: 0,
    Def: 0,
    QB: 0,
    RB: 0,
    WR: 0,
    TE: 0,
    DL: 0,
    LB: 0,
    DB: 0,
  };
  let minAges = {
    Team: 50,
    Off: 50,
    Def: 50,
    QB: 50,
    RB: 50,
    WR: 50,
    TE: 50,
    DL: 50,
    LB: 50,
    DB: 50,
  };
  let maxVariation = {
    Team: -1,
    Off: -1,
    Def: -1,
    QB: -1,
    RB: -1,
    WR: -1,
    TE: -1,
    DL: -1,
    LB: -1,
    DB: -1,
  };
  let minVariation = {
    Team: 50,
    Off: 50,
    Def: 50,
    QB: 50,
    RB: 50,
    WR: 50,
    TE: 50,
    DL: 50,
    LB: 50,
    DB: 50,
  };

  let dataType = "age";
  const changeData = (type) => {
    dataType = type;
  };

  let chartType = "table"; // "stack", "group"
  const changeChartType = (type) => {
    chartType = type;
  };

  // BAR CHART
  let currentManagers = {};
  let ageData;
  let countData;
  const chartColors = [
    "#ff2a6d",
    "#00ceb8",
    "#58a7ff",
    "#ffae58",
    "#ff795a",
    "#6d7df5",
    "#ff7cb6",
  ];

  onMount(async () => {
    const asyncStandingsData = await standingsData;
    const allMatchups = asyncStandingsData.matchups;

    allMatchups.forEach((matchups, weekNum) => {
      matchups.forEach((matchup) => {
        const playerPoints = matchup.players_points;
        Object.entries(playerPoints).forEach(([key, value]) => {
          if (!playerScores[key])
            playerScores[key] = new Array(allMatchups.length).fill(0);
          playerScores[key][weekNum] = value;
        });
      });
    });

    const rosters = Object.values(rostersData.rosters);

    for (const roster of rosters) {
      const user = leagueTeamManagers.users[roster.owner_id];
      const name = user.metadata.team_name
        ? user.metadata.team_name
        : user.display_name;
      const avatar = `https://sleepercdn.com/avatars/thumbs/${user.avatar}`;

      roster.ownerName = name;
      roster.ownerAvatar = avatar;
      const { averages, ageLists, cvAverages } = digestData(
        playersInfo.players,
        roster.players,
        playerScores
      );

      currentManagers[roster.roster_id] = {
        avatar,
        name,
        rosterId: roster.roster_id,
        averages,
        ageLists,
        cvAverages,
      };

      maxAges.Team = Math.max(averages.Team, maxAges.Team);
      minAges.Team = Math.min(averages.Team, minAges.Team);
      maxAges.Off = Math.max(averages.Off, maxAges.Off);
      minAges.Off = Math.min(averages.Off, minAges.Off);
      maxAges.Def = Math.max(averages.Def, maxAges.Def);
      minAges.Def = Math.min(averages.Def, minAges.Def);
      maxAges.QB = Math.max(averages.QB, maxAges.QB);
      minAges.QB = Math.min(averages.QB, minAges.QB);
      maxAges.RB = Math.max(averages.RB, maxAges.RB);
      minAges.RB = Math.min(averages.RB, minAges.RB);
      maxAges.WR = Math.max(averages.WR, maxAges.WR);
      minAges.WR = Math.min(averages.WR, minAges.WR);
      maxAges.TE = Math.max(averages.TE, maxAges.TE);
      minAges.TE = Math.min(averages.TE, minAges.TE);
      maxAges.DL = Math.max(averages.DL, maxAges.DL);
      minAges.DL = Math.min(averages.DL, minAges.DL);
      maxAges.LB = Math.max(averages.LB, maxAges.LB);
      minAges.LB = Math.min(averages.LB, minAges.LB);
      maxAges.DB = Math.max(averages.DB, maxAges.DB);
      minAges.DB = Math.min(averages.DB, minAges.DB);

      maxVariation.Team = Math.max(cvAverages.Team, maxVariation.Team);
      minVariation.Team = Math.min(cvAverages.Team, minVariation.Team);
      maxVariation.Off = Math.max(cvAverages.Off, maxVariation.Off);
      minVariation.Off = Math.min(cvAverages.Off, minVariation.Off);
      maxVariation.Def = Math.max(cvAverages.Def, maxVariation.Def);
      minVariation.Def = Math.min(cvAverages.Def, minVariation.Def);
      maxVariation.QB = Math.max(cvAverages.QB, maxVariation.QB);
      minVariation.QB = Math.min(cvAverages.QB, minVariation.QB);
      maxVariation.RB = Math.max(cvAverages.RB, maxVariation.RB);
      minVariation.RB = Math.min(cvAverages.RB, minVariation.RB);
      maxVariation.WR = Math.max(cvAverages.WR, maxVariation.WR);
      minVariation.WR = Math.min(cvAverages.WR, minVariation.WR);
      maxVariation.TE = Math.max(cvAverages.TE, maxVariation.TE);
      minVariation.TE = Math.min(cvAverages.TE, minVariation.TE);
      maxVariation.DL = Math.max(cvAverages.DL, maxVariation.DL);
      minVariation.DL = Math.min(cvAverages.DL, minVariation.DL);
      maxVariation.LB = Math.max(cvAverages.LB, maxVariation.LB);
      minVariation.LB = Math.min(cvAverages.LB, minVariation.LB);
      maxVariation.DB = Math.max(cvAverages.DB, maxVariation.DB);
      minVariation.DB = Math.min(cvAverages.DB, minVariation.DB);
    }

    const managerData = Object.values(currentManagers);
    ageData = getAgeData(managerData, rosters);
    countData = getCountData(managerData, rosters);

    loading = false;
  });
</script>

<div class="team">
  <h6>Roster analysis</h6>
  {#if loading}
    <!-- promise is pending -->
    <div class="loading">
      <p>Loading...</p>
      <LinearProgress indeterminate />
    </div>
  {:else}
    <div>
      <div class="float-left">
        <Group variant="outlined" class="vertical-align">
          {#if dataType == "age"}
            <Button
              disabled
              class="selectionButtons"
              onclick={() => changeData("age")}
              variant="outlined"
            >
              <Label>Age</Label>
            </Button>
          {:else}
            <Button
              class="selectionButtons"
              onclick={() => changeData("age")}
              variant="outlined"
            >
              <Label>Age</Label>
            </Button>
          {/if}
          {#if dataType == "count"}
            <Button
              disabled
              class="selectionButtons"
              onclick={() => changeData("count")}
              variant="outlined"
            >
              <Label>Count</Label>
            </Button>
          {:else}
            <Button
              class="selectionButtons"
              onclick={() => changeData("count")}
              variant="outlined"
            >
              <Label>Count</Label>
            </Button>
          {/if}
          <!-- {#if dataType == "stdDev"}
            <Button
              disabled
              class="selectionButtons"
              onclick={() => changeData("stdDev")}
              variant="outlined"
            >
              <Label>Std. Dev.</Label>
            </Button>
          {:else}
            <Button
              class="selectionButtons"
              onclick={() => changeData("stdDev")}
              variant="outlined"
            >
              <Label>Std. Dev.</Label>
            </Button>
          {/if} -->
        </Group>
      </div>
      <div class="float-right">
        <Group variant="outlined">
          {#if chartType == "table"}
            <Button
              disabled
              class="selectionButtons"
              onclick={() => changeChartType("table")}
              variant="outlined"
            >
              <Label>Table</Label>
            </Button>
          {:else}
            <Button
              class="selectionButtons"
              onclick={() => changeChartType("table")}
              variant="outlined"
            >
              <Label>Table</Label>
            </Button>
          {/if}
          {#if chartType == "stack"}
            <Button
              disabled
              class="selectionButtons"
              onclick={() => changeChartType("stack")}
              variant="outlined"
            >
              <Label>Stack chart</Label>
            </Button>
          {:else}
            <Button
              class="selectionButtons"
              onclick={() => changeChartType("stack")}
              variant="outlined"
            >
              <Label>Stack chart</Label>
            </Button>
          {/if}
          {#if chartType == "group"}
            <Button
              disabled
              class="selectionButtons"
              onclick={() => changeChartType("group")}
              variant="outlined"
            >
              <Label>Group chart</Label>
            </Button>
          {:else}
            <Button
              class="selectionButtons"
              onclick={() => changeChartType("group")}
              variant="outlined"
            >
              <Label>Group chart</Label>
            </Button>
          {/if}
        </Group>
      </div>
      <div class="age" style="clear: both;" />
    </div>
    {#if chartType == "table"}
      <div>
        <TeamTable
          colorScales={dataType === "age"
            ? getColorScales(minAges, maxAges)
            : getColorScales(minVariation, maxVariation)}
          {currentManagers}
          {dataType}
        />
      </div>
    {:else if chartType === "stack"}
      <Chart
        data={dataType == "age" ? ageData : countData}
        type="bar"
        barOptions={{ stacked: 1 }}
        height={500}
        colors={chartColors}
      />
    {:else}
      <Chart
        data={dataType == "age" ? ageData : countData}
        type="bar"
        barOptions={{ stacked: 0 }}
        height={500}
        colors={chartColors}
      />
    {/if}
  {/if}
</div>

<style>
  .float-left {
    float: left;
  }
  .float-right {
    float: right;
  }

  h6 {
    font-weight: 400;
    width: 100%;
    text-align: center;
    margin: 0 0 1em;
  }

  .team {
    margin: 4px 10px 10px;
  }

  :global(.clickable) {
    cursor: pointer;
  }

  :global(.r_1) {
    text-align: center;
    background-color: var(--r1);
  }

  :global(.r_2) {
    text-align: center;
    background-color: var(--r2);
  }

  :global(.r_3) {
    text-align: center;
    background-color: var(--r3);
  }

  @media (max-width: 500px) {
    .team {
      font-size: 0.9em;
    }
  }

  @media (max-width: 400px) {
    .team {
      margin: 4px auto 10px;
    }
  }

  :global(.icon) {
    vertical-align: middle;
  }

  :global(.interactive) {
    vertical-align: middle;
    cursor: pointer;
  }

  :global(.bench) {
    background-color: var(--ir);
  }
</style>
