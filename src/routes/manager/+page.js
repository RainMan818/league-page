import {
    waitForAll,
    getLeagueRosters,
    getLeagueTeamManagers,
    getLeagueData,
    getLeagueTransactions,
    getAwards,
    getLeagueRecords,
    managers as managersObj
} from '$lib/utils/helper';
// AAA-Raymond: a league without managers in leagueInfo.js gets them from Sleeper (siteManagers.js), so the index is
// checked on the page once the teams have loaded
export async function load({ url }) {
    const managersInfo = waitForAll(
        getLeagueRosters(),    
        getLeagueTeamManagers(),
        getLeagueData(),
        getLeagueTransactions(),
        getAwards(),
        getLeagueRecords(),
    );

    const manager = url?.searchParams?.get('manager');

    const props = {
        manager: manager != null && manager !== '' && Number(manager) >= 0 ? manager : -1,
        managers: managersObj,
        managersInfo
    }

    return props;
}