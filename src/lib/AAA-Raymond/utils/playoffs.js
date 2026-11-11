// Playoff seeding (the league rule), bracket shape and the Monte Carlo playoff projection.
// seedTeams is also used by the standings page, the Trends page (place each week) and the season awards.
// Plain functions, no site imports (tested in tests/seeding.test.js and tests/leagueInsights.test.js).
//
// Data shapes (from Sleeper):
//   weekEntries: one week of /league/<id>/matchups/<week>: [{ roster_id, matchup_id, points, starters, players_points }]
//   matchupsData: array of weekEntries, most recent completed week first (as built in leagueStandings.js)

import { predictScores } from './predictOptimalScore.js';
import { playedEntries } from './matchupEntries.js';

// League seeding rules:
//  1. Division winners take the top seeds (ordered by record).
//  2. The next seeds go to the best records among the remaining teams.
//  3. The last POINTS_WILDCARD_SEEDS seed(s) go to the highest points for among teams not already in,
//     regardless of record.
// Record ties are broken by points for. Byes go to the top seeds.
export const DIVISION_WINNERS_GET_TOP_SEEDS = true;
export const POINTS_WILDCARD_SEEDS = 1;

/* ---------------------------------------------------------------- bracket & seeding */

/** Standard bracket order, e.g. 8 -> [1, 8, 4, 5, 2, 7, 3, 6]. */
export function seedOrder(size) {
    let order = [1];
    while (order.length < size) {
        const n = order.length * 2;
        order = order.flatMap((s) => [s, n + 1 - s]);
    }
    return order;
}

/**
 * Fixed (no re-seeding) single-elimination bracket for `numTeams` seeds, with byes for the top seeds.
 * Returns rounds[r] = games; each side is { seed } for a team or { seeds, from } for the winner of an earlier game.
 */
export function bracketRounds(numTeams) {
    const size = 2 ** Math.ceil(Math.log2(Math.max(2, numTeams)));
    let nodes = seedOrder(size).map((s) => (s <= numTeams ? { seed: s, seeds: [s] } : null));
    const rounds = [];
    while (nodes.length > 1) {
        const games = [], next = [];
        for (let i = 0; i < nodes.length; i += 2) {
            const a = nodes[i], b = nodes[i + 1];
            if (a && b) {
                const game = { round: rounds.length, top: a, bottom: b, seeds: [...a.seeds, ...b.seeds] };
                games.push(game);
                next.push({ seeds: game.seeds, from: game });
            } else {
                next.push(a || b); // bye: advances untouched
            }
        }
        rounds.push(games);
        nodes = next;
    }
    return rounds;
}

/** Number of first-round byes for a bracket of `numTeams`. */
export const byeCount = (numTeams) => 2 ** Math.ceil(Math.log2(Math.max(2, numTeams))) - numTeams;

const winPts = (t) => t.wins + t.ties / 2;
export const rankTeams = (teams) => [...teams].sort((a, b) => winPts(b) - winPts(a) || b.fpts - a.fpts);

/**
 * Seed every team. teams: [{ rosterID, wins, losses, ties, fpts, division }].
 * Returns { order, divisionWinners } where order[i] is seed i + 1
 * (teams after the playoff spots follow in record order).
 */
export function seedTeams(teams, {
    divisionWinnersFirst = DIVISION_WINNERS_GET_TOP_SEEDS,
    playoffTeams = null,
    pointsWildcards = POINTS_WILDCARD_SEEDS,
} = {}) {
    const ranked = rankTeams(teams);
    let divisionWinners = [];
    const divisions = [...new Set(ranked.map((t) => t.division).filter(Boolean))];
    if (divisions.length > 1) {
        divisionWinners = divisions.map((d) => ranked.find((t) => t.division === d));
    }

    const order = divisionWinnersFirst && divisionWinners.length ? rankTeams(divisionWinners) : [];
    const remaining = () => ranked.filter((t) => !order.includes(t));

    if (playoffTeams) {
        const pointsSpots = Math.max(0, Math.min(pointsWildcards, playoffTeams - order.length));
        // record wildcards
        for (const t of remaining()) {
            if (order.length >= playoffTeams - pointsSpots) break;
            order.push(t);
        }
        // points-for wildcards, regardless of record
        const byPoints = [...remaining()].sort((a, b) => b.fpts - a.fpts || winPts(b) - winPts(a));
        order.push(...byPoints.slice(0, pointsSpots));
    }
    order.push(...remaining());
    return { order, divisionWinners };
}

