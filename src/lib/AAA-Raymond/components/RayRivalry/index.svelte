<!--
  Rivalry page (option A "tale of the tape"): two managers picked at the top (URL ?player_one=&player_two=), then a
  head-to-head hero (series record, titles, points), four highlights (last meeting, streak, biggest win, closest
  game), "Career comparison" bars, every meeting (regular season and playoffs; click one for both lineups) and the
  trades between them. Counts per MANAGER, like the manager pages. Swapped in for the template's Rivalry in
  src/lib/components.js. Head-to-head math in utils/rivalry.js.
  Requests: finished seasons' weekly scores are saved in the browser for good (savedSeasons.js `seasonScores`), so a
  pair costs only the current season's played weeks (shared with other loaders) and, when a past game's lineups are
  opened, that one week.
-->
<script>
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { leagueID as currentLeagueID } from "$lib/utils/leagueInfo";
  import { getAwards, getLeagueRecords, getLeagueTransactions, getNflState, loadPlayers, waitForAll } from "$lib/utils/helper";
  import { getRosterIDFromManagerID, getRosterIDFromManagerIDAndYear, getTeamFromTeamManagers } from "$lib/utils/helperFunctions/universalFunctions";
  import { leagueSeasons } from "../../utils/seasonData.js";
  import { seasonJson, seasonScores, isFinishedLeague } from "../../utils/savedSeasons.js";
  import { sleeperJson } from "../../utils/sleeperFetch.js";
  import { rivalryMeetings, rivalrySummary } from "../../utils/rivalry.js";
  import { careerStats, managerTrophies, titleYears, winPct } from "../../utils/managerProfile.js";
  import { ownsFor, recordText, pctText } from "../RayManagers/managerInfo.js";
  import Loading from "../Shared/Loading.svelte";
  import Matchup from "../RayMatchups/Matchup.svelte";
  import TransactionFeed from "../RayTransactions/TransactionFeed.svelte";
  import "../Shared/common.css";

  let { leagueTeamManagers, playersInfo, transactionsInfo, recordsInfo, playerOne, playerTwo } = $props();

  let one = $state(playerOne ?? "");
  let two = $state(playerTwo ?? "");
  let players = $state.raw(playersInfo?.players ?? {});
  let transactions = $state.raw(transactionsInfo?.transactions ?? []);
  let records = $state.raw(recordsInfo);
  let awards = $state.raw([]);
  let result = $state.raw(null); // { meetings, summary, current }
  let status = $state("idle"); // idle | loading | ready | error
  let errorMessage = $state("");
  let selectedKey = $state(null);
  let lineup = $state.raw(null); // { key, pair, week, year, current } | { key, missing: true }
  let lineupOpen = $state(true);
  let lineupLoading = $state(false);

  // refresh data the route handed over stale (same as the template page)
  onMount(async () => {
    getAwards().then((a) => (awards = a ?? [])).catch((e) => console.error(e));
    if (transactionsInfo?.stale) transactions = (await getLeagueTransactions(false, true))?.transactions ?? transactions;
    if (playersInfo?.stale) players = (await loadPlayers(null, true))?.players ?? players;
    if (recordsInfo?.stale) records = await getLeagueRecords(true);
  });

  // ---- managers
  const nameOf = (id) => leagueTeamManagers?.users?.[id]?.display_name ?? "Unknown";
  const managers = $derived(
    Object.keys(leagueTeamManagers?.users ?? {})
      .map((id) => ({ id, name: nameOf(id) }))
      .sort((a, b) => a.name.localeCompare(b.name))
  );
  const latestTeam = (id) => {
    const found = id ? getRosterIDFromManagerID(leagueTeamManagers, id) : null;
    return found ? getTeamFromTeamManagers(leagueTeamManagers, found.rosterID, found.year) : null;
  };
  const rosterOf = (id, year) => getRosterIDFromManagerIDAndYear(leagueTeamManagers, id, year);
  const teamIn = (rosterID, year) => (rosterID ? getTeamFromTeamManagers(leagueTeamManagers, rosterID, year) : null);

  const choose = (a, b) => {
    one = a;
    two = b;
    if (a && b && a !== b) goto(`/rivalry?player_one=${a}&player_two=${b}`, { noscroll: true, keepfocus: true });
  };
  const swap = () => choose(two, one);

  // ---- head to head
  let loadToken = 0;
  async function load(a, b) {
    const token = ++loadToken;
    status = "loading";
    result = null;
    lineup = null;
    try {
      const [seasons, nflState] = await waitForAll(leagueSeasons(), getNflState());
      const input = [];
      await waitForAll(
        ...seasons.map(async (s) => {
          const rosterA = rosterOf(a, s.season);
          const rosterB = rosterOf(b, s.season);
          if (!rosterA || !rosterB || rosterA === rosterB) return;
          const ld = s.leagueData;
          const id = s.leagueID;
          const current = id === String(currentLeagueID);
          const finished = isFinishedLeague(ld, currentLeagueID);
          const playoffWeekStart = Number(ld.settings?.playoff_week_start) || 15;
          const roundType = ld.settings?.playoff_round_type ?? 0;
          const lastScored = current ? Number(ld.settings?.last_scored_leg) || 0 : 99;
          const liveWeek = current && nflState?.season_type === "regular" ? Number(nflState.display_week) || null : null;
          const upTo = current ? Math.max(lastScored, liveWeek ?? 0) : 99;
          // this season's weeks: full entries for the current season (lineups show at once), saved scores for past ones
          const weekData = (w) => (current ? sleeperJson(`league/${id}/matchups/${w}`) : seasonScores(id, w, finished));
          const regularWeeks = Array.from({ length: playoffWeekStart - 1 }, (_, i) => i + 1).filter((w) => w <= upTo);
          // playoff games between them, from the winners bracket (only once the playoffs have started)
          const playoffsStarted = !current || upTo >= playoffWeekStart;
          const winnersBracket = playoffsStarted ? (current ? await sleeperJson(`league/${id}/winners_bracket`) : await seasonJson(`league/${id}/winners_bracket`, finished)) : [];
          const met = (winnersBracket ?? []).filter((g) => [String(g.t1), String(g.t2)].includes(String(rosterA)) && [String(g.t1), String(g.t2)].includes(String(rosterB)));
          const rounds = Math.max(0, ...(winnersBracket ?? []).map((g) => g.r));
          const playoffWeeks = [...new Set(met.flatMap((g) => {
            const first = playoffWeekStart + (roundType === 2 ? 2 * (g.r - 1) : g.r - 1);
            return roundType === 2 || (roundType === 1 && g.r === rounds) ? [first, first + 1] : [first];
          }))].filter((w) => w <= Math.min(18, upTo));
          const weekList = [...regularWeeks, ...playoffWeeks];
          const data = await waitForAll(...weekList.map(weekData));
          input.push({
            season: s.season, leagueID: id, rosterA, rosterB, playoffWeekStart, roundType, current, lastScored, liveWeek,
            weeks: Object.fromEntries(weekList.map((w, i) => [w, data[i] ?? []])),
            winnersBracket: winnersBracket ?? [], // the whole bracket (round names count from the final)
          });
        })
      );
      if (token !== loadToken) return;
      const meetings = rivalryMeetings(input);
      result = { meetings, summary: rivalrySummary(meetings), input };
      selectedKey = null; // a game's lineups open when it's clicked
      status = "ready";
    } catch (err) {
      if (token !== loadToken) return;
      console.error(err);
      errorMessage = err?.message ?? String(err);
      status = "error";
    }
  }

  $effect(() => {
    if (one && two && one !== two) load(one, two);
    else status = "idle";
  });

  // ---- the selected meeting's lineups
  const keyOf = (m) => `${m.season}-${m.week}-${m.kind}`;
  const selected = $derived(result?.meetings.find((m) => keyOf(m) === selectedKey) ?? null);
  $effect(() => {
    const m = selected;
    if (!m) return;
    const key = keyOf(m);
    const s = result.input.find((x) => x.leagueID === m.leagueID);
    const week = m.weeks[0];
    lineupLoading = true;
    (s.current ? Promise.resolve(s.weeks[week]) : sleeperJson(`league/${m.leagueID}/matchups/${week}`))
      .then((entries) => {
        if (selectedKey !== key) return;
        const pick = (rid) => (entries ?? []).find((e) => String(e.roster_id) === String(rid));
        const ea = pick(s.rosterA);
        const eb = pick(s.rosterB);
        if (!ea?.starters || !eb?.starters) {
          lineup = { key, missing: true };
          return;
        }
        const toTemplate = (e) => ({ roster_id: e.roster_id, starters: e.starters, points: e.starters_points, players: e.players, playersPoints: e.players_points, matchup_id: e.matchup_id, total: e.points });
        lineup = { key, pair: [toTemplate(ea), toTemplate(eb)], week, year: m.season, current: s.current };
      })
      .catch((e) => {
        console.error(e);
        lineup = { key, missing: true };
      })
      .finally(() => (lineupLoading = false));
  });
  const select = (m) => {
    const key = keyOf(m);
    if (selectedKey === key) lineupOpen = !lineupOpen;
    else {
      selectedKey = key;
      lineupOpen = true;
    }
  };

  // ---- display
  const fmt = (n) => Number(n ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const short = (id) => nameOf(id);
  const teamA = $derived(latestTeam(one));
  const teamB = $derived(latestTeam(two));
  const titlesOf = (id) => (id ? titleYears(managerTrophies(awards, ownsFor(leagueTeamManagers, id))) : []);
  const titlesA = $derived(titlesOf(one));
  const titlesB = $derived(titlesOf(two));
  const titleText = (years) => (years.length ? `${years.length} title${years.length === 1 ? "" : "s"} · ${years.join(", ")}` : "No titles yet");
  const sideName = (side) => (side === "a" ? short(one) : short(two));
  const s = $derived(result?.summary);
  const leaderText = $derived.by(() => {
    if (!s?.count) return "";
    const { a, b } = s.overall;
    return a > b ? `${short(one)} leads` : b > a ? `${short(two)} leads` : "All square";
  });
  const facts = $derived.by(() => {
    if (!s?.count) return [];
    const when = (m) => `${m.season} ${m.kind === "playoff" ? m.label.toLowerCase() : `week ${m.week}`}`;
    const score = (m) => `${fmt(m.a)}–${fmt(m.b)}`;
    const by = (m) => (m.winner === "tie" ? "Tie" : `${sideName(m.winner)} by ${fmt(m.margin)}`);
    return [
      { k: "Last meeting", v: by(s.last), sub: `${when(s.last)} · ${score(s.last)}` },
      { k: "Streak", v: s.streak ? `${sideName(s.streak.side)} W${s.streak.n}` : "–", sub: s.snapped ? `Snapped ${sideName(s.snapped.side)}'s ${s.snapped.n} in a row` : s.streak?.n > 1 ? `${s.streak.n} straight` : "" },
      { k: "Biggest win", v: s.biggest ? by(s.biggest) : "–", sub: s.biggest ? `${when(s.biggest)} · ${score(s.biggest)}` : "" },
      { k: "Closest game", v: by(s.closest), sub: `${when(s.closest)} · ${score(s.closest)}` },
    ];
  });

  // Career comparison (all-time regular season unless noted; same numbers as the manager pages)
  const careerRows = $derived.by(() => {
    if (!one || !two) return [];
    const ca = careerStats(records, one);
    const cb = careerStats(records, two);
    if (!ca || !cb) return [];
    const ra = records?.regularSeasonData?.leagueManagerRecords?.[one] ?? {};
    const rb = records?.regularSeasonData?.leagueManagerRecords?.[two] ?? {};
    const iq = (r) => (r.potentialPoints ? r.fptsFor / r.potentialPoints : null);
    const pts = (v) => Number(v ?? 0).toLocaleString("en-US", { maximumFractionDigits: 1, minimumFractionDigits: 1 });
    const pct = (v) => (v == null ? "–" : `${(v * 100).toFixed(1)}%`);
    const poPct = (c) => winPct({ wins: c.playoffWins, losses: c.playoffLosses, ties: c.playoffTies });
    return [
      { label: "Record", a: recordText(ca.wins, ca.losses, ca.ties), b: recordText(cb.wins, cb.losses, cb.ties), va: ca.pct, vb: cb.pct },
      { label: "Win %", a: pctText(ca.pct), b: pctText(cb.pct), va: ca.pct, vb: cb.pct },
      { label: "Points for", a: pts(ca.pf), b: pts(cb.pf), va: ca.pf, vb: cb.pf },
      { label: "Points against", a: pts(ra.fptsAgainst), b: pts(rb.fptsAgainst), va: ra.fptsAgainst, vb: rb.fptsAgainst, neutral: true },
      { label: "Lineup IQ", a: pct(iq(ra)), b: pct(iq(rb)), va: iq(ra), vb: iq(rb) },
      { label: "Playoff record", a: recordText(ca.playoffWins, ca.playoffLosses, ca.playoffTies), b: recordText(cb.playoffWins, cb.playoffLosses, cb.playoffTies), va: poPct(ca), vb: poPct(cb) },
      { label: "Playoff trips", a: String(ca.appearances), b: String(cb.appearances), va: ca.appearances, vb: cb.appearances },
      { label: "Titles", a: String(titlesA.length), b: String(titlesB.length), va: titlesA.length, vb: titlesB.length },
    ].map((r) => {
      const max = Math.max(r.va ?? 0, r.vb ?? 0);
      return {
        ...r,
        wa: max > 0 ? Math.round(((r.va ?? 0) / max) * 100) : 0,
        wb: max > 0 ? Math.round(((r.vb ?? 0) / max) * 100) : 0,
        bestA: !r.neutral && (r.va ?? -1) > (r.vb ?? -1),
        bestB: !r.neutral && (r.vb ?? -1) > (r.va ?? -1),
      };
    });
  });

  // trades between the two (each season, the rosters they ran)
  const trades = $derived.by(() => {
    if (!one || !two) return [];
    return transactions.filter((t) => {
      if (t.type !== "trade") return false;
      const ra = parseInt(rosterOf(one, t.season));
      const rb = parseInt(rosterOf(two, t.season));
      return ra && rb && ra !== rb && t.rosters.includes(ra) && t.rosters.includes(rb);
    });
  });
</script>

<div class="rr-rivalry">
  <h1 class="rr-pageTitle">Rivalry</h1>

  <div class="rr-pickers">
    {@render picker(one, two, (v) => choose(v, two), "First manager", "rr-left")}
    <button type="button" class="rr-swap" aria-label="Swap managers" onclick={swap} disabled={!one || !two}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 7h12l-3-3M17 17H5l3 3"></path></svg>
    </button>
    {@render picker(two, one, (v) => choose(one, v), "Second manager", "rr-right")}
  </div>

  {#if status === "idle"}
    <p class="rr-pageSub">Pick two managers to see every game they've played against each other.</p>
  {:else if status === "loading"}
    <Loading message="Going through every season..." />
  {:else if status === "error"}
    <Loading message="Couldn't load the rivalry: {errorMessage}" progress={false} />
  {:else if result}
    <section class="rr-hero" aria-label="Head to head">
      {@render who(one, teamA, titlesA, "rr-left")}
      <div class="rr-series">
        <span class="rr-kicker">Head to head</span>
        {#if s.count}
          <div class="rr-score">
            <span class:rr-ahead={s.overall.a > s.overall.b}>{s.overall.a}</span><span class="rr-dash">–</span><span class:rr-ahead={s.overall.b > s.overall.a}>{s.overall.b}</span>
          </div>
          <span class="rr-seriesLine">
            {leaderText}{s.overall.t ? ` · ${s.overall.t} tie${s.overall.t === 1 ? "" : "s"}` : ""}
            {#if s.playoffs.a + s.playoffs.b + s.playoffs.t}· regular season {recordText(s.regular.a, s.regular.b, s.regular.t)} · playoffs {recordText(s.playoffs.a, s.playoffs.b, s.playoffs.t)}{/if}
          </span>
          <span class="rr-muted">Points in their games {fmt(s.points.a)} – {fmt(s.points.b)}</span>
        {:else}
          <span class="rr-seriesLine">They haven't played each other yet{s.live ? " (one game in progress)" : ""}.</span>
        {/if}
      </div>
      {@render who(two, teamB, titlesB, "rr-right")}
    </section>

    {#if facts.length}
      <div class="rr-facts">
        {#each facts as f (f.k)}
          <div class="rr-fact">
            <span class="rr-factK">{f.k}</span>
            <b class="rr-factV">{f.v}</b>
            {#if f.sub}<span class="rr-muted">{f.sub}</span>{/if}
          </div>
        {/each}
      </div>
    {/if}

    {#if careerRows.length}
      <section class="rr-card rr-career">
        <div class="rr-cardHead"><h2>Career comparison</h2><span class="rr-muted">All-time, as managers · regular season unless noted</span></div>
        {#each careerRows as r (r.label)}
          <div class="rr-tapeRow">
            <b class="rr-tapeVal" class:rr-best={r.bestA}>{r.a}</b>
            <span class="rr-bar rr-barA"><span style="width: {r.wa}%" class:rr-best={r.bestA}></span></span>
            <span class="rr-tapeLabel">{r.label}</span>
            <span class="rr-bar rr-barB"><span style="width: {r.wb}%" class:rr-best={r.bestB}></span></span>
            <b class="rr-tapeVal rr-right" class:rr-best={r.bestB}>{r.b}</b>
          </div>
        {/each}
      </section>
    {/if}

    {#if result.meetings.length}
      <section class="rr-meetings">
        <div class="rr-cardHead"><h2>Every meeting</h2><span class="rr-muted">Click one for both lineups</span></div>
        {#each result.meetings as m (keyOf(m))}
          {@const k = keyOf(m)}
          {@const ta = teamIn(rosterOf(one, m.season), m.season)}
          {@const tb = teamIn(rosterOf(two, m.season), m.season)}
          <button type="button" class="rr-meeting" class:rr-playoff={m.kind === "playoff"} class:rr-selected={selectedKey === k} aria-expanded={selectedKey === k && lineupOpen} onclick={() => select(m)}>
            <span class="rr-when"><b>{m.season} · Wk {m.weeks.join("–")}</b><span class="rr-tag">{m.live ? "Live" : m.kind === "playoff" ? `Playoffs · ${m.label}` : "Regular season"}</span></span>
            <span class="rr-tName rr-tA" class:rr-won={m.winner === "a"}>{ta?.name ?? short(one)}</span>
            <b class="rr-pts rr-ptsA" class:rr-won={m.winner === "a"}>{fmt(m.a)}</b>
            <span class="rr-vs">vs</span>
            <b class="rr-pts rr-ptsB" class:rr-won={m.winner === "b"}>{fmt(m.b)}</b>
            <span class="rr-tName rr-tB" class:rr-won={m.winner === "b"}>{tb?.name ?? short(two)}</span>
            <span class="rr-margin">{m.live ? "In progress" : m.winner === "tie" ? "Tie" : `${sideName(m.winner)} by ${fmt(m.margin)}`}</span>
          </button>
          {#if selectedKey === k && lineupOpen}
            <div class="rr-lineup">
              {#if lineup?.key === k && lineup.pair}
                <Matchup matchup={lineup.pair} {players} week={lineup.week} year={lineup.year} {leagueTeamManagers} current={lineup.current} open={true} onToggle={() => (lineupOpen = false)} />
              {:else if lineup?.key === k && lineup.missing}
                <p class="rr-muted">Sleeper doesn't have the lineups for this game.</p>
              {:else if lineupLoading}
                <Loading message="Loading the lineups..." />
              {/if}
            </div>
          {/if}
        {/each}
      </section>
    {/if}

    <section class="rr-card rr-trades">
      <div class="rr-cardHead"><h2>Trades between them</h2>{#if trades.length}<span class="rr-muted">{trades.length} trade{trades.length === 1 ? "" : "s"}</span>{/if}</div>
      {#if trades.length}
        <TransactionFeed transactions={trades} {players} {leagueTeamManagers} />
      {:else}
        <p class="rr-muted">They've never traded with each other.</p>
      {/if}
    </section>
  {/if}
</div>

{#snippet picker(value, other, onchange, label, side)}
  {@const team = latestTeam(value)}
  <label class="rr-picker {side}">
    {#if team?.avatar}<img src={team.avatar} alt="" />{:else}<span class="rr-avEmpty" aria-hidden="true"></span>{/if}
    <span class="rr-srOnly">{label}</span>
    <select value={value || ""} onchange={(e) => onchange(e.currentTarget.value)}>
      <option value="" disabled>Pick a manager</option>
      {#each managers as mgr (mgr.id)}
        <option value={mgr.id} disabled={mgr.id === other}>{mgr.name}</option>
      {/each}
    </select>
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 9l6 6 6-6"></path></svg>
  </label>
{/snippet}

{#snippet who(id, team, titles, side)}
  <div class="rr-who {side}">
    {#if team?.avatar}<img class="rr-whoAv" src={team.avatar} alt="" />{/if}
    <div class="rr-whoText">
      <b class="rr-whoName">{nameOf(id)}</b>
      <span class="rr-whoTeam">{team?.name ?? ""}</span>
      <span class="rr-whoTitles" class:rr-none={!titles.length}>{titleText(titles)}</span>
    </div>
  </div>
{/snippet}

<style>
  .rr-rivalry {
    max-width: 1000px;
    margin: 0 auto 6em;
    padding: 0 12px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 22px;
  }

  h1.rr-pageTitle {
    margin: 1.33em 0 0;
    text-align: center;
    font-size: 2.125rem;
    font-weight: 500;
    line-height: 1.2;
    color: var(--or-heading, var(--g111));
  }

  .rr-muted {
    color: var(--or-muted, var(--g999));
    font-size: 0.82em;
  }

  .rr-srOnly {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
  }

  /* ---- pickers */
  .rr-pickers {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 14px;
    flex-wrap: wrap;
  }

  .rr-picker {
    position: relative;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 12px 6px 6px;
    border-radius: 999px;
    border: 1px solid var(--or-table-border, var(--ccc));
    background: var(--fff);
  }

  .rr-picker.rr-left {
    border-color: color-mix(in srgb, var(--or-pink, #c2185b) 60%, transparent);
  }

  .rr-picker.rr-right {
    border-color: color-mix(in srgb, var(--or-cyan, #0b8a9a) 60%, transparent);
  }

  .rr-picker img,
  .rr-avEmpty {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    object-fit: cover;
    flex: none;
  }

  .rr-avEmpty {
    border: 1px dashed var(--or-table-border, var(--ccc));
    box-sizing: border-box;
  }

  .rr-picker select {
    appearance: none;
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    font-size: 0.95em;
    padding: 6px 22px 6px 0;
    min-width: 150px;
    cursor: pointer;
  }

  .rr-picker select option {
    background: var(--fff);
    color: var(--or-text, var(--g111));
  }

  .rr-picker svg {
    position: absolute;
    right: 12px;
    pointer-events: none;
    color: var(--or-muted, var(--g999));
  }

  .rr-swap {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: 1px solid var(--or-table-border, var(--ccc));
    background: var(--fff);
    color: inherit;
    display: grid;
    place-items: center;
    cursor: pointer;
  }

  .rr-swap:disabled {
    opacity: 0.5;
    cursor: default;
  }

  /* ---- hero */
  .rr-hero {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: 24px;
    padding: 26px 30px;
    border-radius: 18px;
    border: 1px solid var(--or-table-border, var(--ccc));
    background:
      radial-gradient(circle at 12% 50%, color-mix(in srgb, var(--or-pink, #c2185b) 16%, transparent), transparent 45%),
      radial-gradient(circle at 88% 50%, color-mix(in srgb, var(--or-cyan, #0b8a9a) 14%, transparent), transparent 45%),
      var(--fff);
  }

  .rr-who {
    display: flex;
    align-items: center;
    gap: 16px;
    min-width: 0;
  }

  .rr-who.rr-right {
    flex-direction: row-reverse;
    text-align: right;
  }

  .rr-whoAv {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    object-fit: cover;
    flex: none;
  }

  .rr-whoText {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }

  .rr-whoName {
    font: 800 1.3rem "Orbitron", sans-serif;
    color: var(--or-heading, var(--g111));
  }

  .rr-whoTeam {
    font-size: 0.85em;
    overflow-wrap: anywhere;
  }

  .rr-whoTitles {
    font-size: 0.78em;
    color: var(--or-orange, #e8590c);
  }

  .rr-whoTitles.rr-none {
    color: var(--or-muted, var(--g999));
  }

  .rr-series {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    text-align: center;
    max-width: 340px;
  }

  .rr-kicker,
  .rr-factK {
    font: 700 0.68em "Orbitron", sans-serif;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--or-cyan, #0b8a9a);
  }

  .rr-score {
    display: flex;
    align-items: baseline;
    gap: 16px;
    font: 800 3.2rem "Orbitron", sans-serif;
    color: var(--or-muted, var(--g999));
  }

  .rr-score .rr-ahead {
    color: var(--or-heading, var(--g111));
    text-shadow: 0 0 18px var(--or-glow-pink, transparent);
  }

  .rr-dash {
    font-size: 0.45em;
  }

  .rr-seriesLine {
    font-size: 0.85em;
  }

  /* ---- facts */
  .rr-facts {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
  }

  .rr-fact {
    border-radius: 14px;
    border: 1px solid var(--or-table-border, var(--ccc));
    background: var(--fff);
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .rr-factK {
    color: var(--or-orange, #e8590c);
  }

  .rr-factV {
    font: 700 0.95rem "Orbitron", sans-serif;
    color: var(--or-heading, var(--g111));
  }

  /* ---- cards */
  .rr-card {
    border-radius: 16px;
    border: 1px solid var(--or-table-border, var(--ccc));
    background: var(--fff);
    padding: 18px 22px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .rr-cardHead {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 12px;
    flex-wrap: wrap;
  }

  .rr-cardHead h2 {
    margin: 0;
    font: 700 1.05rem "Orbitron", sans-serif;
    color: var(--or-heading, var(--g111));
  }

  /* ---- career comparison */
  .rr-tapeRow {
    display: grid;
    grid-template-columns: 100px 1fr 140px 1fr 100px;
    align-items: center;
    gap: 12px;
  }

  .rr-tapeVal {
    font: 700 0.88rem "Orbitron", sans-serif;
    color: var(--or-muted, var(--g999));
  }

  .rr-tapeVal.rr-right {
    text-align: right;
  }

  .rr-tapeVal.rr-best {
    color: var(--or-heading, var(--g111));
  }

  .rr-tapeLabel {
    text-align: center;
    font-size: 0.8em;
  }

  .rr-bar {
    display: flex;
    height: 8px;
    border-radius: 4px;
    background: color-mix(in srgb, var(--or-purple, #7b1fa2) 18%, transparent);
  }

  .rr-barA {
    justify-content: flex-end;
  }

  .rr-bar span {
    height: 100%;
    border-radius: 4px;
  }

  .rr-barA span {
    background: color-mix(in srgb, var(--or-pink, #c2185b) 45%, transparent);
  }

  .rr-barB span {
    background: color-mix(in srgb, var(--or-cyan, #0b8a9a) 40%, transparent);
  }

  .rr-barA span.rr-best {
    background: var(--or-pink, #c2185b);
    box-shadow: 0 0 8px var(--or-glow-pink, transparent);
  }

  .rr-barB span.rr-best {
    background: var(--or-cyan, #0b8a9a);
    box-shadow: 0 0 8px color-mix(in srgb, var(--or-cyan, #0b8a9a) 60%, transparent);
  }

  /* ---- meetings */
  .rr-meetings {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .rr-meeting {
    display: grid;
    grid-template-columns: 140px minmax(0, 1fr) 84px 22px 84px minmax(0, 1fr) 130px;
    grid-template-areas: "when ta pa vs pb tb margin";
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border-radius: 12px;
    border: 1px solid var(--or-table-border, var(--ccc));
    background: var(--fff);
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
    transition: border-color 0.2s, box-shadow 0.2s;
  }

  .rr-meeting:hover,
  .rr-meeting:focus-visible {
    border-color: var(--or-pink, var(--blueOne));
  }

  .rr-meeting.rr-playoff {
    border-color: color-mix(in srgb, var(--or-orange, #e8590c) 60%, transparent);
  }

  .rr-meeting.rr-selected {
    border-color: var(--or-cyan, #0b8a9a);
    box-shadow: 0 0 16px color-mix(in srgb, var(--or-cyan, #0b8a9a) 30%, transparent);
  }

  .rr-when {
    grid-area: when;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .rr-when b {
    font: 700 0.8rem "Orbitron", sans-serif;
    color: var(--or-heading, var(--g111));
  }

  .rr-tag {
    font-size: 0.7em;
    color: var(--or-muted, var(--g999));
  }

  .rr-playoff .rr-tag {
    color: var(--or-orange, #e8590c);
    font-weight: 700;
  }

  .rr-tName {
    font-size: 0.82em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--or-muted, var(--g999));
  }

  .rr-tA {
    grid-area: ta;
    text-align: right;
  }

  .rr-tB {
    grid-area: tb;
  }

  .rr-tName.rr-won {
    color: var(--or-heading, var(--g111));
    font-weight: 700;
  }

  .rr-pts {
    font: 700 0.95rem "Orbitron", sans-serif;
    color: var(--or-muted, var(--g999));
  }

  .rr-ptsA {
    grid-area: pa;
    text-align: right;
  }

  .rr-ptsB {
    grid-area: pb;
  }

  .rr-ptsA.rr-won {
    color: var(--or-pink, #c2185b);
    text-shadow: 0 0 10px var(--or-glow-pink, transparent);
  }

  .rr-ptsB.rr-won {
    color: var(--or-cyan, #0b8a9a);
    text-shadow: 0 0 10px color-mix(in srgb, var(--or-cyan, #0b8a9a) 60%, transparent);
  }

  .rr-vs {
    grid-area: vs;
    text-align: center;
    font-size: 0.75em;
    color: var(--or-muted, var(--g999));
  }

  .rr-margin {
    grid-area: margin;
    text-align: right;
    font-size: 0.75em;
    color: var(--or-muted, var(--g999));
  }

  .rr-lineup {
    margin: -4px 0 6px;
  }

  /* ---- phones */
  @media (max-width: 759.98px) {
    .rr-hero {
      grid-template-columns: 1fr 1fr;
      padding: 18px;
      gap: 16px;
    }

    .rr-series {
      grid-column: 1 / -1;
      grid-row: 1;
      max-width: none;
    }

    .rr-who,
    .rr-who.rr-right {
      flex-direction: column;
      text-align: center;
      gap: 8px;
    }

    .rr-whoAv {
      width: 52px;
      height: 52px;
    }

    .rr-whoName {
      font-size: 1rem;
    }

    .rr-facts {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .rr-tapeRow {
      grid-template-columns: 72px 1fr 88px 1fr 72px;
      gap: 6px;
    }

    .rr-tapeVal {
      font-size: 0.72rem;
    }

    .rr-tapeLabel {
      font-size: 0.7em;
    }

    .rr-meeting {
      grid-template-columns: minmax(0, 1fr) auto 16px auto minmax(0, 1fr);
      grid-template-areas:
        "when when when margin margin"
        "ta pa vs pb tb";
      gap: 6px 8px;
      padding: 10px 12px;
    }

    .rr-pts {
      font-size: 0.82rem;
    }
  }
</style>
