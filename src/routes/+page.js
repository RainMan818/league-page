import { getLeagueStandings } from '$lib/utils/helper';

export async function load({ fetch }) {
    const standingsData = getLeagueStandings(fetch);

    return {
        standingsData
    };
}