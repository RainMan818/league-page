<!--
  Players page (/players): "Trending free agents" (design canvas option A, Nov 15) = free agents whose role is growing.
  A ranked table: snaps (last 2 games against earlier), points per game (last 3 against earlier), the last six weeks
  as snap bars with points under them, and why: injury fill-ins (the teammate he's replacing and that player's
  status), his own injury status, and how many Sleeper leagues added him today. Filter chips by side / position and
  a switch to leave fill-ins out. Names open the player card. Data: /api/fetch_trending (Sleeper's weekly stats,
  trimmed and cached on the server) + the league's rosters and players (already loaded); math in utils/trending.js.
  Second section, "Top free agents" (Nov 16): free agents by season points (or points per game, 3+ games), with the
  last 3 games, recent snap share, the same weekly bars, injury status and Sleeper adds; its own filters. Same data.
-->
<script>
  import { loadLeagueBasics } from "../../utils/leagueContext.js";
  import { trendingPlayers, bestAvailable, matchesFilter, weeksLabel, TREND_RULES, BEST_RULES } from "../../utils/trending.js";
  import { posColor } from "../../utils/positions.js";
  import Loading from "../Shared/Loading.svelte";

  const FILTERS = ["All", "Offense", "IDP", "QB", "RB", "WR", "TE", "DL", "LB", "DB"];
  const FIRST = 15;
  const STATUS = { IR: "on IR", Out: "Out", Doubtful: "Doubtful", Questionable: "Questionable", PUP: "on PUP", Sus: "suspended", NA: "inactive" };

  let status = $state("loading"); // loading | ready | error
  let rows = $state.raw([]);
  let players = $state.raw({});
  let through = $state(0);
  let filter = $state("All");
  let withFillIns = $state(true);
  let shown = $state(FIRST);
  // Top free agents
  let source = $state.raw(null);
  let bestFilter = $state("All");
  let bestSort = $state("total"); // total | perGame
  let bestShown = $state(FIRST);

  $effect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/fetch_trending").then((r) => {
        if (!r.ok) throw new Error(`trending ${r.status}`);
        return r.json();
      }),
      loadLeagueBasics(),
    ])
      .then(([data, basics]) => {
        if (cancelled) return;
        const rostered = Object.values(basics.rosters ?? {}).flatMap((r) => r?.players ?? []);
        players = basics.players;
        through = data.through;
        rows = trendingPlayers({ weeks: data.weeks, players: basics.players, rostered, adds: data.adds });
        source = { weeks: data.weeks, players: basics.players, rostered, adds: data.adds };
        status = "ready";
      })
      .catch((e) => {
        console.error(e);
        if (!cancelled) status = "error";
      });
    return () => (cancelled = true);
  });

  const visible = $derived(rows.filter((r) => matchesFilter(r, filter) && (withFillIns || !r.fillIns.length)));
  const fillInCount = $derived(rows.filter((r) => matchesFilter(r, filter) && r.fillIns.length).length);
  const pick = (f) => {
    filter = f;
    shown = FIRST;
  };

  const best = $derived(source ? bestAvailable({ ...source, sort: bestSort }) : []);
  const bestVisible = $derived(best.filter((r) => matchesFilter(r, bestFilter)));
  const pickBest = (f) => {
    bestFilter = f;
    bestShown = FIRST;
  };
  const sortBest = (s) => {
    bestSort = s;
    bestShown = FIRST;
  };
  const bestNotes = (r) => {
    const out = [];
    const own = players[r.id]?.is;
    if (own) out.push({ tone: "own", text: `Listed ${STATUS[own] ?? own}` });
    if (r.adds) out.push({ tone: "adds", text: `Added in ${r.adds >= 1000 ? `${Math.round(r.adds / 1000)}K` : r.adds} Sleeper leagues today` });
    return out;
  };

  const name = (id) => (players[id] ? `${players[id].fn} ${players[id].ln}` : id);
  const fmt = (n, d = 1) => Number(n ?? 0).toFixed(d);
  const firstWeek = $derived(rows[0]?.weeks?.[0]?.week ?? Math.max(1, through - TREND_RULES.shownWeeks + 1));

  /** Why he's on the list: fill-ins first (the two most-used starters), then his own status and Sleeper adds. */
  const reasons = (r) => {
    const out = [];
    for (const f of r.fillIns.slice(0, 2)) {
      const missed = `missed ${weeksLabel(f.missed)}`;
      if (f.status === "back") out.push({ tone: "back", text: `Filling in for ${name(f.id)} (${missed}, back for the latest game: his snaps may drop)` });
      else if (f.status === "healthy") out.push({ tone: "back", text: `Filling in for ${name(f.id)} (${missed}, not listed injured)` });
      else out.push({ tone: "fill", text: `Filling in for ${name(f.id)} (${missed}, now ${STATUS[f.status] ?? f.status})` });
    }
    if (r.fillIns.length > 2) out.push({ tone: "fill", text: `+${r.fillIns.length - 2} more missing at his position` });
    const own = players[r.id]?.is;
    if (own) out.push({ tone: "own", text: `Listed ${STATUS[own] ?? own}` });
    if (r.adds) out.push({ tone: "adds", text: `Added in ${r.adds >= 1000 ? `${Math.round(r.adds / 1000)}K` : r.adds} Sleeper leagues today` });
    return out;
  };
  const ICON = { fill: "✚", back: "↩", own: "!", adds: "↗" };
