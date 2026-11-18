// AAA-Raymond: data for the Players page's Trending free agents list (src/lib/AAA-Raymond/components/RayPlayers).
// Sleeper's weekly stats cover every player in one file per week (~1.6 MB), too big to send to every visitor, so
// this route downloads the finished weeks, trims each to [playerID, team, snap %, league points] (utils/trending.js
// trimWeek, about 25 KB a week) and keeps them in memory: weeks older than the last two never change, the last two
// are refreshed every 6 hours (stat corrections). The answer is also cached by the CDN for an hour, so visitors share
// it and Sleeper sees a handful of requests per hour at most. Also passes on Sleeper's most-added players (24 hours).
import { json, error } from '@sveltejs/kit';
// AAA-Raymond: the league comes from the request (?league=, a visitor's own league from Settings), else the deployed one
import { deployedLeagueID } from '$lib/utils/leagueInfo';
import { leagueFromRequest } from '$lib/AAA-Raymond/utils/leagueOverride.js';
import { completedWeeks, trimWeek } from '$lib/AAA-Raymond/utils/trending.js';
import { lastFantasyWeek } from '$lib/AAA-Raymond/utils/playerCard.js';
import { hasIdpSlots } from '$lib/AAA-Raymond/utils/positions.js';

// defenders only for a league that starts them (a smaller download and answer otherwise)
const query = (list) => list.map((p) => `position[]=${p}`).join('&');
const IDP_POSITIONS = query(['QB', 'RB', 'WR', 'TE', 'DL', 'LB', 'DB']);
const OFFENSE_POSITIONS = query(['QB', 'RB', 'WR', 'TE']);
const HOUR = 3600e3;
const RECENT_REFRESH = 6 * HOUR;

// AAA-Raymond: keyed by league too (points use the league's scoring), so switching leagues never mixes them
const weekCache = new Map(); // `${leagueID}/${season}/${week}` -> { at, rows }
const basicsCache = new Map(); // leagueID -> { at, nflState, league }
let adds = null; // { at, data }

async function sleeper(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Sleeper ${res.status}: ${url}`);
    return res.json();
}

async function loadBasics(leagueID) {
    const cached = basicsCache.get(leagueID);
    if (cached && Date.now() - cached.at < 10 * 60e3) return cached;
    const [nflState, league] = await Promise.all([
        sleeper('https://api.sleeper.app/v1/state/nfl'),
        sleeper(`https://api.sleeper.app/v1/league/${leagueID}`),
    ]);
    if (!league?.league_id) throw new Error(`Sleeper has no league ${leagueID}`);
    const basics = { at: Date.now(), nflState, league };
    basicsCache.set(leagueID, basics);
    return basics;
}

async function loadWeek(leagueID, season, week, scoring, recent, positions) {
    const key = `${leagueID}/${season}/${week}`;
    const saved = weekCache.get(key);
    if (saved && (!recent || Date.now() - saved.at < RECENT_REFRESH)) return saved.rows;
    const data = await sleeper(`https://api.sleeper.com/stats/nfl/${season}/${week}?season_type=regular&${positions}`);
    const rows = trimWeek(Array.isArray(data) ? data : [], scoring);
    weekCache.set(key, { at: Date.now(), rows });
    return rows;
}

async function loadAdds() {
    if (adds && Date.now() - adds.at < HOUR) return adds.data;
    try {
        const list = await sleeper('https://api.sleeper.app/v1/players/nfl/trending/add?lookback_hours=24&limit=100');
        adds = { at: Date.now(), data: Object.fromEntries((list ?? []).map((x) => [String(x.player_id), x.count])) };
    } catch (e) {
        console.error(e);
        adds = { at: Date.now(), data: adds?.data ?? {} };
    }
    return adds.data;
}

export async function GET({ url, setHeaders }) {
    try {
        const leagueID = leagueFromRequest(url, deployedLeagueID);
        const { nflState, league } = await loadBasics(leagueID);
        const season = league.season;
        const scoring = league.scoring_settings ?? {};
        const positions = hasIdpSlots(league.roster_positions) ? IDP_POSITIONS : OFFENSE_POSITIONS;
        const finished = completedWeeks(nflState, season, lastFantasyWeek(league.settings));
        const last = finished[finished.length - 1] ?? 0;
        // four weeks at a time (big files; a cold start late in the season has ~16 to fetch), most come from memory
        const weeks = {};
        for (let i = 0; i < finished.length; i += 4) {
            const batch = finished.slice(i, i + 4);
            const rows = await Promise.all(batch.map((w) => loadWeek(leagueID, season, w, scoring, w >= last - 1, positions)));
            batch.forEach((w, j) => (weeks[w] = rows[j]));
        }
        setHeaders({ 'cache-control': 'public, max-age=600, s-maxage=3600, stale-while-revalidate=86400' });
        return json({ season: Number(season), through: last, weeks, adds: await loadAdds(), updatedAt: Date.now() });
    } catch (e) {
        console.error(e);
        throw error(502, 'Sleeper stats unavailable');
    }
}
