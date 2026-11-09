<!--
  One sortable table: season record, Tankathon draft order, all-play & luck, lineup efficiency,
  and (when SHOW_PLAYOFF_ODDS is on) projected record and playoff odds.
  Replaces the old Tankathon table. Inputs are built in index.svelte from the standings and utils/leagueInsights.js.
-->
<script>
  import TeamChip from "../Shared/TeamChip.svelte";
  import { pct, record, projRecord, signed, pts } from "../Shared/format.js";
  import "../Shared/common.css";
  import { SHOW_PLAYOFF_ODDS } from "./config.js";
  import { streakValue } from "../../utils/leagueInsights.js";

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

  // consecutive columns sharing a group get one header cell above them
  const groups = $derived(
    columns.reduce((acc, c) => {
      const last = acc[acc.length - 1];
      if (last && last.label === c.group) last.span++;
      else acc.push({ label: c.group, span: 1 });
      return acc;
    }, [])
  );

  let sortKey = $state(null);
  let sortDir = $state(-1); // -1 = high to low
  const activeKey = $derived(columns.some((c) => c.key === sortKey) ? sortKey : showOdds ? "playoffs" : "record");

  const ids = $derived(Object.keys(teams));
  const sortedIds = $derived.by(() => {
    const col = columns.find((c) => c.key === activeKey);
    if (!col) return ids;
    const tiebreak = (id) => winPct(standings[id]) * 1e6 + (standings[id]?.fpts ?? 0);
    return [...ids].sort((a, b) => sortDir * (col.get(a) - col.get(b)) || tiebreak(b) - tiebreak(a));
  });

  const sortBy = (key) => {
    if (key === activeKey) sortDir = -sortDir;
    else {
      sortKey = key;
      sortDir = columns.find((c) => c.key === key)?.firstDir ?? -1;
    }
  };

  const clickFor = (id) => (onTeamClick ? () => onTeamClick(id) : null);
  const streakText = (s) => {
    const v = streakValue(s);
    return v > 0 ? `W${v}` : v < 0 ? `L${-v}` : "–";
  };
</script>

<div class="rr-tableWrap">
  <table class="rr-table rr-breakdown">
    <thead>
      <tr class="rr-groupRow">
        <th class="left" rowspan="2">Team</th>
        {#each groups as g}
          <th colspan={g.span} class="rr-group">{g.label}</th>
        {/each}
      </tr>
      <tr>
        {#each columns as c}
          <th aria-sort={c.key === activeKey ? (sortDir < 0 ? "descending" : "ascending") : "none"}>
            <button type="button" class="rr-sortBtn" class:rr-active={c.key === activeKey} title={c.title ?? `Sort by ${c.label}`} onclick={() => sortBy(c.key)}>
              {c.label}{#if c.key === activeKey}<span class="rr-arrow">{sortDir < 0 ? "▼" : "▲"}</span>{/if}
            </button>
          </th>
        {/each}
      </tr>
    </thead>
    <tbody>
      {#each sortedIds as id (id)}
        {@const s = standings[id]}
        {@const o = oddsById[id]}
        {@const l = luckById[id]}
        {@const e = effById[id]}
        <tr>
          <td class="left"><TeamChip team={teams[id]} onclick={clickFor(id)} /></td>
          {#each columns as c}
            {#if c.key === "record"}
              <td>{s ? record(s.wins, s.losses, s.ties) : "–"}</td>
            {:else if c.key === "div"}
              <td class="muted">{s ? record(s.divisionWins, s.divisionLosses, s.divisionTies) : "–"}</td>
            {:else if c.key === "pf"}
              <td>{s ? pts(s.fpts) : "–"}</td>
            {:else if c.key === "pa"}
              <td class="muted">{s ? pts(s.fptsAgainst) : "–"}</td>
            {:else if c.key === "streak"}
              {@const v = streakValue(s?.streak)}
              <td class={v > 0 ? "rr-good" : v < 0 ? "rr-bad" : ""}>{streakText(s?.streak)}</td>
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
          {/each}
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<style>
  .rr-groupRow .rr-group {
    font-size: 0.72em;
    font-weight: 500;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--or-muted, var(--g999));
    border-bottom: 1px solid var(--or-table-border, var(--ccc));
    padding-bottom: 4px;
  }

  .rr-sortBtn {
    padding: 0;
    border: 0;
    background: none;
    color: inherit;
    font: inherit;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
  }

  .rr-sortBtn:hover,
  .rr-sortBtn.rr-active {
    color: var(--or-pink, var(--blueOne));
  }

  .rr-arrow {
    font-size: 0.75em;
    margin-left: 3px;
  }

  /* keep the team column visible while the numbers scroll sideways on phones */
  th.left,
  td.left {
    position: sticky;
    left: 0;
    z-index: 1;
    background: inherit;
    max-width: 180px;
  }

  thead th.left {
    background: var(--fff);
  }

  /* long team names wrap to two lines instead of widening the table */
  td.left :global(.rr-name) {
    white-space: normal;
    overflow-wrap: anywhere; /* one-word names like "SudburyBlueberryBulldogs" can still wrap */
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    line-height: 1.2;
  }

  td.left {
    min-width: 140px;
    width: 170px;
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
