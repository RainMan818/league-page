<script>
  import { Row, Cell } from "@smui/data-table";

  export let columnOrder, team, standing, leagueTeamManagers, colorScale;
</script>

<Row class="contrastRow">
  <Cell class="">
    <div>{team}</div>
  </Cell>
  {#each columnOrder as column}
    <Cell class="center">
      <span
        class="color-scale"
        data-field={column.field}
        style={`background-color: ${colorScale ? colorScale[column.field]
          .getColor(standing[column.field])
          .toHexString() : ""}`}
      >
        {(standing[column.field] % 1) ? standing[column.field].toFixed(2) : standing[column.field]}
      </span>
    </Cell>
  {/each}
</Row>

<style>
  .clickable {
    cursor: pointer;
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

  .color-scale {
    display: inline-block;
    padding: 2px 3px;
    min-width: 40px;
    text-align: center;
    border-radius: 3px;
    color: black;
    font-weight: bold;
  }

  .team {
    text-align: center;
  }
</style>
