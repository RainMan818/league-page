// Playoff bracket for the Matchups page (option A "neon bracket tree"): Sleeper's winners / losers bracket turned into
// a tree layout with scores, statuses, placement games and the champion. Before the regular season is fully scored
// the teams come from today's seeds (the league rule, playoffs.js seedTeams) instead of Sleeper's placeholder.
// Plain functions, no site imports (tested in tests/playoffBracket.test.js).
//
// Sleeper bracket match: { m, r, t1, t2, w, l, p?, t1_from?: { w|l: m }, t2_from?: { w|l: m } }
// (p = the place the winner of a placement game gets; the final has p = 1).

/** NFL weeks of bracket round `round` (1-based). Sleeper playoff_round_type: 0 one week, 1 two-week final, 2 two weeks each. */
export function roundWeeks(round, totalRounds, playoffWeekStart, roundType = 0) {
    const type = Number(roundType) || 0;
    if (type === 2) {
        const first = playoffWeekStart + 2 * (round - 1);
        return [first, first + 1];
    }
    const week = playoffWeekStart + round - 1;
    return type === 1 && round === totalRounds ? [week, week + 1] : [week];
}

export const ordinal = (n) => {
    const teen = n % 100 >= 11 && n % 100 <= 13;
    return `${n}${teen ? 'th' : { 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] ?? 'th'}`;
};

/** Standard bracket seed order for a bracket of `size` (a power of 2): 8 -> [1, 8, 4, 5, 2, 7, 3, 6]. */
export function seedOrder(size) {
    let order = [1, 2];
    while (order.length < size) {
        const n = order.length * 2;
        order = order.flatMap((s) => [s, n + 1 - s]);
    }
    return order.slice(0, Math.max(1, size));
}

const sidesOf = (match) => [
    { team: match.t1 ?? null, from: match.t1_from ?? null },
    { team: match.t2 ?? null, from: match.t2_from ?? null },
];
const fromGame = (from) => (from ? Number(from.w ?? from.l) : null);

/**
 * The bracket with its teams placed by seed instead of Sleeper's: `bySeed[k - 1]` is the roster ID of bracket seed k
 * (for the losers bracket, seed 1 = the worst team). Results are dropped. Only the main bracket path is reseeded;
 * placement games keep their "loser of / winner of" links.
 */
export function reseed(bracket, bySeed) {
    const games = Object.fromEntries(bracket.map((m) => [m.m, { ...m, t1: null, t2: null, w: null, l: null }]));
    const rounds = Math.max(0, ...bracket.map((m) => m.r));
    const final = Object.values(games).find((g) => g.r === rounds && (g.p ?? 1) === 1);
    if (!final) return Object.values(games);
    const n = bySeed.length;
    const assign = (game, seeds) => {
        const sides = sidesOf(game);
        const half = seeds.length / 2;
        const halves = [seeds.slice(0, half), seeds.slice(half)];
        const real = (h) => h.filter((s) => s <= n).length;
        // a team placed straight into this game (a bye) takes the half with one real seed in it
        const order = [0, 1];
        const direct = sides.map((s) => !fromGame(s.from));
        if (direct[0] !== direct[1]) {
            const directSide = direct[0] ? 0 : 1;
            const directHalf = real(halves[0]) === 1 ? 0 : 1;
            order[directSide] = directHalf;
            order[1 - directSide] = 1 - directHalf;
        }
        sides.forEach((side, i) => {
            const h = halves[order[i]];
            const key = i === 0 ? 't1' : 't2';
            const src = side.from?.w != null ? games[Number(side.from.w)] : null;
            if (src) assign(src, h);
            else if (!side.from) {
                const seed = h.find((s) => s <= n);
                game[key] = seed ? String(bySeed[seed - 1]) : null;
            }
        });
    };
    assign(final, seedOrder(2 ** rounds));
    return Object.values(games).sort((a, b) => a.m - b.m);
}

/**
 * Bracket view: games with scores and status, a tree layout for the main path, placement games and the winner.
 * weeks: { [week]: raw Sleeper matchup entries } (only weeks that have started); seeds: { rosterID: overall seed }.
 * losers: the losers bracket. losersAdvance: in this league's losers bracket Sleeper records the LOWER score as the
 * winner (the Toilet Bowl: lose to move on); it's read from the results when there are any.
 */
