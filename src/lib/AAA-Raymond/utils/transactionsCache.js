// Keeping the trades & waivers saved in the browser (localStorage "transactions", built by the template's
// getLeagueTransactions) up to date with as few Sleeper requests as possible: a refresh downloads only the current
// and previous week ("leg") of the current league and merges them in; older weeks and past seasons never change.
// Plain functions, no site imports (tested in tests/transactionsCache.test.js).

/** Bump when the saved shape changes, so every browser does one full download. 1 = entries carry league/leg/ts. */
export const TRANSACTIONS_CACHE_VERSION = 1;

export const transactionsMeta = ({ leagueID, now = Date.now() }) => ({
    version: TRANSACTIONS_CACHE_VERSION,
    leagueID: String(leagueID ?? ''),
    savedAt: now,
});

/** A saved copy can be topped up (instead of downloaded again) when it's this version and for the current league. */
export const canTopUp = (saved, { leagueID }) =>
    !!saved?.meta && saved.meta.version === TRANSACTIONS_CACHE_VERSION && saved.meta.leagueID === String(leagueID ?? '') &&
    Array.isArray(saved.transactions);

/**
 * The weeks to download on a refresh: the current week and the one before (waivers that ran this week can land in
 * either). During the playoffs Sleeper keeps counting weeks; before the season (and in the offseason) it's week 1.
 */
export function latestLegs(nflState) {
    const inSeason = nflState?.season_type === 'regular' || nflState?.season_type === 'post';
    const week = inSeason ? Math.min(18, Math.max(1, Number(nflState?.week) || 1)) : 1;
    return week > 1 ? [week, week - 1] : [1];
}

/**
 * Saved entries with the refreshed weeks swapped in: every saved entry from those weeks of the current league is
 * replaced by what Sleeper returned (so edits and removals there show up), then all is ordered newest first.
 */
export function mergeTransactions(saved = [], fresh = [], { leagueID, legs = [] }) {
    const refreshed = new Set(legs.map(Number));
    const kept = saved.filter((t) => !(String(t.league) === String(leagueID) && refreshed.has(Number(t.leg))));
    const freshIDs = new Set(fresh.map((t) => t.id));
    return [...kept.filter((t) => !freshIDs.has(t.id)), ...fresh].sort(newestFirst);
}

/** Newest first; moves processed at the same moment (one waiver run) keep a fixed order by transaction ID. */
export function newestFirst(a, b) {
    const byTime = (b.ts ?? 0) - (a.ts ?? 0);
    if (byTime) return byTime;
    const ia = String(a.id ?? ''), ib = String(b.id ?? '');
    return ib.length - ia.length || (ib > ia ? 1 : ib < ia ? -1 : 0);
}
