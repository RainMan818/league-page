<!--
  Manager page "Season by season" card: one small chart per stat for each finished season the manager ran, with the
  league rank under each year and that season's league average dashed. Wins are bars from zero, head-to-head only
  (the weekly league-median game from 2026 is left out, so seasons compare evenly); points for and max PF are lines on a zoomed scale with labeled gridlines (seasons differ by ~5%, which bars from zero would hide). Hovering (or tapping) a season highlights it in every chart and shows a tooltip with all its numbers.
  "Table" swaps the charts for the same numbers as a table. Data from utils/managerProfile.js seasonHistory().
-->
<script>
  import { ordinal, pts, record } from "../Shared/format.js";

  let { seasons = [] } = $props();

  let hover = $state(null); // season index highlighted across all charts
  let hoverChart = $state(null); // which chart shows the tooltip
  let showTable = $state(false);
  let width = $state(360);

  const H = 124;
  const TOP = 18; // room for the value labels
  const BOTTOM = 34; // year + rank under the plot
  const LEFT = 34; // gridline labels
  const R = 4;

  const whole = (v) => Math.round(v).toLocaleString("en-US");
  const charts = [
    { key: "wins", label: "Wins", kind: "bar", fmt: (v) => String(v), avgFmt: (v) => v.toFixed(1) },
    { key: "pf", label: "Points for", kind: "line", fmt: whole, avgFmt: whole },
    { key: "maxPF", label: "Max PF", kind: "line", fmt: whole, avgFmt: whole },
  ];

  const band = $derived(seasons.length ? (width - LEFT) / seasons.length : width);
  const barW = $derived(Math.max(10, Math.min(46, band * 0.56)));
  const plotH = H - TOP - BOTTOM;
  const xOf = (i) => LEFT + band * (i + 0.5);

  // a round step (1, 2, 2.5 or 5 x 10^k) giving about `count` gridlines over the span
  function niceStep(span, count) {
    const raw = span / count;
    const mag = 10 ** Math.floor(Math.log10(raw));
    return mag * ([1, 2, 2.5, 5, 10].find((m) => m * mag >= raw) ?? 10);
  }

  // y range + gridlines: bars from zero; lines zoomed to the values and averages
  function scaleFor(c) {
    const vals = seasons.flatMap((s) => [s[c.key], s.avg[c.key]]);
    let lo = c.kind === "bar" ? 0 : Math.min(...vals);
    let hi = Math.max(...vals, lo + 1);
    const step = niceStep(hi - lo || Math.abs(hi) * 0.1 || 1, c.kind === "bar" ? 2 : 3);
    lo = Math.floor(lo / step) * step;
    hi = Math.ceil(hi / step) * step;
    if (c.kind === "bar" && hi < Math.max(...vals) * 1.06) hi += step;
    const ticks = [];
    for (let t = lo; t <= hi + step / 2; t += step) ticks.push(t);
    return { lo, hi, ticks };
  }
  const yOf = (v, sc) => TOP + plotH - ((v - sc.lo) / (sc.hi - sc.lo)) * plotH;
  const linePath = (key, sc, avg = false) =>
    seasons.map((s, i) => `${i ? "L" : "M"}${xOf(i)},${yOf(avg ? s.avg[key] : s[key], sc)}`).join("");

  // bar with rounded top corners, flat on the baseline
  function barPath(cx, v, sc) {
    const base = TOP + plotH;
    const top = yOf(v, sc);
    const x0 = cx - barW / 2;
    const x1 = cx + barW / 2;
    const r = Math.min(R, (base - top) / 2, barW / 2);
    if (base - top <= 0) return "";
    return `M${x0},${base}V${top + r}Q${x0},${top} ${x0 + r},${top}H${x1 - r}Q${x1},${top} ${x1},${top + r}V${base}Z`;
  }

  function pointAt(e, chartKey) {
    const box = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - box.left) / box.width) * width;
    const i = Math.floor((x - LEFT) / band);
    hover = Math.max(0, Math.min(seasons.length - 1, i));
    hoverChart = chartKey;
  }
  const clear = () => {
    hover = null;
    hoverChart = null;
  };

  const eff = (s) => (s.maxPF > 0 ? `${((s.pf * 100) / s.maxPF).toFixed(1)}%` : "–");
  const rankText = (s, key) => `${ordinal(s.rank[key])} of ${s.teams}`;
  const MEDIAN_FROM = 2026; // first season with the weekly league-median game
  const anyMedian = $derived(seasons.some((s) => s.year >= MEDIAN_FROM));
</script>

