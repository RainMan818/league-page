<!--
  Homepage "Payouts" tab (design canvas option B, Nov 16): the Constitution's in-season prizes for this season.
  Money list (only prizes already paid: final weeks, then the season prizes once decided), the top score of each
  week (paid / live / to come), and the season-long races: highest single week (leader only), top offensive and IDP
  players (top 3; credited to the team that has him now), division leaders, Toilet Bowl.
  Data: standings (final weeks' scores, records), the league's matchups (the live week), /api/fetch_trending (every
  player's league points, cached on the server; shared with the Players page) and, once the playoffs start, the
  losers bracket. Math in utils/payouts.js.
-->
<script>
  import { onMount } from "svelte";
  import { getLeagueMatchups } from "$lib/utils/helper";
  import { leagueID } from "$lib/utils/leagueInfo";
  import { loadLeagueContext } from "../../utils/leagueContext.js";
  import { sleeperFetch } from "../../utils/sleeperFetch.js";
  import { seedTeams } from "../../utils/playoffs.js";
  import { bracketIsSet } from "../../utils/draftOrder.js";
  import { entriesByWeek } from "../../utils/matchupEntries.js";
  import { toiletBowl } from "../../utils/seasonAwards.js";
  import { lastFantasyWeek } from "../../utils/playerCard.js";
  import { posColor } from "../../utils/positions.js";
  import {
    PAYOUTS, OFFENSE, IDP, weeklyPrizes, highestWeek, playerTotals, ownersOf, topPlayers, divisionLeaders, recordText,
    moneyList, potSummary, weeksWon,
  } from "../../utils/payouts.js";
  import TeamChip from "../Shared/TeamChip.svelte";
  import Loading from "../Shared/Loading.svelte";

  let { standingsData, leagueTeamManagersData } = $props();

  let status = $state("loading"); // loading | preseason | ready | error
  let v = $state.raw(null);

  async function losersBracket() {
    try {
      const res = await sleeperFetch(`https://api.sleeper.app/v1/league/${leagueID}/losers_bracket`, { compress: true });
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.error(e);
      return [];
    }
  }

  onMount(async () => {
    try {
      const ctx = await loadLeagueContext({ standingsData, leagueTeamManagersData });
      const { standings, rosters, leagueData, teams, players, onTeamClick } = ctx;
      if (!standings?.standingsInfo) {
        status = "preseason";
        return;
      }
      const settings = leagueData.settings;
      const regularSeasonLength = (settings.playoff_week_start || 15) - 1;
      const regularDone = bracketIsSet(leagueData);

      // final weeks: standings.matchups is newest first, one entry list per finished week
      const done = standings.matchups ?? [];
      const finished = Object.fromEntries(done.map((entries, i) => [done.length - i, entries]));

      const [matchups, trending, bracket] = await Promise.all([
        getLeagueMatchups().catch((e) => (console.error(e), null)),
        fetch("/api/fetch_trending")
          .then((r) => (r.ok ? r.json() : null))
          .catch((e) => (console.error(e), null)),
        regularDone ? losersBracket() : Promise.resolve([]),
      ]);

      const byWeek = matchups?.matchupWeeks ? entriesByWeek(matchups.matchupWeeks) : {};
      const liveWeek = Number(matchups?.week);
      const live = liveWeek && !finished[liveWeek] && liveWeek <= regularSeasonLength ? { week: liveWeek, entries: byWeek[liveWeek] ?? [] } : null;
      const weekly = weeklyPrizes({ finished, live, regularSeasonLength });
      const high = highestWeek(finished, regularSeasonLength);

      let offense = null;
      let idp = null;
      if (trending?.weeks) {
        const totals = playerTotals(trending.weeks, regularSeasonLength);
        const owners = ownersOf(rosters);
        offense = topPlayers({ totals, players, owners, groups: OFFENSE, n: 3 });
        idp = topPlayers({ totals, players, owners, groups: IDP, n: 3 });
      }

      const info = Object.values(standings.standingsInfo).map((s) => ({ ...s, id: String(s.rosterID), division: rosters[s.rosterID]?.settings?.division ?? null }));
      const divisions = divisionLeaders(seedTeams(info, { playoffTeams: settings.playoff_teams || 6 }).divisionWinners);

      const toilet = regularDone
        ? toiletBowl({ losersBracket: bracket, weeks: byWeek, playoffWeekStart: settings.playoff_week_start, playoffRoundType: settings.playoff_round_type ?? 0 })
        : null;

      const money = moneyList({ weekly, regularDone, high, topOffense: offense?.[0], topIdp: idp?.[0], divisions, toilet: toilet?.rosterID });
      v = {
        teams,
        players,
        onTeamClick,
        weekly,
        high,
        offense,
        idp,
        divisions,
        toilet,
        money,
        pot: potSummary({ money, regularSeasonLength, divisionCount: divisions.length }),
        regularDone,
        weeksPaid: weekly.filter((w) => w.status === "paid").length,
        regularSeasonLength,
        toiletWeek: lastFantasyWeek(settings),
        playersThrough: trending?.through ?? null,
      };
      status = "ready";
    } catch (e) {
      console.error(e);
      status = "error";
    }
  });

  const team = (id) => v?.teams?.[String(id)] ?? { name: `Team ${id}` };
  const click = (id) => (v?.onTeamClick ? () => v.onTeamClick(id) : null);
  const playerName = (id) => (v?.players?.[id] ? `${v.players[id].fn} ${v.players[id].ln}` : id);
  const money$ = (n) => `$${Number.isInteger(n) ? n : n.toFixed(2)}`;
  const prizeTag = (decided, many = false) => (decided ? (many ? "Winners" : "Winner") : many ? "Leaders" : "Leader");
</script>

{#snippet playerRace(list)}
  {#if !list}
    <p class="rr-muted">Player points couldn't be loaded right now.</p>
  {:else if !list.length}
    <p class="rr-muted">No games yet.</p>
  {:else}
    <ol class="rr-podium">
      {#each list as p, i (p.id)}
        <li class:rr-first={i === 0}>
          <span class="rr-place">{i + 1}</span>
          <span class="rr-player">
            <span class="rr-pname" data-player-id={p.id} role="button" tabindex="0">{playerName(p.id)}</span>
            <span class="rr-pos" style="--pos: {posColor(p.group)}">{p.group}</span>
          </span>
          <b class="rr-pts">{p.points.toFixed(1)}</b>
          <span class="rr-owner"><TeamChip team={team(p.rosterID)} size={20} onclick={click(p.rosterID)} /></span>
        </li>
      {/each}
    </ol>
  {/if}
{/snippet}

<div class="rr-payouts">
  {#if status === "loading"}
    <Loading message="Adding up the payouts..." />
  {:else if status === "preseason"}
    <p class="rr-muted rr-center">Payouts start with week 1.</p>
  {:else if status === "error"}
    <p class="rr-muted rr-center">The payouts couldn't be loaded right now. Try again later.</p>
  {:else}
    <div class="rr-layout">
      <section class="rr-card rr-moneyCard">
        <h2>Money list</h2>
        <p class="rr-sub">In-season prizes paid so far</p>
        {#if v.money.length}
          <ol class="rr-money">
            {#each v.money as t (t.rosterID)}
              {@const weeks = weeksWon(t.prizes)}
              {@const others = t.prizes.filter((p) => p.kind !== "weekly")}
              <li>
                <span class="rr-moneyTeam">
                  <TeamChip team={team(t.rosterID)} size={30} onclick={click(t.rosterID)} />
                  <span class="rr-prizes">
                    {#if weeks}<span>Top score: {weeks}</span>{/if}
                    {#each others as p, pi (pi)}<span>{p.label}</span>{/each}
                  </span>
                </span>
                <b class="rr-amount">{money$(t.amount)}</b>
              </li>
            {/each}
          </ol>
        {:else}
          <p class="rr-muted">Nothing paid yet: the first $10 goes out when week 1 is final.</p>
        {/if}
        <div class="rr-potLine"><span>Paid so far</span><span><b class="rr-gold">{money$(v.pot.paid)}</b> of {money$(v.pot.total)}</span></div>
      </section>

      <div class="rr-right">
        <section class="rr-card">
          <div class="rr-head">
            <h2>Top score each week</h2>
            <span class="rr-sub">{money$(PAYOUTS.weekly)} a week · {v.weeksPaid} of {v.regularSeasonLength} paid</span>
          </div>
          <div class="rr-weeks">
            {#each v.weekly as w (w.week)}
              <div class="rr-week rr-{w.status}">
                <span class="rr-wk">{w.status === "live" ? `LIVE · WK ${w.week}` : `WK ${w.week}`}</span>
                {#if w.rosterIDs.length}
                  <span class="rr-avatars">
                    {#each w.rosterIDs as id (id)}
                      {#if team(id).avatar}<img src={team(id).avatar} alt="" />{/if}
                    {/each}
                  </span>
                  <span class="rr-wkTeam">{w.rosterIDs.map((id) => team(id).name).join(" & ")}</span>
                  <b class="rr-wkPts">{w.points.toFixed(1)}</b>
                  <span class="rr-wkPay">{w.status === "live" ? "leading" : w.rosterIDs.length > 1 ? `${money$(PAYOUTS.weekly / w.rosterIDs.length)} each` : money$(PAYOUTS.weekly)}</span>
                {:else}
                  <span class="rr-dot">·</span>
                  <span class="rr-wkPay">{money$(PAYOUTS.weekly)}</span>
                {/if}
              </div>
            {/each}
          </div>
        </section>

        <section class="rr-card rr-races">
          <div class="rr-race">
            <div class="rr-raceHead">
              <span class="rr-raceName">Highest single-week score</span>
              <span class="rr-raceTag">{prizeTag(v.regularDone)} · regular season</span>
            </div>
            <div class="rr-raceBody">
              {#if v.high}
                <span class="rr-leader">
                  <TeamChip team={team(v.high.rosterID)} size={30} onclick={click(v.high.rosterID)} />
                  <span class="rr-leaderNote"><b>{v.high.points.toFixed(2)}</b> in week {v.high.week}</span>
                </span>
              {:else}<span class="rr-muted">No games yet.</span>{/if}
            </div>
            <b class="rr-gold rr-raceAmt">{money$(PAYOUTS.highWeek)}</b>
          </div>

          <div class="rr-race">
            <div class="rr-raceHead">
              <span class="rr-raceName">Highest-scoring offensive player</span>
              <span class="rr-raceTag">{prizeTag(v.regularDone)} · his team wins</span>
            </div>
            <div class="rr-raceBody">{@render playerRace(v.offense)}</div>
            <b class="rr-gold rr-raceAmt">{money$(PAYOUTS.topOffense)}</b>
          </div>

          <div class="rr-race">
            <div class="rr-raceHead">
              <span class="rr-raceName">Highest-scoring IDP player</span>
              <span class="rr-raceTag">{prizeTag(v.regularDone)} · his team wins</span>
            </div>
            <div class="rr-raceBody">{@render playerRace(v.idp)}</div>
            <b class="rr-gold rr-raceAmt">{money$(PAYOUTS.topIdp)}</b>
          </div>

          <div class="rr-race">
            <div class="rr-raceHead">
              <span class="rr-raceName">Division winners</span>
              <span class="rr-raceTag">{prizeTag(v.regularDone, true)}{v.regularDone ? "" : " · decided after week " + v.regularSeasonLength}</span>
            </div>
            <div class="rr-raceBody">
              <div class="rr-divs">
                {#each v.divisions as d (d.division)}
                  <span class="rr-divName">Division {d.division}</span>
                  <span class="rr-divTeam"><TeamChip team={team(d.rosterID)} size={24} onclick={click(d.rosterID)} /></span>
                  <span class="rr-divRec">{recordText(d)}</span>
                {/each}
              </div>
            </div>
            <span class="rr-raceAmt"><b class="rr-gold">{money$(PAYOUTS.division)}</b><small>each</small></span>
          </div>

          <div class="rr-race">
            <div class="rr-raceHead">
              <span class="rr-raceName">Toilet Bowl winner</span>
              <span class="rr-raceTag">{v.toilet ? "Winner" : "Playoffs"}</span>
            </div>
            <div class="rr-raceBody">
              {#if v.toilet}
                <TeamChip team={team(v.toilet.rosterID)} size={30} onclick={click(v.toilet.rosterID)} />
              {:else}
                <span class="rr-muted">Decided in week {v.toiletWeek}, among the teams that miss the playoffs</span>
              {/if}
            </div>
            <b class="rr-gold rr-raceAmt">{money$(PAYOUTS.toiletBowl)}</b>
          </div>
        </section>
        {#if v.playersThrough}<p class="rr-foot">Player points through week {v.playersThrough}</p>{/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .rr-payouts {
    --gold: #ffc94a;
    container-type: inline-size;
    width: 100%;
    max-width: 1140px;
    margin: 0 auto;
    padding: 0 16px 4em;
    box-sizing: border-box;
  }

  :global(html[data-theme="day"]) .rr-payouts {
    --gold: #a87400;
  }

  .rr-layout {
    display: grid;
    grid-template-columns: minmax(300px, 380px) minmax(0, 1fr);
    gap: 16px;
    align-items: start;
  }

  .rr-right {
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-width: 0;
  }

  .rr-card {
    border-radius: 16px;
    border: 1px solid var(--or-table-border, var(--ccc));
    background: var(--fff);
    padding: 16px 18px;
    min-width: 0;
    box-sizing: border-box;
  }

  h2 {
    margin: 0;
    font: 700 1rem "Orbitron", sans-serif;
    color: var(--or-heading, var(--g111));
    text-align: left;
  }

  .rr-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 6px 12px;
    margin-bottom: 12px;
  }

  .rr-sub {
    margin: 4px 0 0;
    font-size: 0.75rem;
    color: var(--or-muted, var(--g999));
  }

  .rr-head .rr-sub {
    margin: 0;
  }

  .rr-muted {
    margin: 0;
    font-size: 0.8rem;
    color: var(--or-muted, var(--g999));
  }

  .rr-center {
    text-align: center;
    padding: 2em 0;
  }

  .rr-gold {
    color: var(--gold);
    font-family: "Orbitron", sans-serif;
  }

  /* ---- money list */
  .rr-money {
    list-style: none;
    margin: 10px 0 0;
    padding: 0;
  }

  .rr-money li {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    padding: 10px 0;
    border-top: 1px solid color-mix(in srgb, var(--or-table-border, #ccc) 55%, transparent);
  }

  .rr-moneyTeam {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--or-text, var(--g111));
  }

  .rr-prizes {
    display: flex;
    flex-wrap: wrap;
    gap: 2px 10px;
    padding-left: 38px;
    font-size: 0.7rem;
    font-weight: 400;
    color: var(--or-muted, var(--g999));
  }

  .rr-amount {
    flex: none;
    font: 800 0.95rem "Orbitron", sans-serif;
    color: var(--gold);
  }

  .rr-potLine {
    display: flex;
    justify-content: space-between;
    padding-top: 10px;
    margin-top: 2px;
    border-top: 1px solid var(--or-table-border, #ccc);
    font-size: 0.8rem;
    color: var(--or-text, var(--g111));
  }

  /* ---- weekly grid */
  .rr-weeks {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    gap: 8px;
  }

  .rr-week {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    padding: 8px 4px;
    border-radius: 12px;
    border: 1px solid var(--or-table-border, #ccc);
    min-width: 0;
    text-align: center;
  }

  .rr-week.rr-paid {
    border-color: color-mix(in srgb, var(--or-cyan, #0b8a9a) 50%, transparent);
    background: color-mix(in srgb, var(--or-cyan, #0b8a9a) 6%, transparent);
  }

  .rr-week.rr-live {
    border: 1px dashed var(--or-pink, #c2185b);
  }

  .rr-week.rr-upcoming {
    opacity: 0.5;
    justify-content: center;
  }

  .rr-wk {
    font-size: 0.6rem;
    color: var(--or-muted, var(--g999));
    white-space: nowrap;
  }

  .rr-live .rr-wk {
    color: var(--or-pink, #c2185b);
    font-weight: 700;
  }

  .rr-avatars {
    display: flex;
    justify-content: center;
  }

  .rr-avatars img {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: 1px solid var(--or-table-border, #ccc);
    object-fit: cover;
  }

  .rr-avatars img + img {
    margin-left: -8px;
  }

  .rr-wkTeam {
    max-width: 100%;
    font-size: 0.62rem;
    color: var(--or-text, var(--g111));
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .rr-wkPts {
    font: 700 0.72rem "Orbitron", sans-serif;
    color: var(--or-heading, var(--g111));
  }

  .rr-wkPay {
    font-size: 0.62rem;
    color: var(--or-muted, var(--g999));
  }

  .rr-paid .rr-wkPay {
    color: var(--gold);
  }

  .rr-dot {
    font-size: 1.1rem;
    line-height: 1;
    color: var(--or-muted, var(--g999));
  }

  /* ---- races */
  .rr-races {
    padding-top: 4px;
    padding-bottom: 4px;
  }

  .rr-race {
    display: grid;
    grid-template-columns: 190px minmax(0, 1fr) 56px;
    gap: 14px;
    align-items: start;
    padding: 12px 0;
    border-top: 1px solid color-mix(in srgb, var(--or-table-border, #ccc) 55%, transparent);
  }

  .rr-race:first-child {
    border-top: 0;
  }

  .rr-raceHead {
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding-top: 4px;
  }

  .rr-raceName {
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--or-text, var(--g111));
  }

  .rr-raceTag {
    font: 700 0.58rem "Roboto", sans-serif;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--or-muted, var(--g999));
  }

  .rr-raceBody {
    min-width: 0;
    font-size: 0.82rem;
  }

  .rr-raceAmt {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    padding-top: 4px;
    font-size: 0.85rem;
    text-align: right;
  }

  .rr-raceAmt small {
    font-size: 0.6rem;
    color: var(--or-muted, var(--g999));
  }

  .rr-leader {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-weight: 600;
    color: var(--or-text, var(--g111));
  }

  .rr-leaderNote {
    padding-left: 38px;
    font-weight: 400;
    font-size: 0.78rem;
    color: var(--or-muted, var(--g999));
  }

  .rr-leaderNote b {
    color: var(--or-heading, var(--g111));
  }

  .rr-podium {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .rr-podium li {
    display: grid;
    grid-template-columns: 18px minmax(0, 1.2fr) 48px minmax(0, 1fr);
    gap: 10px;
    align-items: center;
    font-size: 0.8rem;
    color: var(--or-muted, var(--g999));
  }

  .rr-podium li.rr-first {
    color: var(--or-text, var(--g111));
    font-weight: 600;
  }

  .rr-place {
    font: 700 0.7rem "Orbitron", sans-serif;
  }

  .rr-first .rr-place {
    color: var(--gold);
  }

  .rr-player {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
  }

  .rr-pname {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .rr-pos {
    flex: none;
    padding: 0 5px;
    border-radius: 4px;
    font: 700 0.58rem "Roboto", sans-serif;
    line-height: 14px;
    background: var(--pos);
    color: var(--or-pos-chip-text, #0b0320);
  }

  .rr-pts {
    text-align: right;
    font-variant-numeric: tabular-nums;
    color: var(--or-heading, var(--g111));
  }

  .rr-owner {
    min-width: 0;
    font-size: 0.74rem;
    font-weight: 400;
  }

  .rr-divs {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    gap: 7px 12px;
    align-items: center;
  }

  .rr-divName {
    font: 700 0.62rem "Roboto", sans-serif;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--or-cyan, #0b8a9a);
  }

  .rr-divTeam {
    min-width: 0;
    font-weight: 600;
    color: var(--or-text, var(--g111));
  }

  .rr-divRec {
    font-variant-numeric: tabular-nums;
    color: var(--or-muted, var(--g999));
  }

  .rr-foot {
    margin: -6px 2px 0;
    font-size: 0.7rem;
    color: var(--or-muted, var(--g999));
  }

  /* sized by the room the homepage gives this tab (a sidebar sits beside it on desktop), not the screen */
  @container (max-width: 959.98px) {
    .rr-layout {
      grid-template-columns: minmax(0, 1fr);
    }
  }

  @media (max-width: 599.98px) {
    .rr-payouts {
      padding: 0 10px 4em;
    }
  }

  @container (max-width: 599.98px) {
    .rr-card {
      padding: 14px 14px;
    }

    .rr-weeks {
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 6px;
    }

    .rr-race {
      grid-template-columns: minmax(0, 1fr) auto;
      grid-template-areas:
        "head amt"
        "body body";
      gap: 8px 10px;
    }

    .rr-raceHead {
      grid-area: head;
    }

    .rr-raceBody {
      grid-area: body;
    }

    .rr-raceAmt {
      grid-area: amt;
    }

    .rr-podium li {
      grid-template-columns: 16px minmax(0, 1fr) 44px;
    }

    .rr-owner {
      grid-column: 2 / 4;
      margin-top: -3px;
    }
  }
</style>
