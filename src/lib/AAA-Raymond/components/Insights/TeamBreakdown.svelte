<!--
  One sortable table: season record, Tankathon draft order, all-play & luck, lineup efficiency,
  and (when SHOW_PLAYOFF_ODDS is on) projected record and playoff odds.
  Replaces the old Tankathon table. Inputs are built in index.svelte from the standings and utils/teamStats.js.
-->
<script>
  import TeamChip from "../Shared/TeamChip.svelte";
  import SortableTable from "../Shared/SortableTable.svelte";
  import { pct, record, projRecord, signed, pts } from "../Shared/format.js";
  import "../Shared/common.css";
  import { SHOW_PLAYOFF_ODDS } from "./config.js";
  import { streakValue, streakLabel } from "../../utils/teamStats.js";

  let { standings, projection = null, luck = [], efficiency = [], teams, divisions = 0, onTeamClick = null } = $props();

  const byId = (list) => Object.fromEntries(list.map((r) => [r.rosterID, r]));
  const showOdds = $derived(SHOW_PLAYOFF_ODDS && !!projection);
  const oddsById = $derived(byId(projection?.odds ?? []));
  const luckById = $derived(byId(luck));
  const effById = $derived(byId(efficiency));
  // where division winners always get the byes, a separate Bye column would repeat Division
  const showBye = $derived(showOdds && projection.odds.some((o) => Math.abs(o.bye - o.division) > 1e-9));

  const winPct = (s) => (s ? (s.wins + s.ties / 2) / Math.max(1, s.wins + s.losses + s.ties) : -1);
  const divPct = (s) => (s ? (s.divisionWins + s.divisionTies / 2) / Math.max(1, s.divisionWins + s.divisionLosses + s.divisionTies) : -1);

  // firstDir: direction of the first click (-1 = high to low). Pick sorts 1, 2, 3... first.
  const columns = $derived(
    [
      { key: "team", label: "Team", thClass: "left", sticky: true, show: true },
      { key: "record", group: "Season", label: "Record", get: (id) => winPct(standings[id]), show: true },
      { key: "div", group: "Season", label: "Div", title: "Division record", get: (id) => divPct(standings[id]), show: divisions > 1 },
      { key: "pf", group: "Season", label: "PF", title: "Points for", get: (id) => standings[id]?.fpts ?? -1, show: true },
      { key: "pa", group: "Season", label: "PA", title: "Points against", get: (id) => standings[id]?.fptsAgainst ?? -1, show: true },
      { key: "streak", group: "Season", label: "Strk", title: "Current streak", get: (id) => streakValue(standings[id]?.streak), show: true },
      { key: "proj", group: "Season", label: "Proj.", title: "Projected final record", get: (id) => oddsById[id]?.projWins ?? -1, show: showOdds },
      { key: "playoffs", group: "Playoff odds", label: "Playoffs", get: (id) => oddsById[id]?.playoffs ?? -1, show: showOdds, kind: "pct" },
      { key: "bye", group: "Playoff odds", label: "Bye", get: (id) => oddsById[id]?.bye ?? -1, show: showBye, kind: "pct" },
      { key: "division", group: "Playoff odds", label: showBye ? "Div" : "Div+Bye", title: "Win the division (and a first-round bye)", get: (id) => oddsById[id]?.division ?? -1, show: showOdds, kind: "pct" },
      { key: "title", group: "Playoff odds", label: "Title", get: (id) => oddsById[id]?.title ?? -1, show: showOdds, kind: "pct" },
      { key: "pick", group: "Tankathon", label: "Pick", title: "Draft order: lowest max points picks first", get: (id) => standings[id]?.pick ?? 99, show: true, firstDir: 1 },
      { key: "max", group: "Tankathon", label: "Max PF", title: "Points with the best possible lineup each week", get: (id) => standings[id]?.potentialPoints ?? -1, show: true, firstDir: 1 },
      { key: "allplay", group: "Luck", label: "All-play", title: "Win % if you played every team every week", get: (id) => luckById[id]?.apPct ?? -1, show: luck.length > 0 },
      { key: "luck", group: "Luck", label: "Luck", title: "Actual wins minus the wins your scores usually earn", get: (id) => luckById[id]?.luck ?? -99, show: luck.length > 0 },
      { key: "eff", group: "Lineups", label: "Efficiency", title: "Points scored ÷ best possible lineup", get: (id) => effById[id]?.efficiency ?? -1, show: efficiency.length > 0 },
    ].filter((c) => c.show)
  );

  const ids = $derived(Object.keys(teams));
  // ties: better record, then more points for
  const tiebreak = (a, b) => {
    const t = (id) => winPct(standings[id]) * 1e6 + (standings[id]?.fpts ?? 0);
    return t(b) - t(a);
  };

  const clickFor = (id) => (onTeamClick ? () => onTeamClick(id) : null);
