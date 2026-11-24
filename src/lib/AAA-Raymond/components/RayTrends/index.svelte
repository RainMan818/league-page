<!--
  The /trends page (option A, "dashboard grid"): standings place, points for, max PF, lineup efficiency,
  all-play, total offense / defense and every position, week by week. Every chart but standings can show each week
  on its own as well as the season so far.
  Every team starts shown in its own color; click a team to hide or show it on every chart, hover one to pick out
  its lines. Hidden teams are remembered in this browser (localStorage, optional).
  Data: loadLeagueContext + utils/leagueTrends.js, built from the already-downloaded matchups (no extra requests).
-->
<script>
  import { onMount } from "svelte";
  import { leagueID } from "$lib/utils/leagueInfo";
  import { loadLeagueContext } from "../../utils/leagueContext.js";
  import { leagueTrends, leagueAverage } from "../../utils/leagueTrends.js";
  import { niceTicks } from "./chartGeometry.js";
  import Loading from "../Shared/Loading.svelte";
  import { ordinal } from "../Shared/format.js";
  import Toggle from "../Shared/Toggle.svelte";
  import TrendChart from "./TrendChart.svelte";

  let { standingsData, leagueTeamManagersData } = $props();

  // per league: roster numbers mean different teams in another league
  const STORAGE_KEY = `rr-trends-hidden:${leagueID}`;
  const short = (s, k) => (s.length > k ? s.slice(0, k - 1) + "…" : s);
  const POS_LABEL = { OFF: "Total offense", DEF: "Total defense" };

  let status = $state("loading"); // loading | early | ready | error
  let errorMessage = $state("");
  let data = $state.raw(null);
  let hidden = $state([]);
  let hoverID = $state(null);
  // Points for / Max PF: per-week average by default (season totals bunch up as the weeks add up); "Weekly" is
  // each week's own score (Raymond, Nov 23-24)
  const SCORE_MODES = [
    { value: "each", label: "Weekly" },
    { value: "week", label: "Avg / week" },
    { value: "total", label: "Total" },
    { value: "avg", label: "vs avg" },
  ];
  let pfMode = $state("week");
  let maxMode = $state("week");
  // Lineup efficiency: season so far by default (the Standings page's Efficiency column), or each week on its own
  const EFF_MODES = [
    { value: "season", label: "Season" },
    { value: "week", label: "Weekly" },
  ];
  let effMode = $state("season");
  // All-play and the position charts: season so far by default, or each week on its own (Raymond, Nov 24)
  let apMode = $state("season");
  let posMode = $state("season");

  onMount(async () => {
    try {
      hidden = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    } catch {
      hidden = [];
    }
    try {
      const { standings, divisions, leagueData, players, teams } = await loadLeagueContext({ standingsData, leagueTeamManagersData });
      const matchupsData = standings?.matchups ?? [];
      const rosterIDs = Object.keys(teams);
      // weekly max PF fitted to Sleeper's official season max PF (same numbers as the Standings page)
      const officialMax = Object.fromEntries(Object.values(standings?.standingsInfo ?? {}).map((s) => [String(s.rosterID), s.potentialPoints]));
      const trends = leagueTrends({ matchupsData, rosterIDs, divisions, leagueData, players, officialMax });
      if (trends.weeks.length < 2) {
        status = "early";
        return;
      }
      data = {
        year: standings.yearData,
        trends,
        playoffTeams: leagueData.settings?.playoff_teams || 6,
        medianGame: leagueData.settings?.league_average_match == 1,
        // colors follow roster order, so a team keeps its color everywhere and from week to week
        teams: rosterIDs.map((id, i) => ({ id, name: teams[id].name, color: i % 16 })), // 16 colors (leagues up to 16 teams)
      };
      status = "ready";
    } catch (err) {
      console.error(err);
      errorMessage = err?.message ?? String(err);
      status = "error";
    }
  });

  const save = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(hidden));
    } catch {
      /* private mode etc.: the choice just isn't remembered */
    }
  };
  const toggle = (id) => {
    hidden = hidden.includes(id) ? hidden.filter((h) => h !== id) : [...hidden, id];
    save();
  };
  const showAll = () => {
    hidden = [];
    save();
  };
  const hideAll = () => {
    hidden = data.teams.map((t) => t.id);
    save();
  };

  const visible = $derived(data ? data.teams.filter((t) => !hidden.includes(t.id)) : []);
  const shownLabel = $derived(
    !data ? "" : visible.length === data.teams.length ? `All ${data.teams.length} teams shown` : visible.length === 0 ? "No teams shown" : `${visible.length} of ${data.teams.length} teams shown`
  );

  /** Series for one metric, visible teams only (name = full, for the tooltip; label = shortened end label). */
  const seriesFor = (pick, nameLen = 18) =>
    visible.map((t) => ({ id: t.id, name: t.name, label: short(t.name, nameLen), color: t.color, vals: pick(data.trends.series[t.id]) }));

  /** Each team's rank (1 = best) on the latest week, among all teams, so hiding teams doesn't change it. */
  const ranksFor = (pick, best = "high") => {
    const ids = data.trends.teamIDs;
    const last = (id) => { const v = pick(data.trends.series[id]); return v[v.length - 1]; };
    const sorted = [...ids].sort((a, b) => (best === "high" ? last(b) - last(a) : last(a) - last(b)));
    return Object.fromEntries(sorted.map((id, i) => [id, i + 1]));
  };
  /** Series whose end labels start with the team's rank ("3rd Globo_Gym"; just "3" when the chart is phone-width). */
  const rankedSeries = (pick, nameLen = 13) => {
    const rank = ranksFor(pick);
    return seriesFor(pick, nameLen).map((s) => ({ ...s, rank: rank[s.id], label: `${ordinal(rank[s.id])} ${s.label}` }));
  };

  /** Axis range over every team (not just visible ones), so hiding teams doesn't rescale the chart. */
  const rangeFor = (pick, count = 4) => {
    const all = data.trends.teamIDs.flatMap((id) => pick(data.trends.series[id]));
    return niceTicks(Math.min(...all), Math.max(...all), count);
  };

  /** All-play "each week" axis: every 3 teams (2 in small leagues) up to the top, which is always labeled. */
  const apTicks = (top) => {
    const step = top > 8 ? 3 : 2;
    const ticks = [];
    for (let v = 0; v <= top; v += step) ticks.push(v);
    if (top - ticks[ticks.length - 1] >= 2) ticks.push(top);
    else ticks[ticks.length - 1] = top;
    return [...new Set(ticks)];
  };
  const signed = (v, d) => `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(d)}`;
  /**
   * Points for / Max PF in one of the views: season average per week, season total, total minus the league average,
   * or each week on its own.
   */
  const scoreChart = (key, mode) => {
    const t = data.trends;
    if (mode === "each") {
      const pick = key === "maxCum" ? (s) => s.maxWeek : (s) => s.pfWeek;
      return {
        range: rangeFor(pick),
        series: rankedSeries(pick),
        fmt: (v) => v.toFixed(1),
        tickFmt: (v) => v.toLocaleString("en-US"),
        mark: null,
        refs: [{ label: "League avg", vals: leagueAverage(t, pick) }],
        note: `${key === "maxCum" ? "Best possible lineup, each" : "Each"} week on its own · dashed = league average`,
      };
    }
    const avg = leagueAverage(t, (s) => s[key]);
    const pick =
      mode === "total" ? (s) => s[key] : mode === "avg" ? (s) => s[key].map((v, w) => v - avg[w]) : (s) => s[key].map((v, w) => v / (w + 1));
    const what = key === "maxCum" ? "Best possible lineup, " : "";
    return {
      range: rangeFor(pick),
      series: rankedSeries(pick),
      fmt: mode === "avg" ? (v) => signed(v, 1) : (v) => v.toFixed(1),
      tickFmt: mode === "avg" ? (v) => (v === 0 ? "0" : signed(v, 0)) : (v) => v.toLocaleString("en-US"),
      mark: mode === "avg" ? { value: 0, label: "LEAGUE AVERAGE" } : null,
      refs: mode === "avg" ? [] : [{ label: "League avg", vals: mode === "total" ? avg : avg.map((v, w) => v / (w + 1)) }],
      note:
        mode === "total"
          ? `${what}season total after each week · dashed = league average`
          : mode === "avg"
            ? `${what}season total above or below the league average`
            : `${what}season average per week · dashed = league average`,
    };
  };

  const charts = $derived.by(() => {
    if (!data) return null;
    const t = data.trends;
    const nTeams = t.teamIDs.length;
    const pct = (v) => `${v.toFixed(0)}%`;
    const effPick = effMode === "week" ? (s) => s.effWeek : (s) => s.effCum;
    const effR = rangeFor(effPick);
    // offense vs defense only when the lineup starts defenders (IDP or a team defense); otherwise offense = points for
    const defense = t.positions.some((p) => ["DL", "LB", "DB", "DEF"].includes(p));
    const posOf = posMode === "week" ? (s) => s.posWeek : (s) => s.pos;
    const sides = (defense ? ["OFF", "DEF"] : []).map((p) => {
      const pick = (s) => posOf(s)[p];
      return { key: p, label: POS_LABEL[p], range: rangeFor(pick), series: rankedSeries(pick), refs: [{ label: "League avg", vals: leagueAverage(t, pick) }] };
    });
    const positions = t.positions.map((p) => {
      const pick = (s) => posOf(s)[p];
      return { key: p, range: rangeFor(pick, 3), series: seriesFor(pick), refs: [{ label: "League avg", vals: leagueAverage(t, pick) }] };
    });
    return {
      place: {
        series: seriesFor((s) => s.place, 22).map((s) => ({ ...s, rank: s.vals[s.vals.length - 1], label: `${ordinal(s.vals[s.vals.length - 1])} ${s.label}` })),
        ticks: [1, 3, 6, 9, nTeams].filter((v, i, a) => v <= nTeams && a.indexOf(v) === i),
        max: nTeams,
      },
      pf: scoreChart("pfCum", pfMode),
      max: scoreChart("maxCum", maxMode),
      eff: {
        range: { ...effR, max: Math.min(100, effR.max) },
        series: rankedSeries(effPick),
        fmt: pct,
        note: effMode === "week" ? "Points started ÷ best possible lineup, each week on its own" : "Points started ÷ best possible lineup, season so far after each week",
      },
      ap:
        apMode === "week"
          ? {
              // teams beaten that week (ties count half), out of everyone else
              series: rankedSeries((s) => s.allPlayWeek),
              min: 0,
              max: nTeams - 1,
              ticks: apTicks(nTeams - 1),
              fmt: (v) => `${Number.isInteger(v) ? v : v.toFixed(1)} of ${nTeams - 1}`,
              tickFmt: (v) => String(v),
              mark: { value: (nTeams - 1) / 2, label: "AVERAGE" },
              note: `Teams you'd have beaten that week, out of ${nTeams - 1}`,
            }
          : {
              series: rankedSeries((s) => s.allPlay),
              min: 0,
              max: 100,
              ticks: [0, 25, 50, 75, 100],
              fmt: pct,
              tickFmt: (v) => `${v}%`,
              mark: { value: 50, label: "AVERAGE" },
              note: "Your record if you played every team every week (season so far)",
            },
      posNote: posMode === "week" ? "Points each week on its own" : "Points per week, season average after each week",
      sides,
      positions,
    };
  });
