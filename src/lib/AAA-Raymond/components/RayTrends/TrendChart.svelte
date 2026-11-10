<!--
  One trend line chart (SVG). Every visible team is a line in its own color (CSS var --rr-team-N, set in
  RayTrends/index.svelte so day mode gets darker shades). Optional dashed reference lines (league average, median),
  a dashed marker (playoff line, 50%), end labels with a short tick to their line, and a week crosshair + tooltip.
  Hovering a team elsewhere on the page (hoverID) thickens its line and fades the rest.
-->
<script>
  import { scales, points, spreadLabels, nearestIndex } from "./chartGeometry.js";

  let {
    title = "",
    weeks = [],
    series = [], // [{ id, name, color: index, vals, label?, rank? }] (label = end label text, defaults to name; rank = short label)
    refs = [], // [{ label, vals }]
    min = 0,
    max = 1,
    ticks = [],
    invert = false,
    fmt = (v) => v.toFixed(1),
    tickFmt = (v) => String(v),
    mark = null, // { value, label }
    labels = true,
    compact = false,
    w = 496, // fallback width before the chart is measured; it then draws at its real width so text stays 11px
    h = 230,
    hoverID = null,
  } = $props();

  let boxW = $state(0);
  const W = $derived(boxW > 0 ? Math.round(boxW) : w);
  // Full end labels ("3rd Globo_Gym") need ~150px. On a phone-width chart each line is labeled with just its rank
  // number (~30px); the tooltip names the teams. The position charts pass labels={false} and show end dots only.
  const short = $derived(compact || W < 480);
  const hasRanks = $derived(series.some((s) => s.rank != null));
  const showLabels = $derived(labels && W >= 110 && (!short || hasRanks));
  const pad = $derived.by(() => {
    const r = !showLabels ? (compact ? 10 : 16) : short ? 30 : 150;
    return compact ? { l: 6, r, t: 8, b: 8 } : { l: 44, r, t: 14, b: 26 };
  });
  const n = $derived(weeks.length);
  const sc = $derived(scales({ w: W, h, pad, n, min, max, invert }));

  const lines = $derived(
    series
      .map((s) => ({
        ...s,
        pts: points(s.vals, sc.X, sc.Y),
        endX: sc.X(n - 1),
        endY: sc.Y(s.vals[n - 1]),
        on: hoverID === s.id,
        faded: hoverID != null && hoverID !== s.id,
      }))
      // the highlighted line draws last so it sits on top
      .sort((a, b) => Number(a.on) - Number(b.on))
  );

  const endLabels = $derived.by(() => {
    if (!showLabels) return [];
    const gap = short ? 11 : 13;
    const ys = spreadLabels(lines.map((l) => l.endY + 4), { gap, floor: h - pad.b + 4, ceil: pad.t + 4 });
    return lines.map((l, i) => ({ ...l, ly: ys[i], lx: l.endX + (short ? 14 : 22), text: short ? String(l.rank ?? "") : (l.label ?? l.name) }));
  });

  const refLines = $derived(refs.map((r) => ({ ...r, pts: points(r.vals, sc.X, sc.Y) })));
  const gridLines = $derived(compact ? [] : ticks.map((t) => ({ y: sc.Y(t), t })));

  // crosshair + tooltip
  let svgEl = $state(null);
  let hoverIdx = $state(null);
  const move = (ev) => {
    if (!svgEl || n < 1) return;
    const r = svgEl.getBoundingClientRect();
    const x = ((ev.clientX - r.left) / r.width) * W;
    hoverIdx = nearestIndex(x, sc.X, n);
  };
  const tip = $derived.by(() => {
    if (hoverIdx == null) return null;
    const rows = series
      .map((s) => ({ id: s.id, name: s.name, color: s.color, v: s.vals[hoverIdx] }))
      .sort((a, b) => (invert ? a.v - b.v : b.v - a.v));
    return {
      week: weeks[hoverIdx],
      x: sc.X(hoverIdx),
      leftPct: (sc.X(hoverIdx) / W) * 100,
      flip: sc.X(hoverIdx) > W * 0.55,
      rows,
      refs: refs.map((r) => ({ label: r.label, v: r.vals[hoverIdx] })),
    };
  });
</script>

