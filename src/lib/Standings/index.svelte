<script>
  import { leagueName, round } from "$lib/utils/helper";
  import { getTeamFromTeamManagers } from "$lib/utils/helperFunctions/universalFunctions";
  import DataTable, { Head, Body, Row, Cell } from "@smui/data-table";
  import LinearProgress from "@smui/linear-progress";
  import { onMount } from "svelte";
  import Standing from "./Standing.svelte";
  import PositionAverages from "../PositionAverages/index.svelte";
  import { colorsGYR, getColorScale, getRanking } from "$lib/utils/helperFunctions/colorScale";
  import ColorScale from "color-scales";

  export let standingsData, leagueTeamManagersData;

  // Least important to most important (i.e. the most important [usually wins] goes last)
  // Edit this to match your leagues settings
  const sortOrder = [
    "fptsAgainst",
    "divisionTies",
    "divisionWins",
    "fpts",
    "ties",
    "wins",
  ];

  // Column order from left to right
  const columnOrder = [
    { name: "W", field: "wins" },
    { name: "T", field: "ties" },
    { name: "L", field: "losses" },
    { name: "Div W", field: "divisionWins" },
    { name: "Div T", field: "divisionTies" },
    { name: "Div L", field: "divisionLosses" },
    { name: "FPTS", field: "fpts" },
    { name: "FPTS Against", field: "fptsAgainst" },
    { name: "Potential FPTS", field: "potentialPoints" },
    { name: "Streak", field: "streak" },
  ];

  const jamesColumnOrder = [
    { name: "Total", field: "Team" },
    { name: "All Offense", field: "Off" },
    { name: "All Defense", field: "Def" },
    { name: "QB+Flex", field: "QB+Flex" },
    { name: "RB", field: "RB" },
    { name: "WR", field: "WR" },
    { name: "TE", field: "TE" },
    { name: "WRT", field: "WRT" },
    { name: "IDP", field: "IDP" },
    { name: "DL", field: "DL" },
    { name: "LB", field: "LB" },
    { name: "DB", field: "DB" },
  ];

  const rayColumnOrder = [
    { name: "Total", field: "Team" },
    { name: "All Offense", field: "Off" },
    { name: "All Defense", field: "Def" },
    { name: "QB", field: "QB" },
    { name: "RB", field: "RB" },
    { name: "WR", field: "WR" },
    { name: "TE", field: "TE" },
    { name: "DL", field: "DL" },
    { name: "LB", field: "LB" },
    { name: "DB", field: "DB" },
  ];

  let loading = true;
  let preseason = false;
  let standings, year, leagueTeamManagers;
  let jamesData, positionalData;
  let jamesColorScales, rayColorScales;
  let jamesRankings = {}, rayRankings = {};
  let week = 0;
  onMount(async () => {
    const asyncStandingsData = await standingsData;
    if (!asyncStandingsData) {
      loading = false;
      preseason = true;
      return;
    }
    const {
      standingsInfo,
      yearData,
      week: asyncWeek,
      jamesData: asyncJamesData,
      positionalData: asyncPositionalData,
    } = asyncStandingsData;
    leagueTeamManagers = await leagueTeamManagersData;
    year = yearData;

    let finalStandings = Object.keys(standingsInfo).map(
      (key) => standingsInfo[key]
    );

    for (const sortType of sortOrder) {
      if (!finalStandings[0][sortType] && finalStandings[0][sortType] != 0) {
        continue;
      }
      finalStandings = [...finalStandings].sort(
        (a, b) => b[sortType] - a[sortType]
      );
    }

    week = asyncWeek;
    jamesData = asyncJamesData;
    positionalData = asyncPositionalData;
    standings = finalStandings;
    loading = false;

    jamesColorScales = jamesColumnOrder
      .map(({ field }) => field)
      .reduce((mapping, position) => {
        mapping.averages[position] = getColorScale({
          key: position,
          originalMin: 100000,
          originalMax: 0,
          objects: Object.values(jamesData),
        });
        jamesRankings[position] = getRanking({
          objects: Object.values(jamesData),
          key: position,
        });
        mapping.ranking[position] = new ColorScale(1, 12, colorsGYR);

        return mapping;
      }, {averages: {}, ranking: {}});

    rayColorScales = rayColumnOrder
      .map(({ field }) => field)
      .reduce((mapping, position) => {
        mapping.averages[position] = getColorScale({
          key: position,
          originalMin: 100000,
          originalMax: 0,
          objects: Object.values(positionalData),
        });
        rayRankings[position] = getRanking({
          objects: Object.values(positionalData),
          key: position,
        });
        mapping.ranking[position] = new ColorScale(1, 12, colorsGYR);

        return mapping;
      }, {averages: {}, ranking: {}});
  });

  let innerWidth;
</script>

<svelte:window bind:innerWidth />

<h1>{year ?? ""} {leagueName} Standings</h1>

{#if loading}
  <!-- promise is pending -->
  <div class="loading">
    <p>Loading Standings...</p>
    <LinearProgress indeterminate />
  </div>
{:else if preseason}
  <div class="loading">
    <p>Preseason, No Standings Yet</p>
  </div>
{:else}
  <div class="standingsTable">
    <DataTable table$aria-label="League Standings">
      <Head>
        <!-- Team name  -->
        <Row>
          <Cell class="center">Team</Cell>
          {#each columnOrder as column}
            <Cell class="center wrappable">{column.name}</Cell>
          {/each}
        </Row>
      </Head>
      <Body>
        <!-- 	Standing	 -->
        {#each standings as standing}
          <Standing
            {columnOrder}
            {standing}
            {leagueTeamManagers}
            team={getTeamFromTeamManagers(
              leagueTeamManagers,
              standing.rosterID
            )}
          />
        {/each}
      </Body>
    </DataTable>
  </div>

  <div>
    <PositionAverages
      headerLabel="Per player position averages"
      {leagueTeamManagers}
      columnOrder={rayColumnOrder}
      averagesData={positionalData}
      rankings={rayRankings}
      colorScale={rayColorScales}
      {week}
    />

    <PositionAverages
      headerLabel="Per roster position averages"
      {leagueTeamManagers}
      columnOrder={jamesColumnOrder}
      averagesData={jamesData}
      rankings={jamesRankings}
      colorScale={jamesColorScales}
      {week}
    />
  </div>
{/if}

<style>
  .loading {
    display: block;
    width: 85%;
    max-width: 500px;
    margin: 80px auto;
  }

  :global(.center) {
    text-align: center;
  }

  :global(.wrappable) {
    white-space: normal;
    line-height: 1.2em;
  }

  h1 {
    font-size: 2.2em;
    line-height: 1.3em;
    margin: 1.5em 0 2em;
  }

  .standingsTable {
    max-width: 100%;
    overflow-x: scroll;
    margin: 0.5em 0 5em;
  }
</style>
