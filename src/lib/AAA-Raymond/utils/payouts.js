// In-season payouts (homepage "Payouts" tab, components/RayPayouts): the Constitution's in-season prizes
// (RayConstitution/content.js, "In-season payouts") worked out from this season's results.
// - top score each week, weeks 1-14: $10 a week, paid when the week is final
// - highest single-week score of the regular season, team with the top offensive / IDP player (regular season),
//   each division winner: decided when the regular season is fully scored
// - Toilet Bowl winner: decided by the losers bracket final
// The money list counts only prizes already decided (Raymond's call); races show leaders until then.
// Top players are credited to the team that has them on its roster now, with all their regular-season points
// (bench weeks included). Plain functions, no site imports (tested in tests/payouts.test.js).
import { playerGroup } from './positions.js';

export const PAYOUTS = { weekly: 10, highWeek: 10, topOffense: 10, topIdp: 10, division: 20, toiletBowl: 10 };
export const OFFENSE = ['QB', 'RB', 'WR', 'TE'];
export const IDP = ['DL', 'LB', 'DB'];

const round2 = (n) => Math.round(n * 100) / 100;
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/** Team totals for one week of Sleeper-style entries ({ roster_id, points }): [{ rosterID, points }], best first. */
export function weekScores(entries = []) {
    return (entries ?? [])
        .map((e) => ({ rosterID: String(e.roster_id), points: round2(num(e.points)) }))
        .sort((a, b) => b.points - a.points);
}

/** The week's top score: { rosterIDs (more than one on a tie), points } or null when nobody scored. */
export function weekWinner(entries = []) {
    const scores = weekScores(entries);
    if (!scores.length || scores[0].points <= 0) return null;
    const top = scores[0].points;
    return { rosterIDs: scores.filter((s) => s.points === top).map((s) => s.rosterID), points: top };
}

/**
 * One card per week 1..regularSeasonLength: { week, status: 'paid' | 'live' | 'upcoming', rosterIDs, points }.
 * finished = { [week]: entries } for final weeks; live = the week in progress ({ week, entries }) or null.
 */
export function weeklyPrizes({ finished = {}, live = null, regularSeasonLength = 14 }) {
    const out = [];
    for (let week = 1; week <= regularSeasonLength; week++) {
        const done = finished[week] ? weekWinner(finished[week]) : null;
        if (done) out.push({ week, status: 'paid', ...done });
        else if (live && live.week === week && weekWinner(live.entries)) out.push({ week, status: 'live', ...weekWinner(live.entries) });
        else out.push({ week, status: 'upcoming', rosterIDs: [], points: null });
    }
    return out;
}

/** Best single-week team score over the final regular-season weeks: { rosterID, week, points } or null. */
export function highestWeek(finished = {}, regularSeasonLength = 14) {
    let best = null;
    for (const [w, entries] of Object.entries(finished ?? {})) {
        const week = Number(w);
        if (week > regularSeasonLength) continue;
        for (const s of weekScores(entries)) {
            if (!best || s.points > best.points || (s.points === best.points && week < best.week)) best = { rosterID: s.rosterID, week, points: s.points };
        }
    }
    return best && best.points > 0 ? best : null;
}

/**
 * Season points per player from the trimmed weekly stats (/api/fetch_trending: { [week]: [[id, team, snap, pts]] }),
 * regular-season weeks only: { [playerID]: points }.
 */
export function playerTotals(weeks = {}, regularSeasonLength = 14) {
    const tot = {};
    for (const [w, rows] of Object.entries(weeks ?? {})) {
        if (Number(w) > regularSeasonLength) continue;
        for (const [id, , , pts] of rows ?? []) tot[id] = (tot[id] ?? 0) + num(pts);
    }
    for (const id of Object.keys(tot)) tot[id] = round2(tot[id]);
    return tot;
}

/** { [playerID]: rosterID } for every rostered player (Sleeper rosters, list or keyed). */
export function ownersOf(rosters = {}) {
    const out = {};
    for (const r of Object.values(rosters ?? {})) for (const p of r?.players ?? []) out[String(p)] = String(r.roster_id);
    return out;
}

