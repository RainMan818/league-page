import { get } from 'svelte/store';
import {players} from '$lib/stores';
import { browser } from '$app/environment';
// AAA-Raymond: player projections are scored with the league's settings, so the saved copy is tagged with its league
// ("playersLeague") and downloaded again for another league (one copy only: it's about 2.7M characters)
import { leagueID } from '$lib/utils/leagueInfo';
import { playersBelongTo } from '$lib/AAA-Raymond/utils/leagueStorage.js';

export const loadPlayers = async (servFetch, refresh = false) => {     
	if(get(players)[1426]) {
		return {
            players: get(players),
            stale: false
        };
	}

    const smartFetch = servFetch ?? fetch;
    
    const now = Math.round(new Date().getTime() / 1000);
    let playersInfo = null;
    let expiration = null;
    if(browser) {
        try {
            if(playersBelongTo(localStorage.getItem("playersLeague"), leagueID)) {
                playersInfo = JSON.parse(localStorage.getItem("playersInfo"));
                expiration = parseInt(localStorage.getItem("expiration"));
            }
        } catch (err) {
            playersInfo = null;
        }
    }

    if(playersInfo && playersInfo[1426] && expiration && now > expiration && !refresh) {
        return {
            players: playersInfo,
            stale: true
        }
    }
    
    if(!playersInfo || !expiration || now > expiration) {
        const res = await smartFetch(`/api/fetch_players_info`, {compress: true});
        const data = await res.json();

        if (!res.ok) {
            throw new Error(data);
        }

        if(browser) {
            const ts = Math.round(new Date().getTime() / 1000);
            const newExpiration = ts + (24 * 3600);
            try {
                localStorage.removeItem("playersInfo"); // room for the new copy before writing it
                localStorage.setItem("playersInfo", JSON.stringify(data))
                localStorage.setItem("expiration", newExpiration)
                localStorage.setItem("playersLeague", String(leagueID))
            } catch (err) {
                console.error(err); // storage full: keep it for this visit only
            }

            players.update(() => data);
        }

        return {
            players: data,
            stale: false
        };
    }
    players.update(() => playersInfo);
    return {
        players: playersInfo,
        stale: false
    };
}