<div class="rr-chart" class:rr-compact={compact} bind:clientWidth={boxW}>
  <svg
    bind:this={svgEl}
    viewBox="0 0 {W} {h}"
    role="img"
    aria-label={title}
    onpointermove={move}
    onpointerdown={move}
    onpointerleave={() => (hoverIdx = null)}
  >
    {#each gridLines as g}
      <line class="rr-grid" x1={pad.l} x2={W - pad.r} y1={g.y} y2={g.y}></line>
      <text class="rr-axis" x={pad.l - 6} y={g.y + 4} text-anchor="end">{tickFmt(g.t)}</text>
    {/each}
    {#if !compact}
      {#each weeks as wk, i}
        <text class="rr-axis" x={sc.X(i)} y={h - 7} text-anchor="middle">W{wk}</text>
      {/each}
    {/if}
    {#if mark}
      <line class="rr-mark" x1={pad.l} x2={W - pad.r} y1={sc.Y(mark.value)} y2={sc.Y(mark.value)}></line>
      {#if !compact}<text class="rr-markLabel" x={pad.l + 4} y={sc.Y(mark.value) - 5}>{mark.label}</text>{/if}
    {/if}
    {#each refLines as r}
      <polyline class="rr-ref" points={r.pts}></polyline>
    {/each}
    {#each lines as l (l.id)}
      <polyline
        class="rr-line"
        class:rr-on={l.on}
        class:rr-faded={l.faded}
        points={l.pts}
        style="stroke: var(--rr-team-{l.color})"
        stroke-width={l.on ? (compact ? 3 : 3.5) : compact ? 1.6 : 2}
      ></polyline>
    {/each}
    {#each endLabels as l (l.id)}
      <g class:rr-faded={l.faded}>
        <line x1={l.endX} y1={l.endY} x2={l.lx - 3} y2={l.ly - 4} style="stroke: var(--rr-team-{l.color})" stroke-width="1.5"></line>
        <circle cx={l.endX} cy={l.endY} r="4" class="rr-dot" style="fill: var(--rr-team-{l.color})"></circle>
        <text class="rr-label" class:rr-labelSm={short} x={l.lx} y={l.ly}>{l.text}</text>
      </g>
    {/each}
    {#if compact && !showLabels}
      {#each lines as l (l.id)}
        <circle cx={l.endX} cy={l.endY} r="3" class:rr-faded={l.faded} style="fill: var(--rr-team-{l.color})"></circle>
      {/each}
    {/if}
    {#if tip}
      <line class="rr-cross" x1={tip.x} x2={tip.x} y1={pad.t} y2={h - pad.b}></line>
    {/if}
  </svg>

  {#if tip && (tip.rows.length || tip.refs.length)}
    <div class="rr-tip" class:rr-flip={tip.flip} style="left: {tip.leftPct}%" role="status">
      <div class="rr-tipHead">Week {tip.week}</div>
      {#each tip.refs as r}
        <div class="rr-tipRow rr-tipRef"><span class="rr-tipSwatch rr-dash"></span><span class="rr-tipName">{r.label}</span><b>{fmt(r.v)}</b></div>
      {/each}
      {#each tip.rows as r (r.id)}
        <div class="rr-tipRow" class:rr-on={hoverID === r.id}>
          <span class="rr-tipSwatch" style="background: var(--rr-team-{r.color})"></span>
          <span class="rr-tipName">{r.name}</span>
          <b>{fmt(r.v)}</b>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .rr-chart {
    position: relative;
    width: 100%;
  }

  svg {
    display: block;
    width: 100%;
    height: auto;
    overflow: visible;
    font-family: "Roboto", sans-serif;
    touch-action: pan-y;
  }

  .rr-grid {
    stroke: var(--or-table-border, rgba(181, 55, 242, 0.18));
    stroke-opacity: 0.6;
  }

  .rr-axis {
    fill: var(--or-muted, #9a86c4);
    font-size: 11px;
  }

  .rr-mark {
    stroke: var(--or-pink, #ff2a6d);
    stroke-dasharray: 6 5;
    stroke-width: 1.5;
  }

  .rr-markLabel {
    fill: var(--or-pink, #ff2a6d);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.1em;
  }

  .rr-ref {
    fill: none;
    stroke: var(--or-text, #efe6ff);
    stroke-opacity: 0.75;
    stroke-width: 1.5;
    stroke-dasharray: 5 5;
  }

  .rr-line {
    fill: none;
    stroke-linejoin: round;
    stroke-linecap: round;
    transition: stroke-opacity 0.15s;
  }

  .rr-faded {
    opacity: 0.15;
  }

  .rr-dot {
    stroke: var(--fff, #120726);
    stroke-width: 2;
  }

  .rr-labelSm {
    font-size: 10px;
  }

  .rr-label {
    fill: var(--or-text, #efe6ff);
    font-size: 11px;
    font-weight: 700;
  }

  .rr-cross {
    stroke: var(--or-text, #efe6ff);
    stroke-opacity: 0.35;
    stroke-width: 1;
  }

  .rr-tip {
    position: absolute;
    top: 0;
    z-index: 5;
    min-width: 180px;
    max-width: 240px;
    padding: 8px 10px;
    margin-left: 12px;
    border: 1px solid var(--or-table-border, rgba(181, 55, 242, 0.4));
    border-radius: 10px;
    background: var(--fff, #120726);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
    pointer-events: none;
    font-size: 12px;
    color: var(--or-text, #efe6ff);
    text-align: left;
  }

  .rr-tip.rr-flip {
    transform: translateX(-100%);
    margin-left: -12px;
  }

  .rr-tipHead {
    margin-bottom: 4px;
    font: 700 11px "Orbitron", sans-serif;
    letter-spacing: 0.08em;
    color: var(--or-cyan, #05d9e8);
  }

  .rr-tipRow {
    display: grid;
    grid-template-columns: 10px minmax(0, 1fr) auto;
    align-items: center;
    gap: 6px;
    line-height: 1.55;
  }

  .rr-tipRow.rr-on {
    font-weight: 700;
  }

  .rr-tipRef {
    color: var(--or-muted, #9a86c4);
  }

  .rr-tipSwatch {
    width: 10px;
    height: 10px;
    border-radius: 3px;
  }

  .rr-tipSwatch.rr-dash {
    height: 0;
    border-top: 2px dashed var(--or-text, #efe6ff);
    border-radius: 0;
  }

  .rr-tipName {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .rr-compact .rr-tip {
    min-width: 160px;
  }
</style>
