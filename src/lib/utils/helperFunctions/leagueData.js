import { get } from 'svelte/store';
import {leagueData} from '$lib/stores';
import { leagueID } from '$lib/utils/leagueInfo';
// AAA-Raymond: one request per Sleeper URL per page load (shared with every other loader)
import { sleeperFetch } from '$lib/AAA-Raymond/utils/sleeperFetch.js';
// AAA-Raymond: past (finished) seasons are saved in the browser
import { pastSeasons, isFinishedLeague } from '$lib/AAA-Raymond/utils/savedSeasons.js';

export const getLeagueData = async (queryLeagueID = leagueID) => {
	if(get(leagueData)[queryLeagueID]) {
		return get(leagueData)[queryLeagueID];
	}
	// AAA-Raymond: a saved past season
	const saved = pastSeasons.read(`league/${queryLeagueID}`);
	if (saved) {
		leagueData.update(ld => {ld[queryLeagueID] = saved; return ld});
		return saved;
	}
    const res = await sleeperFetch(`https://api.sleeper.app/v1/league/${queryLeagueID}`, {compress: true}).catch((err) => { console.error(err); });
	const data = await res.json().catch((err) => { console.error(err); });
	
	if (res.ok) {
		leagueData.update(ld => {ld[queryLeagueID] = data; return ld});
		if (isFinishedLeague(data, leagueID)) pastSeasons.save(`league/${queryLeagueID}`, data); // AAA-Raymond
		return data;
	} else {
		throw new Error(data);
	}
}