<section class="rr-card rr-seasons">
  <div class="rr-cardHead">
    <h2 class="rr-h">Season by season</h2>
    {#if seasons.length}
      <button type="button" class="rr-linkBtn" aria-pressed={showTable} onclick={() => (showTable = !showTable)}>
        {showTable ? "Charts" : "Table"}
      </button>
    {/if}
  </div>

  {#if !seasons.length}
    <p class="rr-muted">No completed seasons yet.</p>
  {:else if showTable}
    <div class="rr-tableWrap">
      <table class="rr-table">
        <thead>
          <tr><th>Season</th><th>Record</th><th>Points for</th><th>Max PF</th><th>Lineup IQ</th></tr>
        </thead>
        <tbody>
          {#each seasons as s (s.year)}
            <tr>
              <td>{s.year}</td>
              <td>{record(s.wins, s.losses, s.ties)} <span class="rr-rk">{ordinal(s.rank.wins)}</span></td>
              <td>{pts(s.pf)} <span class="rr-rk">{ordinal(s.rank.pf)}</span></td>
              <td>{pts(s.maxPF)} <span class="rr-rk">{ordinal(s.rank.maxPF)}</span></td>
              <td>{eff(s)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    <p class="rr-note">
      Regular season only. Small numbers are the league rank that season.{#if anyMedian}
        Records are head-to-head only (the weekly median game is left out).{/if}
    </p>
  {:else}
    <p class="rr-note rr-key">
      Regular season · <span class="rr-keyAvg" aria-hidden="true"></span> league average · rank under each year
    </p>
    {#each charts as c (c.key)}
      {@const sc = scaleFor(c)}
      <div class="rr-chartBlock">
        <span class="rr-k">{c.label}</span>
        <div class="rr-chart" bind:clientWidth={width}>
          <svg
            viewBox="0 0 {width} {H}"
            height={H}
            role="img"
            aria-label="{c.label} by season: {seasons.map((s) => `${s.year} ${c.fmt(s[c.key])}`).join(', ')}"
            onpointermove={(e) => pointAt(e, c.key)}
            onpointerdown={(e) => pointAt(e, c.key)}
            onpointerleave={clear}
          >
            {#each sc.ticks as t (t)}
              <line class={t === sc.lo ? "rr-base" : "rr-grid"} x1={LEFT - 4} x2={width} y1={yOf(t, sc)} y2={yOf(t, sc)} />
              <text class="rr-tick" x={LEFT - 8} y={yOf(t, sc) + 3.5} text-anchor="end">{c.fmt(t)}</text>
            {/each}
            {#if c.kind === "line"}
              <path class="rr-avgLine" d={linePath(c.key, sc, true)} />
              <path class="rr-line" d={linePath(c.key, sc)} />
            {/if}
            {#each seasons as s, i (s.year)}
              {@const cx = xOf(i)}
              {@const y = yOf(s[c.key], sc)}
              {@const avgY = yOf(s.avg[c.key], sc)}
              <g class:rr-dim={hover != null && hover !== i}>
                {#if c.kind === "bar"}
                  <path class="rr-bar" d={barPath(cx, s[c.key], sc)} />
                  <line class="rr-avg" x1={cx - barW / 2 - 5} x2={cx + barW / 2 + 5} y1={avgY} y2={avgY} />
                {:else}
                  <circle class="rr-dot" cx={cx} cy={y} r={hover === i ? 6 : 4.5} />
                {/if}
                <text class="rr-val" x={cx} y={(c.kind === "bar" ? Math.min(y, avgY) : y) - (c.kind === "bar" ? 5 : 10)} text-anchor="middle">{c.fmt(s[c.key])}</text>
                <text class="rr-year" x={cx} y={TOP + plotH + 14} text-anchor="middle">{s.year}</text>
                <text class="rr-rank" x={cx} y={TOP + plotH + 27} text-anchor="middle">{ordinal(s.rank[c.key])}</text>
              </g>
            {/each}
          </svg>
          {#if hover != null && hoverChart === c.key}
            {@const s = seasons[hover]}
            {@const cx = xOf(hover)}
            <div class="rr-tip" class:rr-flip={cx > width / 2} style="left: {cx}px">
              <div class="rr-tipHead">{s.year} season</div>
              <div class="rr-tipRow"><span>Record</span><b>{record(s.wins, s.losses, s.ties)}</b><span class="rr-rk">{rankText(s, "wins")}</span></div>
              <div class="rr-tipRow"><span>Points for</span><b>{pts(s.pf)}</b><span class="rr-rk">{rankText(s, "pf")}</span></div>
              <div class="rr-tipRow"><span>Max PF</span><b>{pts(s.maxPF)}</b><span class="rr-rk">{rankText(s, "maxPF")}</span></div>
              <div class="rr-tipRow"><span>Lineup IQ</span><b>{eff(s)}</b><span></span></div>
              <div class="rr-tipAvg">League avg {c.label.toLowerCase()}: {c.avgFmt(s.avg[c.key])}</div>
            </div>
          {/if}
        </div>
      </div>
    {/each}
    {#if anyMedian}<p class="rr-note">Wins are head-to-head only; the weekly median game is left out.</p>{/if}
  {/if}
</section>

<style>
  /* card, heading and link button look the same as the other manager page cards */
  .rr-card {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 18px;
    border-radius: 14px;
    border: 1px solid var(--or-table-border, var(--ccc));
    background: var(--fff);
    box-shadow: 0 6px 24px var(--or-table-shadow, transparent);
    min-width: 0;
  }

  .rr-cardHead {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 10px;
  }

  h2.rr-h {
    margin: 0;
    font: 700 1rem "Orbitron", sans-serif;
    color: var(--or-heading, var(--g111));
    text-align: left;
  }

  .rr-linkBtn {
    padding: 0;
    border: 0;
    background: none;
    color: var(--or-cyan, #0b8a9a);
    font: inherit;
    font-size: 0.85em;
    cursor: pointer;
  }

  .rr-linkBtn:hover {
    text-decoration: underline;
  }

  .rr-k {
    font-size: 0.66em;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--or-muted, var(--g999));
  }

  .rr-muted,
  .rr-note {
    margin: 0;
    font-size: 0.78em;
    color: var(--or-muted, var(--g999));
  }

  .rr-key {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 5px;
    margin-top: -4px;
  }

  .rr-keyAvg {
    display: inline-block;
    width: 16px;
    border-top: 2px dashed var(--or-text, #efe6ff);
    opacity: 0.8;
  }

  .rr-chartBlock {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .rr-chart {
    position: relative;
    width: 100%;
  }

  svg {
    display: block;
    width: 100%;
    overflow: visible;
    font-family: "Roboto", sans-serif;
    touch-action: pan-y;
  }

  .rr-base {
    stroke: var(--or-table-border, #ccc);
    stroke-width: 1;
  }

  .rr-grid {
    stroke: var(--or-table-border, #ccc);
    stroke-opacity: 0.45;
    stroke-width: 1;
  }

  .rr-tick {
    fill: var(--or-muted, #999);
    font-size: 10px;
  }

  .rr-line {
    fill: none;
    stroke: var(--or-pink, #ff2a6d);
    stroke-width: 2;
    stroke-linejoin: round;
    stroke-linecap: round;
  }

  .rr-avgLine {
    fill: none;
    stroke: var(--or-text, #333);
    stroke-opacity: 0.6;
    stroke-width: 1.5;
    stroke-dasharray: 4 3;
  }

  .rr-dot {
    fill: var(--or-pink, #ff2a6d);
    stroke: var(--fff, #fff);
    stroke-width: 2;
    transition: r 0.15s;
  }

  .rr-bar {
    fill: var(--or-pink, #ff2a6d);
  }

  .rr-avg {
    stroke: var(--or-text, #333);
    stroke-opacity: 0.8;
    stroke-width: 2;
    stroke-dasharray: 4 3;
  }

  g {
    transition: opacity 0.15s;
  }

  g.rr-dim {
    opacity: 0.35;
  }

  .rr-val {
    fill: var(--or-text, #333);
    font-size: 11px;
    font-weight: 700;
  }

  .rr-year {
    fill: var(--or-text, #333);
    font-size: 11px;
  }

  .rr-rank {
    fill: var(--or-muted, #999);
    font-size: 10px;
  }

  .rr-tip {
    position: absolute;
    top: 6px;
    z-index: 5;
    min-width: 200px;
    padding: 8px 10px;
    margin-left: 14px;
    border: 1px solid var(--or-table-border, #ccc);
    border-radius: 10px;
    background: var(--fff, #fff);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
    pointer-events: none;
    font-size: 12px;
    color: var(--or-text, #333);
  }

  .rr-tip.rr-flip {
    transform: translateX(-100%);
    margin-left: -14px;
  }

  .rr-tipHead {
    margin-bottom: 4px;
    font: 700 11px "Orbitron", sans-serif;
    letter-spacing: 0.08em;
    color: var(--or-cyan, #0b8a9a);
  }

  .rr-tipRow {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto 62px;
    gap: 8px;
    line-height: 1.55;
  }

  .rr-tipRow .rr-rk {
    text-align: right;
  }

  .rr-tipAvg {
    margin-top: 4px;
    padding-top: 4px;
    border-top: 1px solid var(--or-table-border, #ccc);
    color: var(--or-muted, #999);
  }

  .rr-rk {
    font-size: 0.85em;
    color: var(--or-muted, #999);
  }

  .rr-tableWrap {
    overflow-x: auto;
  }

  .rr-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.82em;
  }

  .rr-table th {
    padding: 6px 4px;
    font-size: 0.8em;
    font-weight: 500;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    text-align: left;
    color: var(--or-muted, #999);
    border-bottom: 1px solid var(--or-table-border, #ccc);
  }

  .rr-table td {
    padding: 6px 4px;
    white-space: nowrap;
    border-bottom: 1px solid color-mix(in srgb, var(--or-table-border, #ccc) 60%, transparent);
  }
</style>
