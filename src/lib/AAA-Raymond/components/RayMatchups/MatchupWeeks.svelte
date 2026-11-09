<!--
  Regular-season matchups for one week (Matchups option B). Replaces the template's MatchupWeeks in
  src/lib/Matchups/MatchupsAndBrackets.svelte; the playoff bracket still uses the template's components.
  Same props and URL behavior as the template version (?week=N, playoffs weeks switch to the bracket).
-->
<script>
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { getLeagueData } from "$lib/utils/helper";
  import Matchup from "./Matchup.svelte";

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

  const matchups = $derived(Object.values(matchupWeeks[displayWeek - 1]?.matchups ?? {}));

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
      League median <b>{median.toFixed(2)}</b>
      <span class="rr-medianKey"><span class="rr-mBadge" aria-hidden="true">M</span> beat the league median this week</span>
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
