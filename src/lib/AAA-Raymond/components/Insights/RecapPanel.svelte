<!--
  Weekly recap panel at the top of the homepage (see RayHome/index.svelte), with week navigation.
  Data comes from loadLeagueContext, shared with the other homepage sections. Once the playoffs start, the
  scored playoff weeks are added (winners-bracket games only, from loadPlayoffRecapWeeks in utils/seasonData.js).
-->
<script>
  import { onMount } from "svelte";
  import { weeklyRecap } from "../../utils/leagueInsights.js";
  import { loadLeagueContext } from "../../utils/leagueContext.js";
  import { loadPlayoffRecapWeeks } from "../../utils/seasonData.js";
  import Loading from "../Shared/Loading.svelte";
  import WeeklyRecap from "./WeeklyRecap.svelte";

  let { standingsData, leagueTeamManagersData } = $props();

  let status = $state("loading"); // loading | none | ready | error
  let errorMessage = $state("");
  let teams = $state.raw({});
  let onTeamClick = $state.raw(null);

  // every completed regular-season week is already in standings.matchups (index 0 = latest), so switching weeks
  // needs no fetch; playoff weeks are fetched once (shared with the season awards)
  let source = $state.raw(null); // { byWeek: { [week]: { entries, roundName } }, players, leagueData }
  let selectedWeek = $state(null);
  const weeks = $derived(source ? Object.keys(source.byWeek).map(Number).sort((a, b) => b - a) : []);
  const roundName = $derived(source?.byWeek[selectedWeek]?.roundName ?? null);
  const recap = $derived.by(() => {
    if (!source || selectedWeek == null) return null;
    const entries = source.byWeek[selectedWeek]?.entries;
    return entries ? weeklyRecap(entries, source.players, { week: selectedWeek, leagueData: source.leagueData }) : null;
  });
  const canPrev = $derived(weeks.length > 0 && selectedWeek > weeks[weeks.length - 1]);
  const canNext = $derived(weeks.length > 0 && selectedWeek < weeks[0]);
  // weeks can have gaps (none today, but a week with no bracket game is skipped), so step through the list
  const step = (dir) => {
    const i = weeks.indexOf(selectedWeek);
    const next = weeks[i - dir];
    if (next != null) selectedWeek = next;
  };

  onMount(async () => {
    try {
      const ctx = await loadLeagueContext({ standingsData, leagueTeamManagersData });
      const { standings } = ctx;
      const matchups = standings?.matchups ?? [];
      if (!matchups.length) {
        status = "none";
        return;
      }
      teams = ctx.teams;
      onTeamClick = ctx.onTeamClick;
      // matchups[0] is the most recent completed week
      const latestWeek = standings.week - 1;
      const byWeek = {};
      matchups.forEach((entries, i) => (byWeek[latestWeek - i] = { entries, roundName: null }));
      const playoffWeeks = await loadPlayoffRecapWeeks().catch((err) => {
        console.error(err);
        return {};
      });
      Object.assign(byWeek, playoffWeeks);
      source = { byWeek, players: ctx.players, leagueData: ctx.leagueData };
      selectedWeek = weeks[0];
      status = recap ? "ready" : "none";
    } catch (err) {
      console.error(err);
      errorMessage = err?.message ?? String(err);
      status = "error";
    }
  });
</script>

{#if status === "loading"}
  <Loading message="Building the weekly recap..." />
{:else if status === "error"}
  <Loading message="Couldn't build the weekly recap: {errorMessage}" progress={false} />
{:else if status === "ready"}
  <section class="rr-recapPanel">
    <div class="rr-weekNav">
      <button type="button" class="rr-navBtn" aria-label="Previous week" disabled={!canPrev} onclick={() => step(-1)}>
        <span class="material-icons">chevron_left</span>
      </button>
      <h6>Week {selectedWeek} Recap{roundName ? ` · ${roundName}` : ""}</h6>
      <button type="button" class="rr-navBtn" aria-label="Next week" disabled={!canNext} onclick={() => step(1)}>
        <span class="material-icons">chevron_right</span>
      </button>
    </div>
    <p class="rr-sub">
      {#if weeks.length > 1}
        <label class="rr-weekPick">
          <span>Jump to</span>
          <select bind:value={selectedWeek} aria-label="Choose a week">
            {#each weeks as w}<option value={w}>Week {w}{source.byWeek[w]?.roundName ? ` · ${source.byWeek[w].roundName}` : ""}{w === weeks[0] ? " (latest)" : ""}</option>{/each}
          </select>
        </label>
      {/if}
    </p>
    {#if recap}
      <WeeklyRecap {recap} {teams} {onTeamClick} />
    {:else}
      <p class="rr-sub">No results for week {selectedWeek}.</p>
    {/if}
  </section>
{/if}

<style>
  h6 {
    font-weight: 400;
    text-align: center;
    margin: 0;
  }

  .rr-weekNav {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 14px;
    margin: 0 0 0.4em;
  }

  .rr-navBtn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    padding: 0;
    border: 1px solid var(--or-table-border, var(--ccc));
    border-radius: 50%;
    background: var(--fff);
    color: var(--or-pink, var(--blueOne));
    cursor: pointer;
  }

  .rr-navBtn:hover:not(:disabled) {
    border-color: var(--or-pink, var(--blueOne));
    box-shadow: 0 0 10px var(--or-glow-pink, transparent);
  }

  .rr-navBtn:disabled {
    opacity: 0.35;
    cursor: default;
  }

  .rr-weekPick {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-left: 10px;
    white-space: nowrap;
  }

  .rr-weekPick select {
    padding: 3px 6px;
    border: 1px solid var(--or-table-border, var(--ccc));
    border-radius: 6px;
    background: var(--fff);
    color: inherit;
    font: inherit;
  }

  .rr-sub {
    text-align: center;
    font-size: 0.85em;
    color: var(--or-muted, var(--g999));
    margin: 0 auto 1.2em;
  }
</style>
