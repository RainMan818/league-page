<!--
  Standings option B: one sortable table, ordered by playoff seed by default, with a dashed playoff line
  and division leader / wildcard tags. Rows are built in RayStandings/index.svelte (seeds from seedTeams()).
  Table look comes from Insights/insights.css (wrapped in .insights by the parent).
-->
<script>
  import TeamChip from "../Insights/TeamChip.svelte";
  import { record, pts } from "../Insights/format.js";
  import { streakValue } from "../../utils/leagueInsights.js";

  let { rows, teams, playoffTeams = 0, showDivisions = false, onTeamClick = null } = $props();

  const winPct = (r) => (r.wins + r.ties / 2) / Math.max(1, r.wins + r.losses + r.ties);
  const divPct = (r) => (r.divisionWins + r.divisionTies / 2) / Math.max(1, r.divisionWins + r.divisionLosses + r.divisionTies);

  const columns = $derived(
    [
      { key: "seed", label: "Seed", get: (r) => r.seed, firstDir: 1, cls: "rr-seedCol" },
      { key: "div", label: "Div", get: (r) => (r.division ?? 99) * 100 + r.seed, firstDir: 1, show: showDivisions },
      { key: "record", label: "Record", get: winPct },
      { key: "divRec", label: "Div Rec", title: "Division record", get: divPct, show: showDivisions },
      { key: "pf", label: "PF", title: "Points for", get: (r) => r.fpts },
      { key: "pa", label: "PA", title: "Points against", get: (r) => r.fptsAgainst },
      { key: "max", label: "Max PF", title: "Points with the best possible lineup each week", get: (r) => r.potentialPoints },
      { key: "streak", label: "Strk", title: "Current streak", get: (r) => streakValue(r.streak) },
    ].filter((c) => c.show !== false)
  );

  let sortKey = $state("seed");
  let sortDir = $state(1);

  const sorted = $derived.by(() => {
    const col = columns.find((c) => c.key === sortKey) ?? columns[0];
    return [...rows].sort((a, b) => sortDir * (col.get(a) - col.get(b)) || a.seed - b.seed);
  });

  // the playoff line only makes sense in seed order
  const showLine = $derived(sortKey === "seed" && sortDir === 1 && playoffTeams > 0);

  const sortBy = (key) => {
    if (key === sortKey) sortDir = -sortDir;
    else {
      sortKey = key;
      sortDir = columns.find((c) => c.key === key)?.firstDir ?? -1;
    }
  };

  const streakText = (s) => {
    const v = streakValue(s);
    return v > 0 ? `W${v}` : v < 0 ? `L${-v}` : "–";
  };
  const divColor = (d) => ["var(--or-cyan)", "var(--or-orange)", "var(--or-purple)", "var(--or-pink)"][((d ?? 1) - 1) % 4];
  const clickFor = (id) => (onTeamClick ? () => onTeamClick(id) : null);
</script>

