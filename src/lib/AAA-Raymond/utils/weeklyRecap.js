// Weekly recap for the homepage (Insights/RecapPanel + WeeklyRecap): best/worst teams, players of the week,
// bench stars and the weekly awards, in the spirit of Sleeper's weekly report.
// Plain functions, no site imports (tested in tests/weeklyRecap.test.js).

import { predictScores } from './predictOptimalScore.js';
import { playerGroup, groupOf } from './positions.js';
import { pairMatchups, playedEntries } from './matchupEntries.js';

export const RECAP_POSITIONS = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF', 'DL', 'LB', 'DB'];

/** A player's position group (DE -> DL, CB -> DB, ...). */
export const positionGroup = (player) => (player ? playerGroup(player, RECAP_POSITIONS) ?? groupOf(player.pos) : null);

const shortName = (info, playerID) => {
    if (!info) return playerID;
    if (info.pos === 'DEF') return `${info.fn ?? ''} ${info.ln ?? ''}`.trim() || playerID;
    const first = info.fn ? `${info.fn[0]}. ` : '';
    return `${first}${info.ln ?? ''}`.trim() || playerID;
};

/**
 * Weekly report for one completed week, in the spirit of Sleeper's weekly report.
 *  weekEntries: that week's matchups ({ roster_id, matchup_id, points, starters, players, players_points })
 *  players:     the site's player map (fn, ln, pos, positions, wi[week] = { p: projection, o: opponent })
 *  week:        the NFL week number of weekEntries
 *  leagueData:  Sleeper league (roster_positions) for each team's best possible lineup
 */
export function weeklyRecap(weekEntries, players = {}, { week, leagueData } = {}) {
    const entries = playedEntries(weekEntries);
    if (!entries.length) return null;

    // per-team numbers
    const teams = entries.map((e) => {
        const starters = (e.starters || []).filter((id) => id && id !== '0');
        // projections are stored as strings (e.g. "22.01")
        const projected = starters.reduce((sum, id) => sum + (parseFloat(players[id]?.wi?.[week]?.p) || 0), 0);
        let max = null;
        if (leagueData?.roster_positions) {
            const pool = (e.players || Object.keys(e.players_points || {})).map((id) => ({
                pos: players[id]?.pos, positions: players[id]?.positions,
                wi: { [week]: { p: e.players_points?.[id] ?? 0 } },
            }));
            max = Math.max(predictScores(pool, week, leagueData), e.points);
        }
        return { rosterID: String(e.roster_id), points: e.points, projected, max, starters: new Set(starters), entry: e };
    });
    const byRoster = Object.fromEntries(teams.map((t) => [t.rosterID, t]));

    const games = pairMatchups(entries).map(([a, b]) => {
        const [w, l] = a.points >= b.points ? [a, b] : [b, a];
        return {
            winner: String(w.roster_id), loser: String(l.roster_id),
            winnerPts: w.points, loserPts: l.points, margin: w.points - l.points, tie: a.points === b.points,
        };
    });
    const decided = games.filter((g) => !g.tie);

    // top starter and top bench player at each position
    const best = { starters: {}, bench: {} };
    for (const t of teams) {
        for (const [playerID, points] of Object.entries(t.entry.players_points || {})) {
            const info = players[playerID];
            const pos = positionGroup(info);
            if (!pos) continue;
            const bucket = t.starters.has(playerID) ? best.starters : best.bench;
            if (!bucket[pos] || points > bucket[pos].points) {
                bucket[pos] = { playerID, pos, points, rosterID: t.rosterID, name: shortName(info, playerID), opponent: info?.wi?.[week]?.o ?? null };
            }
        }
    }
    const ordered = (bucket) => RECAP_POSITIONS.filter((p) => bucket[p]).map((p) => bucket[p]);

    const pick = (list, score, dir) => list.reduce((acc, x) => (acc === null || dir * (score(x) - score(acc)) > 0 ? x : acc), null);
    const teamSummary = (t) => (t ? { rosterID: t.rosterID, points: t.points, projected: t.projected, max: t.max } : null);
    const withMax = teams.filter((t) => t.max > 0);
    const withProj = teams.filter((t) => t.projected > 0);
    const losers = decided.map((g) => ({ ...g, team: g.loser, pts: g.loserPts, opp: g.winner, oppPts: g.winnerPts }));
    const winners = decided.map((g) => ({ ...g, team: g.winner, pts: g.winnerPts, opp: g.loser, oppPts: g.loserPts }));
    const vs = (x) => (x ? { rosterID: x.team, points: x.pts, oppRosterID: x.opp, oppPoints: x.oppPts } : null);

    return {
        week,
        bestTeam: teamSummary(pick(teams, (t) => t.points, 1)),
        worstTeam: teamSummary(pick(teams, (t) => t.points, -1)),
        playersOfWeek: ordered(best.starters),
        benchwarmers: ordered(best.bench).filter((p) => p.points > 0),
        awards: {
            bestManager: teamSummary(pick(withMax, (t) => t.points / t.max, 1)),
            worstManager: teamSummary(pick(withMax, (t) => t.points / t.max, -1)),
            highestInLoss: vs(pick(losers, (x) => x.pts, 1)),
            lowestInWin: vs(pick(winners, (x) => x.pts, -1)),
            blowout: pick(decided, (g) => g.margin, 1),
            narrowWin: pick(decided, (g) => g.margin, -1),
            overachiever: teamSummary(pick(withProj, (t) => t.points - t.projected, 1)),
            underachiever: teamSummary(pick(withProj, (t) => t.points - t.projected, -1)),
        },
        byRoster: Object.fromEntries(Object.entries(byRoster).map(([id, t]) => [id, teamSummary(t)])),
    };
}
