<!--
  Playoff bracket (Matchups option A "neon bracket tree"). Replaces the template's Brackets in
  src/lib/Matchups/MatchupsAndBrackets.svelte; that page's Championship / Toilet Bowl buttons set `selection`.
  A season picker shows any season's bracket. Columns are the rounds (connector lines; the champion's path in pink),
  then the champion (or, in the Toilet Bowl, the team that finished last). Placement games sit below, and the selected
  game's lineups open under them (RayMatchups/Matchup). Before the regular season is fully scored the teams come from
  today's seeds (league rule) instead of Sleeper's placeholder bracket. A playoff week in progress shows LIVE with a
  "Refresh scores" button (one Sleeper request, at most every 30 seconds). Logic in utils/playoffBracket.js.
  Requests: the two brackets (saved for finished seasons) and the playoff weeks that have started, shared with
  every other loader on the page.
-->
<script>
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { leagueID as currentLeagueID } from "$lib/utils/leagueInfo";
  import { getLeagueRosters, getNflState, waitForAll } from "$lib/utils/helper";
  import { getTeamFromTeamManagers } from "$lib/utils/helperFunctions/universalFunctions";
  import { leagueSeasons } from "../../utils/seasonData.js";
  import { seasonJson, isFinishedLeague } from "../../utils/savedSeasons.js";
  import { sleeperJson } from "../../utils/sleeperFetch.js";
  import { seedTeams } from "../../utils/playoffs.js";
  import { buildBracket, reseed, defaultGame, roundWeeks } from "../../utils/playoffBracket.js";
  import Loading from "../Shared/Loading.svelte";
  import BracketCard from "./BracketCard.svelte";
  import Matchup from "./Matchup.svelte";

  let { leagueTeamManagers, players, selection = $bindable(), queryWeek } = $props();

  const REFRESH_COOLDOWN_MS = 30000; // be gentle with the Sleeper API
  // tree geometry (px): a column is a card plus the gap the connector lines run through
  const CARD_W = 240;
  const COL = 280;
  const UNIT = 140;
  const CHAMP_W = 200;
  const CHAMP_H = 224;

  let seasons = $state.raw([]);
  let season = $state.raw(null); // { leagueID, season, leagueData }
  let data = $state.raw(null); // { champ, toilet, weeks, projected, liveWeek, lastScored, isCurrent, regularSeasonLength }
  let status = $state("loading"); // loading | ready | error
  let errorMessage = $state("");
  let selectedM = $state({ champ: null, toilet: null });
  let lineupWeek = $state(null);
  let lineupOpen = $state(true);
  let refreshing = $state(false);
  let coolingDown = $state(false);
  let refreshError = $state("");
  let updatedAt = $state("");

  const which = $derived(selection === "losers" ? "toilet" : "champ");
  const view = $derived(data?.[which] ?? null);
  const moveOn = $derived(which === "toilet" && !!view?.losersAdvance);
  const year = $derived(season?.season);
  const teamFor = (id) => (id && leagueTeamManagers && year ? getTeamFromTeamManagers(leagueTeamManagers, id, year) : null);

  const possessive = (name) => (/s$/i.test(name.trim()) ? `${name.trim()}'` : `${name.trim()}'s`);
  const regularSeasonLength = (ld) => (Number(ld?.settings?.playoff_week_start) || 15) - 1;

  async function loadSeason(s) {
    status = "loading";
    try {
      const id = s.leagueID;
      const ld = s.leagueData;
      const finished = isFinishedLeague(ld, currentLeagueID);
      const isCurrent = id === String(currentLeagueID);
      const [winners, losers, rosterData, nflState] = await waitForAll(
        seasonJson(`league/${id}/winners_bracket`, finished),
        seasonJson(`league/${id}/losers_bracket`, finished),
        getLeagueRosters(id),
        getNflState()
      );
      const R = regularSeasonLength(ld);
      const playoffWeekStart = R + 1;
      const roundType = ld.settings?.playoff_round_type ?? 0;
      const lastScored = ld.status === "complete" ? 99 : Number(ld.settings?.last_scored_leg) || 0;
      const regularDone = lastScored >= R || ld.status === "post_season" || ld.status === "complete";
      const liveWeek = isCurrent && nflState?.season_type === "regular" ? Number(nflState.display_week) || null : null;
      const playoffTeams = Number(ld.settings?.playoff_teams) || 6;

      // seeds by the league rule, from each roster's record and points
      const teams = Object.values(rosterData?.rosters ?? {}).map((r) => ({
        rosterID: String(r.roster_id),
        wins: r.settings?.wins ?? 0,
        losses: r.settings?.losses ?? 0,
        ties: r.settings?.ties ?? 0,
        fpts: (r.settings?.fpts ?? 0) + (r.settings?.fpts_decimal ?? 0) / 100,
        division: r.settings?.division ?? null,
      }));
      const order = seedTeams(teams, { playoffTeams }).order.map((t) => t.rosterID);
      const seeds = Object.fromEntries(order.map((rid, i) => [rid, i + 1]));

      // before the regular season is over, place the teams by today's seeds (Sleeper's bracket is a placeholder)
      const projected = isCurrent && !regularDone;
      const wb = projected ? reseed(winners ?? [], order.slice(0, playoffTeams)) : winners ?? [];
      const lb = projected ? reseed(losers ?? [], order.slice(playoffTeams).reverse()) : losers ?? [];

      // scores for every playoff week that has started
      const rounds = Math.max(0, ...wb.map((m) => m.r));
      const lastWeek = isCurrent ? Math.max(lastScored, liveWeek ?? 0) : 99;
      const playoffWeeks = new Set();
      for (let r = 1; r <= rounds; r++) for (const w of roundWeeks(r, rounds, playoffWeekStart, roundType)) playoffWeeks.add(w);
      const weekList = projected ? [] : [...playoffWeeks].filter((w) => w <= Math.min(18, lastWeek)).sort((a, b) => a - b);
      const fetched = await waitForAll(...weekList.map((w) => sleeperJson(`league/${id}/matchups/${w}`)));
      const weeks = Object.fromEntries(weekList.map((w, i) => [w, fetched[i] ?? []]));

      const common = { weeks, playoffWeekStart, roundType, seeds, totalTeams: teams.length, liveWeek: projected ? null : liveWeek, lastScored: projected ? 0 : lastScored };
      const built = { champ: buildBracket(wb, common), toilet: buildBracket(lb, { ...common, losers: true }) };
      data = { ...built, weeks, projected, liveWeek, lastScored, isCurrent, regularSeasonLength: R, playoffWeekStart, common, wb, lb };
      selectedM = { champ: defaultGame(built.champ), toilet: defaultGame(built.toilet) };
      lineupWeek = null;
      lineupOpen = true;
      updatedAt = "";
      status = "ready";
    } catch (err) {
      console.error(err);
      errorMessage = err?.message ?? String(err);
      status = "error";
    }
  }

  onMount(async () => {
    try {
      seasons = await leagueSeasons();
      season = seasons[0];
      const playoffWeekStart = regularSeasonLength(season.leagueData) + 1;
      // a regular-season week in the URL goes back to that week's matchups (the template went to week 1)
      if (queryWeek && queryWeek > 0 && queryWeek < playoffWeekStart) {
        goto(`/matchups?week=${queryWeek}`, { noscroll: true });
        selection = "regular";
        return;
      }
      goto(`/matchups?week=${playoffWeekStart}`, { noscroll: true });
      await loadSeason(season);
    } catch (err) {
      console.error(err);
      errorMessage = err?.message ?? String(err);
      status = "error";
    }
  });

  const pickSeason = (s) => {
    if (s.leagueID === season?.leagueID) return;
    season = s;
    loadSeason(s);
  };

  const select = (m) => {
    selectedM = { ...selectedM, [which]: m };
    lineupWeek = null;
    lineupOpen = true;
  };

  // live scores for the week in progress (replaces that week everywhere in the bracket)
  const anyLive = $derived(!!data && [data.champ, data.toilet].some((v) => v && Object.values(v.games).some((g) => g.status === "live")));
  const refresh = async () => {
    if (refreshing || coolingDown || !data?.liveWeek) return;
    refreshing = true;
    refreshError = "";
    try {
      const res = await fetch(`https://api.sleeper.app/v1/league/${season.leagueID}/matchups/${data.liveWeek}`);
      if (!res.ok) throw new Error(`Sleeper returned ${res.status}`);
      const weeks = { ...data.weeks, [data.liveWeek]: await res.json() };
      const common = { ...data.common, weeks };
      data = { ...data, weeks, common, champ: buildBracket(data.wb, common), toilet: buildBracket(data.lb, { ...common, losers: true }) };
      updatedAt = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
      coolingDown = true;
      setTimeout(() => (coolingDown = false), REFRESH_COOLDOWN_MS);
    } catch (err) {
      console.error(err);
      refreshError = "Couldn't refresh the scores. Try again in a moment.";
    } finally {
      refreshing = false;
    }
  };

  // ---- layout
  const finalNode = $derived(view?.nodes.find((n) => n.kind === "game" && n.m === view.final?.m) ?? null);
  const treeWidth = $derived(view ? view.rounds * COL + CHAMP_W : 0);
  const treeHeight = $derived(view ? Math.max(view.leafCount * UNIT, CHAMP_H + 20) : 0);
  const paths = $derived.by(() => {
    if (!view) return [];
    const out = view.lines.map((l) => {
      const x1 = l.fromCol * COL + CARD_W;
      const x2 = l.toCol * COL;
      const xm = x2 - (COL - CARD_W) / 2;
      return { d: `M${x1} ${l.fromCenter * UNIT} H${xm} V${l.toCenter * UNIT} H${x2}`, style: l.style };
    });
    if (finalNode) {
      const y = finalNode.center * UNIT;
      out.push({ d: `M${finalNode.col * COL + CARD_W} ${y} H${view.rounds * COL}`, style: view.winner ? "win" : "dim" });
    }
    return out;
  });
  // phone layout: each round as a list, in bracket order
  const roundsList = $derived.by(() => {
    if (!view) return [];
    return view.roundNames.map((rn) => ({
      ...rn,
      nodes: view.nodes.filter((n) => n.col === rn.round - 1).sort((a, b) => a.center - b.center),
    }));
  });

  // ---- the end result card (champion, or last place in the Toilet Bowl)
  const result = $derived.by(() => {
    if (!view?.final) return null;
    const f = view.final;
    const winSide = f.sides.find((s) => s.won);
    const other = f.sides.find((s) => s.won === false);
    const weeksText = `week ${f.weeks.join("–")}`;
    if (which === "champ") {
      return {
        title: `${year} Champion`,
        decided: !!winSide,
        team: winSide ? teamFor(winSide.rosterID) : null,
        line1: winSide ? `${winSide.seed} seed · won ${view.winnerWins} playoff game${view.winnerWins === 1 ? "" : "s"}` : `Decided in ${weeksText}`,
        line2: winSide && other ? `Beat ${teamFor(other.rosterID)?.name ?? "TBD"} ${winSide.points?.toFixed(2)}–${other.points?.toFixed(2)}` : "",
      };
    }
    if (!view.losersAdvance) {
      return { title: "Consolation winner", decided: !!winSide, team: winSide ? teamFor(winSide.rosterID) : null, line1: winSide ? `${winSide.seed} seed` : `Decided in ${weeksText}`, line2: "" };
    }
    return {
      title: "Last place",
      decided: !!winSide,
      team: winSide ? teamFor(winSide.rosterID) : null,
      line1: winSide ? "Lost all the way down" : `Decided in ${weeksText}`,
      line2: winSide && other ? `Scored ${winSide.points?.toFixed(2)} to ${possessive(teamFor(other.rosterID)?.name ?? "TBD")} ${other.points?.toFixed(2)} in the Toilet Bowl` : "",
    };
  });

  // ---- the selected game's lineups
  const selected = $derived(view && selectedM[which] != null ? view.games[selectedM[which]] : null);
  const shownWeek = $derived(selected ? lineupWeek ?? selected.weeks.find((w) => data?.weeks?.[w]) ?? selected.weeks[0] : null);
  const lineupPair = $derived.by(() => {
    if (!selected || !data?.weeks?.[shownWeek] || selected.sides.some((s) => !s.rosterID)) return null;
    const entries = selected.sides.map((s) => data.weeks[shownWeek].find((e) => String(e.roster_id) === s.rosterID));
    if (entries.some((e) => !e)) return null;
    return entries.map((e) => ({
      roster_id: e.roster_id,
      starters: e.starters,
      points: e.starters_points,
      players: e.players,
      playersPoints: e.players_points,
      matchup_id: e.matchup_id,
      total: e.points,
    }));
  });
  // placement games in the Toilet Bowl: the higher score gets the better place, so show that team as the winner
  const placeView = (g) =>
    which === "toilet" && view?.losersAdvance ? { ...g, sides: g.sides.map((sd) => ({ ...sd, won: sd.won == null ? null : !sd.won })) } : g;
  const statusText = (g) => (g.status === "live" ? "LIVE" : g.status === "final" ? "FINAL" : "UPCOMING");