/* ---------------------------------------------------------------- projections */

const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const stdev = (xs) => {
    if (xs.length < 2) return 0;
    const m = mean(xs);
    return Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1));
};

/** Each team's actual weekly scores from completed weeks. */
export function weeklyScores(matchupsData) {
    const scores = {};
    for (const week of matchupsData || []) {
        for (const e of playedEntries(week)) {
            (scores[String(e.roster_id)] ||= []).push(e.points);
        }
    }
    return scores;
}

/**
 * Expected score and spread for every team in every week of `weeks`.
 * Starts from Sleeper's projected best lineup (predictScores), scales projections so the league average matches
 * actual scoring so far (projections can run low for IDP), then blends in each team's season average.
 */
export function expectedScores({ rosters, players, leagueData, weeks, matchupsData }) {
    const actual = weeklyScores(matchupsData);
    const projected = {};
    for (const [rosterID, roster] of Object.entries(rosters)) {
        const rosterPlayers = (roster.players || [])
            .map((id) => players[id])
            .filter(Boolean)
            .map((p) => ({ pos: p.pos, positions: p.positions, wi: p.wi }));
        projected[rosterID] = {};
        for (const w of weeks) projected[rosterID][w] = predictScores(rosterPlayers, w, leagueData);
    }

    const allActual = Object.values(actual).flat();
    const allProjected = Object.values(projected).flatMap((byWeek) => Object.values(byWeek)).filter((p) => p > 0);
    const leagueActual = mean(allActual);
    const leagueProjected = mean(allProjected);
    let factor = leagueActual > 0 && leagueProjected > 0 ? leagueActual / leagueProjected : 1;
    factor = Math.min(1.6, Math.max(0.6, factor));
    const leagueSd = stdev(allActual) || 0.15 * (leagueActual || leagueProjected || 100);

    const expected = {}, sd = {};
    for (const rosterID of Object.keys(rosters)) {
        const own = actual[rosterID] || [];
        const teamAvg = mean(own);
        expected[rosterID] = {};
        for (const w of weeks) {
            const proj = projected[rosterID][w] * factor;
            if (proj > 0 && teamAvg > 0) expected[rosterID][w] = 0.7 * proj + 0.3 * teamAvg;
            else expected[rosterID][w] = proj > 0 ? proj : teamAvg || leagueActual;
        }
        // shrink each team's spread toward the league's, since a few weeks is a small sample
        const weight = Math.min(own.length, 8) / 16;
        sd[rosterID] = weight * (stdev(own) || leagueSd) + (1 - weight) * leagueSd;
    }
    return { expected, sd, factor };
}

/* ---------------------------------------------------------------- simulation */

