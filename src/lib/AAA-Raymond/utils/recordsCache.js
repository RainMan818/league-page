// When the league records saved in the browser (localStorage "records", built by the template's getLeagueRecords)
// are still good, so the Records / Rivalry pages don't re-download every week of every season on each visit.
// Plain functions, no site imports (tested in tests/recordsCache.test.js).

/** Bump whenever the records math changes, so every browser rebuilds once. 2 = points per week (median-game fix). */
export const RECORDS_CACHE_VERSION = 2;

/** What gets saved next to the records: version, when, and how far Sleeper had scored the season. */
export const recordsMeta = ({ season, lastScored, now = Date.now() }) => ({
    version: RECORDS_CACHE_VERSION,
    savedAt: now,
    season: String(season ?? ''),
    lastScored: Number(lastScored ?? 0),
});

/**
 * Saved records are fresh when they were built by this version, for the current season, after the latest week
 * Sleeper has scored (Raymond's call: rebuild only when a new week is scored). Records saved before this check
 * existed have no meta and are rebuilt once.
 */
export function isRecordsFresh(meta, { season, lastScored } = {}) {
    if (!meta || meta.version !== RECORDS_CACHE_VERSION) return false;
    if (meta.season !== String(season ?? '')) return false;
    return meta.lastScored === Number(lastScored ?? 0);
}