export function buildBracket(bracket = [], {
    weeks = {}, playoffWeekStart = 15, roundType = 0, seeds = {}, losers = false, totalTeams = 12,
    liveWeek = null, lastScored = 99, losersAdvanceDefault = true,
} = {}) {
    if (!bracket.length) return null;
    const rounds = Math.max(...bracket.map((m) => m.r));
    const pointsFor = (rosterID, gameWeeks) => {
        let total = 0;
        let any = false;
        for (const w of gameWeeks) {
            const e = (weeks[w] ?? []).find((x) => String(x.roster_id) === String(rosterID));
            if (e && typeof e.points === 'number') {
                total += e.points;
                any = true;
            }
        }
        return any ? Math.round(total * 100) / 100 : null;
    };
    const games = {};
    for (const match of bracket) {
        const gameWeeks = roundWeeks(match.r, rounds, playoffWeekStart, roundType);
        const winner = match.w != null ? String(match.w) : null;
        let status = 'upcoming';
        if (winner) status = 'final';
        else if (gameWeeks.every((w) => w <= lastScored)) status = 'final';
        else if (liveWeek != null && gameWeeks.some((w) => w <= liveWeek)) status = 'live';
        const sides = sidesOf(match).map((s) => {
            const rosterID = s.team != null ? String(s.team) : null;
            return {
                rosterID,
                seed: rosterID ? seeds[rosterID] ?? null : null,
                points: rosterID && status !== 'upcoming' ? pointsFor(rosterID, gameWeeks) : null,
                from: s.from ? { kind: s.from.w != null ? 'w' : 'l', m: fromGame(s.from) } : null,
                won: winner ? rosterID === winner : null,
            };
        });
        games[match.m] = { m: match.m, round: match.r, p: match.p ?? null, weeks: gameWeeks, sides, winner, loser: match.l != null ? String(match.l) : null, status };
    }

    // does the lower score move on? (read from decided games; Sleeper always records the advancing team as w)
    let losersAdvance = false;
    if (losers) {
        const decided = Object.values(games).filter((g) => g.winner && g.sides.every((s) => s.points != null) && g.sides[0].points !== g.sides[1].points);
        losersAdvance = decided.length
            ? decided.filter((g) => g.sides.find((s) => s.won).points < g.sides.find((s) => !s.won).points).length > decided.length / 2
            : losersAdvanceDefault;
    }

    const roundName = (r) => {
        if (losers) return r === rounds ? (losersAdvance ? 'Toilet Bowl' : 'Consolation final') : `Round ${r}`;
        const fromEnd = rounds - r;
        return fromEnd === 0 ? 'Championship' : fromEnd === 1 ? 'Semifinals' : fromEnd === 2 ? 'Quarterfinals' : `Round ${r}`;
    };
    for (const g of Object.values(games)) {
        if (g.p && g.p > 1) g.label = `${ordinal(losers ? totalTeams - g.p : g.p)} place`;
        else g.label = roundName(g.round);
    }

    // main path: the final and everything feeding it through winners
    const final = Object.values(games).find((g) => g.round === rounds && (g.p ?? 1) === 1) ?? null;
    const placement = Object.values(games).filter((g) => g !== final && g.p && g.p > 1).sort((a, b) => a.p - b.p);
    const nodes = [];
    const lines = [];
    let leafCount = 0;
    const build = (game, mirrored) => {
        const node = { kind: 'game', m: game.m, col: game.round - 1, center: 0 };
        nodes.push(node);
        const children = game.sides.map((s) => {
            if (s.from?.kind === 'w' && games[s.from.m]) return build(games[s.from.m], mirrored);
            if (!s.from && s.rosterID != null && game.round > 1) {
                const bye = { kind: 'bye', rosterID: s.rosterID, seed: s.seed, col: game.round - 2, center: 0, children: [] };
                nodes.push(bye);
                return bye;
            }
            return null;
        }).filter(Boolean);
        node.children = mirrored ? [...children].reverse() : children;
        return node;
    };
    const place = (node) => {
        if (!node.children.length) {
            node.center = leafCount + 0.5;
            leafCount += 1;
            return;
        }
        node.children.forEach(place);
        node.center = node.children.reduce((a, c) => a + c.center, 0) / node.children.length;
    };
    let root = null;
    if (final) {
        root = { kind: 'game', m: final.m, col: final.round - 1, center: 0 };
        nodes.push(root);
        const kids = final.sides.map((s, i) =>
            s.from?.kind === 'w' && games[s.from.m] ? build(games[s.from.m], i === 1) : null).filter(Boolean);
        root.children = kids;
        place(root);
        const champion = final.winner;
        const carries = (child) => {
            if (!champion) return false;
            if (child.kind === 'bye') return child.rosterID === champion;
            return games[child.m].winner === champion;
        };
        const walk = (node) => {
            for (const child of node.children) {
                const decided = child.kind === 'game' && !!games[child.m].winner;
                lines.push({ fromCol: child.col, fromCenter: child.center, toCol: node.col, toCenter: node.center, style: carries(child) ? 'win' : decided ? 'adv' : 'dim' });
                walk(child);
            }
        };
        walk(root);
    }

    const winner = final?.winner ?? null;
    const winnerGames = winner ? Object.values(games).filter((g) => g.winner === winner && !(g.p && g.p > 1)) : [];
    return {
        rounds,
        games,
        final: final ?? null,
        placement,
        nodes: nodes.map(({ children, ...n }) => n),
        lines,
        leafCount,
        losersAdvance,
        roundNames: Array.from({ length: rounds }, (_, i) => ({ round: i + 1, name: roundName(i + 1), weeks: roundWeeks(i + 1, rounds, playoffWeekStart, roundType) })),
        winner,
        winnerWins: winnerGames.length,
    };
}

/**
 * Where a side's team will come from while it isn't known: "Winner of #4 / #5" when both teams of that game are known,
 * otherwise "Semifinal 1 winner" (games of a round numbered top to bottom).
 */
export function sourceLabel(side, games) {
    const src = side?.from && games[side.from.m];
    if (!src) return 'TBD';
    const result = side.from.kind === 'w' ? 'winner' : 'loser';
    if (src.sides.every((s) => s.seed)) return `${result === 'winner' ? 'Winner' : 'Loser'} of ${src.sides.map((s) => `#${s.seed}`).join(' / ')}`;
    const sameRound = Object.values(games).filter((g) => g.round === src.round && !(g.p && g.p > 1)).sort((a, b) => a.m - b.m);
    const name = (src.label ?? `Round ${src.round}`).replace(/s$/, '');
    const number = sameRound.length > 1 ? ` ${sameRound.indexOf(src) + 1}` : '';
    return `${name}${number} ${result}`;
}

/** The game to show first: a live one, else the final once decided, else the first game of the first round. */
export function defaultGame(view) {
    if (!view) return null;
    const all = Object.values(view.games);
    const live = all.find((g) => g.status === 'live' && g.sides.every((s) => s.rosterID));
    if (live) return live.m;
    if (view.final?.winner) return view.final.m;
    const firstRound = all.filter((g) => g.round === 1).sort((a, b) => a.m - b.m)[0];
    return firstRound?.m ?? null;
}
