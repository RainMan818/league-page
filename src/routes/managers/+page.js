import {
    getLeagueTeamManagers,
    managers,
} from '$lib/utils/helper';

// AAA-Raymond: a league without managers in leagueInfo.js gets them from Sleeper (siteManagers.js), so always load
export async function load() {
    const leagueTeamManagersData = getLeagueTeamManagers();

    const props = {
        managers,
        leagueTeamManagersData
    }

    return props;
}