</script>

<SortableTable {columns} rows={ids} rowKey={(id) => id} defaultKey={showOdds ? "playoffs" : "record"} {tiebreak} tableClass="rr-breakdown">
  {#snippet cell(id, c)}
    {@const s = standings[id]}
    {@const o = oddsById[id]}
    {@const l = luckById[id]}
    {@const e = effById[id]}
    {#if c.key === "team"}
      <td class="left rr-sticky"><TeamChip team={teams[id]} onclick={clickFor(id)} /></td>
    {:else if c.key === "record"}
      <td>{s ? record(s.wins, s.losses, s.ties) : "–"}</td>
    {:else if c.key === "div"}
      <td class="muted">{s ? record(s.divisionWins, s.divisionLosses, s.divisionTies) : "–"}</td>
    {:else if c.key === "pf"}
      <td>{s ? pts(s.fpts) : "–"}</td>
    {:else if c.key === "pa"}
      <td class="muted">{s ? pts(s.fptsAgainst) : "–"}</td>
    {:else if c.key === "streak"}
      {@const v = streakValue(s?.streak)}
      <td class={v > 0 ? "rr-good" : v < 0 ? "rr-bad" : ""}>{streakLabel(s?.streak)}</td>
    {:else if c.key === "proj"}
      <td class="muted">{o ? projRecord(o.projWins + o.projTies / 2, o.projLosses + o.projTies / 2) : "–"}</td>
    {:else if c.kind === "pct"}
      {@const p = c.get(id)}
      <td><span class="rr-pctCell" style="--p: {Math.max(0, p)}">{p < 0 ? "–" : pct(p)}</span></td>
    {:else if c.key === "pick"}
      <td class="rr-pick">{s?.pick ?? "–"}</td>
    {:else if c.key === "max"}
      <td>
        {#if s}<span class="rr-maxPf" style="background-color: {s.maxColor ?? 'transparent'}">{pts(s.potentialPoints)}</span>{:else}–{/if}
      </td>
    {:else if c.key === "allplay"}
      <td title={l ? `All-play record ${record(l.apWins, l.apLosses, l.apTies)}` : ""}>{l ? `${(l.apPct * 100).toFixed(0)}%` : "–"}</td>
    {:else if c.key === "luck"}
      <td class={l ? (l.luck > 0.05 ? "rr-good" : l.luck < -0.05 ? "rr-bad" : "") : ""} title={l ? `${l.wins} actual wins vs ${l.expectedWins.toFixed(1)} expected` : ""}>
        {l ? signed(l.luck) : "–"}
      </td>
    {:else if c.key === "eff"}
      <td class="rr-effCell" title={e ? `${pts(e.fpts)} of ${pts(e.maxPts)} possible · ${pts(e.benchPts)} left on the bench` : ""}>
        {#if e}
          <span class="rr-bar"><span class="rr-fill" style="width: {(e.efficiency * 100).toFixed(1)}%"></span></span>{(e.efficiency * 100).toFixed(1)}%
        {:else}–{/if}
      </td>
    {/if}
  {/snippet}
</SortableTable>

<style>
  /* team column width (sticky + name wrapping come from Shared/common.css) */
  td.left {
    min-width: 140px;
    width: 170px;
    max-width: 180px;
  }

  .rr-pctCell {
    display: inline-block;
    min-width: 38px;
    padding: 2px 4px;
    border-radius: 4px;
    background: color-mix(in srgb, var(--or-pink, #c2185b) calc(var(--p) * 55%), transparent);
  }

  .rr-pick {
    font-family: "Orbitron", sans-serif;
    font-weight: 700;
    color: var(--or-pink, var(--blueOne));
  }

  /* same green-to-red scale the old Tankathon table used */
  .rr-maxPf {
    display: inline-block;
    padding: 2px 5px;
    border-radius: 4px;
    color: #000;
    font-weight: 700;
  }

  .rr-good {
    color: #57bb8a;
    font-weight: 700;
  }

  .rr-bad {
    color: #e67c73;
    font-weight: 700;
  }

  .rr-effCell {
    white-space: nowrap;
  }

  .rr-bar {
    display: inline-block;
    vertical-align: middle;
    width: 24px;
    height: 6px;
    margin-right: 5px;
    border-radius: 4px;
    background: var(--or-table-border, var(--ddd));
    overflow: hidden;
  }

  .rr-fill {
    display: block;
    height: 100%;
    border-radius: 4px;
    background: linear-gradient(90deg, var(--or-purple, #7b1fa2), var(--or-pink, #c2185b));
  }
</style>
