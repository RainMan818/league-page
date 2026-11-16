// Player stats for the player card, from Sleeper's player stats endpoint (unofficial; Sleeper's own app uses it):
// https://api.sleeper.com/stats/nfl/player/<id>?season_type=regular&season=<year>&grouping=week|season
// One request returns a player's whole season. Requests go through sleeperFetch (one per URL per page load, so
// reopening a card costs nothing). Finished seasons' totals never change, so they're saved in the browser for good
// (savedSeasons.js, key "pstats/v1/<id>/<season>"), trimmed to the stats the card uses (trimStats in playerCard.js).
import { sleeperFetch } from './sleeperFetch.js';
import { pastSeasons } from './savedSeasons.js';
import { trimStats } from './playerCard.js';

/** Bump when trimStats keeps different keys, so saved season totals are downloaded again. */
export const PLAYER_STATS_VERSION = 1;

const statsUrl = (playerID, season, grouping) =>
    `https://api.sleeper.com/stats/nfl/player/${encodeURIComponent(playerID)}?season_type=regular&season=${season}&grouping=${grouping}`;

async function statsJson(url) {
    const res = await sleeperFetch(url);
    if (!res.ok) throw new Error(`Sleeper player stats: ${res.status}`);
    return res.json();
}

/**
 * One season week by week: { [week]: { week, opponent, is_away_team, stats } | null } (null = no game: bye, or
 * didn't play). Stats are trimmed to what the league scores and the card shows.
 */
export async function weeklyStats(playerID, season, scoring) {
    const data = await statsJson(statsUrl(playerID, season, 'week'));
    const out = {};
    for (const [week, e] of Object.entries(data ?? {})) {
        out[week] = e?.stats ? { week: Number(week), opponent: e.opponent ?? null, is_away_team: e.is_away_team ?? null, stats: trimStats(e.stats, scoring) } : null;
    }
    return out;
}

/** A finished season's totals (trimmed), saved for good once downloaded. null if the player has no stats that season. */
export async function seasonTotals(playerID, season, scoring) {
    const key = `pstats/v${PLAYER_STATS_VERSION}/${playerID}/${season}`;
    const saved = pastSeasons.read(key);
    if (saved) return saved.stats;
    const data = await statsJson(statsUrl(playerID, season, 'season'));
    const stats = data?.stats ? trimStats(data.stats, scoring) : null;
    pastSeasons.save(key, { stats }, { permanent: true });
    return stats;
}
