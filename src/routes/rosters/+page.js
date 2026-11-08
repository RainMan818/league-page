import { getLeagueData, getLeagueRosters, getLeagueTeamManagers, getLeagueStandings, loadPlayers, waitForAll } from '$lib/utils/helper';

export async function load({fetch}) {
    const rostersInfo = waitForAll(
        getLeagueData(),
        getLeagueRosters(),
        getLeagueTeamManagers(),
        loadPlayers(fetch),
    )

    return {
        rostersInfo,
        // used by Roster Analysis (AAA-Raymond) for weekly player scores
        standingsData: getLeagueStandings(fetch),
    };
}