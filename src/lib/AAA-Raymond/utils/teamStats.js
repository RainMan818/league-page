// Season team stats for the homepage Team Breakdown and the season awards: all-play record & luck,
// lineup efficiency, Tankathon draft order and Sleeper streaks.
// Plain functions, no site imports (tested in tests/leagueInsights.test.js).
//
// Data shapes (from Sleeper):
//   weekEntries: one week of /league/<id>/matchups/<week>: [{ roster_id, matchup_id, points, starters, players_points }]
//   matchupsData: array of weekEntries, most recent completed week first (as built in leagueStandings.js)

import { pairMatchups, playedEntries } from './matchupEntries.js';

/* ---------------------------------------------------------------- all-play & luck */

/**
 * All-play record: each week, every team "plays" every other team.
 * Expected wins = sum over weeks of (teams outscored / other teams). Luck = actual H2H wins - expected wins.
 */
export function allPlayRecords(matchupsData) {
    const rec = {};
    const ensure = (id) => (rec[id] ||= {
        rosterID: String(id), wins: 0, losses: 0, ties: 0,
        apWins: 0, apLosses: 0, apTies: 0, expectedWins: 0,
    });

    for (const week of matchupsData || []) {
        const entries = playedEntries(week);
        if (entries.length < 2) continue;
        for (const a of entries) {
            let w = 0, l = 0, t = 0;
            for (const b of entries) {
                if (b === a) continue;
                if (a.points > b.points) w++;
                else if (a.points < b.points) l++;
                else t++;
            }
            const r = ensure(a.roster_id);
            r.apWins += w; r.apLosses += l; r.apTies += t;
            r.expectedWins += (w + t / 2) / (entries.length - 1);
        }
        for (const [a, b] of pairMatchups(entries)) {
            const ra = ensure(a.roster_id), rb = ensure(b.roster_id);
            if (a.points > b.points) { ra.wins++; rb.losses++; }
            else if (b.points > a.points) { rb.wins++; ra.losses++; }
            else { ra.ties++; rb.ties++; }
        }
    }

    return Object.values(rec)
        .map((r) => {
            const apGames = r.apWins + r.apLosses + r.apTies;
            return {
                ...r,
                apPct: apGames ? (r.apWins + r.apTies / 2) / apGames : 0,
                luck: r.wins + r.ties / 2 - r.expectedWins,
            };
        })
        .sort((a, b) => b.luck - a.luck);
}

/* ---------------------------------------------------------------- lineup efficiency */

/** Points scored vs. the best possible lineup (Sleeper's potential points). */
export function lineupEfficiency(standingsInfo) {
    return Object.values(standingsInfo || {})
        .filter((s) => s.potentialPoints > 0)
        .map((s) => ({
            rosterID: String(s.rosterID),
            fpts: s.fpts,
            maxPts: s.potentialPoints,
            efficiency: Math.min(1, s.fpts / s.potentialPoints),
            benchPts: Math.max(0, s.potentialPoints - s.fpts),
        }))
        .sort((a, b) => b.efficiency - a.efficiency);
}

/* ---------------------------------------------------------------- tankathon */

// Tankathon draft order: lowest potential (max) points picks first.
// Tiebreakers, least to most important (same chain the old Tankathon table used).
const TANKATHON_SORT = ['fptsAgainst', 'divisionTies', 'divisionLosses', 'fpts', 'ties', 'losses', 'potentialPoints'];

/** Roster IDs in Tankathon pick order (index 0 = pick 1). */
export function tankathonOrder(standingsInfo) {
    let rows = Object.values(standingsInfo || {});
    for (const key of TANKATHON_SORT) {
        if (!rows.length || (rows[0][key] == null)) continue;
        // ascending; a stable sort keeps the earlier tiebreakers in order
        rows = [...rows].sort((a, b) => (a[key] ?? 0) - (b[key] ?? 0));
    }
    return rows.map((r) => String(r.rosterID));
}

/** Sleeper streak text ("3W", "2L") as a number (+3, -2). */
export const streakValue = (streak) => {
    const m = /^(\d+)\s*([WLT])$/i.exec(String(streak ?? '').trim()) || /^([WLT])\s*(\d+)$/i.exec(String(streak ?? '').trim());
    if (!m) return 0;
    const [n, k] = /\d/.test(m[1]) ? [Number(m[1]), m[2]] : [Number(m[2]), m[1]];
    return k.toUpperCase() === 'W' ? n : k.toUpperCase() === 'L' ? -n : 0;
};

/** Streak for display: "W3", "L2", or "–" when there's none. */
export const streakLabel = (streak) => {
    const v = streakValue(streak);
    return v > 0 ? `W${v}` : v < 0 ? `L${-v}` : '–';
};
