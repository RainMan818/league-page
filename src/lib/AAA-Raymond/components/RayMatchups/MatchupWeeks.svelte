<!--
  Regular-season matchups for one week (Matchups option B). Replaces the template's MatchupWeeks in
  src/lib/Matchups/MatchupsAndBrackets.svelte; the playoff bracket still uses the template's components.
  Same props and URL behavior as the template version (?week=N, playoffs weeks switch to the bracket).
  The current week is labeled LIVE with a "Refresh scores" button (one Sleeper request, at most every 30 seconds;
  nothing refreshes on its own). Past weeks say FINAL, future weeks UPCOMING.
-->
<script>
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { getLeagueData } from "$lib/utils/helper";
  import { leagueID } from "$lib/utils/leagueInfo";
  import { matchupsStore } from "$lib/stores";
  import { toTemplateMatchups, weekStatus } from "../../utils/matchupEntries.js";
  import Matchup from "./Matchup.svelte";

  const REFRESH_COOLDOWN_MS = 30000; // be gentle with the Sleeper API

  let {
    queryWeek,
    players,
    matchupWeeks,
    year,
    week,
    regularSeasonLength,
    selection = $bindable(),
    leagueTeamManagers,
  } = $props();

  let displayWeek = $state(Number(queryWeek) || 1);
  let active = $state(null);
  let medianGames = $state(false);

  // refreshed scores for one week (replaces the cached copy for that week)
  let refreshed = $state.raw(null); // { week, matchups, at }
  let refreshing = $state(false);
  let coolingDown = $state(false);
  let refreshError = $state("");

  const cachedWeek = $derived(matchupWeeks.find((w) => w.week === displayWeek) ?? matchupWeeks[displayWeek - 1]);
  const matchups = $derived(
    Object.values(refreshed?.week === displayWeek ? refreshed.matchups : (cachedWeek?.matchups ?? {}))
  );

  // the template passes the current NFL week (display week) during the regular season
  const currentWeek = $derived(Number(week) > 0 && Number(week) <= regularSeasonLength ? Number(week) : null);
  const status = $derived(weekStatus(displayWeek, currentWeek));
  const updatedAt = $derived(
    refreshed?.week === displayWeek ? refreshed.at.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : ""
  );

  const refresh = async () => {
    if (refreshing || coolingDown) return;
    refreshing = true;
    refreshError = "";
    const forWeek = displayWeek;
    try {
      const res = await fetch(`https://api.sleeper.app/v1/league/${leagueID}/matchups/${forWeek}`, { compress: true });
      if (!res.ok) throw new Error(`Sleeper returned ${res.status}`);
      const fresh = toTemplateMatchups(await res.json());
      refreshed = { week: forWeek, matchups: fresh, at: new Date() };
      // keep the shared cache in step so other pages see the new scores too
      matchupsStore.update((s) =>
        s?.matchupWeeks ? { ...s, matchupWeeks: s.matchupWeeks.map((w) => (w.week === forWeek ? { ...w, matchups: fresh } : w)) } : s
      );
      coolingDown = true;
      setTimeout(() => (coolingDown = false), REFRESH_COOLDOWN_MS);
    } catch (err) {
      console.error(err);
      refreshError = "Couldn't refresh the scores. Try again in a moment.";
    } finally {
      refreshing = false;
    }
  };

  // league median for the week: every team's starter points, middle value
  const median = $derived.by(() => {
    const totals = matchups
      .flat()
      .map((e) => (e.points ?? []).reduce((a, b) => a + (b || 0), 0))
      .sort((a, b) => a - b);
    if (!totals.length || totals[totals.length - 1] === 0) return null;
    const mid = Math.floor(totals.length / 2);
    return totals.length % 2 ? totals[mid] : (totals[mid - 1] + totals[mid]) / 2;
  });

  onMount(() => {
    // the median badge only means something in leagues that play the median each week
    getLeagueData()
      .then((d) => (medianGames = d?.settings?.league_average_match == 1))
      .catch(() => {});

    if (!queryWeek || queryWeek < 1) {
      displayWeek = Number(week) || 1;
      goto(`/matchups?week=${displayWeek}`, { noscroll: true });
      if (displayWeek > regularSeasonLength) selection = "champions";
      return;
    }
    if (queryWeek > regularSeasonLength) selection = "champions";
  });

  const changeWeek = (newWeek) => {
    displayWeek = newWeek;
    active = null;
    refreshError = "";
    goto(`/matchups?week=${newWeek}`, { noscroll: true });
  };
</script>

