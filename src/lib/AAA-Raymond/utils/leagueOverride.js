// Visitors can switch the site to their own Sleeper league from the Settings page (Nov 17, experimental). The ID is
// saved in their browser ("rr-league-id"); leagueInfo.js reads it when the site starts, so every page, link and
// saved-data key follows it. Reset (Settings) removes it and the deployed league comes back. The server always
// renders the deployed league; the browser then loads everything for the visitor's league (app.html hides the page
// until then). Server routes take the league from the request (?league=). Plain functions, no site imports
// (tests/leagueOverride.test.js).

export const LEAGUE_OVERRIDE_KEY = 'rr-league-id';

const VALID = /^\d{15,20}$/; // Sleeper league IDs are long numbers (18-19 digits)

/** A league ID from what someone typed: the number itself or a Sleeper league link. null when there isn't one. */
export function parseLeagueID(text) {
    const s = String(text ?? '').trim();
    const fromLink = s.match(/leagues?\/(\d{15,20})/);
    if (fromLink) return fromLink[1];
    const digits = s.replace(/[\s,]/g, '');
    return VALID.test(digits) ? digits : null;
}

/** The saved league ID, or null (none, broken, blocked storage, or the deployed league itself). */
export function readLeagueOverride(storage, deployedLeagueID) {
    try {
        const id = storage?.getItem(LEAGUE_OVERRIDE_KEY);
        return VALID.test(id ?? '') && id !== String(deployedLeagueID) ? id : null;
    } catch {
        return null;
    }
}

/** Save a league ID for this browser (false when storage is blocked). */
export function saveLeagueOverride(storage, id) {
    try {
        if (!VALID.test(String(id))) return false;
        storage.setItem(LEAGUE_OVERRIDE_KEY, String(id));
        return true;
    } catch {
        return false;
    }
}

/** Back to the deployed league. */
export function clearLeagueOverride(storage) {
    try {
        storage?.removeItem(LEAGUE_OVERRIDE_KEY);
    } catch {
        /* nothing saved */
    }
}

/** A server route's league: ?league= when it's a league ID, else the deployed one. */
export const leagueFromRequest = (url, deployedLeagueID) => {
    const id = url?.searchParams?.get('league');
    return VALID.test(id ?? '') ? id : String(deployedLeagueID);
};

/** What the Settings page shows about a league from Sleeper (null when Sleeper doesn't know the ID). */
export function leagueSummary(league) {
    if (!league || !league.league_id) return null;
    return {
        id: String(league.league_id),
        name: league.name ?? 'Unnamed league',
        season: league.season,
        teams: league.total_rosters,
        sport: league.sport,
        avatar: league.avatar ? `https://sleepercdn.com/avatars/thumbs/${league.avatar}` : null,
    };
}
