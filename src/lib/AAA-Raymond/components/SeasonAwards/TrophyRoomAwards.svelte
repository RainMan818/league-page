<!--
  The Trophy Room (/awards): season awards for every season, one season at a time with a season picker.
  A season is listed once its regular season is over. Past seasons are loaded only when picked and are then
  saved in the browser (see utils/seasonData.js), so browsing them costs Sleeper nothing after the first look.
-->
<script>
  import { onMount } from "svelte";
  import { getLeagueTeamManagers, getNflState, gotoManager } from "$lib/utils/helper";
  import { leagueSeasons, loadSeasonAwards, seasonPhase } from "../../utils/seasonData.js";
  import Loading from "../Shared/Loading.svelte";
  import SeasonAwards from "./SeasonAwards.svelte";

  let { teamManagersData = undefined } = $props();

  let status = $state("loading"); // loading | none | ready | error
  let errorMessage = $state("");
  let seasons = $state.raw([]); // [{ leagueID, season }]
  let selected = $state(null); // leagueID
  let managers = $state.raw(null);

  // per-season results, so flipping back to a season doesn't reload it
  let results = $state.raw({}); // leagueID -> { status, awards, error }
  const current = $derived(results[selected]);
  const season = $derived(seasons.find((s) => s.leagueID === selected)?.season);

  const teamFor = (id) => {
    const map = managers?.teamManagersMap;
    const team = map?.[season]?.[id]?.team ?? map?.[managers?.currentSeason]?.[id]?.team;
    return team ? { name: team.name, avatar: team.avatar } : null;
  };
  const onTeamClick = (id) => {
    if (managers) gotoManager({ leagueTeamManagers: managers, rosterID: parseInt(id), year: season });
  };

  async function show(leagueID) {
    selected = leagueID;
    if (results[leagueID]?.status === "ready") return;
    results = { ...results, [leagueID]: { status: "loading" } };
    try {
      const awards = await loadSeasonAwards(leagueID);
      results = { ...results, [leagueID]: awards?.regular ? { status: "ready", awards } : { status: "error", error: "no results for this season" } };
    } catch (err) {
      console.error(err);
      results = { ...results, [leagueID]: { status: "error", error: err?.message ?? String(err) } };
    }
  }

  onMount(async () => {
    try {
      const [all, nflState, mgrs] = await Promise.all([leagueSeasons(), getNflState(), teamManagersData ?? getLeagueTeamManagers()]);
      managers = mgrs;
      seasons = all
        .filter((s) => s.status === "complete" || seasonPhase(s.leagueData, nflState).regularDone)
        .map(({ leagueID, season }) => ({ leagueID, season }));
      if (!seasons.length) {
        status = "none";
        return;
      }
      status = "ready";
      show(seasons[0].leagueID);
    } catch (err) {
      console.error(err);
      errorMessage = err?.message ?? String(err);
      status = "error";
    }
  });
</script>

{#if status === "loading"}
  <Loading message="Loading season awards..." />
{:else if status === "error"}
  <Loading message="Couldn't load season awards: {errorMessage}" progress={false} />
{:else if status === "none"}
  <Loading message="No season has finished its regular season yet, so no awards have been earned." progress={false} />
{:else if status === "ready"}
  <section class="rr-trophyAwards">
    <h3>Trophy Room</h3>
    <div class="rr-seasonPick" role="tablist" aria-label="Season">
      {#each seasons as s (s.leagueID)}
        <button type="button" role="tab" aria-selected={s.leagueID === selected} class:rr-on={s.leagueID === selected} onclick={() => show(s.leagueID)}>
          {s.season}
        </button>
      {/each}
    </div>

    {#if !current || current.status === "loading"}
      <Loading message="Handing out the {season} awards..." margin="40px auto" />
    {:else if current.status === "error"}
      <Loading message="Couldn't build the {season} awards: {current.error}" progress={false} margin="40px auto" />
    {:else}
      {#key selected}
        <SeasonAwards awards={current.awards} {teamFor} {onTeamClick} prefer="regular" />
      {/key}
    {/if}
  </section>
{/if}

<style>
  .rr-trophyAwards {
    margin: 3em auto 4em;
  }

  h3 {
    text-align: center;
    margin: 0 0 0.6em;
  }

  .rr-seasonPick {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 6px;
    margin: 0 0 1.6em;
  }

  .rr-seasonPick button {
    min-width: 64px;
    min-height: 34px;
    padding: 0 14px;
    border: 1px solid var(--or-toggle-border, var(--ccc));
    border-radius: 8px;
    background: var(--or-toggle-bg, var(--fff));
    color: var(--or-toggle-text, var(--g555));
    font: 600 0.85em "Orbitron", sans-serif;
    cursor: pointer;
  }

  .rr-seasonPick button:hover:not(.rr-on) {
    color: var(--or-heading, var(--g111));
  }

  .rr-seasonPick button.rr-on {
    background: var(--or-pink, var(--blueOne));
    border-color: var(--or-pink, var(--blueOne));
    color: #fff;
    box-shadow: 0 0 10px var(--or-glow-pink, transparent);
  }
</style>
