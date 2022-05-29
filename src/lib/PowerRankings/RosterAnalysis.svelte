<script>
  import Button, { Group, Label } from "@smui/button";
  import { gotoManager } from "$lib/utils/helper";
  import DataTable, { Head, Body, Row, Cell } from "@smui/data-table";
  import { Icon } from "@smui/icon-button";

  // export let roster, users, startersAndReserve, players, rosterPositions, division, expanded;
  export let rostersData, users, leagueData, records, playersInfo;

  const digestData = (passedPlayers, rawPlayers) => {
    let digestedRoster = {
      Team: [],
      QB: [],
      RB: [],
      WR: [],
      TE: [],
      DL: [],
      LB: [],
      DB: [],
    };

    console.log("rawPlayers", rawPlayers);
    if (!rawPlayers) return digestedRoster;

    for (const singlePlayer of rawPlayers) {
      let player = {};

      if (singlePlayer == "0") {
        continue;
      }

      const positions = passedPlayers[singlePlayer].positions;
      const age = passedPlayers[singlePlayer].age;

      digestedRoster.Team.push(age);
      if (positions.length === 2) {
        if (positions.includes("DL")) {
          digestedRoster.DL.push(age);
          continue;
        } else if (positions.includes("CB")) {
          digestedRoster.CB.push(age);
          continue;
        }
      }
      if (positions.includes("QB")) {
        digestedRoster.QB.push(age);
        continue;
      }
      if (positions.includes("RB")) {
        digestedRoster.RB.push(age);
        continue;
      }
      if (positions.includes("WR")) {
        digestedRoster.WR.push(age);
        continue;
      }
      if (positions.includes("TE")) {
        digestedRoster.TE.push(age);
        continue;
      }
      if (positions.includes("DL")) {
        digestedRoster.DL.push(age);
        continue;
      }
      if (positions.includes("LB")) {
        digestedRoster.LB.push(age);
        continue;
      }
      if (positions.includes("DB")) {
        digestedRoster.DB.push(age);
        continue;
      }

      digestedRoster.push(player);
    }

    return digestedRoster;
  };

  const getAverage = (numArray) => {
    const total = numArray.reduce((total, num) => {
      total += num;
      return total;
    }, 0);
    const average = total / numArray.length;
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
    const rosterData = digestData(playersInfo.players, roster.players);
    currentManagers[roster.roster_id] = {
      avatar,
      name,
      rosterId: roster.roster_id,
      rosterData,
    };
  }

  let dataType = "age";
  const changeData = (type) => {
    dataType = type;
  };

  const getAgeClass = (average) => {
    if (Math.round(average) <= 20) return "age age-20";
    if (Math.round(average) === 21) return "age age-21";
    if (Math.round(average) === 22) return "age age-22";
    if (Math.round(average) === 23) return "age age-23";
    if (Math.round(average) === 24) return "age age-24";
    if (Math.round(average) === 25) return "age age-25";
    if (Math.round(average) === 26) return "age age-26";
    if (Math.round(average) === 27) return "age age-27";
    if (Math.round(average) === 28) return "age age-28";
    if (Math.round(average) === 29) return "age age-29";
    if (Math.round(average) === 30) return "age age-30";
    if (Math.round(average) === 31) return "age age-31";
    if (Math.round(average) === 32) return "age age-32";
    if (Math.round(average) === 33) return "age age-33";
    if (Math.round(average) === 34) return "age age-34";
    if (Math.round(average) === 35) return "age age-35";
    if (Math.round(average) === 36) return "age age-36";
    if (Math.round(average) === 37) return "age age-37";
    if (Math.round(average) === 38) return "age age-38";
    if (Math.round(average) === 39) return "age age-39";
    if (Math.round(average) >= 40) return "age age-40";
  };
</script>

