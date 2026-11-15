import { getLeagueStandings } from '$lib/utils/helper';

export async function load({fetch}) {
    return {
        // AAA-Raymond: RayRosters loads the league, rosters, managers and players itself (shared requests);
        // standings give the points per week by position and Roster analysis's weekly player scores
        standingsData: getLeagueStandings(fetch),
    };
}
