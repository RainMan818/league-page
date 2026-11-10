<!--
  The /trends page (option A, "dashboard grid"): standings place, points for, max PF, lineup efficiency,
  all-play win %, total offense / defense and every position, week by week.
  Every team starts shown in its own color; click a team to hide or show it on every chart, hover one to pick out
  its lines. Hidden teams are remembered in this browser (localStorage, optional).
  Data: loadLeagueContext + utils/leagueTrends.js, built from the already-downloaded matchups (no extra requests).
-->
<script>
  import { onMount } from "svelte";
  import { loadLeagueContext } from "../../utils/leagueContext.js";
  import { leagueTrends, leagueAverage } from "../../utils/leagueTrends.js";
  import { niceTicks } from "./chartGeometry.js";
  import Loading from "../Shared/Loading.svelte";
  import TrendChart from "./TrendChart.svelte";

  let { standingsData, leagueTeamManagersData } = $props();

  const STORAGE_KEY = "rr-trends-hidden";
  const ord = (k) => k + (k % 100 >= 11 && k % 100 <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" }[k % 10] ?? "th"));
  const short = (s, k) => (s.length > k ? s.slice(0, k - 1) + "…" : s);
  const POS_LABEL = { OFF: "Total offense", DEF: "Total defense" };

  let status = $state("loading"); // loading | early | ready | error
  let errorMessage = $state("");
  let data = $state.raw(null);
  let hidden = $state([]);
  let hoverID = $state(null);

  onMount(async () => {
    try {
      hidden = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    } catch {
      hidden = [];
    }
    try {
      const { standings, rosters, leagueData, players, teams } = await loadLeagueContext({ standingsData, leagueTeamManagersData });
      const matchupsData = standings?.matchups ?? [];
      const rosterIDs = Object.keys(teams);
      const divisions = Object.fromEntries(rosterIDs.map((id) => [id, rosters[id]?.settings?.division ?? null]));
      const trends = leagueTrends({ matchupsData, rosterIDs, divisions, leagueData, players });
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
        teams: rosterIDs.map((id, i) => ({ id, name: teams[id].name, color: i % 12 })),
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
    return seriesFor(pick, nameLen).map((s) => ({ ...s, rank: rank[s.id], label: `${ord(rank[s.id])} ${s.label}` }));
  };

  /** Axis range over every team (not just visible ones), so hiding teams doesn't rescale the chart. */
  const rangeFor = (pick, count = 4) => {
    const all = data.trends.teamIDs.flatMap((id) => pick(data.trends.series[id]));
    return niceTicks(Math.min(...all), Math.max(...all), count);
  };

  const charts = $derived.by(() => {
    if (!data) return null;
    const t = data.trends;
    const nTeams = t.teamIDs.length;
    const pct = (v) => `${v.toFixed(0)}%`;
    const pfR = rangeFor((s) => s.pfCum);
    const maxR = rangeFor((s) => s.maxCum);
    const effR = rangeFor((s) => s.effWeek);
    const sides = ["OFF", "DEF"].map((p) => {
      const pick = (s) => s.pos[p];
      return { key: p, label: POS_LABEL[p], range: rangeFor(pick), series: rankedSeries(pick), refs: [{ label: "League avg", vals: leagueAverage(t, pick) }] };
    });
    const positions = t.positions.map((p) => {
      const pick = (s) => s.pos[p];
      return { key: p, range: rangeFor(pick, 3), series: seriesFor(pick), refs: [{ label: "League avg", vals: leagueAverage(t, pick) }] };
    });
    return {
      place: {
        series: seriesFor((s) => s.place, 22).map((s) => ({ ...s, rank: s.vals[s.vals.length - 1], label: `${ord(s.vals[s.vals.length - 1])} ${s.label}` })),
        ticks: [1, 3, 6, 9, nTeams].filter((v, i, a) => v <= nTeams && a.indexOf(v) === i),
        max: nTeams,
      },
      pf: { range: pfR, series: rankedSeries((s) => s.pfCum) },
      max: { range: maxR, series: rankedSeries((s) => s.maxCum) },
      eff: { range: { ...effR, max: Math.min(100, effR.max) }, series: rankedSeries((s) => s.effWeek), fmt: pct },
      ap: { series: rankedSeries((s) => s.allPlay), fmt: pct },
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
        fmt={(v) => ord(v)}
        mark={{ value: data.playoffTeams + 0.5, label: "PLAYOFF LINE" }}
        w={1088}
        h={340}
        {hoverID}
      />
    </section>

    <div class="rr-grid2">
      <section class="rr-card">
        <h3>Points for</h3>
        <p class="rr-note">Season total after each week</p>
        <TrendChart title="Points for, season total, by week" weeks={data.trends.weeks} series={charts.pf.series} min={charts.pf.range.min} max={charts.pf.range.max} ticks={charts.pf.range.ticks} {hoverID} />
      </section>
      <section class="rr-card">
        <h3>Max PF</h3>
        <p class="rr-note">Best possible lineup, season total after each week</p>
        <TrendChart title="Max PF, season total, by week" weeks={data.trends.weeks} series={charts.max.series} min={charts.max.range.min} max={charts.max.range.max} ticks={charts.max.range.ticks} {hoverID} />
      </section>
      <section class="rr-card">
        <h3>Lineup efficiency</h3>
        <p class="rr-note">Points started ÷ best possible lineup, each week</p>
        <TrendChart title="Lineup efficiency by week" weeks={data.trends.weeks} series={charts.eff.series} min={charts.eff.range.min} max={charts.eff.range.max} ticks={charts.eff.range.ticks} fmt={charts.eff.fmt} tickFmt={(v) => `${v}%`} {hoverID} />
      </section>
      <section class="rr-card">
        <h3>All-play win %</h3>
        <p class="rr-note">Your record if you played every team every week (season so far)</p>
        <TrendChart title="All-play win percentage by week" weeks={data.trends.weeks} series={charts.ap.series} min={0} max={100} ticks={[0, 25, 50, 75, 100]} fmt={charts.ap.fmt} tickFmt={(v) => `${v}%`} mark={{ value: 50, label: "AVERAGE" }} {hoverID} />
      </section>
    </div>

    <section class="rr-card">
      <h3>Position averages</h3>
      <p class="rr-note">Points per week, season average after each week · totals include the flex slots · dashed = league average</p>
      <div class="rr-grid2 rr-sides">
        {#each charts.sides as c (c.key)}
          <div>
            <span class="rr-posLabel">{c.label}</span>
            <TrendChart title="{c.label} points per week by week" weeks={data.trends.weeks} series={c.series} refs={c.refs} min={c.range.min} max={c.range.max} ticks={c.range.ticks} {hoverID} />
          </div>
        {/each}
      </div>
      <div class="rr-minis">
        {#each charts.positions as c (c.key)}
          <div>
            <span class="rr-posLabel" style="color: var(--or-pos-{c.key}, var(--or-cyan))">{c.key}</span>
            <TrendChart title="{c.key} points per week by week" weeks={data.trends.weeks} series={c.series} refs={c.refs} min={c.range.min} max={c.range.max} ticks={c.range.ticks} compact labels={false} w={240} h={110} {hoverID} />
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