// small seeded RNG so the odds don't wobble between page loads
function mulberry32(seed) {
    return function () {
        seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
function normalSampler(rand) {
    let spare = null;
    return () => {
        if (spare !== null) { const s = spare; spare = null; return s; }
        let u = 0, v = 0;
        while (u === 0) u = rand();
        while (v === 0) v = rand();
        const mag = Math.sqrt(-2 * Math.log(u));
        spare = mag * Math.sin(2 * Math.PI * v);
        return mag * Math.cos(2 * Math.PI * v);
    };
}

/**
 * Simulate the rest of the regular season and the playoffs.
 *  teams:        [{ rosterID, wins, losses, ties, fpts, division }] current standings
 *  schedule:     [{ week, pairs: [[rosterID, rosterID], ...] }] remaining regular-season weeks
 *  expected, sd: from expectedScores (must cover schedule weeks and playoffWeeks)
 *  playoffTeams: number of playoff teams; playoffWeeks[r] = NFL week of playoff round r
 *  medianGame:   true if teams also play the league median each week
 */
export function simulateSeason({
    teams, schedule, expected, sd, playoffTeams, playoffWeeks = [],
    medianGame = false, divisionWinnersFirst = DIVISION_WINNERS_GET_TOP_SEEDS, pointsWildcards = POINTS_WILDCARD_SEEDS,
    sims = 10000, seed = 2026,
}) {
    const seedRules = { divisionWinnersFirst, playoffTeams, pointsWildcards };
    const rand = mulberry32(seed);
    const normal = normalSampler(rand);
    const ids = teams.map((t) => String(t.rosterID));
    const byes = byeCount(playoffTeams);
    const rounds = bracketRounds(playoffTeams);
    const score = (id, week) => Math.max(0, (expected[id]?.[week] ?? 0) + (sd[id] ?? 0) * normal());

    const tally = Object.fromEntries(ids.map((id) => [id, {
        playoffs: 0, bye: 0, division: 0, topSeed: 0, final: 0, title: 0, wins: 0, losses: 0, ties: 0, fpts: 0, seedSum: 0,
    }]));

    for (let s = 0; s < sims; s++) {
        const state = Object.fromEntries(teams.map((t) => [String(t.rosterID), { ...t, rosterID: String(t.rosterID) }]));

        for (const { week, pairs } of schedule) {
            const weekScores = {};
            for (const [a, b] of pairs) {
                const sa = score(String(a), week), sb = score(String(b), week);
                weekScores[a] = sa; weekScores[b] = sb;
                const A = state[a], B = state[b];
                if (!A || !B) continue;
                A.fpts += sa; B.fpts += sb;
                if (sa > sb) { A.wins++; B.losses++; } else if (sb > sa) { B.wins++; A.losses++; } else { A.ties++; B.ties++; }
            }
            if (medianGame) {
                const vals = Object.values(weekScores).sort((x, y) => x - y);
                const mid = vals.length / 2;
                const median = vals.length % 2 ? vals[Math.floor(mid)] : (vals[mid - 1] + vals[mid]) / 2;
                for (const [id, v] of Object.entries(weekScores)) {
                    if (!state[id]) continue;
                    if (v > median) state[id].wins++; else if (v < median) state[id].losses++; else state[id].ties++;
                }
            }
        }

        const { order, divisionWinners } = seedTeams(Object.values(state), seedRules);
        order.forEach((t, i) => {
            const tl = tally[t.rosterID];
            tl.wins += t.wins; tl.losses += t.losses; tl.ties += t.ties; tl.fpts += t.fpts;
            if (i < playoffTeams) { tl.playoffs++; tl.seedSum += i + 1; }
            if (i < byes) tl.bye++;
            if (i === 0) tl.topSeed++;
        });
        for (const t of divisionWinners) tally[t.rosterID].division++;

        // play out the bracket
        const seedTeam = (n) => order[n - 1]?.rosterID;
        const winners = new Map();
        const sideTeam = (side) => (side.from ? winners.get(side.from) : seedTeam(side.seed));
        rounds.forEach((games, r) => {
            const week = playoffWeeks[r];
            for (const game of games) {
                const a = sideTeam(game.top), b = sideTeam(game.bottom);
                const sa = score(a, week), sb = score(b, week);
                winners.set(game, sa >= sb ? a : b);
                if (r === rounds.length - 1) { tally[a].final++; tally[b].final++; }
            }
        });
        const finalGame = rounds[rounds.length - 1]?.[0];
        if (finalGame) tally[winners.get(finalGame)].title++;
    }

    const odds = ids.map((id) => {
        const t = tally[id];
        return {
            rosterID: id,
            playoffs: t.playoffs / sims, bye: t.bye / sims, division: t.division / sims,
            topSeed: t.topSeed / sims, final: t.final / sims, title: t.title / sims,
            projWins: t.wins / sims, projLosses: t.losses / sims, projTies: t.ties / sims, projFpts: t.fpts / sims,
            avgSeed: t.playoffs ? t.seedSum / t.playoffs : null,
        };
    });

    // most likely bracket: seed by average projected record
    const projectedTeams = odds.map((o) => ({
        rosterID: o.rosterID, wins: o.projWins, losses: o.projLosses, ties: o.projTies, fpts: o.projFpts,
        division: teams.find((t) => String(t.rosterID) === o.rosterID)?.division,
    }));
    const projected = seedTeams(projectedTeams, seedRules);

    return {
        odds: odds.sort((a, b) => b.playoffs - a.playoffs || b.title - a.title),
        projectedSeeds: projected.order.slice(0, playoffTeams).map((t) => t.rosterID),
        rounds,
        byes,
        sims,
        pointsWildcards: Math.min(pointsWildcards, playoffTeams),
    };
}
