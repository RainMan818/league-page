import { getLeagueStandings, getLeagueTeamManagers, getLeagueRecords, getLeagueTransactions } from '$lib/utils/helper';

export async function load() {
    const leagueRecords = getLeagueRecords(false);
    const leagueTransactions = getLeagueTransactions(false);
    const standingsData = getLeagueStandings();
    const leagueTeamManagersData = getLeagueTeamManagers();

    return {
        leagueRecords,
        leagueTransactions,
        standingsData,
        leagueTeamManagersData,
    };
}