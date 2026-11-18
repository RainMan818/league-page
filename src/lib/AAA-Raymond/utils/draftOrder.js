// Rookie draft order by the league rule (Constitution 8.2), shared by the Standings page, the homepage Team
// Breakdown and the Drafts board's upcoming draft:
//   picks 1-6: teams that miss the playoffs, lowest max points for first (Tankathon tiebreakers)
//   picks 7-12: 5th place, 6th place, 3rd, 4th, runner-up, champion
// That's The Dynasty League's house rule (leagueRules.js). Other leagues draft in reverse order of finish: teams
// that miss the playoffs worst record first, then playoff teams worst place first.
// Before the playoffs are decided, playoff teams are projected by seed (the better seed wins every game left);
// played bracket games replace the projection as they finish.
// Plain functions, no site imports (tested in tests/draftOrder.test.js).
//
// teams: [{ rosterID, wins, losses, ties, fpts, potentialPoints, division }] (standings rows or Sleeper roster settings)
// bracket: Sleeper /league/<id>/winners_bracket: [{ r, m, t1, t2, w, l, p, t1_from: { w|l: m }, t2_from }]

import { seedTeams, POINTS_WILDCARD_SEEDS } from './playoffs.js';
import { tankathonOrder } from './teamStats.js';
import { houseRulesOn } from './leagueRules.js';

/** Playoff place of each pick after the non-playoff teams, by playoff size (default: worst place first). */
const PLACE_PICKS = { 6: [5, 6, 3, 4, 2, 1] };

/**
 * Final place of every team in the winners bracket: played games use the real winner, games not played yet go to
 * the better seed. Placement games carry `p` (1 = final, 3 = 3rd place, 5 = 5th place): winner p, loser p + 1.
 * seedOf: { rosterID: seed }. Returns { rosterID: place }; empty when the bracket has no teams yet.
 */
export function playoffPlaces(bracket = [], seedOf = {}) {
    const games = [...(Array.isArray(bracket) ? bracket : [])].sort((a, b) => a.r - b.r || a.m - b.m);
    const result = {}; // m -> { w, l }
    const places = {};
    const seed = (id) => seedOf[String(id)] ?? 99;
    const side = (team, from) => {
        if (team != null) return team;
        if (from?.w != null) return result[from.w]?.w ?? null;
        if (from?.l != null) return result[from.l]?.l ?? null;
        return null;
    };
    for (const g of games) {
        const t1 = side(g.t1, g.t1_from);
        const t2 = side(g.t2, g.t2_from);
        if (t1 == null || t2 == null) continue;
        const w = g.w != null ? g.w : seed(t1) <= seed(t2) ? t1 : t2;
        const l = w === t1 ? t2 : t1;
        result[g.m] = { w, l };
        if (g.p) {
            places[String(w)] = g.p;
            places[String(l)] = g.p + 1;
        }
    }
    return places;
}

/**
 * Roster IDs in draft order (index 0 = pick 1), plus each team's seed and (projected) playoff place.
 * Returns { order: [rosterID], seeds: { id: seed }, places: { id: place } }.
 */
export function leagueDraftOrder(teams = [], { playoffTeams = 6, bracket = [], houseRules = houseRulesOn() } = {}) {
    const rows = teams.map((t) => ({ ...t, rosterID: String(t.rosterID) }));
    const { order: seeded } = seedTeams(rows, { playoffTeams, pointsWildcards: houseRules ? POINTS_WILDCARD_SEEDS : 0 });
    const seeds = Object.fromEntries(seeded.map((t, i) => [t.rosterID, i + 1]));
    const inPlayoffs = seeded.slice(0, playoffTeams).map((t) => t.rosterID);
    const out = seeded.slice(playoffTeams);

    const bracketPlaces = playoffPlaces(bracket, seeds);
    const places = {};
    for (const id of inPlayoffs) places[id] = bracketPlaces[id] ?? seeds[id]; // by seed until the bracket says otherwise

    const worstFirst = [...inPlayoffs.keys()].map((i) => inPlayoffs.length - i);
    const placePicks = (houseRules && PLACE_PICKS[inPlayoffs.length]) || worstFirst;
    const playoffOrder = [...inPlayoffs].sort((a, b) => placePicks.indexOf(places[a]) - placePicks.indexOf(places[b]) || seeds[b] - seeds[a]);
    // non-playoff teams: lowest max PF first (house rule), else worst record first (seeds run best to worst)
    const missed = houseRules ? tankathonOrder(out) : [...out].reverse().map((t) => t.rosterID);
    return { order: [...missed, ...playoffOrder], seeds, places };
}

/**
 * The Toilet Bowl winner's extra pick (Constitution 7.4 / 8.2, new for 2026): pick 3.13, right after round 3,
 * starting with the 2027 rookie draft (the first one after a Toilet Bowl under the rule).
 */
export const TOILET_BOWL_PICK = { round: 3, firstDraft: 2027, label: 'Toilet Bowl winner' };

/**
 * Toilet Bowl winner from Sleeper's losers bracket, the same way the Trophy Room reads it (leagueAwards.js): the
 * winner of the last round's main game (lower score advances in this league). null until that game is played.
 */
export function toiletBowlWinner(losersBracket = []) {
    const games = Array.isArray(losersBracket) ? losersBracket : [];
    if (!games.length) return null;
    const last = Math.max(...games.map((m) => m.r ?? 0));
    const game = games.find((m) => m.r === last && (!m.t1_from || m.t1_from.w));
    return game?.w != null ? String(game.w) : null;
}

/** The winners bracket is set once Sleeper has scored the whole regular season (or the league is finished). */
export const bracketIsSet = (leagueData) =>
    leagueData?.status === 'complete' ||
    (leagueData?.settings?.last_scored_leg ?? 0) >= (leagueData?.settings?.playoff_week_start ?? 99) - 1;

/** Standings-like rows from Sleeper rosters (for pages that only have the rosters). */
export const teamsFromRosters = (rosters = {}) =>
    Object.values(rosters ?? {}).map((r) => {
        const s = r?.settings ?? {};
        return {
            rosterID: String(r.roster_id),
            wins: s.wins ?? 0,
            losses: s.losses ?? 0,
            ties: s.ties ?? 0,
            fpts: (s.fpts ?? 0) + (s.fpts_decimal ?? 0) / 100,
            fptsAgainst: (s.fpts_against ?? 0) + (s.fpts_against_decimal ?? 0) / 100,
            potentialPoints: (s.ppts ?? 0) + (s.ppts_decimal ?? 0) / 100,
            division: s.division ?? null,
        };
    });
