import { getLeagueMatchups, getLeagueTeamManagers, loadPlayers } from '$lib/utils/helper';

export async function load({ url, fetch }) {
    const queryWeek = url?.searchParams?.get('week');
    return {
        queryWeek: isNaN(queryWeek) ? null : queryWeek,
        matchupsData: getLeagueMatchups(),
        // AAA-Raymond: no bracketsData; the playoff bracket (RayMatchups/PlayoffBracket) loads its own when opened
        leagueTeamManagersData: getLeagueTeamManagers(),
        playersData: loadPlayers(fetch),
    };
}