</script>

<div class="rr-trends">
  <h1 class="rr-pageTitle">{data?.year ?? ""} Season Trends</h1>

  {#if status === "loading"}
    <Loading message="Loading trends..." />
  {:else if status === "early"}
    <Loading message="Trends show up once two weeks have been played" progress={false} />
  {:else if status === "error"}
    <Loading message="Couldn't load the trends: {errorMessage}" progress={false} />
  {:else if data && charts}
    <p class="rr-pageSub">
      Weeks 1–{data.trends.weeks.length}{data.medianGame ? " · records include the weekly median game" : ""} · click a team to show or hide it on every chart, hover to pick out its lines
    </p>

    <div class="rr-controls">
      <span class="rr-count">{shownLabel}</span>
      <button type="button" class="rr-ctl" onclick={showAll}>Show all</button>
      <button type="button" class="rr-ctl" onclick={hideAll}>Hide all</button>
    </div>
    <div class="rr-chips">
      {#each data.teams as t (t.id)}
        {@const on = !hidden.includes(t.id)}
        <button
          type="button"
          class="rr-chip"
          class:rr-off={!on}
          class:rr-hover={hoverID === t.id}
          style="--c: var(--rr-team-{t.color})"
          aria-pressed={on}
          aria-label="{on ? 'Hide' : 'Show'} {t.name} on the charts"
          onclick={() => toggle(t.id)}
          onmouseenter={() => (hoverID = t.id)}
          onmouseleave={() => (hoverID = null)}
          onfocus={() => (hoverID = t.id)}
          onblur={() => (hoverID = null)}
        >
          <span class="rr-swatch" aria-hidden="true"></span>{t.name}
        </button>
      {/each}
    </div>

    <section class="rr-card">
      <h3>Standings</h3>
      <p class="rr-note">Place after each week (playoff seeding rules) · dashed line = playoff cut</p>
      <TrendChart
        title="Standings by week"
        weeks={data.trends.weeks}
        series={charts.place.series}
        min={1}
        max={charts.place.max}
        ticks={charts.place.ticks}
        invert
        fmt={(v) => ordinal(v)}
        mark={{ value: data.playoffTeams + 0.5, label: "PLAYOFF LINE" }}
        w={1088}
        h={340}
        {hoverID}
      />
    </section>

    <div class="rr-grid2">
      <section class="rr-card">
        <div class="rr-cardHead">
          <h3>Points for</h3>
          <Toggle small label="Points for view" options={SCORE_MODES} bind:value={pfMode} />
        </div>
        <p class="rr-note rr-capFirst">{charts.pf.note}</p>
        <TrendChart title="Points for by week" weeks={data.trends.weeks} series={charts.pf.series} refs={charts.pf.refs} min={charts.pf.range.min} max={charts.pf.range.max} ticks={charts.pf.range.ticks} fmt={charts.pf.fmt} tickFmt={charts.pf.tickFmt} mark={charts.pf.mark} {hoverID} />
      </section>
      <section class="rr-card">
        <div class="rr-cardHead">
          <h3>Max PF</h3>
          <Toggle small label="Max PF view" options={SCORE_MODES} bind:value={maxMode} />
        </div>
        <p class="rr-note rr-capFirst">{charts.max.note}</p>
        <TrendChart title="Max PF by week" weeks={data.trends.weeks} series={charts.max.series} refs={charts.max.refs} min={charts.max.range.min} max={charts.max.range.max} ticks={charts.max.range.ticks} fmt={charts.max.fmt} tickFmt={charts.max.tickFmt} mark={charts.max.mark} {hoverID} />
      </section>
      <section class="rr-card">
        <div class="rr-cardHead">
          <h3>Lineup efficiency</h3>
          <Toggle small label="Lineup efficiency view" options={EFF_MODES} bind:value={effMode} />
        </div>
        <p class="rr-note">{charts.eff.note}</p>
        <TrendChart title="Lineup efficiency by week" weeks={data.trends.weeks} series={charts.eff.series} min={charts.eff.range.min} max={charts.eff.range.max} ticks={charts.eff.range.ticks} fmt={charts.eff.fmt} tickFmt={(v) => `${v}%`} {hoverID} />
      </section>
      <section class="rr-card">
        <div class="rr-cardHead">
          <h3>All-play</h3>
          <Toggle small label="All-play view" options={EFF_MODES} bind:value={apMode} />
        </div>
        <p class="rr-note">{charts.ap.note}</p>
        <TrendChart title="All-play by week" weeks={data.trends.weeks} series={charts.ap.series} min={charts.ap.min} max={charts.ap.max} ticks={charts.ap.ticks} fmt={charts.ap.fmt} tickFmt={charts.ap.tickFmt} mark={charts.ap.mark} {hoverID} />
      </section>
    </div>

    <section class="rr-card">
      <div class="rr-cardHead">
        <h3>Points by position</h3>
        <Toggle small label="Points by position view" options={EFF_MODES} bind:value={posMode} />
      </div>
      <p class="rr-note">{charts.posNote}{charts.sides.length ? " · totals include the flex slots" : ""} · dashed = league average</p>
      {#if charts.sides.length}
      <div class="rr-grid2 rr-sides">
        {#each charts.sides as c (c.key)}
          <div>
            <span class="rr-posLabel">{c.label}</span>
            <TrendChart title="{c.label} points by week" weeks={data.trends.weeks} series={c.series} refs={c.refs} min={c.range.min} max={c.range.max} ticks={c.range.ticks} {hoverID} />
          </div>
        {/each}
      </div>
      {/if}
      <div class="rr-minis">
        {#each charts.positions as c (c.key)}
          <div>
            <span class="rr-posLabel" style="color: var(--or-pos-{c.key}, var(--or-cyan))">{c.key}</span>
            <TrendChart title="{c.key} points by week" weeks={data.trends.weeks} series={c.series} refs={c.refs} min={c.range.min} max={c.range.max} ticks={c.range.ticks} compact labels={false} w={240} h={110} {hoverID} />
          </div>
        {/each}
      </div>
    </section>
  {/if}
</div>

<style>
  .rr-trends {
    /* one fixed color per team (roster order); 12 hues can't all be told apart, so lines also get end labels and
       the hover highlight. Darker shades in day mode keep contrast on the light background. */
    --rr-team-0: #ff2a6d;
    --rr-team-1: #05d9e8;
    --rr-team-2: #ff9e3d;
    --rr-team-3: #b537f2;
    --rr-team-4: #fff67a;
    --rr-team-5: #00ceb8;
    --rr-team-6: #58a7ff;
    --rr-team-7: #ff795a;
    --rr-team-8: #9be15d;
    --rr-team-9: #ff7cb6;
    --rr-team-10: #6d7df5;
    --rr-team-11: #e6d3ff;
    --rr-team-12: #f5a3ff;
    --rr-team-13: #7fffd4;
    --rr-team-14: #ffcf33;
    --rr-team-15: #c9c9d6;
    max-width: 1140px;
    margin: 0 auto;
    padding: 0 16px 4em;
    display: flex;
    flex-direction: column;
    gap: 18px;
    text-align: left;
  }

  :global(html[data-theme="day"]) .rr-trends {
    --rr-team-0: #d1004f;
    --rr-team-1: #007f8c;
    --rr-team-2: #c25e00;
    --rr-team-3: #8a1fc0;
    --rr-team-4: #8a7a00;
    --rr-team-5: #00806f;
    --rr-team-6: #1f6fd1;
    --rr-team-7: #c2410c;
    --rr-team-8: #4d8a1c;
    --rr-team-9: #c2186b;
    --rr-team-10: #3b47b8;
    --rr-team-11: #6b5a8e;
    --rr-team-12: #a3389f;
    --rr-team-13: #0f7a5a;
    --rr-team-14: #9a6a00;
    --rr-team-15: #5c5c6e;
  }

  .rr-pageTitle {
    margin: 0.6em 0 0;
    text-align: center;
    font: 500 2.125rem "Orbitron", sans-serif;
    color: var(--or-heading);
    text-shadow: var(--or-heading-glow);
  }

  .rr-pageSub {
    margin: -6px auto 0;
    max-width: 720px;
    text-align: center;
    font-size: 0.85em;
    color: var(--or-muted);
  }

  .rr-controls {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: center;
    gap: 10px;
  }

  .rr-count {
    font-size: 0.8em;
    color: var(--or-muted);
  }

  .rr-ctl {
    min-height: 32px;
    padding: 0 12px;
    border: 1px solid var(--or-toggle-border, var(--or-table-border));
    border-radius: 6px;
    background: transparent;
    color: var(--or-cyan);
    font: 700 0.72em "Roboto", sans-serif;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    cursor: pointer;
  }

  .rr-ctl:hover {
    border-color: var(--or-pink);
  }

  .rr-chips {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
    margin-top: -6px;
  }

  .rr-chip {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    min-height: 36px;
    padding: 0 12px;
    border: 1px solid var(--c);
    border-radius: 999px;
    background: color-mix(in srgb, var(--or-text) 5%, transparent);
    color: var(--or-text);
    font: 600 0.78em "Roboto", sans-serif;
    cursor: pointer;
  }

  .rr-chip.rr-hover {
    background: color-mix(in srgb, var(--or-text) 13%, transparent);
  }

  .rr-chip.rr-off {
    border-color: var(--or-table-border);
    background: transparent;
    color: var(--or-muted);
  }

  /* filled = shown, outlined = hidden, so the state isn't color alone */
  .rr-swatch {
    flex: none;
    box-sizing: border-box;
    width: 10px;
    height: 10px;
    border: 2px solid var(--c);
    border-radius: 3px;
    background: var(--c);
  }

  .rr-off .rr-swatch {
    background: transparent;
  }

  .rr-card {
    min-width: 0;
    padding: 16px 18px;
    border: 1px solid var(--or-table-border);
    border-radius: 14px;
    background: var(--fff);
    box-shadow: 0 6px 24px var(--or-table-shadow, transparent);
  }

  .rr-card h3 {
    margin: 0;
    font: 700 0.95rem "Orbitron", sans-serif;
    color: var(--or-heading);
  }

  .rr-cardHead {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 6px 10px;
  }

  .rr-capFirst::first-letter {
    text-transform: uppercase;
  }

  .rr-note {
    margin: 2px 0 8px;
    font-size: 0.78em;
    color: var(--or-muted);
  }

  .rr-grid2 {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 18px;
  }

  .rr-sides {
    padding-bottom: 14px;
    margin-bottom: 12px;
    border-bottom: 1px solid var(--or-table-border);
  }

  .rr-posLabel {
    display: block;
    margin-bottom: 4px;
    font: 700 0.75em "Roboto", sans-serif;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--or-cyan);
  }

  .rr-minis {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 14px 18px;
  }

  @media (max-width: 760px) {
    .rr-grid2 {
      grid-template-columns: 1fr;
    }

    .rr-minis {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .rr-card {
      padding: 14px 12px;
    }
  }
</style>
