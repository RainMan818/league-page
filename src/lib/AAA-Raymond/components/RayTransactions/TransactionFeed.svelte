<!--
  Trades & waivers grouped by day (option C). One card per day, one line per team:
  waivers show + added / − dropped players (and the FAAB bid); trades show each team ← what it received.
  Used by the template's TransactionsPage (Trades & Waivers page, manager pages) and by RecentMoves (homepage).
  compact = narrow layout for the homepage sidebar.
-->
<script>
  import { gotoManager } from "$lib/utils/helper";
  import { getTeamFromTeamManagers } from "$lib/utils/helperFunctions/universalFunctions";
  import { groupByDay, transactionSides } from "./transactionView.js";

  let { transactions = [], players = {}, leagueTeamManagers, compact = false } = $props();

  const team = (rosterID, season) => getTeamFromTeamManagers(leagueTeamManagers, rosterID, season) ?? { name: `Team ${rosterID}` };

  const groups = $derived(
    groupByDay(transactions).map((g) => ({
      ...g,
      countLabel: countLabel(g.items.map((i) => i.transaction)),
      rows: g.items.map(({ transaction: t, when }) => ({
        id: t.id,
        trade: t.type === "trade",
        time: when?.time ?? "",
        sides: transactionSides(t, players, (id) => team(id, t.season).name).map((s) => ({
          ...s,
          team: team(s.rosterID, t.season),
          season: t.season,
        })),
      })),
    }))
  );

  function countLabel(list) {
    const trades = list.filter((t) => t.type === "trade").length;
    const waivers = list.length - trades;
    return [trades ? `${trades} trade${trades === 1 ? "" : "s"}` : "", waivers ? `${waivers} waiver${waivers === 1 ? "" : "s"}` : ""]
      .filter(Boolean)
      .join(" · ");
  }

  const open = (side) => gotoManager({ year: side.season, leagueTeamManagers, rosterID: side.rosterID });
  const sign = { add: "+", drop: "−" };
</script>