<div class="team">
  <h6>Roster analysis</h6>
  <div class="managerNav upper">
    <Group variant="outlined">
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
  <DataTable class="teamInner" table$aria-label="Team Name">
    <Head>
      <Row>
        <Cell class="header">Manager</Cell>
        <Cell class="header">Team</Cell>
        <Cell class="header">QB</Cell>
        <Cell class="header">RB</Cell>
        <Cell class="header">WR</Cell>
        <Cell class="header">TE</Cell>
        <Cell class="header">DL</Cell>
        <Cell class="header">LB</Cell>
        <Cell class="header">DB</Cell>
      </Row>
    </Head>
    <Body>
      {#each Object.values(currentManagers) as manager, ix}
        <Row class="interactive">
          <Cell>
            <img class="avatar" alt="avatar" src={manager.avatar} />
            {manager.name}
          </Cell>
          <Cell>
            {#if dataType == "age"}
              <div class={getAgeClass(getAverage(manager.rosterData.Team))}>
                {getAverage(manager.rosterData.Team).toFixed(2)}
              </div>
            {:else}
              <div class={getAgeClass(getAverage(manager.rosterData.Team))}>
                {manager.rosterData.Team.length}
              </div>
            {/if}
          </Cell>
          <Cell>
            {#if dataType == "age"}
              <div class={getAgeClass(getAverage(manager.rosterData.QB))}>
                {getAverage(manager.rosterData.QB).toFixed(2)}
              </div>
            {:else}
              {manager.rosterData.QB.length}
            {/if}
          </Cell>
          <Cell>
            {#if dataType == "age"}
              <div class={getAgeClass(getAverage(manager.rosterData.RB))}>
                {getAverage(manager.rosterData.RB).toFixed(2)}
              </div>
            {:else}
              {manager.rosterData.RB.length}
            {/if}
          </Cell>
          <Cell>
            {#if dataType == "age"}
              <div class={getAgeClass(getAverage(manager.rosterData.WR))}>
                {getAverage(manager.rosterData.WR).toFixed(2)}
              </div>
            {:else}
              {manager.rosterData.WR.length}
            {/if}
          </Cell>
          <Cell>
            {#if dataType == "age"}
              <div class={getAgeClass(getAverage(manager.rosterData.TE))}>
                {getAverage(manager.rosterData.TE).toFixed(2)}
              </div>
            {:else}
              {manager.rosterData.TE.length}
            {/if}
          </Cell>
          <Cell>
            {#if dataType == "age"}
              <div class={getAgeClass(getAverage(manager.rosterData.DL))}>
                {getAverage(manager.rosterData.DL).toFixed(2)}
              </div>
            {:else}
              {manager.rosterData.DL.length}
            {/if}
          </Cell>
          <Cell>
            {#if dataType == "age"}
              <div class={getAgeClass(getAverage(manager.rosterData.LB))}>
                {getAverage(manager.rosterData.LB).toFixed(2)}
              </div>
            {:else}
              {manager.rosterData.LB.length}
            {/if}
          </Cell>
          <Cell>
            {#if dataType == "age"}
              <div class={getAgeClass(getAverage(manager.rosterData.DB))}>
                {getAverage(manager.rosterData.DB).toFixed(2)}
              </div>
            {:else}
              {manager.rosterData.DB.length}
            {/if}
          </Cell>
        </Row>
      {/each}
    </Body>
  </DataTable>
</div>

<style>
  .age {
    padding: 1px 2px;
    text-align: center;
    border-radius: 3px;
    color: black;
    font-weight: bold;
  }
  .age-20 {
    /* background-color: rgb(87, 187, 138); */
    background-color: var(--age20);
  }
  .age-21 {
    /* background-color: rgb(103, 189, 135); */
    background-color: var(--age21);
  }
  .age-22 {
    /* background-color: rgb(120, 192, 131); */
    background-color: var(--age22);
  }
  .age-23 {
    /* background-color: rgb(137, 195, 128); */
    background-color: var(--age23);
  }
  .age-24 {
    /* background-color: rgb(154, 197, 124); */
    background-color: var(--age24);
  }
  .age-25 {
    /* background-color: rgb(171, 200, 120); */
    background-color: var(--age25);
  }
  .age-26 {
    /* background-color: rgb(187, 203, 117); */
    background-color: var(--age26);
  }
  .age-27 {
    /* background-color: rgb(204, 205, 113); */
    background-color: var(--age27);
  }
  .age-28 {
    /* background-color: rgb(221, 208, 110); */
    background-color: var(--age28);
  }
  .age-29 {
    /* background-color: rgb(238, 211, 106); */
    background-color: var(--age29);
  }
  .age-30 {
    /* background-color: rgb(255, 214, 102); */
    background-color: var(--age30);
  }
  .age-31 {
    /* background-color: rgb(253, 205, 103); */
    background-color: var(--age31);
  }
  .age-32 {
    /* background-color: rgb(251, 197, 104); */
    background-color: var(--age32);
  }
  .age-33 {
    /* background-color: rgb(248, 187, 105); */
    background-color: var(--age33);
  }
  .age-34 {
    /* background-color: rgb(246, 179, 107); */
    background-color: var(--age34);
  }
  .age-35 {
    /* background-color: rgb(243, 169, 108); */
    background-color: var(--age35);
  }
  .age-36 {
    /* background-color: rgb(240, 160, 109); */
    background-color: var(--age36);
  }
  .age-37 {
    /* background-color: rgb(238, 152, 111); */
    background-color: var(--age37);
  }
  .age-38 {
    /* background-color: rgb(235, 142, 112); */
    background-color: var(--age38);
  }
  .age-39 {
    /* background-color: rgb(233, 134, 113); */
    background-color: var(--age39);
  }
  .age-40 {
    /* background-color: rgb(230, 124, 115); */
    background-color: var(--age40);
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
