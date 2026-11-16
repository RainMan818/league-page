// The secret playoff-odds switch: visiting any page with ?odds=on shows the playoff odds on the homepage (bracket
// percentages, title odds, Team Breakdown odds columns) in that browser from then on; ?odds=off hides them again.
// The choice is kept in localStorage ("rr-odds") and the parameter is taken out of the address, so screenshots and
// copied links don't give it away. Not real security: the site's code is public in the browser.
// Plain functions, no site imports (tested in tests/oddsSwitch.test.js); the site glue is Insights/OddsSwitch.svelte
// (reads the address and storage) and Insights/playoffOdds.svelte.js (the on/off state the homepage reads).

export const ODDS_PARAM = 'odds';
export const ODDS_KEY = 'rr-odds';

const ON = ['on', '1', 'true', 'yes'];
const OFF = ['off', '0', 'false', 'no'];

/** 'on' | 'off' for a parameter or saved value, null for anything else (missing, typos). */
export function oddsValue(raw) {
    const v = String(raw ?? '').trim().toLowerCase();
    if (ON.includes(v)) return 'on';
    if (OFF.includes(v)) return 'off';
    return null;
}

/**
 * Whether to show the odds: the address parameter wins, then the saved choice, then the site default
 * (config.js SHOW_PLAYOFF_ODDS). save = the value to remember ('on' / 'off') when the address set one, else null.
 */
export function resolveOdds({ param = null, saved = null, fallback = false } = {}) {
    const fromParam = oddsValue(param);
    if (fromParam) return { show: fromParam === 'on', save: fromParam };
    const fromSaved = oddsValue(saved);
    return { show: fromSaved ? fromSaved === 'on' : !!fallback, save: null };
}

/** The address without the odds parameter (the rest of the query and the hash are kept). */
export function withoutOddsParam(href) {
    const url = new URL(href);
    url.searchParams.delete(ODDS_PARAM);
    return url.toString();
}
