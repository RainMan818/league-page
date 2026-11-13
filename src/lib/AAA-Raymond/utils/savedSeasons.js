// Finished seasons saved in the browser. The league info, users and rosters of a past season (a previous league in
// the chain, status "complete") don't change, but the template downloads them again on nearly every page (to walk
// back through the seasons for team names: 3 requests per season). They're kept in localStorage
// ("rr-pastSeasons") and refreshed once a week (so a changed avatar shows up eventually). The current league is
// never saved. The store itself is plain (tested in tests/savedSeasons.test.js); the site glue is at the bottom.
import { sleeperJson } from './sleeperFetch.js';

/** Bump when the saved shape changes, so every browser downloads once more. */
export const SAVED_SEASONS_VERSION = 1;
export const SAVED_SEASONS_MAX_AGE = 7 * 24 * 3600e3;
const KEY = 'rr-pastSeasons';

/** A past league whose data can be kept: finished, and not the league the site is set to. */
export const isFinishedLeague = (league, currentLeagueID) =>
    league?.status === 'complete' && String(league.league_id ?? '') !== String(currentLeagueID ?? '');

/**
 * Saved Sleeper answers by path ("league/123/rosters") in one storage entry: { version, items: { [path]: { savedAt, data } } }.
 * `storage` is localStorage (or null on the server: nothing is kept). Reads hand out copies, so callers can change them.
 */
export function createSavedStore(storage, { now = () => Date.now(), maxAge = SAVED_SEASONS_MAX_AGE } = {}) {
    let entry = null;
    const load = () => {
        if (entry) return entry;
        entry = { version: SAVED_SEASONS_VERSION, items: {} };
        try {
            const saved = JSON.parse(storage?.getItem(KEY) ?? 'null');
            if (saved?.version === SAVED_SEASONS_VERSION && saved.items) entry = saved;
        } catch {
            // unreadable or blocked storage: start empty
        }
        return entry;
    };
    return {
        read(path) {
            const item = load().items[path];
            if (!item || now() - item.savedAt > maxAge) return null;
            return structuredClone(item.data);
        },
        save(path, data) {
            if (!storage) return;
            const e = load();
            e.items[path] = { savedAt: now(), data: structuredClone(data) };
            try {
                storage.setItem(KEY, JSON.stringify(e));
            } catch {
                // storage full or blocked: keep it for this page load only
            }
        },
    };
}

const browserStorage = (() => {
    try {
        return typeof window !== 'undefined' ? window.localStorage : null;
    } catch {
        return null;
    }
})();

export const pastSeasons = createSavedStore(browserStorage);

/**
 * JSON for a Sleeper path, from the saved copy when `finished` (and saving it after a download). `keep` trims a big
 * answer to the fields the site uses (applied to fresh downloads too, so both look the same).
 */
export async function seasonJson(path, finished, keep = (data) => data) {
    if (finished) {
        const saved = pastSeasons.read(path);
        if (saved) return saved;
    }
    const data = keep(await sleeperJson(path));
    if (finished) pastSeasons.save(path, data);
    return data;
}
