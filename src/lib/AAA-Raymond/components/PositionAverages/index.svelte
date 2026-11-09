<!--
  One position-averages table on the /standings page (used twice by RayStandings).
  Averages / ranking toggle; two-sided heat scale per column: cyan = low, neutral = middle, pink = high.
-->
<script>
  import TeamChip from "../Shared/TeamChip.svelte";
  import "../Shared/common.css";
  import Toggle from "../Shared/Toggle.svelte";

  let { averagesData, columnOrder, headerLabel, week, teams = {}, onTeamClick = null } = $props();

  let mode = $state("averages"); // "averages" | "ranking"

  const ids = $derived(Object.keys(averagesData ?? {}));

  // per column: min, max and each team's rank (1 = highest)
  const stats = $derived.by(() => {
    const out = {};
    for (const { field } of columnOrder) {
      const values = ids.map((id) => averagesData[id]?.[field] ?? 0);
      const unique = [...new Set(values)].sort((a, b) => b - a);
      out[field] = {
        min: Math.min(...values),
        max: Math.max(...values),
        maxRank: unique.length,
        rank: Object.fromEntries(ids.map((id, i) => [id, unique.indexOf(values[i]) + 1])),
      };
    }
    return out;
  });

  const cell = (id, field) => {
    const s = stats[field];
    const value = averagesData[id]?.[field] ?? 0;
    // averages: shade by value; ranking: shade by rank, spread evenly (1st = pink, last = cyan)
    const t =
      mode === "ranking"
        ? s.maxRank <= 1 ? 0.5 : 1 - (s.rank[id] - 1) / (s.maxRank - 1)
        : s.max === s.min ? 0.5 : (value - s.min) / (s.max - s.min);
    const d = t - 0.5; // -0.5 (lowest) .. +0.5 (highest)
    return {
      text: mode === "ranking" ? s.rank[id] : value.toFixed(2),
      color: d < 0 ? "var(--or-cyan, #0b8a9a)" : "var(--or-pink, #c2185b)",
      alpha: Math.min(0.8, Math.abs(d) * 2 * 0.8).toFixed(2),
      high: t >= 0.8,
      low: t <= 0.2,
    };
  };

  const clickFor = (id) => (onTeamClick ? () => onTeamClick(id) : null);
</script>

<section class="rr-avg">
  <div class="rr-avgHead">
    <div>
      <h2>{headerLabel}</h2>
      <p class="rr-pageSub rr-avgSub">Points per week · through week {week - 1}</p>
    </div>
    <Toggle
      bind:value={mode}
      label="Show averages or rankings"
      options={[
        { value: "averages", label: "Averages" },
        { value: "ranking", label: "Ranking" },
      ]}
    />
  </div>

  <div class="rr-tableWrap">
    <table class="rr-table rr-avgTable">
      <thead>
        <tr>
          <th class="left">Team</th>
          {#each columnOrder as c (c.field)}<th>{c.name}</th>{/each}
        </tr>
      </thead>
      <tbody>
        {#each ids as id (id)}
          <tr>
            <td class="left"><TeamChip team={teams[id]} onclick={clickFor(id)} size={26} /></td>
            {#each columnOrder as c (c.field)}
              {@const v = cell(id, c.field)}
              <td><span class="rr-heat" class:rr-high={v.high} class:rr-low={v.low} style="--hc: {v.color}; --a: {v.alpha}">{v.text}</span></td>
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
  <p class="rr-key"><span>Low</span><span class="rr-keyBar" aria-hidden="true"></span><span>High</span><span class="rr-keyNote">· compared within each column</span></p>
</section>

<style>
  .rr-avg {
    margin: 3em 0 0;
  }

  .rr-avgHead {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 1em;
  }

  h2 {
    margin: 0;
    font-size: 1.4em;
    text-align: left;
  }

  .rr-avgSub {
    margin: 0.3em 0 0;
    text-align: left;
  }

  /* .rr-avg prefix: beat the shared .rr-tableWrap table.rr-table padding/size */
  .rr-avg table.rr-avgTable {
    font-size: 0.85em;
  }

  .rr-avg table.rr-avgTable th,
  .rr-avg table.rr-avgTable td {
    padding: 7px 4px;
  }

  .rr-avg table.rr-avgTable th {
    white-space: normal;
    line-height: 1.15;
  }

  .rr-heat {
    display: inline-block;
    min-width: 36px;
    padding: 3px 4px;
    border-radius: 6px;
    background: color-mix(in srgb, var(--hc) calc(var(--a) * 100%), transparent);
  }

  .rr-heat.rr-high {
    font-weight: 700;
    color: #fff;
    box-shadow: 0 0 10px var(--or-glow-pink, transparent);
  }

  .rr-heat.rr-low {
    font-weight: 700;
  }

  .rr-key {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    margin: 0.6em 0 0;
    font-size: 0.75em;
    color: var(--or-muted, var(--g999));
  }

  .rr-keyBar {
    width: 140px;
    height: 8px;
    border-radius: 8px;
    background: linear-gradient(90deg, color-mix(in srgb, var(--or-cyan, #0b8a9a) 80%, transparent), transparent, color-mix(in srgb, var(--or-pink, #c2185b) 80%, transparent));
  }

  th.left,
  td.left {
    position: sticky;
    left: 0;
    z-index: 1;
    background: inherit;
    min-width: 130px;
    max-width: 190px;
  }

  thead th.left {
    background: var(--fff);
  }
</style>
