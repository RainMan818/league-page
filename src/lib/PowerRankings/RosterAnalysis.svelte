<script>
  import Button, { Group, Label } from "@smui/button";
  import { gotoManager } from "$lib/utils/helper";
  import DataTable, { Head, Body, Row, Cell } from "@smui/data-table";
  import ColorScale from "color-scales";
  import Chart from "svelte-frappe-charts";

  import "@carbon/styles/css/styles.css";
  import "@carbon/charts/styles.css";

  // export let roster, users, startersAndReserve, players, rosterPositions, division, expanded;
  export let rostersData, users, leagueData, records, playersInfo;

  const max = {
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
  const min = {
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
  const digestData = (passedPlayers, rawPlayers) => {
    let ageLists = {
      Team: [],
      Off: [],
      Def: [],
      QB: [],
      RB: [],
      WR: [],
      TE: [],
      DL: [],
      LB: [],
      DB: [],
    };

    if (!rawPlayers) return ageLists;

    for (const singlePlayer of rawPlayers) {
      let player = {};

      if (singlePlayer == "0") {
        continue;
      }

      const positions = passedPlayers[singlePlayer].positions;
      const age = passedPlayers[singlePlayer].age || 22;

      ageLists.Team.push(age);
      if (positions.length === 2) {
        if (positions.includes("DL")) {
          ageLists.DL.push(age);
          ageLists.Def.push(age);
          continue;
        } else if (positions.includes("DB")) {
          ageLists.DB.push(age);
          ageLists.Def.push(age);
          continue;
        }
      }
      if (positions.includes("QB")) {
        ageLists.QB.push(age);
        ageLists.Off.push(age);
        continue;
      }
      if (positions.includes("RB")) {
        ageLists.RB.push(age);
        ageLists.Off.push(age);
        continue;
      }
      if (positions.includes("WR")) {
        ageLists.WR.push(age);
        ageLists.Off.push(age);
        continue;
      }
      if (positions.includes("TE")) {
        ageLists.TE.push(age);
        ageLists.Off.push(age);
        continue;
      }
      if (positions.includes("DL")) {
        ageLists.DL.push(age);
        ageLists.Off.push(age);
        continue;
      }
      if (positions.includes("LB")) {
        ageLists.LB.push(age);
        ageLists.Def.push(age);
        continue;
      }
      if (positions.includes("DB")) {
        ageLists.DB.push(age);
        ageLists.Def.push(age);
        continue;
      }

      ageLists.push(player);
    }

    const ageTeam = getAverage(ageLists.Team);
    const ageOff = getAverage(ageLists.Off);
    const ageDef = getAverage(ageLists.Def);
    const ageQB = getAverage(ageLists.QB);
    const ageRB = getAverage(ageLists.RB);
    const ageWR = getAverage(ageLists.WR);
    const ageTE = getAverage(ageLists.TE);
    const ageDL = getAverage(ageLists.DL);
    const ageLB = getAverage(ageLists.LB);
    const ageDB = getAverage(ageLists.DB);
    // Set "max"
    max.Team = Math.max(max.Team, ageTeam);
    max.Off = Math.max(max.Off, ageOff);
    max.Def = Math.max(max.Def, ageDef);
    max.QB = Math.max(max.QB, ageQB);
    max.RB = Math.max(max.RB, ageRB);
    max.WR = Math.max(max.WR, ageWR);
    max.TE = Math.max(max.TE, ageTE);
    max.DL = Math.max(max.DL, ageDL);
    max.LB = Math.max(max.LB, ageLB);
    max.DB = Math.max(max.DB, ageDB);
    // Set "min"
    min.Team = Math.min(min.Team, ageTeam);
    min.Off = Math.min(min.Off, ageOff);
    min.Def = Math.min(min.Def, ageDef);
    min.QB = Math.min(min.QB, ageQB);
    min.RB = Math.min(min.RB, ageRB);
    min.WR = Math.min(min.WR, ageWR);
    min.TE = Math.min(min.TE, ageTE);
    min.DL = Math.min(min.DL, ageDL);
    min.LB = Math.min(min.LB, ageLB);
    min.DB = Math.min(min.DB, ageDB);

    const averages = {
      Team: ageTeam,
      Off: ageOff,
      Def: ageDef,
      QB: ageQB,
      RB: ageRB,
      WR: ageWR,
      TE: ageTE,
      DL: ageDL,
      LB: ageLB,
      DB: ageDB,
    };

    return {
      averages,
      ageLists,
    };
  };

  const getAverage = (numArray) => {
    const ages = numArray.filter(Boolean);
    const total = ages.filter(Boolean).reduce((total, num) => {
      total += num;
      return total;
    }, 0);
    const average = total / ages.length;
    if (isNaN(average)) {
      return 0;
    }
    return average;
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
    const { averages, ageLists } = digestData(
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
  }

  const colors = ["#57bb8a", "#ffd666", "#e67c73"];
  const colorsTeam = new ColorScale(min.Team, max.Team, colors);
  const colorsOff = new ColorScale(min.Off, max.Off, colors);
  const colorsDef = new ColorScale(min.Def, max.Def, colors);
  const colorsQB = new ColorScale(min.QB, max.QB, colors);
  const colorsRB = new ColorScale(min.RB, max.RB, colors);
  const colorsWR = new ColorScale(min.WR, max.WR, colors);
  const colorsTE = new ColorScale(min.TE, max.TE, colors);
  const colorsDL = new ColorScale(min.DL, max.DL, colors);
  const colorsLB = new ColorScale(min.LB, max.LB, colors);
  const colorsDB = new ColorScale(min.DB, max.DB, colors);

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
  let ageData = {
    labels: rosters.map(({ ownerName }) => ownerName),
    datasets: [
      {
        name: "QB",
        values: managerData.map(
          (manager) => Math.round(manager.averages.QB * 100) / 100
        ),
      },
      {
        name: "RB",
        values: managerData.map(
          (manager) => Math.round(manager.averages.RB * 100) / 100
        ),
      },
      {
        name: "WR",
        values: managerData.map(
          (manager) => Math.round(manager.averages.WR * 100) / 100
        ),
      },
      {
        name: "TE",
        values: managerData.map(
          (manager) => Math.round(manager.averages.TE * 100) / 100
        ),
      },
      {
        name: "DL",
        values: managerData.map(
          (manager) => Math.round(manager.averages.DL * 100) / 100
        ),
      },
      {
        name: "LB",
        values: managerData.map(
          (manager) => Math.round(manager.averages.LB * 100) / 100
        ),
      },
      {
        name: "DB",
        values: managerData.map(
          (manager) => Math.round(manager.averages.DB * 100) / 100
        ),
      },
    ],
  };
  const countData = {
    labels: rosters.map(({ ownerName }) => ownerName),
    datasets: [
      {
        name: "QB",
        values: managerData.map((manager) => manager.ageLists.QB.length),
      },
      {
        name: "RB",
        values: managerData.map((manager) => manager.ageLists.RB.length),
      },
      {
        name: "WR",
        values: managerData.map((manager) => manager.ageLists.WR.length),
      },
      {
        name: "TE",
        values: managerData.map((manager) => manager.ageLists.TE.length),
      },
      {
        name: "DL",
        values: managerData.map((manager) => manager.ageLists.DL.length),
      },
      {
        name: "LB",
        values: managerData.map((manager) => manager.ageLists.LB.length),
      },
      {
        name: "DB",
        values: managerData.map((manager) => manager.ageLists.DB.length),
      },
    ],
  };

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
    <DataTable class="teamInner" table$aria-label="Team Name">
      <Head>
        <Row>
          <Cell class="header">Manager</Cell>
          <Cell class="header">Team</Cell>
          <Cell class="header">Off.</Cell>
          <Cell class="header">QB</Cell>
          <Cell class="header">RB</Cell>
          <Cell class="header">WR</Cell>
          <Cell class="header">TE</Cell>
          <Cell class="header">Def.</Cell>
          <Cell class="header">DL</Cell>
          <Cell class="header">LB</Cell>
          <Cell class="header">DB</Cell>
        </Row>
      </Head>
      <Body>
        {#each Object.values(currentManagers) as manager, ix}
          <Row>
            <Cell class="interactive" on:click={() => gotoManager(ix)}>
              <img class="avatar" alt="avatar" src={manager.avatar} />
              {manager.name}
            </Cell>
            <Cell class="age-cell">
              {#if dataType == "age"}
                <div
                  class="age"
                  style={`background-color: ${colorsTeam
                    .getColor(manager.averages.Team.toFixed(2))
                    .toHexString()}`}
                >
                  {manager.averages.Team.toFixed(2)}
                </div>
              {:else}
                <div
                  class="age"
                  style={`background-color: ${
                    manager.ageLists.Team.length === 48 ? "#57bb8a" : "#e67c73"
                  }`}
                >
                  {manager.ageLists.Team.length}
                </div>
              {/if}
            </Cell>
            <Cell class="age-cell">
              {#if dataType == "age"}
                <div
                  class="age"
                  style={`background-color: ${colorsOff
                    .getColor(manager.averages.Off.toFixed(2))
                    .toHexString()}`}
                >
                  {manager.averages.Off.toFixed(2)}
                </div>
              {:else}
                {manager.ageLists.Off.length}
              {/if}
            </Cell>
            <Cell class="age-cell">
              {#if dataType == "age"}
                <div
                  class="age"
                  style={`background-color: ${colorsQB
                    .getColor(manager.averages.QB.toFixed(2))
                    .toHexString()}`}
                >
                  {manager.averages.QB.toFixed(2)}
                </div>
              {:else}
                {manager.ageLists.QB.length}
              {/if}
            </Cell>
            <Cell class="age-cell">
              {#if dataType == "age"}
                <div
                  class="age"
                  style={`background-color: ${colorsRB
                    .getColor(manager.averages.RB.toFixed(2))
                    .toHexString()}`}
                >
                  {manager.averages.RB.toFixed(2)}
                </div>
              {:else}
                {manager.ageLists.RB.length}
              {/if}
            </Cell>
            <Cell class="age-cell">
              {#if dataType == "age"}
                <div
                  class="age"
                  style={`background-color: ${colorsWR
                    .getColor(manager.averages.WR.toFixed(2))
                    .toHexString()}`}
                >
                  {manager.averages.WR.toFixed(2)}
                </div>
              {:else}
                {manager.ageLists.WR.length}
              {/if}
            </Cell>
            <Cell class="age-cell">
              {#if dataType == "age"}
                <div
                  class="age"
                  style={`background-color: ${colorsTE
                    .getColor(manager.averages.TE.toFixed(2))
                    .toHexString()}`}
                >
                  {manager.averages.TE.toFixed(2)}
                </div>
              {:else}
                {manager.ageLists.TE.length}
              {/if}
            </Cell>
            <Cell class="age-cell">
              {#if dataType == "age"}
                <div
                  class="age"
                  style={`background-color: ${colorsDef
                    .getColor(manager.averages.Def.toFixed(2))
                    .toHexString()}`}
                >
                  {manager.averages.Def.toFixed(2)}
                </div>
              {:else}
                {manager.ageLists.Def.length}
              {/if}
            </Cell>
            <Cell class="age-cell">
              {#if dataType == "age"}
                <div
                  class="age"
                  style={`background-color: ${colorsDL
                    .getColor(manager.averages.DL.toFixed(2))
                    .toHexString()}`}
                >
                  {manager.averages.DL.toFixed(2)}
                </div>
              {:else}
                {manager.ageLists.DL.length}
              {/if}
            </Cell>
            <Cell class="age-cell">
              {#if dataType == "age"}
                <div
                  class="age"
                  style={`background-color: ${colorsLB
                    .getColor(manager.averages.LB.toFixed(2))
                    .toHexString()}`}
                >
                  {manager.averages.LB.toFixed(2)}
                </div>
              {:else}
                {manager.ageLists.LB.length}
              {/if}
            </Cell>
            <Cell class="age-cell">
              {#if dataType == "age"}
                <div
                  class="age"
                  style={`background-color: ${colorsDB
                    .getColor(manager.averages.DB.toFixed(2))
                    .toHexString()}`}
                >
                  {manager.averages.DB.toFixed(2)}
                </div>
              {:else}
                {manager.ageLists.DB.length}
              {/if}
            </Cell>
          </Row>
        {/each}
      </Body>
    </DataTable>
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

  :global(.age-cell) {
    vertical-align: middle;
  }

  .age {
    padding: 1px 2px;
    text-align: center;
    border-radius: 3px;
    color: black;
    font-weight: bold;
  }

  .avatar {
    vertical-align: middle;
    border-radius: 50%;
    height: 25px;
    width: 25px;
    margin: 0;
    border: 0.25px solid #777;
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

  :global(.teamInner) {
    box-shadow: 0px 3px 3px -2px var(--boxShadowOne),
      0px 3px 4px 0px var(--boxShadowTwo), 0px 1px 8px 0px var(--boxShadowThree);
    display: block;
    margin: 0 auto;
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