</script>

<div class="rr-playoffs">
  {#if seasons.length > 1}
    <div class="rr-seasons" role="group" aria-label="Season">
      {#each seasons as s (s.leagueID)}
        <button type="button" class="rr-seasonPill" class:rr-active={s.leagueID === season?.leagueID} aria-pressed={s.leagueID === season?.leagueID} onclick={() => pickSeason(s)}>{s.season}</button>
      {/each}
    </div>
  {/if}

  {#if status === "loading"}
    <Loading message="Loading the bracket..." />
  {:else if status === "error"}
    <Loading message="Couldn't load the bracket: {errorMessage}" progress={false} />
  {:else if !view?.final}
    <Loading message="Sleeper hasn't set up this bracket yet." progress={false} />
  {:else}
    <h3 class="rr-title">{year} {which === "toilet" ? (view.losersAdvance ? "Toilet Bowl" : "Consolation bracket") : (data.projected ? "Playoff Projection" : "Playoffs")}</h3>
    {#if anyLive}
      <div class="rr-liveBar">
        <span class="rr-livePill"><span class="rr-dot" aria-hidden="true"></span>Live · week {data.liveWeek}</span>
        <button type="button" class="rr-refresh" onclick={refresh} disabled={refreshing || coolingDown}>
          {refreshing ? "Refreshing..." : coolingDown ? "Refreshed" : "Refresh scores"}
        </button>
        {#if updatedAt}<span class="rr-muted">Updated {updatedAt}</span>{/if}
        {#if refreshError}<span class="rr-error">{refreshError}</span>{/if}
      </div>
    {/if}

    <!-- desktop: the bracket tree -->
    <div class="rr-treeScroll">
      <div class="rr-heads" style="width: {treeWidth}px">
        {#each view.roundNames as rn (rn.round)}
          <span style="left: {(rn.round - 1) * COL}px; width: {CARD_W}px">{rn.name} · Wk {rn.weeks.join("–")}</span>
        {/each}
        <span class="rr-headResult" style="left: {view.rounds * COL}px; width: {CHAMP_W}px">{which === "champ" ? "Champion" : view.losersAdvance ? "Last place" : "Winner"}</span>
      </div>
      <div class="rr-tree" style="width: {treeWidth}px; height: {treeHeight}px">
        <svg class="rr-lines" width={treeWidth} height={treeHeight} viewBox="0 0 {treeWidth} {treeHeight}" aria-hidden="true">
          {#each paths as p, i (i)}<path d={p.d} class="rr-line rr-{p.style}" class:rr-orange={moveOn} />{/each}
        </svg>
        {#each view.nodes as n (n.kind + (n.m ?? n.rosterID))}
          <div class="rr-node" style="left: {n.col * COL}px; top: {n.center * UNIT - 46}px; width: {CARD_W}px">
            {#if n.kind === "bye"}
              <BracketCard bye={n} {teamFor} />
            {:else}
              <BracketCard game={view.games[n.m]} games={view.games} {teamFor} {moveOn} selected={selectedM[which] === n.m} onclick={() => select(n.m)} />
            {/if}
          </div>
        {/each}
        {#if result && finalNode}
          {@render resultCard(`left: ${view.rounds * COL}px; top: ${Math.max(0, finalNode.center * UNIT - CHAMP_H / 2)}px`)}
        {/if}
      </div>
    </div>

    <!-- phones: one list per round -->
    <div class="rr-list">
      {#if result}{@render resultCard("")}{/if}
      {#each roundsList as rd (rd.round)}
        <h4 class="rr-listHead">{rd.name} · Week {rd.weeks.join("–")}</h4>
        {#each rd.nodes as n (n.kind + (n.m ?? n.rosterID))}
          {#if n.kind === "bye"}
            <BracketCard bye={n} {teamFor} />
          {:else}
            <BracketCard game={view.games[n.m]} games={view.games} {teamFor} {moveOn} selected={selectedM[which] === n.m} onclick={() => select(n.m)} />
          {/if}
        {/each}
      {/each}
    </div>

    {#if view.placement.length}
      <h4 class="rr-sectionHead">Placement games</h4>
      <div class="rr-placement">
        {#each view.placement as g (g.m)}
          <div class="rr-placeGame">
            <span class="rr-muted">{g.label} · Week {g.weeks.join("–")}</span>
            <BracketCard game={placeView(g)} games={view.games} {teamFor} selected={selectedM[which] === g.m} onclick={() => select(g.m)} />
          </div>
        {/each}
      </div>
    {/if}

    {#if selected}
      <section class="rr-selectedGame" aria-label="Selected game">
        <div class="rr-selHead">
          <span>{selected.label} · Week {shownWeek} · {statusText(selected)}</span>
          {#if selected.weeks.length > 1}
            <span class="rr-weekSwitch" role="group" aria-label="Week">
              {#each selected.weeks as w (w)}
                <button type="button" class:rr-active={w === shownWeek} aria-pressed={w === shownWeek} disabled={!data.weeks[w]} onclick={() => (lineupWeek = w)}>Week {w}</button>
              {/each}
            </span>
          {/if}
        </div>
        {#if lineupPair}
          <Matchup matchup={lineupPair} {players} week={shownWeek} {year} {leagueTeamManagers} current={data.isCurrent} open={lineupOpen} onToggle={() => (lineupOpen = !lineupOpen)} />
        {:else if data.projected}
          <p class="rr-muted">The matchups are set once the regular season ends (week {data.regularSeasonLength}). Lineups show here when the game starts.</p>
        {:else}
          <p class="rr-muted">Lineups show here once both teams are known and the week starts.</p>
        {/if}
      </section>
    {/if}
  {/if}
</div>

{#snippet resultCard(pos)}
  <div class="rr-result" class:rr-decided={result.decided} class:rr-last={which === "toilet"} style={pos}>
    <svg class="rr-resultIcon" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      {#if which === "champ"}
        <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4zM7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4"></path>
      {:else}
        <path d="M12 3v12M6 9l6 6 6-6M5 21h14"></path>
      {/if}
    </svg>
    <span class="rr-resultTitle">{result.title}</span>
    {#if result.team}
      {#if result.team.avatar}<img class="rr-resultAv" src={result.team.avatar} alt="" />{/if}
      <b class="rr-resultName">{result.team.name}</b>
    {/if}
    <span class="rr-resultLine">{result.line1}</span>
    {#if result.line2}<span class="rr-resultLine rr-muted">{result.line2}</span>{/if}
  </div>
{/snippet}

<style>
  .rr-playoffs {
    max-width: 1100px;
    margin: 0 auto 6em;
    padding: 0 12px;
    box-sizing: border-box;
  }

  .rr-seasons {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
    margin: 0 0 1.4em;
  }

  .rr-seasonPill {
    min-width: 64px;
    min-height: 36px;
    padding: 6px 14px;
    border-radius: 999px;
    border: 1px solid var(--or-table-border, var(--ccc));
    background: transparent;
    color: inherit;
    font: inherit;
    font-size: 0.85em;
    cursor: pointer;
  }

  .rr-seasonPill.rr-active {
    border-color: var(--or-pink, var(--blueOne));
    background: var(--or-pink, var(--blueOne));
    color: #fff;
    font-weight: 700;
  }

  .rr-title {
    margin: 0 0 0.3em;
    font-size: 2em;
    text-align: center;
  }

  .rr-note {
    margin: 0 0 1.2em;
    text-align: center;
    font-size: 0.85em;
    color: var(--or-muted, var(--g999));
  }

  .rr-liveBar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 8px 12px;
    margin: 0 0 1.2em;
    font-size: 0.85em;
  }

  .rr-livePill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 3px 10px;
    border-radius: 999px;
    background: var(--or-pink, var(--blueOne));
    color: #fff;
    font: 700 0.8em "Orbitron", sans-serif;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    box-shadow: 0 0 12px var(--or-glow-pink, transparent);
  }

  .rr-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #fff;
    animation: rr-pulse 1.4s ease-in-out infinite;
  }

  @keyframes rr-pulse {
    50% {
      opacity: 0.25;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .rr-dot {
      animation: none;
    }
  }

  .rr-refresh {
    min-height: 32px;
    padding: 4px 12px;
    border-radius: 8px;
    border: 1px solid var(--or-cyan, #0b8a9a);
    background: transparent;
    color: var(--or-cyan, #0b8a9a);
    font: inherit;
    font-size: 0.9em;
    font-weight: 700;
    cursor: pointer;
  }

  .rr-refresh:disabled {
    opacity: 0.6;
    cursor: default;
  }

  .rr-muted {
    color: var(--or-muted, var(--g999));
  }

  .rr-error {
    color: var(--or-pink, #c2185b);
  }

  /* ---- tree */
  .rr-treeScroll {
    overflow-x: auto;
    padding: 4px 4px 12px;
  }

  .rr-heads {
    position: relative;
    height: 2em;
    margin: 0 auto;
  }

  .rr-heads span {
    position: absolute;
    top: 0;
    font: 700 0.68em "Orbitron", sans-serif;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--or-cyan, #0b8a9a);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .rr-heads .rr-headResult {
    color: var(--or-orange, #e8590c);
  }

  .rr-tree {
    position: relative;
    margin: 0 auto;
  }

  .rr-lines {
    position: absolute;
    inset: 0;
  }

  .rr-line {
    fill: none;
    stroke-width: 1.5;
    stroke: color-mix(in srgb, var(--or-purple, #7b1fa2) 50%, transparent);
  }

  .rr-line.rr-adv {
    stroke: color-mix(in srgb, var(--or-cyan, #0b8a9a) 75%, transparent);
  }

  .rr-line.rr-win {
    stroke-width: 2.5;
    stroke: var(--or-pink, #c2185b);
    filter: drop-shadow(0 0 4px var(--or-glow-pink, transparent));
  }

  .rr-line.rr-win.rr-orange {
    stroke: var(--or-orange, #e8590c);
    filter: none;
  }

  .rr-node {
    position: absolute;
  }

  /* ---- result card */
  .rr-result {
    position: absolute;
    width: 200px;
    height: 224px;
    box-sizing: border-box;
    padding: 16px 12px;
    border-radius: 16px;
    border: 1px dashed var(--or-table-border, var(--ccc));
    background: var(--fff);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    text-align: center;
    color: var(--or-muted, var(--g999));
  }

  .rr-result.rr-decided {
    border: 1px solid color-mix(in srgb, var(--or-orange, #e8590c) 75%, transparent);
    background: radial-gradient(circle at 50% 0%, color-mix(in srgb, var(--or-orange, #e8590c) 25%, transparent), transparent 65%), var(--fff);
    box-shadow: 0 0 26px color-mix(in srgb, var(--or-orange, #e8590c) 22%, transparent);
    color: inherit;
  }

  .rr-result.rr-decided.rr-last {
    border-color: var(--or-table-border, var(--ccc));
    background: var(--fff);
    box-shadow: none;
  }

  .rr-resultIcon {
    color: var(--or-orange, #e8590c);
  }

  .rr-last .rr-resultIcon {
    color: var(--or-muted, var(--g999));
  }

  .rr-resultTitle {
    font: 700 0.68em "Orbitron", sans-serif;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--or-orange, #e8590c);
  }

  .rr-last .rr-resultTitle {
    color: var(--or-muted, var(--g999));
  }

  .rr-resultAv {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    object-fit: cover;
  }

  .rr-resultName {
    font: 800 0.95em "Orbitron", sans-serif;
    color: var(--or-heading, var(--g111));
    overflow-wrap: anywhere;
  }

  .rr-resultLine {
    font-size: 0.78em;
  }

  /* ---- phones: rounds as lists */
  .rr-list {
    display: none;
  }

  .rr-listHead,
  .rr-sectionHead {
    margin: 1.4em 0 0.6em;
    font: 700 0.72em "Orbitron", sans-serif;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--or-cyan, #0b8a9a);
  }

  @media (max-width: 759.98px) {
    .rr-treeScroll {
      display: none;
    }

    .rr-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .rr-list .rr-result {
      position: static;
      width: 100%;
      height: auto;
    }
  }

  /* ---- placement games and the selected game */
  .rr-placement {
    display: flex;
    flex-wrap: wrap;
    gap: 16px 40px;
  }

  .rr-placeGame {
    display: flex;
    flex-direction: column;
    gap: 6px;
    width: 240px;
    max-width: 100%;
    font-size: 0.85em;
  }

  .rr-selectedGame {
    margin-top: 2em;
  }

  .rr-selHead {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 0.8em;
    font: 700 0.72em "Orbitron", sans-serif;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--or-cyan, #0b8a9a);
  }

  .rr-weekSwitch {
    display: inline-flex;
    gap: 4px;
  }

  .rr-weekSwitch button {
    padding: 4px 10px;
    border-radius: 8px;
    border: 1px solid var(--or-table-border, var(--ccc));
    background: transparent;
    color: inherit;
    font: inherit;
    cursor: pointer;
  }

  .rr-weekSwitch button.rr-active {
    border-color: var(--or-pink, var(--blueOne));
    background: var(--or-pink, var(--blueOne));
    color: #fff;
  }
</style>
