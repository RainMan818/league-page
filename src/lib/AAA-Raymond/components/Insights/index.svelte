<!--
  Homepage insights: playoff projection and the Team Breakdown table (record, Tankathon pick, all-play & luck,
  lineup efficiency). Used in RayHome. Gets data from loadLeagueContext, computes everything once,
  then hands it to InsightsView.
-->
<script>
  import { onMount } from "svelte";
  import { allPlayRecords, lineupEfficiency, tankathonOrder } from "../../utils/teamStats.js";
  import { expectedScores, simulateSeason, seedTeams } from "../../utils/playoffs.js";
  import { pairMatchups } from "../../utils/matchupEntries.js";
  import { loadLeagueContext } from "../../utils/leagueContext.js";
  import { getWeeklyMatchupEntries } from "../../utils/weeklyMatchups.js";
  import Loading from "../Shared/Loading.svelte";
  import InsightsView from "./InsightsView.svelte";
  import "./insights.css";

  let { standingsData, leagueTeamManagersData } = $props();

  let status = $state("loading"); // loading | none | ready | error
  let errorMessage = $state("");
  // raw: big computed data, never mutated; a deep proxy would also break object identity in the bracket
  let view = $state.raw(null);
  let onTeamClick = $state.raw(null);

  // remaining schedule: Sleeper has pairings for future weeks too; read from the shared matchups download
  const loadSchedule = async (weeksLeft) => {
    const { weeks } = await getWeeklyMatchupEntries().catch(() => ({ weeks: {} }));
    return weeksLeft.map((week) => ({
      week,
      pairs: pairMatchups(weeks[week] ?? []).map(([a, b]) => [String(a.roster_id), String(b.roster_id)]),
    }));
  };

  onMount(async () => {
    try {
      const ctx = await loadLeagueContext({ standingsData, leagueTeamManagersData });
      const { standings, leagueData, players, rosters, teams } = ctx;
      onTeamClick = ctx.onTeamClick;
      if (!standings?.standingsInfo) {
        status = "none";
        return;
      }

      const settings = leagueData.settings;
      const matchups = standings.matchups ?? [];
      const regularSeasonLength = settings.playoff_week_start - 1;

      const standingsRows = {};
      const picks = tankathonOrder(standings.standingsInfo);
      // playoff seeds by the league rule (same as the Standings page)
      const { order: seedOrder } = seedTeams(
        Object.values(standings.standingsInfo).map((s) => ({ ...s, division: rosters[s.rosterID]?.settings?.division ?? null })),
        { playoffTeams: settings.playoff_teams || 6 }
      );
      const seeds = Object.fromEntries(seedOrder.map((t, i) => [String(t.rosterID), i + 1]));
      for (const s of Object.values(standings.standingsInfo)) {
        const id = String(s.rosterID);
        standingsRows[id] = {
          ...s,
          pick: picks.indexOf(id) + 1,
          seed: seeds[id] ?? null,
          // green-to-red scale over max points, as on the old Tankathon table
          maxColor: standings.colorsScale?.getColor(s.potentialPoints)?.toHexString?.() ?? null,
        };
      }

      // playoff projection (only during the regular season)
      let projection = null;
      const postseason = standings.week > regularSeasonLength;
      const fromWeek = standings.week >= 1 ? standings.week : regularSeasonLength + 1;
      const playoffTeams = settings.playoff_teams || 6;
      const playoffWeeks = Array.from({ length: Math.ceil(Math.log2(playoffTeams)) }, (_, r) => settings.playoff_week_start + r);
      if (!postseason && leagueData.status === "in_season") {
        const remaining = [];
        for (let w = fromWeek; w <= regularSeasonLength; w++) remaining.push(w);
        const schedule = await loadSchedule(remaining);
        const { expected, sd } = expectedScores({
          rosters,
          players,
          leagueData,
          weeks: [...remaining, ...playoffWeeks],
          matchupsData: matchups,
        });
        projection = simulateSeason({
          teams: Object.values(standings.standingsInfo).map((s) => ({
            rosterID: String(s.rosterID),
            wins: s.wins,
            losses: s.losses,
            ties: s.ties,
            fpts: s.fpts,
            division: rosters[s.rosterID]?.settings?.division,
          })),
          schedule,
          expected,
          sd,
          playoffTeams,
          playoffWeeks,
          medianGame: settings.league_average_match == 1,
        });
      }

      view = {
        year: standings.yearData,
        teams,
        standings: standingsRows,
        projection,
        postseason,
        divisions: settings.divisions || 0,
        playoffWeeks,
        fromWeek,
        regularSeasonLength,
        luck: allPlayRecords(matchups),
        efficiency: lineupEfficiency(standings.standingsInfo),
      };
      status = "ready";
    } catch (err) {
      console.error(err);
      errorMessage = err?.message ?? String(err);
      status = "error";
    }
  });
</script>

{#if status === "loading"}
  <Loading message="Crunching playoff odds and league stats..." margin="40px auto 80px" />
{:else if status === "error"}
  <Loading message="Couldn't build league insights: {errorMessage}" progress={false} margin="40px auto 80px" />
{:else if status === "ready"}
  <InsightsView {view} {onTeamClick} />
{/if}
