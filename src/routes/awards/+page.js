import { getLeagueTeamManagers } from '$lib/utils/helper';

// AAA-Raymond: the template's podiums (getAwards) aren't shown here any more, so only team managers are loaded
export async function load() {
    const teamManagersData = getLeagueTeamManagers();

    return {
        teamManagersData,
    };
}