{#snippet teamButton(s)}
  <button type="button" class="rr-team" onclick={() => open(s)} title={s.team.name}>
    {#if s.team.avatar}<img src={s.team.avatar} alt="" />{/if}
    <span class="rr-teamName">{s.team.name}</span>
  </button>
{/snippet}

{#snippet items(list)}
  <span class="rr-items">
    {#each list as it}
      <span class="rr-item rr-{it.kind}">
        {#if sign[it.kind]}<b class="rr-sign" aria-label={it.kind === "add" ? "Added" : "Dropped"}>{sign[it.kind]}</b>{/if}
        <span class="rr-itemName">{it.name}</span>
        {#if it.info}<span class="rr-itemInfo">{it.info}</span>{/if}
      </span>
    {/each}
  </span>
{/snippet}

<div class="rr-feed" class:rr-compact={compact}>
  {#each groups as g (g.key)}
    <section class="rr-day">
      <header class="rr-dayHead">
        <span class="rr-dayLabel">{g.label}</span>
        <span class="rr-dayCount">{g.countLabel}</span>
      </header>
      {#each g.rows as r (r.id)}
        <div class="rr-row">
          <span class="rr-when">
            <span class="rr-time">{r.time}</span>
            <span class="rr-kind" class:rr-kindTrade={r.trade}>{r.trade ? "Trade" : "Waiver"}</span>
          </span>
          <span class="rr-sides">
            {#each r.sides as s (s.rosterID)}
              <span class="rr-side">
                <span class="rr-who">
                  {@render teamButton(s)}
                  {#if s.bid}<span class="rr-bid">${s.bid}</span>{/if}
                </span>
                {#if r.trade}
                  <svg class="rr-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-label="receives"><path d="M19 12H5M11 6l-6 6 6 6"></path></svg>
                {/if}
                {#if s.items.length}
                  {@render items(s.items)}
                {:else}
                  <span class="rr-items rr-nothing">nothing</span>
                {/if}
              </span>
            {/each}
          </span>
        </div>
      {/each}
    </section>
  {/each}
</div>

<style>
  .rr-feed {
    display: flex;
    flex-direction: column;
    gap: 14px;
    text-align: left;
  }

  .rr-day {
    border: 1px solid var(--or-table-border, var(--ccc));
    border-radius: 12px;
    background: var(--fff);
    box-shadow: 0 4px 16px var(--or-table-shadow, transparent);
    overflow: hidden;
  }

  .rr-dayHead {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    padding: 7px 14px;
    background: var(--f8f8f8);
    border-bottom: 1px solid var(--or-table-border, var(--ccc));
  }

  .rr-dayLabel {
    font: 700 0.75em "Orbitron", sans-serif;
    letter-spacing: 0.08em;
    color: var(--or-tab-active, var(--or-pink));
  }

  .rr-dayCount {
    font-size: 0.7em;
    color: var(--or-muted, var(--g999));
  }

  .rr-row {
    display: grid;
    grid-template-columns: 66px minmax(0, 1fr);
    gap: 12px;
    padding: 8px 14px;
    border-bottom: 1px solid color-mix(in srgb, var(--or-table-border, #ccc) 50%, transparent);
  }

  .rr-row:last-child {
    border-bottom: 0;
  }

  .rr-when {
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding-top: 3px;
  }

  .rr-time {
    font-size: 0.7em;
    color: var(--or-muted, var(--g999));
    white-space: nowrap;
  }

  .rr-kind {
    font: 700 0.56em "Orbitron", sans-serif;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--or-cyan, #0b8a9a);
  }

  .rr-kind.rr-kindTrade {
    color: var(--or-tab-active, var(--or-pink));
  }

  .rr-sides {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }

  .rr-side {
    display: grid;
    grid-template-columns: 220px auto minmax(0, 1fr);
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  .rr-who {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
  }

  .rr-team {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    padding: 0;
    border: 0;
    background: none;
    color: inherit;
    font: inherit;
    cursor: pointer;
  }

  .rr-team img {
    flex: none;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: 1px solid var(--or-table-border, var(--ccc));
    object-fit: cover;
  }

  .rr-teamName {
    font-size: 0.85em;
    font-weight: 700;
    color: var(--or-heading, var(--g111));
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .rr-team:hover .rr-teamName {
    color: var(--or-pink, var(--blueOne));
  }

  .rr-bid {
    flex: none;
    font-size: 0.72em;
    font-weight: 700;
    color: var(--or-orange, #e8590c);
  }

  .rr-arrow {
    color: var(--or-pink, var(--blueOne));
  }

  .rr-items {
    display: flex;
    flex-wrap: wrap;
    gap: 2px 14px;
    min-width: 0;
  }

  .rr-nothing {
    font-size: 0.75em;
    font-style: italic;
    color: var(--or-muted, var(--g999));
  }

  .rr-item {
    display: inline-flex;
    align-items: baseline;
    gap: 5px;
  }

  .rr-sign {
    font: 800 0.85em "Orbitron", sans-serif;
  }

  .rr-add .rr-sign {
    color: #2fbf8a;
  }

  .rr-drop .rr-sign {
    color: var(--or-pink, #c2185b);
  }

  .rr-itemName {
    font-size: 0.85em;
    color: var(--or-text, var(--g111));
  }

  .rr-pick .rr-itemName,
  .rr-budget .rr-itemName {
    font-weight: 600;
    color: var(--or-link-visited, #7b1fa2);
  }

  .rr-drop .rr-itemName {
    color: var(--or-muted, var(--g555));
  }

  .rr-itemInfo {
    font-size: 0.7em;
    color: var(--or-muted, var(--g999));
  }

  /* narrow (homepage sidebar, phones): time + label sit top-right; each team above what it received */
  .rr-compact .rr-row {
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 8px;
  }

  .rr-compact .rr-when {
    grid-column: 2;
    grid-row: 1;
    align-items: flex-end;
    padding-top: 2px;
  }

  .rr-compact .rr-sides {
    grid-column: 1;
    grid-row: 1;
  }

  .rr-compact .rr-side {
    grid-template-columns: 1fr;
    gap: 2px;
  }

  .rr-compact .rr-arrow {
    display: none;
  }

  .rr-compact .rr-items {
    padding-left: 32px;
  }

  @media (max-width: 640px) {
    .rr-row {
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 8px;
    }

    .rr-when {
      grid-column: 2;
      grid-row: 1;
      align-items: flex-end;
      padding-top: 2px;
    }

    .rr-sides {
      grid-column: 1;
      grid-row: 1;
    }

    .rr-side {
      grid-template-columns: 1fr;
      gap: 2px;
    }

    .rr-arrow {
      display: none;
    }

    .rr-items {
      padding-left: 32px;
    }
  }
</style>
