import { standingsStore } from '$lib/stores';
import { get } from 'svelte/store';
import ColorScale from "color-scales";
import { getNflState } from "../../utils/helperFunctions/nflState"
import { getLeagueData } from "../../utils/helperFunctions/leagueData"
import { getLeagueRosters } from "../../utils/helperFunctions/leagueRosters"
import { waitForAll } from '../../utils/helperFunctions/multiPromise';
import { round } from '../../utils/helperFunctions/universalFunctions';
import { getWeeklyMatchupEntries } from './weeklyMatchups.js';
import { completedWeeksNewestFirst } from './matchupEntries.js';
import { positionAverages } from './positionAverages.js';
import { colorsGYR } from './colorScale.js';



// servFetch is accepted for compatibility with the route loaders (they pass SvelteKit's fetch); nothing here needs it now
export const getLeagueStandings = async (servFetch) => {
    if (get(standingsStore).standingsInfo) {
        return get(standingsStore);
    }

    const leagueInfo = await waitForAll(
        getNflState(),
        getLeagueData(),
        getLeagueRosters(),
    ).catch((err) => { console.error(err); return null; });
    // if loading failed, show no standings rather than crashing the server
    if (!leagueInfo) {
        return null;
    }
    const [nflState, leagueData, rostersData] = leagueInfo;

    const yearData = leagueData.season;
    const regularSeasonLength = leagueData.settings.playoff_week_start - 1;
    const divisions = leagueData.settings.divisions && leagueData.settings.divisions > 1;
    const rosters = rostersData.rosters;

    // if the season hasn't started, standings can't be created
    if ((leagueData.status != "in_season" && leagueData.status != "post_season" && leagueData.status != "complete") || nflState.week < 1) {
        return null;
    }

    let standings = {};
    let minPotentialPoints = 100000000;
    let maxPotentialPoints = 0;
    for (const rosterID in rosters) {
        const roster = rosters[rosterID];
        const potentialPoints = roster.settings.ppts + (roster.settings.ppts_decimal / 100);
        standings[rosterID] = {
            rosterID,
            wins: roster.settings.wins,
            losses: roster.settings.losses,
            ties: roster.settings.ties,
            fpts: round(roster.settings.fpts + (roster.settings.fpts_decimal / 100)),
            fptsAgainst: round(roster.settings.fpts_against + (roster.settings.fpts_against_decimal / 100)),
            potentialPoints,
            streak: roster.metadata?.streak || 0,
            divisionWins: divisions ? 0 : null,
            divisionLosses: divisions ? 0 : null,
            divisionTies: divisions ? 0 : null,
        }
        minPotentialPoints = Math.min(minPotentialPoints, potentialPoints);
        maxPotentialPoints = Math.max(maxPotentialPoints, potentialPoints);
    }

    let rosterPositionAveragesData = {};
    let positionalData = {};
    let matchupsData = [];
    // week = the current (not yet completed) week; weeks 1 to week - 1 are complete
    let week = 0;
    if (nflState.season_type == 'regular') {
        // max the week out at end of regular season
        week = nflState.display_week > regularSeasonLength ? regularSeasonLength + 1 : nflState.display_week;
    } else if (nflState.season_type == 'post') {
        week = regularSeasonLength + 1;
    }

    // division records need at least one completed week
    if (divisions && week < 2) {
        return null;
    }

    if (week >= 2) {
        // all completed matchups for the season (index 0 = most recent week), from the shared download
        try {
            const { weeks } = await getWeeklyMatchupEntries();
            matchupsData = completedWeeksNewestFirst(weeks, week - 1);
        } catch (err) {
            // keep the basic standings if matchups can't be loaded
            console.error(err);
            matchupsData = [];
        }

        if (divisions) {
            for (const weekMatchups of matchupsData) {
                processStandings(weekMatchups, standings, rosters);
            }
        }

        // lineup slots come from the league settings (roster_positions), not hard-coded indexes
        rosterPositionAveragesData = positionAverages(matchupsData, week - 1, leagueData.roster_positions, 'roster');
        positionalData = positionAverages(matchupsData, week - 1, leagueData.roster_positions, 'player');
    }

    const response = {
        week,
        regularSeasonLength,
        matchups: matchupsData,
        standingsInfo: standings,
        yearData,
        rosterPositionAveragesData: rosterPositionAveragesData,
        positionalData,
        colorsScale: new ColorScale(minPotentialPoints, maxPotentialPoints, colorsGYR),
    }

    standingsStore.update(() => response);

    return response;
}

const processStandings = (matchup, standingsData, rosters) => {
    const matchups = {};
    for (const match of matchup) {
        if (!matchups[match.matchup_id]) {
            matchups[match.matchup_id] = [];
        }
        const rosterID = match.roster_id;

        matchups[match.matchup_id].push({
            rosterID,
            division: rosters[rosterID].settings.division,
            points: match.points,
        })
    }

    for (const matchupKey in matchups) {
        const teamA = matchups[matchupKey][0];
        const teamB = matchups[matchupKey][1];
        if (!teamA || !teamB) continue;

        const divisionMatchup = teamA.division && teamB.division && teamA.division == teamB.division;

        if (divisionMatchup) {
            if (teamA.points > teamB.points) {
                standingsData[teamA.rosterID].divisionWins++;
                standingsData[teamB.rosterID].divisionLosses++;
                continue;
            } else if (teamB.points > teamA.points) {
                standingsData[teamB.rosterID].divisionWins++;
                standingsData[teamA.rosterID].divisionLosses++;
                continue;
            } else {
                standingsData[teamA.rosterID].divisionTies++;
                standingsData[teamB.rosterID].divisionTies++;
            }
        }
    }
    return standingsData;
}
