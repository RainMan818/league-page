// Records page (RayRecords) numbers from the template's league records (getLeagueRecords) and transaction totals.
// Plain functions, no site imports (tested in tests/recordBook.test.js).
//
// Records are per TEAM (Sleeper roster), not per manager: all-time rows add up every season a roster played, so a
// team that changed hands (calarseneau 2022–23, then Zack Miller) is one row. A single season shows that season.
//
// data = records.regularSeasonData or records.playoffData:
//   leagueRosterRecords: { [rosterID]: { years: [{ year, wins, losses, ties, fpts, fptsAgainst, fptsPerGame,
//                                                   potentialPoints, pOGames, byes }] } }
//   leagueWeekHighs / leagueWeekLows: [{ rosterID, fpts, week, year }] (top 10, all-time)
//   allTimeBiggestBlowouts / allTimeClosestMatchups: [{ year, week, differential, home: { rosterID, fpts }, away }]
//   seasonWeekRecords: [{ year, seasonPointsHighs, seasonPointsLows, biggestBlowouts, closestMatchups }]
// txSeasons = transaction totals .seasons: { [season]: { [rosterID]: { trade, waiver } } }

/** Weeks a team-season covers. fptsPerGame is points per week (one game a week, or two with the median game). */
export const weeksOf = (y) => {
    const games = (y.wins ?? 0) + (y.losses ?? 0) + (y.ties ?? 0);
    return y.fptsPerGame > 0 ? Math.max(1, Math.round(y.fpts / y.fptsPerGame)) : games;
};

const pct = (w, l, t) => (w + l + t ? (w + t / 2) / (w + l + t) : null);

/**
 * One row per team: every season combined (year null) or one season.
 * Returns [{ rosterID, years, wins, losses, ties, pct, pf, pa, potential, weeks, ppw, iq, trades, waivers,
 *            playoffTrips, byes }]
 */
export function teamRows(data, { year = null, txSeasons = {} } = {}) {
    const rows = [];
    for (const [rosterID, rec] of Object.entries(data?.leagueRosterRecords ?? {})) {
        const ys = (rec.years ?? []).filter((y) => year == null || Number(y.year) === Number(year));
        if (!ys.length) continue;
        const sum = (k) => ys.reduce((a, y) => a + (Number(y[k]) || 0), 0);
        const wins = sum('wins'), losses = sum('losses'), ties = sum('ties');
        const pf = sum('fpts'), pa = sum('fptsAgainst'), potential = sum('potentialPoints');
        const weeks = ys.reduce((a, y) => a + weeksOf(y), 0);
        let trades = 0, waivers = 0;
        for (const [season, perRoster] of Object.entries(txSeasons ?? {})) {
            if (year != null && Number(season) !== Number(year)) continue;
            trades += perRoster?.[rosterID]?.trade ?? 0;
            waivers += perRoster?.[rosterID]?.waiver ?? 0;
        }
        rows.push({
            rosterID: String(rosterID),
            years: ys.map((y) => Number(y.year)).sort((a, b) => a - b),
            wins, losses, ties,
            pct: pct(wins, losses, ties),
            pf, pa, potential, weeks,
            ppw: weeks ? pf / weeks : 0,
            iq: potential > 0 ? pf / potential : null,
            trades, waivers,
            playoffTrips: ys.filter((y) => (y.pOGames ?? 0) > 0).length,
            byes: sum('byes'),
        });
    }
    return rows;
}

/** Every team-season with points per week, best first. inProgressYear's seasons are marked `soFar`. */
export function teamSeasons(data, { year = null, inProgressYear = null } = {}) {
    const out = [];
    for (const [rosterID, rec] of Object.entries(data?.leagueRosterRecords ?? {})) {
        for (const y of rec.years ?? []) {
            if (year != null && Number(y.year) !== Number(year)) continue;
            const weeks = weeksOf(y);
            out.push({ rosterID: String(rosterID), year: Number(y.year), fpts: y.fpts, weeks, ppw: weeks ? y.fpts / weeks : 0, soFar: Number(y.year) === Number(inProgressYear) });
        }
    }
    return out.sort((a, b) => b.ppw - a.ppw);
}

const games = (list = []) => list.map((m) => ({ year: Number(m.year), week: m.week, margin: m.differential, winner: m.home, loser: m.away }));

/**
 * The lists for the selected view. year null = all-time.
 * Returns { weekHighs, weekLows, blowouts, closeWins, bestSeasons, worstSeasons } (up to 10 each; season lists
 * only for the all-time view). Ties aren't wins, so they're left out of closeWins; worstSeasons skips the season
 * still being played.
 */
export function recordLists(data, { year = null, inProgressYear = null } = {}) {
    if (year == null) {
        const seasons = teamSeasons(data, { inProgressYear });
        return {
            weekHighs: data?.leagueWeekHighs ?? [],
            weekLows: data?.leagueWeekLows ?? [],
            blowouts: games(data?.allTimeBiggestBlowouts),
            closeWins: games(data?.allTimeClosestMatchups).filter((g) => g.margin > 0),
            bestSeasons: seasons.slice(0, 10),
            worstSeasons: seasons.filter((s) => !s.soFar).reverse().slice(0, 10),
        };
    }
    const s = (data?.seasonWeekRecords ?? []).find((r) => Number(r.year) === Number(year));
    const withYear = (list = []) => list.map((e) => ({ ...e, year: Number(year) }));
    return {
        weekHighs: withYear(s?.seasonPointsHighs),
        weekLows: withYear(s?.seasonPointsLows),
        blowouts: games(withYear(s?.biggestBlowouts)),
        closeWins: games(withYear(s?.closestMatchups)).filter((g) => g.margin > 0),
        bestSeasons: [],
        worstSeasons: [],
    };
}

/** Seasons that have records, newest first. */
export const recordYears = (data) =>
    (data?.seasonWeekRecords ?? []).map((r) => Number(r.year)).filter(Boolean).sort((a, b) => b - a);
