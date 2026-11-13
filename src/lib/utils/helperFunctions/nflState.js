import { get } from 'svelte/store';
import {nflState} from '$lib/stores';
// AAA-Raymond: one request per Sleeper URL per page load (shared with every other loader)
import { sleeperFetch } from '$lib/AAA-Raymond/utils/sleeperFetch.js';

export const getNflState = async () => {
	if(get(nflState).season) {
		return get(nflState);
	}
    const res = await sleeperFetch(`https://api.sleeper.app/v1/state/nfl`, {compress: true}).catch((err) => { console.error(err); });
	const data = await res.json().catch((err) => { console.error(err); });
	
	if (res.ok) {
		nflState.update(() => data);
		return data;
	} else {
		throw new Error(data);
	}
}