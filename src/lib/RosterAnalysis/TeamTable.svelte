<script>
  import { gotoManager } from "$lib/utils/helper";
  import DataTable, { Head, Body, Row, Cell } from "@smui/data-table";

//   import "@carbon/styles/css/styles.css";
//   import "@carbon/charts/styles.css";

  export let currentManagers, dataType, colorScales;
</script>

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
              style={`background-color: ${colorScales.colorsTeam
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
              style={`background-color: ${colorScales.colorsOff
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
              style={`background-color: ${colorScales.colorsQB
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
              style={`background-color: ${colorScales.colorsRB
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
              style={`background-color: ${colorScales.colorsWR
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
              style={`background-color: ${colorScales.colorsTE
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
              style={`background-color: ${colorScales.colorsDef
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
              style={`background-color: ${colorScales.colorsDL
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
              style={`background-color: ${colorScales.colorsLB
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
              style={`background-color: ${colorScales.colorsDB
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

<style>
  :global(.teamInner) {
    box-shadow: 0px 3px 3px -2px var(--boxShadowOne),
      0px 3px 4px 0px var(--boxShadowTwo), 0px 1px 8px 0px var(--boxShadowThree);
    display: block;
    margin: 0 auto;
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
</style>
