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

/**
 * 'live' for the current NFL week, 'final' before it, 'upcoming' after it (regular season only).
 * lastScored (Sleeper league settings.last_scored_leg) wins: a week Sleeper has finished scoring is final even while
 * nflState.display_week still points at it (Sleeper keeps display_week on the old week until about Wednesday).
 */
export function weekStatus(displayWeek, currentWeek, lastScored = 0) {
    if (displayWeek <= (Number(lastScored) || 0)) return 'final';
    if (!currentWeek) return 'final';
    if (displayWeek < currentWeek) return 'final';
    if (displayWeek === currentWeek) return 'live';
    return 'upcoming';
}

/**
 * The first week that isn't finished yet (weeks 1 .. this - 1 are complete), capped at regularSeasonLength + 1.
 * Sleeper's nflState.display_week stays on the last week until about Wednesday, but the league's
 * settings.last_scored_leg moves as soon as Monday night's games are scored, so the later of the two wins.
 */
export function firstUnfinishedWeek(nflState, leagueData, regularSeasonLength) {
    if (nflState?.season_type === 'post') return regularSeasonLength + 1;
    if (nflState?.season_type !== 'regular') return 0;
    const scored = Number(leagueData?.settings?.last_scored_leg) || 0;
    const week = Math.max(Number(nflState.display_week) || 0, scored + 1);
    return Math.min(week, regularSeasonLength + 1);
}
