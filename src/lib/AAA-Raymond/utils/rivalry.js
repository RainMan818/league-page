// Head-to-head between two managers for the Rivalry page (option A): every meeting (regular season and
// championship-bracket playoff games), the series record, points, streak, biggest win and closest game.
// Rivalry counts per MANAGER (like the manager pages): each season uses the roster that manager ran.
// Toilet Bowl games are left out (there the lower score moves on). Plain functions (tests/rivalry.test.js).
import { roundWeeks } from './playoffBracket.js';

const pointsOf = (entries, rosterID) => {
    const e = (entries ?? []).find((x) => String(x.roster_id) === String(rosterID));
    return e && typeof e.points === 'number' ? e : null;
};

const playoffLabel = (game, rounds, hasByes = false) => {
    if (game.p === 1) return 'Championship';
    if (game.p && game.p > 1) {
        const n = game.p;
        return `${n}${n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th'} place game`;
    }
    const fromEnd = rounds - game.r;
    if (fromEnd === 1) return 'Semifinal';
    if (game.r === 1 && hasByes) return 'Wild Card'; // the top seeds sit round 1 out (as on the bracket and Home)
    return fromEnd === 2 ? 'Quarterfinal' : `Playoff round ${game.r}`;
};

/**
 * Every meeting, newest first.
 * seasons: [{ season, leagueID, rosterA, rosterB, playoffWeekStart, roundType, weeks: { [week]: entries },
 *             winnersBracket, current, lastScored, liveWeek }]
 * (rosterA / rosterB: the roster each manager ran that season; a season where either is missing is skipped.)
 * A meeting: { season, leagueID, week, weeks, kind: 'regular'|'playoff', label, a, b, winner: 'a'|'b'|'tie'|null,
 *              margin, live }. Live meetings (the week in progress) have winner null and don't count.
 */
export function rivalryMeetings(seasons = []) {
    const out = [];
    for (const s of seasons) {
        const A = s.rosterA != null ? String(s.rosterA) : null;
        const B = s.rosterB != null ? String(s.rosterB) : null;
        if (!A || !B || A === B) continue;
        const lastScored = s.current ? Number(s.lastScored) || 0 : 99;
        const liveWeek = s.current ? Number(s.liveWeek) || null : null;
        const status = (weeks) => (weeks.every((w) => w <= lastScored) ? 'final' : liveWeek && weeks.some((w) => w <= liveWeek) ? 'live' : 'upcoming');
        const push = (m) => {
            const winner = m.live ? null : m.a > m.b ? 'a' : m.b > m.a ? 'b' : 'tie';
            out.push({ ...m, winner, margin: Math.round(Math.abs(m.a - m.b) * 100) / 100 });
        };

        // regular season: both teams in the same matchup that week
        for (let w = 1; w < s.playoffWeekStart; w++) {
            const st = status([w]);
            if (st === 'upcoming') continue;
            const ea = pointsOf(s.weeks?.[w], A);
            const eb = pointsOf(s.weeks?.[w], B);
            if (!ea || !eb || ea.matchup_id == null || ea.matchup_id !== eb.matchup_id) continue;
            push({ season: Number(s.season), leagueID: s.leagueID, week: w, weeks: [w], kind: 'regular', label: 'Regular season', a: ea.points, b: eb.points, live: st === 'live' });
        }

        // playoffs: championship-bracket games between them (including placement games)
        const bracket = s.winnersBracket ?? [];
        const rounds = Math.max(0, ...bracket.map((g) => g.r));
        // a team placed straight into a later round (not fed by an earlier game) had a first-round bye
        const hasByes = bracket.some((g) => g.r > 1 && ((g.t1 != null && !g.t1_from) || (g.t2 != null && !g.t2_from)));
        for (const g of bracket) {
            const teams = [String(g.t1), String(g.t2)];
            if (!(teams.includes(A) && teams.includes(B))) continue;
            const weeks = roundWeeks(g.r, rounds, s.playoffWeekStart, s.roundType);
            const st = g.w != null ? 'final' : status(weeks);
            if (st === 'upcoming') continue;
            const sum = (rid) => weeks.reduce((t, w) => t + (pointsOf(s.weeks?.[w], rid)?.points ?? 0), 0);
            push({ season: Number(s.season), leagueID: s.leagueID, week: weeks[0], weeks, kind: 'playoff', label: playoffLabel(g, rounds, hasByes), a: Math.round(sum(A) * 100) / 100, b: Math.round(sum(B) * 100) / 100, live: st === 'live' });
        }
    }
    return out.sort((x, y) => y.season - x.season || y.week - x.week);
}

const record = (list) => ({
    a: list.filter((m) => m.winner === 'a').length,
    b: list.filter((m) => m.winner === 'b').length,
    t: list.filter((m) => m.winner === 'tie').length,
});

/** Series numbers from rivalryMeetings() (live meetings don't count). Sides are 'a' / 'b'. */
export function rivalrySummary(meetings = []) {
    const done = meetings.filter((m) => m.winner);
    const points = done.reduce((p, m) => ({ a: p.a + m.a, b: p.b + m.b }), { a: 0, b: 0 });
    // streaks, newest first
    let streak = null;
    let previous = null;
    for (const m of done) {
        if (m.winner === 'tie') break;
        if (!streak) streak = { side: m.winner, n: 1 };
        else if (!previous && m.winner === streak.side) streak.n++;
        else if (!previous) previous = { side: m.winner, n: 1 };
        else if (m.winner === previous.side) previous.n++;
        else break;
    }
    const decided = done.filter((m) => m.winner !== 'tie');
    const biggest = decided.reduce((best, m) => (!best || m.margin > best.margin ? m : best), null);
    const closest = done.reduce((best, m) => (!best || m.margin < best.margin ? m : best), null);
    return {
        count: done.length,
        overall: record(done),
        regular: record(done.filter((m) => m.kind === 'regular')),
        playoffs: record(done.filter((m) => m.kind === 'playoff')),
        points: { a: Math.round(points.a * 100) / 100, b: Math.round(points.b * 100) / 100 },
        last: done[0] ?? null,
        streak,
        // the streak the current one ended (worth mentioning when it was long)
        snapped: streak?.n === 1 && previous?.n >= 3 ? previous : null,
        biggest,
        closest,
        live: meetings.find((m) => m.live) ?? null,
    };
}
