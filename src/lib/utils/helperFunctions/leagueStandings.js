import { leagueID } from '$lib/utils/leagueInfo';
import { getNflState } from "./nflState"
import { getLeagueData } from "./leagueData"
import { getLeagueRosters } from "./leagueRosters"
import { waitForAll } from './multiPromise';
import { get } from 'svelte/store';
import { standingsStore } from '$lib/stores';
import { round } from './universalFunctions';
import ColorScale from "color-scales";
import { loadPlayers } from './players';

const rosterIDs = ['ianpeterson', 'LMiller', 'Roensb', 'DLokk', 'RainMan001', 'joshhancock92',
    'jsamp17', 'GluteSloot', 'brenlen', 'Seanzie', 'Fergilatr', 'Globo_Gym']

function addValue(map, roster_id, position, value) {
    if (!map[roster_id]) {
        map[roster_id] = {};
    }
    if (!map[roster_id]?.[position]) {
        map[roster_id][position] = 0;
    }
    map[roster_id][position] = value + map[roster_id][position]
}

export const getLeagueStandings = async (servFetch) => {
    if (get(standingsStore).standingsInfo) {
        return get(standingsStore);
    }

    const [nflState, leagueData, rostersData, playersInfo] = await waitForAll(
        getNflState(),
        getLeagueData(),
        getLeagueRosters(),
        loadPlayers(servFetch || null),
    ).catch((err) => { console.error(err); });

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

    let jamesData = {};
    let positionalData = {};
    let matchupsData = [];
    let week = 0;
    // let week = 2;
    if (divisions) {
        if (nflState.season_type == 'regular') {
            // max the week out at end of regular season
            week = nflState.display_week > regularSeasonLength ? regularSeasonLength + 1 : nflState.display_week;
        } else if (nflState.season_type == 'post') {
            week = regularSeasonLength + 1;
        }

        // if at least one week hasn't been completed, then standings can't be created
        if (week < 2) {
            return null;
        }

        // pull in all matchup data for the season
        const matchupsPromises = [];
        for (let i = week - 1; i > 0; i--) {
            matchupsPromises.push(fetch(`https://api.sleeper.app/v1/league/${leagueID}/matchups/${i}`, { compress: true }))
        }
        const matchupsRes = await waitForAll(...matchupsPromises);

        // convert the json matchup responses
        const matchupsJsonPromises = [];
        for (const matchupRes of matchupsRes) {
            const data = matchupRes.json();
            matchupsJsonPromises.push(data)
            if (!matchupRes.ok) {
                throw new Error(data);
            }
        }
        matchupsData = await waitForAll(...matchupsJsonPromises).catch((err) => { console.error(err); }).catch((err) => { console.error(err); });

        jamesData = updateJamesData({ matchupsData, standings, rosters, week: week - 1 })

        positionalData = updatePositionalData({ matchupsData, standings, rosters, week: week - 1, players: playersInfo.players })

    }

    const colorsGYR = ["#57bb8a", "#ffd666", "#e67c73"];
    const response = {
        week,
        matchups: matchupsData,
        standingsInfo: standings,
        yearData,
        jamesData,
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

const updateJamesData = ({ matchupsData, standings, rosters, week }) => {
    const jamesData = {};
    for (const matchup of matchupsData) {
        standings = processStandings(matchup, standings, rosters);
        matchup.forEach((val) => {
            const scores = val['starters_points']
            const userId = val['roster_id']
            const user = rosterIDs[userId - 1];
            addValue(jamesData, user, 'QB+Flex', scores[0])
            addValue(jamesData, user, 'RB', scores[1])
            addValue(jamesData, user, 'RB', scores[2])
            addValue(jamesData, user, 'WR', scores[3])
            addValue(jamesData, user, 'WR', scores[4])
            addValue(jamesData, user, 'TE', scores[5])
            addValue(jamesData, user, 'WRT', scores[6])
            addValue(jamesData, user, 'WRT', scores[7])
            addValue(jamesData, user, 'WRT', scores[8])
            addValue(jamesData, user, 'QB+Flex', scores[9])
            addValue(jamesData, user, 'IDP', scores[10])
            addValue(jamesData, user, 'DL', scores[11])
            addValue(jamesData, user, 'DL', scores[12])
            addValue(jamesData, user, 'DL', scores[13])
            addValue(jamesData, user, 'LB', scores[14])
            addValue(jamesData, user, 'LB', scores[15])
            addValue(jamesData, user, 'LB', scores[16])
            addValue(jamesData, user, 'DB', scores[17])
            addValue(jamesData, user, 'DB', scores[18])
            addValue(jamesData, user, 'DB', scores[19])

            scores.forEach((score) => {
                addValue(jamesData, user, "Team", score);
            })
            scores.slice(0, 10).forEach((score) => {
                addValue(jamesData, user, "Off", score);
            })
            scores.slice(11, 20).forEach((score) => {
                addValue(jamesData, user, "Def", score);
            })
        })
    }
    for (const team in jamesData) {
        const mapping = jamesData[team];
        for (const position in mapping) {
            const totalPoints = mapping[position];
            mapping[position] = totalPoints / week
        }
    }

    return jamesData
}

const updatePositionalData = ({ matchupsData, standings, rosters, week, players }) => {
    const positionalData = {};
    if (!players) return positionalData;
    // process all the matchups
    for (const matchups of matchupsData) {
        standings = processStandings(matchups, standings, rosters);

        matchups.forEach((matchup) => {
            const scores = matchup['starters_points']
            const starters = matchup['starters']
            const userId = matchup['roster_id']
            const user = rosterIDs[userId - 1];
            addValue(positionalData, user, 'QB', scores[0])
            addValue(positionalData, user, 'RB', scores[1])
            addValue(positionalData, user, 'RB', scores[2])
            addValue(positionalData, user, 'WR', scores[3])
            addValue(positionalData, user, 'WR', scores[4])
            addValue(positionalData, user, 'TE', scores[5])

            /** Assign multi-positional slots to actual player positions */
            // TODO: do not use position [0]
            // addValue(positionalData, user, players[starters[6]]?.positions[0], scores[6])
            // addValue(positionalData, user, players[starters[7]]?.positions[0], scores[7])
            // addValue(positionalData, user, players[starters[8]]?.positions[0], scores[8])
            // addValue(positionalData, user, players[starters[9]]?.positions[0], scores[9])
            // addValue(positionalData, user, players[starters[10]]?.positions[0], scores[10])

            addValue(positionalData, user, 'DL', scores[11])
            addValue(positionalData, user, 'DL', scores[12])
            addValue(positionalData, user, 'DL', scores[13])
            addValue(positionalData, user, 'LB', scores[14])
            addValue(positionalData, user, 'LB', scores[15])
            addValue(positionalData, user, 'LB', scores[16])
            addValue(positionalData, user, 'DB', scores[17])
            addValue(positionalData, user, 'DB', scores[18])
            addValue(positionalData, user, 'DB', scores[19])

            scores.forEach((score) => {
                addValue(positionalData, user, "Team", score);
            })
            scores.slice(0, 10).forEach((score) => {
                addValue(positionalData, user, "Off", score);
            })
            scores.slice(11, 20).forEach((score) => {
                addValue(positionalData, user, "Def", score);
            })
        })
    }
    for (const team in positionalData) {
        const mapping = positionalData[team];
        for (const position in mapping) {
            const totalPoints = mapping[position];
            mapping[position] = totalPoints / week
        }
    }

    return positionalData
}
