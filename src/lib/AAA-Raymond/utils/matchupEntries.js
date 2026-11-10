// Converts the template's processed matchups (getLeagueMatchups -> matchupWeeks) back into Sleeper's raw
// per-team entries, so standings, the weekly recap and the playoff projection can share that one download.
// Plain functions, no site imports (tested in tests/matchupEntries.test.js).
//
// template entry (src/lib/utils/helperFunctions/leagueMatchups.js, processMatchups):
//   { roster_id, matchup_id, starters, points (= starters_points), players, playersPoints, total (= points) }

const sum = (xs) => (xs ?? []).reduce((a, b) => a + (b || 0), 0);

/** One template entry -> Sleeper's raw shape ({ roster_id, matchup_id, points, starters, starters_points, ... }). */
export const toEntry = (e) => ({
    roster_id: e.roster_id,
    matchup_id: e.matchup_id ?? null,
    points: e.total ?? sum(e.points),
    starters: e.starters ?? [],
    starters_points: e.points ?? [],
    players: e.players ?? [],
    players_points: e.playersPoints ?? {},
});

/** { [week]: [raw entries] } from the template's matchupWeeks ([{ week, matchups: { [matchupID]: [entry, entry] } }]). */
export function entriesByWeek(matchupWeeks = []) {
    const weeks = {};
    for (const { week, matchups } of matchupWeeks) {
        weeks[week] = Object.values(matchups ?? {}).flat().map(toEntry);
    }
    return weeks;
}

/** Completed weeks newest first (index 0 = lastWeek), the order standings and the recap expect. */
export function completedWeeksNewestFirst(weeks, lastWeek) {
    const out = [];
    for (let w = lastWeek; w >= 1; w--) out.push(weeks[w] ?? []);
    return out;
}

/**
 * Raw Sleeper entries for one week -> the template's matchups shape ({ [matchupID]: [entry, entry] }),
 * so a refreshed week can replace the cached one (Matchups page "Refresh scores").
 */
export function toTemplateMatchups(rawEntries = []) {
    const matchups = {};
    for (const e of rawEntries) {
        (matchups[e.matchup_id] ??= []).push({
            roster_id: e.roster_id,
            starters: e.starters,
            points: e.starters_points,
            players: e.players,
            playersPoints: e.players_points,
            matchup_id: e.matchup_id,
            total: e.points,
        });
    }
    return matchups;
}

/** 'live' for the current NFL week, 'final' before it, 'upcoming' after it (regular season only). */
export function weekStatus(displayWeek, currentWeek) {
    if (!currentWeek) return 'final';
    if (displayWeek < currentWeek) return 'final';
    if (displayWeek === currentWeek) return 'live';
    return 'upcoming';
}
