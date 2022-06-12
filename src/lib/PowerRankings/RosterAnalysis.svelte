<script>
  import Button, { Group, Label } from "@smui/button";
  import Chart from "svelte-frappe-charts";

  import TeamTable from "./TeamTable.svelte";
  import {getAgeData, getCountData, getColorScales, digestData} from "./utils";

  import "@carbon/styles/css/styles.css";
  import "@carbon/charts/styles.css";

  // export let roster, users, startersAndReserve, players, rosterPositions, division, expanded;
  export let rostersData, users, leagueData, records, playersInfo;

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
    Team: 100,
    Off: 100,
    Def: 100,
    QB: 100,
    RB: 100,
    WR: 100,
    TE: 100,
    DL: 100,
    LB: 100,
    DB: 100,
  };
  const rosters = rostersData.rosters;
  const currentManagers = {};
  for (const roster of rosters) {
    const user = users[roster.owner_id];
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

    minAges.Team = Math.min(...ageLists.Team);
    maxAges.Team = Math.max(...ageLists.Team);
    minAges.Off = Math.min(...ageLists.Off);
    maxAges.Off = Math.max(...ageLists.Off);
    minAges.Def = Math.min(...ageLists.Def);
    maxAges.Def = Math.max(...ageLists.Def);
    minAges.QB = Math.min(...ageLists.QB);
    maxAges.QB = Math.max(...ageLists.QB);
    minAges.RB = Math.min(...ageLists.RB);
    maxAges.RB = Math.max(...ageLists.RB);
    minAges.WR = Math.min(...ageLists.WR);
    maxAges.WR = Math.max(...ageLists.WR);
    minAges.TE = Math.min(...ageLists.TE);
    maxAges.TE = Math.max(...ageLists.TE);
    minAges.DL = Math.min(...ageLists.DL);
    maxAges.DL = Math.max(...ageLists.DL);
    minAges.LB = Math.min(...ageLists.LB);
    maxAges.LB = Math.max(...ageLists.LB);
    minAges.DB = Math.min(...ageLists.DB);
    maxAges.DB = Math.max(...ageLists.DB);
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
  <h4>Roster analysis</h4>
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

  h4 {
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
