<script>
  import Button, { Group, Label } from "@smui/button";
  import Chart from "svelte-frappe-charts";

  import TeamTable from "./TeamTable.svelte";
  import {getAgeData, getCountData, getColorScales, digestData} from "./utils";

//   import "@carbon/styles/css/styles.css";
//   import "@carbon/charts/styles.css";

  export let rostersData, leagueData, playersInfo, nflState, leagueTeamManagers
  
    console.log("rostersData", rostersData);
    console.log("leagueData", leagueData);
    console.log("playersInfo", playersInfo);
    console.log("nflState", nflState);
    console.log("leagueTeamManagers", leagueTeamManagers);

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
    Team: 40,
    Off: 40,
    Def: 40,
    QB: 40,
    RB: 40,
    WR: 40,
    TE: 40,
    DL: 40,
    LB: 40,
    DB: 40,
  };
  const rosters = Object.values(rostersData.rosters);
  const currentManagers = {};
  for (const roster of rosters) {
    const user = leagueTeamManagers.users[roster.owner_id];
    const name = user.metadata.team_name
      ? user.metadata.team_name
      : user.display_name;
    const avatar = `https://sleepercdn.com/avatars/thumbs/${user.avatar}`;

    roster.ownerName = name;
    roster.ownerAvatar = avatar;
    const {averages, ageLists} = digestData(
      playersInfo.players,
      roster.players
    );

    currentManagers[roster.roster_id] = {
      avatar,
      name,
      rosterId: roster.roster_id,
      averages,
      ageLists,
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
  }

  let dataType = "age";
  const changeData = (type) => {
    dataType = type;
  };

  let chartType = "table"; // "stack", "group"
  const changeChartType = (type) => {
    chartType = type;
  };

  // BAR CHART
  const managerData = Object.values(currentManagers);
  const ageData = getAgeData(managerData, rosters);
  const countData = getCountData(managerData, rosters);
  const chartColors = [
    "#ff2a6d",
    "#00ceb8",
    "#58a7ff",
    "#ffae58",
    "#ff795a",
    "#6d7df5",
    "#ff7cb6",
  ];
</script>

<div class="team">
  <h6>Roster analysis</h6>
  <div>
    <div class="float-left">
      <Group variant="outlined" class="vertical-align">
        {#if dataType == "age"}
          <Button
            disabled
            class="selectionButtons"
            on:click={() => changeData("age")}
            variant="outlined"
          >
            <Label>Age</Label>
          </Button>
        {:else}
          <Button
            class="selectionButtons"
            on:click={() => changeData("age")}
            variant="outlined"
          >
            <Label>Age</Label>
          </Button>
        {/if}
        {#if dataType == "count"}
          <Button
            disabled
            class="selectionButtons"
            on:click={() => changeData("count")}
            variant="outlined"
          >
            <Label>Count</Label>
          </Button>
        {:else}
          <Button
            class="selectionButtons"
            on:click={() => changeData("count")}
            variant="outlined"
          >
            <Label>Count</Label>
          </Button>
        {/if}
      </Group>
    </div>
    <div class="float-right">
      <Group variant="outlined">
        {#if chartType == "table"}
          <Button
            disabled
            class="selectionButtons"
            on:click={() => changeChartType("table")}
            variant="outlined"
          >
            <Label>Table</Label>
          </Button>
        {:else}
          <Button
            class="selectionButtons"
            on:click={() => changeChartType("table")}
            variant="outlined"
          >
            <Label>Table</Label>
          </Button>
        {/if}
        {#if chartType == "stack"}
          <Button
            disabled
            class="selectionButtons"
            on:click={() => changeChartType("stack")}
            variant="outlined"
          >
            <Label>Stack chart</Label>
          </Button>
        {:else}
          <Button
            class="selectionButtons"
            on:click={() => changeChartType("stack")}
            variant="outlined"
          >
            <Label>Stack chart</Label>
          </Button>
        {/if}
        {#if chartType == "group"}
          <Button
            disabled
            class="selectionButtons"
            on:click={() => changeChartType("group")}
            variant="outlined"
          >
            <Label>Group chart</Label>
          </Button>
        {:else}
          <Button
            class="selectionButtons"
            on:click={() => changeChartType("group")}
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
            colorScales={getColorScales(minAges, maxAges)}
            currentManagers={currentManagers}
            dataType={dataType}
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
