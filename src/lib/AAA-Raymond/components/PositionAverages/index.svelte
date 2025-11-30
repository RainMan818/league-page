<script>
  import { leagueName, round } from "$lib/utils/helper";
  import { getTeamFromTeamManagers } from "$lib/utils/helperFunctions/universalFunctions";
  import DataTable, { Head, Body, Row, Cell } from "@smui/data-table";
  import LinearProgress from "@smui/linear-progress";
  import { onMount } from "svelte";
  import PositionAverages from "./PositionAverages.svelte";
  import Button, { Group, Label } from "@smui/button";

  export let averagesData, rankings, week, columnOrder, headerLabel, colorScale;

  let dataType = "averages"; // "ranking"
  const changeData = (type) => {
    dataType = type;
  };

  let loading = true;
  let preseason = false;
  let averages, year, leagueTeamManagers;
  let formattedRankings;
  onMount(async () => {
    let finalAverages = Object.keys(averagesData).map(
      (key) => averagesData[key]
    );

    formattedRankings = Object.keys(averagesData).reduce((map, teamName, i) => {
      map[i] = Object.entries(rankings).reduce((posMap, [position, arr]) => {
        posMap[position] = arr[i];
        return posMap;
      }, {});
      return map;
    }, []);

    averages = finalAverages;
    loading = false;
  });

  let innerWidth;
</script>

<svelte:window bind:innerWidth />

<h1>{headerLabel}</h1>
<div>Last updated week: {week - 1}</div>

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
    <div>
      <Group variant="outlined" class="vertical-align">
        {#if dataType == "averages"}
          <Button
            disabled
            class="selectionButtons"
            onclick={() => changeData("averages")}
            variant="outlined"
          >
            <Label>averages</Label>
          </Button>
        {:else}
          <Button
            class="selectionButtons"
            onclick={() => changeData("averages")}
            variant="outlined"
          >
            <Label>averages</Label>
          </Button>
        {/if}
        {#if dataType == "ranking"}
          <Button
            disabled
            class="selectionButtons"
            onclick={() => changeData("ranking")}
            variant="outlined"
          >
            <Label>ranking</Label>
          </Button>
        {:else}
          <Button
            class="selectionButtons"
            onclick={() => changeData("ranking")}
            variant="outlined"
          >
            <Label>ranking</Label>
          </Button>
        {/if}
      </Group>
    </div>
    <DataTable table$aria-label="League Standings">
      <Head>
        <Row>
          <Cell class="center">Team</Cell>
          {#each columnOrder as column}
            <Cell class="center wrappable">{column.name}</Cell>
          {/each}
        </Row>
      </Head>
      <Body>
        {#each averages as standing, i}
          <PositionAverages
            {columnOrder}
            colorScale={colorScale[dataType]}
            standing={dataType == "averages" ? standing : formattedRankings[i]}
            {leagueTeamManagers}
            team={Object.keys(averagesData)[i]}
          />
        {/each}
      </Body>
    </DataTable>
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
  }

  .standingsTable {
    max-width: 100%;
    overflow-x: scroll;
    margin: 0.5em 0 5em;
  }
</style>
