<!--
  Standings option B: one sortable table, ordered by playoff seed by default, with a dashed playoff line
  and division leader / wildcard tags. Rows are built in RayStandings/index.svelte (seeds from seedTeams()).
  Sorting and the header come from Shared/SortableTable; table look from Shared/common.css.
-->
<script>
  import TeamChip from "../Shared/TeamChip.svelte";
  import SortableTable from "../Shared/SortableTable.svelte";
  import { record, pts } from "../Shared/format.js";
  import "../Shared/common.css";
  import { streakValue, streakLabel } from "../../utils/teamStats.js";

  let { rows, teams, playoffTeams = 0, showDivisions = false, onTeamClick = null } = $props();

  const winPct = (r) => (r.wins + r.ties / 2) / Math.max(1, r.wins + r.losses + r.ties);
  const divPct = (r) => (r.divisionWins + r.divisionTies / 2) / Math.max(1, r.divisionWins + r.divisionLosses + r.divisionTies);

  const columns = $derived(
    [
      { key: "seed", label: "Seed", get: (r) => r.seed, firstDir: 1 },
      { key: "team", label: "Team", thClass: "left", sticky: true },
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
  // the playoff line only makes sense in seed order
  const showLine = $derived(sortKey === "seed" && sortDir === 1 && playoffTeams > 0);

  const divColor = (d) => ["var(--or-cyan)", "var(--or-orange)", "var(--or-purple)", "var(--or-pink)"][((d ?? 1) - 1) % 4];
  const clickFor = (id) => (onTeamClick ? () => onTeamClick(id) : null);
</script>

<SortableTable
  {columns}
  {rows}
  rowKey={(r) => r.id}
  defaultKey="seed"
  tiebreak={(a, b) => a.seed - b.seed}
  tableClass="rr-standings"
  rowClass={(r) => (showLine && r.seed === playoffTeams ? "rr-lineAfter" : "")}
  bind:sortKey
  bind:sortDir
>
  {#snippet cell(r, c)}
    {#if c.key === "seed"}
      <td><span class="rr-seed" class:rr-in={r.seed <= playoffTeams}>{r.seed}</span></td>
    {:else if c.key === "team"}
      <td class="left rr-sticky">
        <span class="rr-teamCell">
          <TeamChip team={teams[r.id]} onclick={clickFor(r.id)} size={30} />
          {#if r.tag}<span class="rr-tag" class:rr-tagDiv={r.tagKind === "division"}>{r.tag}</span>{/if}
        </span>
      </td>
    {:else if c.key === "div"}
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
      <td><span class="rr-streak" class:rr-good={v > 0} class:rr-bad={v < 0}>{streakLabel(r.streak)}</span></td>
    {/if}
  {/snippet}
</SortableTable>
{#if showLine}
  <p class="rr-legend"><span class="rr-seed rr-in" aria-hidden="true">1</span> in the playoffs today · dashed line = playoff cut</p>
{/if}

<style>
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

  /* the <tr> is rendered by SortableTable (rowClass), the <td> here */
  :global(tr.rr-lineAfter) td {
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

  /* team column width (sticky + name wrapping come from Shared/common.css) */
  td.left {
    min-width: 170px;
    max-width: 230px;
  }
</style>
