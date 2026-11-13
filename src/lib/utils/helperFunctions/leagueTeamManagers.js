import { leagueID, managers } from '$lib/utils/leagueInfo';
import { get } from 'svelte/store';
import { teamManagersStore } from '$lib/stores';
import { waitForAll } from './multiPromise';
import { getManagers, getTeamData } from './universalFunctions';
import { getLeagueData } from './leagueData';
// AAA-Raymond: one request per Sleeper URL per page load (shared with every other loader)
// AAA-Raymond: past (finished) seasons' users and rosters are saved in the browser (savedSeasons.js)
import { seasonJson, isFinishedLeague } from '$lib/AAA-Raymond/utils/savedSeasons.js';

export const getLeagueTeamManagers = async () => {
    if(get(teamManagersStore) && get(teamManagersStore).currentSeason) {
		return get(teamManagersStore);
	}
    let currentLeagueID = leagueID;
	let teamManagersMap = {};
    let finalUsers = {};
    let currentSeason = null;

    // loop through all seasons and create a [year][roster_id]: team, managers object
	while(currentLeagueID && currentLeagueID != 0) {
		// AAA-Raymond: league info first (saved for past seasons), so a finished season's users and rosters can come
		// from the saved copy too
		const leagueData = await getLeagueData(currentLeagueID);
		const finished = isFinishedLeague(leagueData, leagueID);
		const [users, rosters] = await waitForAll(
			seasonJson(`league/${currentLeagueID}/users`, finished),
			seasonJson(`league/${currentLeagueID}/rosters`, finished),
		).catch((err) => { console.error(err); });

        const year = parseInt(leagueData.season);
        currentLeagueID = leagueData.previous_league_id;
        if(!currentSeason) {
            currentSeason = year;
        }
        teamManagersMap[year] = {};
        const processedUsers = processUsers(users);

        // in order to not overwrite most recent data, only add new entries to finalUsers
        for(const processedUserKey in processedUsers) {
            if(finalUsers[processedUserKey]) continue;
            finalUsers[processedUserKey] = processedUsers[processedUserKey];
        }
        for(const roster of rosters) {
            teamManagersMap[year][roster.roster_id] = {
                team: getTeamData(processedUsers, roster.owner_id),
                managers: getManagers(roster, processedUsers),
            };
        }
    }
    const response = {
        currentSeason,
        teamManagersMap,
        users: finalUsers,
    }
    teamManagersStore.update(() => response);
    return response;
}

const processUsers = (rawUsers) => {
	let finalUsers = {};
	for(const user of rawUsers) {
        user.user_name = user.user_name ?? user.display_name;
		finalUsers[user.user_id] = user;
        const manager = managers.find(m => m.managerID === user.user_id);
        if(manager) {
            finalUsers[user.user_id].display_name = manager.name;
        }
	}
	return finalUsers;
}