<div class="tableWrap">
  <table class="ins rr-standings">
    <thead>
      <tr>
        <th aria-sort={sortKey === "seed" ? (sortDir > 0 ? "ascending" : "descending") : "none"}>
          <button type="button" class="rr-sortBtn" class:rr-active={sortKey === "seed"} onclick={() => sortBy("seed")}>
            Seed{#if sortKey === "seed"}<span class="rr-arrow">{sortDir > 0 ? "▲" : "▼"}</span>{/if}
          </button>
        </th>
        <th class="left">Team</th>
        {#each columns.slice(1) as c (c.key)}
          <th aria-sort={c.key === sortKey ? (sortDir > 0 ? "ascending" : "descending") : "none"}>
            <button type="button" class="rr-sortBtn" class:rr-active={c.key === sortKey} title={c.title ?? `Sort by ${c.label}`} onclick={() => sortBy(c.key)}>
              {c.label}{#if c.key === sortKey}<span class="rr-arrow">{sortDir > 0 ? "▲" : "▼"}</span>{/if}
            </button>
          </th>
        {/each}
      </tr>
    </thead>
    <tbody>
      {#each sorted as r (r.id)}
        <tr class:rr-lineAfter={showLine && r.seed === playoffTeams}>
          <td><span class="rr-seed" class:rr-in={r.seed <= playoffTeams}>{r.seed}</span></td>
          <td class="left">
            <span class="rr-teamCell">
              <TeamChip team={teams[r.id]} onclick={clickFor(r.id)} size={30} />
              {#if r.tag}<span class="rr-tag" class:rr-tagDiv={r.tagKind === "division"}>{r.tag}</span>{/if}
            </span>
          </td>
          {#each columns.slice(1) as c (c.key)}
            {#if c.key === "div"}
              <td><span class="rr-divPill" style="--c: {divColor(r.division)}">D{r.division ?? "–"}</span></td>
            {:else if c.key === "record"}
              <td class="rr-strong">{record(r.wins, r.losses, r.ties)}</td>
            {:else if c.key === "divRec"}
              <td class="muted">{record(r.divisionWins ?? 0, r.divisionLosses ?? 0, r.divisionTies ?? 0)}</td>
            {:else if c.key === "pf"}
              <td>{pts(r.fpts)}</td>
            {:else if c.key === "pa"}
              <td class="muted">{pts(r.fptsAgainst)}</td>
            {:else if c.key === "max"}
              <td>{pts(r.potentialPoints)}</td>
            {:else if c.key === "streak"}
              {@const v = streakValue(r.streak)}
              <td><span class="rr-streak" class:rr-good={v > 0} class:rr-bad={v < 0}>{streakText(r.streak)}</span></td>
            {/if}
          {/each}
        </tr>
      {/each}
    </tbody>
  </table>
</div>
{#if showLine}
  <p class="rr-legend"><span class="rr-seed rr-in" aria-hidden="true">1</span> in the playoffs today · dashed line = playoff cut</p>
{/if}

<style>
  .rr-standings th,
  .rr-standings td {
    padding: 9px 10px;
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

  .rr-seed {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 7px;
    font: 700 0.8em "Orbitron", sans-serif;
    border: 1px solid var(--or-table-border, var(--ccc));
    color: var(--or-muted, var(--g999));
  }

  .rr-seed.rr-in {
    border-color: transparent;
    background: var(--or-pink, var(--blueOne));
    color: #fff;
    box-shadow: 0 0 10px var(--or-glow-pink, transparent);
  }

  .rr-teamCell {
    display: inline-flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    min-width: 0;
    max-width: 100%;
  }

  .rr-tag {
    padding-left: 38px;
    font-size: 0.75em;
    color: var(--or-cyan, #0b8a9a);
  }

  .rr-tag.rr-tagDiv {
    color: var(--or-tab-active, var(--or-pink));
  }

  .rr-divPill {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 999px;
    border: 1px solid var(--c);
    color: var(--c);
    font-size: 0.8em;
    font-weight: 700;
  }

  .rr-strong {
    font-family: "Orbitron", sans-serif;
    font-weight: 700;
  }

  .rr-streak {
    display: inline-block;
    min-width: 30px;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 0.8em;
    font-weight: 700;
  }

  .rr-good {
    color: #2fbf8a;
    background: color-mix(in srgb, #2fbf8a 14%, transparent);
  }

  .rr-bad {
    color: var(--or-pink, #c2185b);
    background: color-mix(in srgb, var(--or-pink, #c2185b) 12%, transparent);
  }

  tr.rr-lineAfter td {
    border-bottom: 2px dashed var(--or-pink, var(--blueOne));
  }

  .rr-legend {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin: 0.8em 0 0;
    font-size: 0.8em;
    color: var(--or-muted, var(--g999));
  }

  .rr-legend .rr-seed {
    width: 20px;
    height: 20px;
    font-size: 0.7em;
  }

  /* team column stays visible while the numbers scroll sideways on phones */
  th.left,
  td.left {
    position: sticky;
    left: 0;
    z-index: 1;
    background: inherit;
    min-width: 170px;
    max-width: 230px;
  }

  thead th.left {
    background: var(--fff);
  }

  td.left :global(.rr-name) {
    white-space: normal;
    overflow-wrap: anywhere;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    line-height: 1.2;
  }
</style>
