<script>
  import { gotoManager } from "$lib/utils/helper";
  import { Row, Cell } from "@smui/data-table";

  export let columnOrder, team, standing, leagueTeamManagers, colorScales, index;
</script>

<Row class="contrastRow">
  <Cell class="">{index + 1}</Cell>
  <Cell class="">
    <div
      class="clickable team"
      onclick={() =>
        gotoManager({ leagueTeamManagers, rosterID: standing.rosterID })}
    >
      <img alt="team avatar" class="teamAvatar clickable" src={team.avatar} />
      <div>
        {team.name}
      </div>
    </div>
  </Cell>
  {#each columnOrder as column}
    {#if column.field == "potentialPoints"}
      <Cell class="center">
        <div
          class="potentialPoints"
          style={`background-color: ${colorScales[standing.rosterID]}`}
        >
          {standing[column.field]}
        </div>
      </Cell>
    {:else}
      <Cell class="center">{standing[column.field]}</Cell>
    {/if}
  {/each}
</Row>

<style>
  .clickable {
    cursor: pointer;
  }

  .potentialPoints {
    padding: 1px 2px;
    text-align: center;
    border-radius: 3px;
    color: black;
    font-weight: bold;
  }
  .teamAvatar {
    vertical-align: middle;
    border-radius: 50%;
    height: 40px;
    margin-right: 15px;
    border: 0.25px solid #777;
  }

  :global(.contrastRow) {
    background-color: var(--f8f8f8);
  }

  .team {
    text-align: center;
  }
</style>