/**
 * The top `n` rostered players in a set of positions: [{ id, group, points, rosterID }]. Free agents can't win the
 * prize, so they're left out.
 */
export function topPlayers({ totals = {}, players = {}, owners = {}, groups = OFFENSE, n = 3 }) {
    return Object.entries(totals)
        .filter(([id]) => owners[id])
        .map(([id, points]) => ({ id, group: playerGroup(players[id], [...OFFENSE, ...IDP]), points, rosterID: owners[id] }))
        .filter((p) => groups.includes(p.group))
        .sort((a, b) => b.points - a.points || a.id.localeCompare(b.id))
        .slice(0, n);
}

/**
 * Division leaders from seeded standings: [{ division, rosterID, wins, losses, ties }] by division number.
 * divisionWinners = playoffs.js seedTeams(...).divisionWinners (the league's tiebreakers already applied).
 */
export const divisionLeaders = (divisionWinners = []) =>
    divisionWinners
        .map((t) => ({ division: t.division, rosterID: String(t.rosterID ?? t.id), wins: num(t.wins), losses: num(t.losses), ties: num(t.ties) }))
        .sort((a, b) => a.division - b.division);

/** "11-7" or "11-6-1". */
export const recordText = (r) => `${r.wins}-${r.losses}${r.ties ? `-${r.ties}` : ''}`;

/**
 * Money paid so far per team: [{ rosterID, amount, prizes: [{ kind, label, amount }] }], biggest first, teams with
 * nothing left out (ties: paid first comes first). Weekly prizes count once final; season prizes once decided
 * (regularDone / toilet given). A tied week splits its $10.
 */
export function moneyList({ weekly = [], regularDone = false, high = null, topOffense = null, topIdp = null, divisions = [], toilet = null }) {
    const teams = {};
    const add = (rosterID, kind, label, amount, order) => {
        const t = (teams[rosterID] ??= { rosterID, amount: 0, prizes: [], first: order });
        t.amount = round2(t.amount + amount);
        t.prizes.push({ kind, label, amount });
    };
    for (const w of weekly) {
        if (w.status !== 'paid') continue;
        const share = round2(PAYOUTS.weekly / w.rosterIDs.length);
        for (const id of w.rosterIDs) add(id, 'weekly', `Week ${w.week}`, share, w.week);
    }
    if (regularDone) {
        if (high) add(high.rosterID, 'high', 'Highest single week', PAYOUTS.highWeek, 90);
        if (topOffense) add(topOffense.rosterID, 'offense', 'Top offensive player', PAYOUTS.topOffense, 91);
        if (topIdp) add(topIdp.rosterID, 'idp', 'Top IDP player', PAYOUTS.topIdp, 92);
        for (const d of divisions) add(d.rosterID, 'division', `Division ${d.division} winner`, PAYOUTS.division, 93);
    }
    if (toilet) add(String(toilet), 'toilet', 'Toilet Bowl', PAYOUTS.toiletBowl, 99);
    // ties: the team that got paid first
    return Object.values(teams)
        .sort((a, b) => b.amount - a.amount || a.first - b.first)
        .map(({ first, ...t }) => t);
}

/** Total paid so far, and the whole in-season pot for this league size. */
export function potSummary({ money = [], regularSeasonLength = 14, divisionCount = 3 }) {
    const total =
        PAYOUTS.weekly * regularSeasonLength + PAYOUTS.division * divisionCount + PAYOUTS.toiletBowl + PAYOUTS.highWeek + PAYOUTS.topOffense + PAYOUTS.topIdp;
    return { paid: round2(money.reduce((s, t) => s + t.amount, 0)), total };
}

/** Weekly prizes in one line: "3 weeks (2, 4, 8)". */
export function weeksWon(prizes = []) {
    const weeks = prizes.filter((p) => p.kind === 'weekly').map((p) => Number(p.label.replace('Week ', '')));
    return weeks.length ? `${weeks.length} week${weeks.length === 1 ? '' : 's'} (${weeks.join(', ')})` : '';
}
