import { getLeagueStandings, getLeagueTeamManagers } from '$lib/utils/helper';

export async function load({ fetch }) {

    // pass SvelteKit's fetch so the relative /api call works during server rendering
    const standingsData = getLeagueStandings(fetch);
    const leagueTeamManagersData = getLeagueTeamManagers();

    return {
        standingsData,
        leagueTeamManagersData,
    };
}