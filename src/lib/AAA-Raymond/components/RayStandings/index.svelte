<!--
  The /standings page (src/routes/standings/+page.svelte): seeded standings table (option B) and the two
  position-averages tables. Data from loadLeagueContext; seeds use the league rule in utils/playoffs.js.
-->
<script>
  import { onMount } from "svelte";
  import { loadLeagueContext } from "../../utils/leagueContext.js";
  import { seedTeams, POINTS_WILDCARD_SEEDS } from "../../utils/playoffs.js";
  import Loading from "../Shared/Loading.svelte";
  import StandingsTable from "./StandingsTable.svelte";
  import PositionAverages from "../PositionAverages/index.svelte";
  import { rosterPositionAveragesColumnOrder, playerPositionAveragesColumnOrder } from "./constants";
  import "../Shared/common.css";

  let { standingsData, leagueTeamManagersData } = $props();

  let status = $state("loading"); // loading | preseason | ready | error
  let errorMessage = $state("");
  let view = $state.raw(null);

  onMount(async () => {
    try {
      const ctx = await loadLeagueContext({ standingsData, leagueTeamManagersData });
      const { standings, rosters, leagueData, teams, onTeamClick } = ctx;
      if (!standings?.standingsInfo) {
        status = "preseason";
        return;
      }

      const settings = leagueData.settings;
      const playoffTeams = settings.playoff_teams || 6;
      const divisions = settings.divisions || 0;
      const regularSeasonOver = standings.week > settings.playoff_week_start - 1;

      const info = Object.values(standings.standingsInfo).map((s) => ({
        ...s,
        id: String(s.rosterID),
        division: rosters[s.rosterID]?.settings?.division ?? null,
      }));
      const { order, divisionWinners } = seedTeams(info, { playoffTeams });

      const recordSpots = playoffTeams - Math.min(POINTS_WILDCARD_SEEDS, playoffTeams - divisionWinners.length);
      const rows = order.map((t, i) => {
        const seed = i + 1;
        let tag = "";
        let tagKind = "";
        if (divisionWinners.includes(t)) {
          tag = regularSeasonOver ? "Division winner" : "Division leader";
          tagKind = "division";
        } else if (seed <= recordSpots) tag = "Wildcard";
        else if (seed <= playoffTeams) tag = "Points wildcard";
        return { ...t, seed, tag, tagKind };
      });

      view = {
        year: standings.yearData,
        week: standings.week,
        rows,
        teams,
        onTeamClick,
        playoffTeams,
        showDivisions: divisions > 1,
        playerAverages: standings.positionalData,
        rosterAverages: standings.rosterPositionAveragesData,
      };
      status = "ready";
    } catch (err) {
      console.error(err);
      errorMessage = err?.message ?? String(err);
      status = "error";
    }
  });
</script>

<h1 class="rr-pageTitle">{view?.year ?? ""} Standings</h1>

{#if status === "loading"}
  <Loading message="Loading Standings..." />
{:else if status === "preseason"}
  <Loading message="Preseason, No Standings Yet" progress={false} />
{:else if status === "error"}
  <Loading message="Couldn't load the standings: {errorMessage}" progress={false} />
{:else}
  <div class="rr-standingsPage">
    <p class="rr-pageSub">Ordered by playoff seed · click a column to sort · records include the weekly median game</p>
    <StandingsTable
      rows={view.rows}
      teams={view.teams}
      playoffTeams={view.playoffTeams}
      showDivisions={view.showDivisions}
      onTeamClick={view.onTeamClick}
    />

    <PositionAverages
      headerLabel="Per-player position averages"
      columnOrder={playerPositionAveragesColumnOrder}
      averagesData={view.playerAverages}
      week={view.week}
      teams={view.teams}
      onTeamClick={view.onTeamClick}
    />

    <PositionAverages
      headerLabel="Per-roster position averages"
      columnOrder={rosterPositionAveragesColumnOrder}
      averagesData={view.rosterAverages}
      week={view.week}
      teams={view.teams}
      onTeamClick={view.onTeamClick}
    />
  </div>
{/if}

<style>
  /* same look as the other main pages' headings (Matchups, Drafts): Orbitron, pink glow, no gradient */
  h1.rr-pageTitle {
    margin: 1.33em 16px 0.5em;
    font-size: 2.125rem;
    font-weight: 500;
    line-height: 1.2;
    background: none;
    -webkit-background-clip: border-box;
    background-clip: border-box;
    color: var(--or-heading, var(--g111));
    text-shadow: var(--or-heading-glow, none);
    filter: none;
  }

  @media (max-width: 800px) {
    h1.rr-pageTitle {
      font-size: 1.5rem;
    }
  }

  .rr-standingsPage {
    max-width: 1140px;
    margin: 0 auto;
    padding: 0 16px 4em;
    text-align: left;
  }
</style>