<div class="rr-weeks">
  <div class="rr-weekHead">
    <button type="button" class="rr-weekBtn" aria-label="Previous week" disabled={displayWeek <= 1} onclick={() => changeWeek(displayWeek - 1)}>
      <span class="material-icons" aria-hidden="true">chevron_left</span>
    </button>
    <h3 class="rr-weekTitle">{year} Week {displayWeek} Matchups</h3>
    <button type="button" class="rr-weekBtn" aria-label="Next week" disabled={displayWeek >= matchupWeeks.length} onclick={() => changeWeek(displayWeek + 1)}>
      <span class="material-icons" aria-hidden="true">chevron_right</span>
    </button>
  </div>

  <div class="rr-status">
    {#if status === "live"}
      <span class="rr-pill rr-live"><span class="rr-dot" aria-hidden="true"></span>Live</span>
      <button type="button" class="rr-refresh" disabled={refreshing || coolingDown} onclick={refresh}>
        <span class="material-icons" class:rr-spin={refreshing} aria-hidden="true">refresh</span>
        {refreshing ? "Refreshing…" : coolingDown ? "Up to date" : "Refresh scores"}
      </button>
    {:else if status === "final"}
      <span class="rr-pill rr-final">Final</span>
    {:else}
      <span class="rr-pill rr-upcoming">Upcoming</span>
    {/if}
  </div>
  {#if refreshError}<p class="rr-error" role="alert">{refreshError}</p>{/if}

  <div class="rr-list">
    {#each matchups as matchup, ix (`${displayWeek}-${ix}`)}
      <Matchup
        {matchup}
        {players}
        week={displayWeek}
        {year}
        {leagueTeamManagers}
        median={medianGames ? median : null}
        open={active === ix}
        onToggle={() => (active = active === ix ? null : ix)}
      />
    {/each}
  </div>

  {#if medianGames && median != null}
    <p class="rr-median">
      League median{status === "live" ? " so far" : ""} <b>{median.toFixed(2)}</b>
      <span class="rr-medianKey"><span class="rr-mBadge" aria-hidden="true">M</span> {status === "live" ? "above the league median right now" : "beat the league median this week"}</span>
    </p>
  {/if}
</div>

<style>
  .rr-weeks {
    margin: 2em auto 6em;
    padding: 0 12px;
    max-width: 860px;
    box-sizing: border-box;
  }

  .rr-weekHead {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 20px;
    margin-bottom: 1.4em;
  }

  .rr-weekTitle {
    margin: 0;
    font-size: 2em;
    text-align: center;
  }

  .rr-status {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 8px 12px;
    margin: -0.6em 0 1.4em;
    font-size: 0.85em;
  }

  .rr-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 3px 10px;
    border-radius: 999px;
    font: 700 0.8em "Orbitron", sans-serif;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .rr-live {
    color: #fff;
    background: var(--or-pink, var(--blueOne));
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
    .rr-dot,
    .rr-spin {
      animation: none;
    }
  }

  .rr-final {
    color: var(--or-muted, var(--g999));
    border: 1px solid var(--or-table-border, var(--ccc));
  }

  .rr-upcoming {
    color: var(--or-cyan, #0b8a9a);
    border: 1px solid var(--or-cyan, #0b8a9a);
  }

  .rr-statusText {
    color: var(--or-muted, var(--g999));
  }

  .rr-refresh {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 36px;
    padding: 0 14px;
    border: 1px solid var(--or-toggle-border, var(--ccc));
    border-radius: 8px;
    background: var(--or-toggle-bg, var(--fff));
    color: var(--or-cyan, var(--blueOne));
    font: 600 0.9em "Roboto", sans-serif;
    cursor: pointer;
  }

  .rr-refresh .material-icons {
    font-size: 18px;
  }

  .rr-refresh:hover:not(:disabled) {
    border-color: var(--or-pink, var(--blueOne));
  }

  .rr-refresh:disabled {
    opacity: 0.6;
    cursor: default;
  }

  .rr-spin {
    animation: rr-rotate 0.9s linear infinite;
  }

  @keyframes rr-rotate {
    to {
      transform: rotate(360deg);
    }
  }

  .rr-error {
    margin: -0.8em 0 1.2em;
    text-align: center;
    font-size: 0.85em;
    color: var(--or-pink, #c2185b);
  }

  .rr-weekBtn {
    flex: none;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: 1px solid var(--or-table-border, var(--ccc));
    background: var(--fff);
    color: var(--or-pink, var(--blueOne));
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }

  .rr-weekBtn:hover:not(:disabled) {
    border-color: var(--or-pink, var(--blueOne));
    box-shadow: 0 0 10px var(--or-glow-pink, transparent);
  }

  .rr-weekBtn:disabled {
    visibility: hidden;
  }

  .rr-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .rr-median {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 6px 18px;
    margin: 1.6em 0 0;
    font-size: 0.9em;
    color: var(--or-muted, var(--g999));
  }

  .rr-median b {
    font-family: "Orbitron", sans-serif;
    color: var(--or-heading, var(--g111));
  }

  .rr-medianKey {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .rr-mBadge {
    width: 20px;
    height: 20px;
    border-radius: 6px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font: 700 11px "Orbitron", sans-serif;
    color: var(--or-cyan, #0b8a9a);
    border: 1px solid var(--or-cyan, #0b8a9a);
  }

  @media (max-width: 800px) {
    .rr-weekTitle {
      font-size: clamp(1em, 4.6vw, 1.4em);
    }

    .rr-weekHead {
      gap: 8px;
    }
  }
</style>
