<!-- One position-averages table on the /standings page (used twice by RayStandings), with an averages / ranking toggle. -->
<script>
  import DataTable, { Head, Body, Row, Cell } from "@smui/data-table";
  import Button, { Group, Label } from "@smui/button";
  import PositionAverages from "./PositionAverages.svelte";

  export let averagesData, rankings, week, columnOrder, headerLabel, colorScale, leagueTeamManagers;

  let dataType = "averages"; // "averages" | "ranking"

  $: rosterIDs = Object.keys(averagesData ?? {});
  $: averages = rosterIDs.map((key) => averagesData[key]);
  // per team: { [position]: rank }
  $: formattedRankings = rosterIDs.map((_, i) =>
    Object.entries(rankings ?? {}).reduce((posMap, [position, arr]) => {
      posMap[position] = arr[i];
      return posMap;
    }, {})
  );
</script>

<h1>{headerLabel}</h1>
<div>Last updated week: {week - 1}</div>

<div class="standingsTable">
  <div>
    <Group variant="outlined" class="vertical-align">
      {#each ["averages", "ranking"] as type}
        <Button
          disabled={dataType == type}
          class="selectionButtons"
          onclick={() => (dataType = type)}
          variant="outlined"
        >
          <Label>{type}</Label>
        </Button>
      {/each}
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
          colorScale={colorScale?.[dataType]}
          standing={dataType == "averages" ? standing : formattedRankings[i]}
          {leagueTeamManagers}
          rosterID={rosterIDs[i]}
        />
      {/each}
    </Body>
  </DataTable>
</div>

<style>
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