</script>

{#snippet delta(a, b, unit, d)}
  <span class="rr-delta">
    <span class="rr-from">{fmt(a, d)}{unit}</span>
    <span class="rr-from">→</span>
    <b>{fmt(b, d)}{unit}</b>
    <small class:rr-down={b < a}>{b >= a ? "▲" : "▼"}{fmt(Math.abs(b - a), d)}</small>
  </span>
{/snippet}

{#snippet bars(r)}
  <span class="rr-bars" style="--pos: {posColor(r.group)}" aria-label="Snap share and points, weeks {firstWeek}–{through}">
    {#each r.weeks as w (w.week)}
      <span class="rr-barCol" title={w.bye ? `Week ${w.week}: bye` : w.played ? `Week ${w.week}: ${w.snap}% of snaps, ${fmt(w.pts)} points` : `Week ${w.week}: didn't play`}>
        <span class="rr-barBox">
          {#if w.bye}<span class="rr-bye">bye</span>
          {:else if !w.played}<span class="rr-bar rr-none"></span>
          {:else}<span class="rr-bar" class:rr-recent={w.recent} style="height: {Math.max(4, w.snap)}%"></span>{/if}
        </span>
        <span class="rr-barPts" class:rr-recentPts={w.recent}>{w.played ? (w.pts >= 10 ? Math.round(w.pts) : fmt(w.pts)) : ""}</span>
      </span>
    {/each}
  </span>
{/snippet}

<div class="rr-players">
  <h1 class="rr-pageTitle">Players</h1>

<section class="rr-card">
    <div class="rr-head">
      <div>
        <h2>Top free agents</h2>
        <p class="rr-sub">The free agents who have scored the most this season, with how their last 3 games went.</p>
      </div>
    </div>

    <div class="rr-controls">
      <div class="rr-chips" role="group" aria-label="Filter best available by position">
        {#each FILTERS as f (f)}
          <button type="button" class="rr-chip" class:rr-on={bestFilter === f} aria-pressed={bestFilter === f} onclick={() => pickBest(f)}>{f}</button>
        {/each}
      </div>
      <div class="rr-seg" role="group" aria-label="Sort best available">
        <button type="button" class:rr-on={bestSort === "total"} aria-pressed={bestSort === "total"} onclick={() => sortBest("total")}>Total points</button>
        <button type="button" class:rr-on={bestSort === "perGame"} aria-pressed={bestSort === "perGame"} onclick={() => sortBest("perGame")}>Per game</button>
      </div>
    </div>

    {#if status === "loading"}
      <Loading message="Finding the best free agents..." />
    {:else if status === "error"}
      <Loading message="Sleeper's stats couldn't be loaded right now. Try again later." progress={false} />
    {:else if !bestVisible.length}
      <p class="rr-empty">{#if !through}No games finished yet this season.{:else}No free agents at this position have played yet.{/if}</p>
    {:else}
      <div class="rr-table" role="table" aria-label="Top free agents">
        <div class="rr-row rr-bestRow rr-headRow" role="row">
          <span role="columnheader"></span>
          <span role="columnheader">Player</span>
          <span role="columnheader" class="rr-statHead"><span>Total</span><span>Per game</span><span>Last 3</span></span>
          <span role="columnheader">Snaps <small>last 2</small></span>
          <span role="columnheader">Weeks {firstWeek}–{through} <small>snaps · pts</small></span>
          <span role="columnheader">Notes</span>
        </div>
        {#each bestVisible.slice(0, bestShown) as r, i (r.id)}
          {@const p = players[r.id]}
          <div class="rr-row rr-bestRow" role="row">
            <span class="rr-rank" role="cell">{i + 1}</span>
            <span class="rr-who" role="cell">
              <span class="rr-name" data-player-id={r.id} role="button" tabindex="0">{name(r.id)}</span>
              <span class="rr-meta"><span class="rr-pos" style="--pos: {posColor(r.group)}">{r.group}</span>{r.team}{p?.age ? ` · ${p.age} yrs` : ""}</span>
            </span>
            <span class="rr-stats" role="cell">
              <span class="rr-stat" class:rr-sorted={bestSort === "total"}><span class="rr-label">Total</span><b>{fmt(r.points)}</b><small>{r.games} game{r.games === 1 ? "" : "s"}</small></span>
              <span class="rr-stat" class:rr-sorted={bestSort === "perGame"}><span class="rr-label">Per game</span><b>{fmt(r.perGame)}</b></span>
              <span class="rr-stat"><span class="rr-label">Last 3</span><b>{fmt(r.recent)}</b></span>
            </span>
            <span class="rr-num rr-bestSnaps" role="cell"><span class="rr-label">Snaps</span><b>{r.snaps}%</b></span>
            <span class="rr-chart" role="cell">{@render bars(r)}</span>
            <span class="rr-why" role="cell">
              {#each bestNotes(r) as x, xi (xi)}
                <span class="rr-note rr-{x.tone}"><b aria-hidden="true">{ICON[x.tone]}</b><span>{x.text}</span></span>
              {/each}
            </span>
          </div>
        {/each}
      </div>
      {#if bestVisible.length > bestShown}
        <button type="button" class="rr-more" onclick={() => (bestShown += FIRST)}>Show {Math.min(FIRST, bestVisible.length - bestShown)} more ▾</button>
      {/if}
      <p class="rr-foot">
        Free agents = on no roster in this league, on an NFL team now. Points with this league's scoring; per game counts the games he played
        ({BEST_RULES.minGamesPerGame}+ to be ranked); last 3 = his team's last 3 games, missed games as 0. Through week {through}.
      </p>
    {/if}
  </section>

  <section class="rr-card">
    <div class="rr-head">
      <div>
        <h2>Trending free agents</h2>
        <p class="rr-sub">Free agents whose role is growing: snaps over their team's last 2 games and points over the last 3, against earlier this season.</p>
      </div>
    </div>

    <div class="rr-controls">
      <div class="rr-chips" role="group" aria-label="Filter by position">
        {#each FILTERS as f (f)}
          <button type="button" class="rr-chip" class:rr-on={filter === f} aria-pressed={filter === f} onclick={() => pick(f)}>{f}</button>
        {/each}
      </div>
      <label class="rr-switch">
        <input type="checkbox" bind:checked={withFillIns} />
        <span class="rr-track" aria-hidden="true"><span class="rr-knob"></span></span>
        Include injury fill-ins{#if status === "ready"}<span class="rr-count">({fillInCount})</span>{/if}
      </label>
    </div>

    {#if status === "loading"}
      <Loading message="Finding who's trending up..." />
    {:else if status === "error"}
      <Loading message="Sleeper's stats couldn't be loaded right now. Try again later." progress={false} />
    {:else if !visible.length}
      <p class="rr-empty">
        {#if !through}No games finished yet this season.{:else}Nobody fits right now. Try another position{withFillIns ? "" : " or include injury fill-ins"}.{/if}
      </p>
    {:else}
      <div class="rr-table" role="table" aria-label="Trending free agents">
        <div class="rr-row rr-headRow" role="row">
          <span role="columnheader"></span>
          <span role="columnheader">Player</span>
          <span role="columnheader">Snaps <small>last 2</small></span>
          <span role="columnheader">Pts / game <small>last 3</small></span>
          <span role="columnheader">Weeks {firstWeek}–{through} <small>snaps · pts</small></span>
          <span role="columnheader">Why</span>
        </div>
        {#each visible.slice(0, shown) as r, i (r.id)}
          {@const p = players[r.id]}
          <div class="rr-row" role="row">
            <span class="rr-rank" role="cell">{i + 1}</span>
            <span class="rr-who" role="cell">
              <span class="rr-name" data-player-id={r.id} role="button" tabindex="0">{name(r.id)}</span>
              <span class="rr-meta"><span class="rr-pos" style="--pos: {posColor(r.group)}">{r.group}</span>{r.team}{p?.age ? ` · ${p.age} yrs` : ""}</span>
            </span>
            <span class="rr-num rr-snaps" role="cell"><span class="rr-label">Snaps</span>{@render delta(r.trend.snap.earlier, r.trend.snap.recent, "%", 0)}</span>
            <span class="rr-num rr-ppg" role="cell"><span class="rr-label">Pts / game</span>{@render delta(r.trend.points.earlier, r.trend.points.recent, "", 1)}</span>
            <span class="rr-chart" role="cell">{@render bars(r)}</span>
            <span class="rr-why" role="cell">
              {#each reasons(r) as x, xi (xi)}
                <span class="rr-note rr-{x.tone}"><b aria-hidden="true">{ICON[x.tone]}</b><span>{x.text}</span></span>
              {:else}
                <span class="rr-earned">Not injury related</span>
              {/each}
            </span>
          </div>
        {/each}
      </div>
      {#if visible.length > shown}
        <button type="button" class="rr-more" onclick={() => (shown += FIRST)}>Show {Math.min(FIRST, visible.length - shown)} more ▾</button>
      {/if}
      <p class="rr-foot">
        Snaps = share of his team's snaps on his side of the ball (bars; his recent games bright, points under them). Shown when snaps are up
        {TREND_RULES.minSnapJump}+ points or points per game up {TREND_RULES.minPointJump}+, with {TREND_RULES.minRecentSnaps}%+ of snaps and a typical recent game of
        {TREND_RULES.minTypicalPoints}+ points. Fill-in = a teammate at his position who was playing {TREND_RULES.starterSnaps}%+ of snaps missed one of his recent games.
        Through week {through}.
      </p>
    {/if}
  </section>
</div>

<style>
  .rr-players {
    max-width: 1180px;
    margin: 0 auto 6em;
    padding: 0 12px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  h1.rr-pageTitle {
    margin: 1.33em 0 0;
    text-align: center;
    font-size: 2.125rem;
    font-weight: 500;
    line-height: 1.2;
    color: var(--or-heading, var(--g111));
  }

  .rr-card {
    border-radius: 16px;
    border: 1px solid var(--or-table-border, var(--ccc));
    background: var(--fff);
    padding: 16px 20px 14px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
  }

  .rr-head h2 {
    margin: 0;
    font: 700 1.05rem "Orbitron", sans-serif;
    color: var(--or-heading, var(--g111));
    text-align: left;
  }

  .rr-sub {
    margin: 4px 0 0;
    font-size: 0.8rem;
    color: var(--or-muted, var(--g999));
  }

  .rr-controls {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: center;
    gap: 10px 16px;
  }

  .rr-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .rr-chip {
    padding: 5px 12px;
    border-radius: 999px;
    border: 1px solid var(--or-table-border, var(--ccc));
    background: none;
    font: 500 0.75rem "Roboto", sans-serif;
    color: var(--or-text, var(--g111));
    cursor: pointer;
  }

  .rr-chip:hover {
    border-color: var(--or-cyan, #0b8a9a);
  }

  .rr-chip.rr-on {
    background: var(--or-cyan, #0b8a9a);
    border-color: var(--or-cyan, #0b8a9a);
    color: var(--fff);
    font-weight: 700;
  }

  .rr-switch {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 0.78rem;
    color: var(--or-text, var(--g111));
    cursor: pointer;
    user-select: none;
  }

  .rr-switch input {
    position: absolute;
    opacity: 0;
    width: 1px;
    height: 1px;
  }

  .rr-track {
    position: relative;
    width: 32px;
    height: 18px;
    border-radius: 9px;
    background: color-mix(in srgb, var(--or-muted, #999) 35%, transparent);
    transition: background 0.15s;
  }

  .rr-knob {
    position: absolute;
    top: 3px;
    left: 3px;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--or-muted, #999);
    transition: left 0.15s, background 0.15s;
  }

  .rr-switch input:checked + .rr-track {
    background: color-mix(in srgb, #ffb547 35%, transparent);
  }

  .rr-switch input:checked + .rr-track .rr-knob {
    left: 17px;
    background: #ffb547;
  }

  .rr-switch input:focus-visible + .rr-track {
    outline: 2px solid var(--or-cyan, #0b8a9a);
    outline-offset: 2px;
  }

  .rr-count {
    margin-left: 2px;
    color: var(--or-muted, var(--g999));
  }

  /* ---- table */
  .rr-row {
    display: grid;
    grid-template-columns: 26px minmax(170px, 1.3fr) 140px 130px 168px minmax(220px, 2fr);
    gap: 14px;
    align-items: center;
    padding: 10px 4px;
    border-top: 1px solid color-mix(in srgb, var(--or-table-border, #ccc) 55%, transparent);
  }

  .rr-headRow {
    border-top: 0;
    padding-top: 2px;
    font: 700 0.62rem "Roboto", sans-serif;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--or-cyan, #0b8a9a);
  }

  .rr-headRow small {
    letter-spacing: 0;
    text-transform: none;
    font-weight: 400;
    color: var(--or-muted, var(--g999));
  }

  .rr-rank {
    font: 700 0.75rem "Orbitron", sans-serif;
    color: var(--or-muted, var(--g999));
  }

  .rr-who {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }

  .rr-name {
    font-weight: 700;
    font-size: 0.9rem;
    color: var(--or-text, var(--g111));
  }

  .rr-meta {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.72rem;
    color: var(--or-muted, var(--g999));
  }

  .rr-pos {
    padding: 0 5px;
    border-radius: 4px;
    font: 700 0.62rem "Roboto", sans-serif;
    line-height: 15px;
    background: var(--pos);
    color: var(--or-pos-chip-text, #0b0320);
  }

  .rr-label {
    display: none;
  }

  .rr-delta {
    display: inline-flex;
    align-items: baseline;
    gap: 5px;
    font-size: 0.82rem;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }

  .rr-from {
    color: var(--or-muted, var(--g999));
  }

  .rr-delta b {
    color: var(--or-heading, var(--g111));
  }

  .rr-delta small {
    font-size: 0.66rem;
    color: #2fd08f;
  }

  .rr-delta small.rr-down {
    color: var(--or-pink, #c2185b);
  }

  .rr-bars {
    display: flex;
    gap: 4px;
  }

  .rr-barCol {
    flex: 1 1 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    min-width: 0;
  }

  .rr-barBox {
    position: relative;
    width: 100%;
    height: 30px;
    display: flex;
    align-items: flex-end;
    justify-content: center;
  }

  .rr-bar {
    width: 100%;
    max-width: 22px;
    border-radius: 3px 3px 1px 1px;
    background: var(--pos);
    opacity: 0.4;
  }

  .rr-bar.rr-recent {
    opacity: 1;
  }

  .rr-bar.rr-none {
    height: 2px;
    opacity: 0.5;
    background: var(--or-muted, #999);
  }

  .rr-bye {
    font-size: 0.56rem;
    color: var(--or-muted, var(--g999));
  }

  .rr-barPts {
    font-size: 0.58rem;
    min-height: 0.8rem;
    color: var(--or-muted, var(--g999));
    font-variant-numeric: tabular-nums;
  }

  .rr-barPts.rr-recentPts {
    color: var(--or-text, var(--g111));
  }

  .rr-why {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
    min-width: 0;
  }

  .rr-note {
    display: inline-flex;
    gap: 6px;
    align-items: flex-start;
    padding: 3px 8px;
    border-radius: 8px;
    font-size: 0.7rem;
    line-height: 1.35;
    color: var(--or-text, var(--g111));
    --tone: #ffb547;
    background: color-mix(in srgb, var(--tone) 12%, transparent);
    border: 1px solid color-mix(in srgb, var(--tone) 45%, transparent);
  }

  .rr-note b {
    color: var(--tone);
  }

  .rr-note.rr-back {
    --tone: #ff9e3d;
  }

  .rr-note.rr-own {
    --tone: var(--or-pink, #c2185b);
  }

  .rr-note.rr-adds {
    --tone: var(--or-cyan, #0b8a9a);
  }

  .rr-earned {
    font-size: 0.72rem;
    color: var(--or-muted, var(--g999));
  }

  .rr-more {
    align-self: flex-start;
    padding: 6px 4px;
    border: 0;
    background: none;
    font: 500 0.8rem "Roboto", sans-serif;
    color: var(--or-cyan, #0b8a9a);
    cursor: pointer;
  }

  .rr-more:hover {
    color: var(--or-pink, var(--blueOne));
  }

  .rr-foot,
  .rr-empty {
    margin: 0;
    font-size: 0.72rem;
    color: var(--or-muted, var(--g999));
  }

  .rr-empty {
    padding: 16px 4px;
    font-size: 0.85rem;
  }

  /* ---- best available */
  .rr-bestRow {
    grid-template-columns: 26px minmax(170px, 1.3fr) 230px 70px 168px minmax(150px, 1fr);
  }

  .rr-statHead,
  .rr-stats {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
  }

  .rr-stat {
    display: flex;
    flex-direction: column;
    gap: 1px;
    font-variant-numeric: tabular-nums;
  }

  .rr-stat b,
  .rr-bestSnaps b {
    font-size: 0.85rem;
    color: var(--or-heading, var(--g111));
  }

  .rr-stat small {
    font-size: 0.62rem;
    color: var(--or-muted, var(--g999));
  }

  .rr-stat:not(.rr-sorted) b {
    font-weight: 500;
    color: var(--or-text, var(--g111));
  }

  .rr-seg {
    display: inline-flex;
    padding: 3px;
    border-radius: 10px;
    border: 1px solid var(--or-table-border, var(--ccc));
  }

  .rr-seg button {
    padding: 4px 12px;
    border: 0;
    border-radius: 7px;
    background: none;
    font: 500 0.75rem "Roboto", sans-serif;
    color: var(--or-text, var(--g111));
    cursor: pointer;
  }

  .rr-seg button.rr-on {
    background: var(--or-pink, #c2185b);
    color: #fff;
    font-weight: 700;
  }

  /* narrower screens: name + numbers on one line, bars and reasons below */
  @media (max-width: 899.98px) {
    .rr-card {
      padding: 14px 14px 12px;
    }

    .rr-headRow {
      display: none;
    }

    .rr-row {
      grid-template-columns: 22px minmax(0, 1fr) minmax(0, 1fr);
      grid-template-areas:
        "rank who who"
        ". snaps pts"
        ". chart chart"
        ". why why";
      gap: 8px 12px;
      align-items: start;
    }

    .rr-rank {
      grid-area: rank;
      padding-top: 2px;
    }

    .rr-who {
      grid-area: who;
    }

    .rr-snaps {
      grid-area: snaps;
    }

    .rr-ppg {
      grid-area: pts;
    }

    .rr-num {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 2px;
    }

    .rr-label {
      display: block;
      font: 700 0.56rem "Roboto", sans-serif;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--or-cyan, #0b8a9a);
    }

    .rr-delta {
      font-size: 0.76rem;
      gap: 3px;
    }

    .rr-chart {
      grid-area: chart;
      max-width: 260px;
      width: 100%;
    }

    .rr-why {
      grid-area: why;
    }

    .rr-bestRow {
      grid-template-columns: 22px minmax(0, 1fr) auto;
      grid-template-areas:
        "rank who snaps"
        ". stats stats"
        ". chart chart"
        ". why why";
    }

    .rr-bestRow .rr-stats {
      grid-area: stats;
      max-width: 300px;
    }

    .rr-bestSnaps {
      grid-area: snaps;
      align-items: flex-end;
    }

    .rr-bestRow .rr-why:empty {
      display: none;
    }
  }
</style>
