// End-of-season awards: regular-season awards (shown after the last regular-season week) and post-season awards
// (shown once the championship is decided). Used on the homepage and in the Trophy Room.
// Plain functions, no site imports (tested in tests/seasonAwards.test.js). Data loading is in seasonData.js.
//
// Input (one season), all straight from Sleeper:
//   season            2025 (number)
//   currentSeason     the NFL season Sleeper's player data describes (players' years_exp is as of this season)
//   rosterPositions   league.roster_positions
//   regularSeasonLength, playoffWeekStart, playoffRoundType (league settings)
//   weeks             { [week]: [matchup entries] } for regular-season and playoff weeks
//                     entry = { roster_id, matchup_id, points, starters, starters_points, players, players_points }
//   rosters           [{ rosterID, wins, losses, ties, fpts, division }] final regular-season records
//   winnersBracket    /league/<id>/winners_bracket
//   losersBracket     /league/<id>/losers_bracket (a toilet bowl here: the lower score "wins" and advances)
//   pickValues        optional { round: points } for traded draft picks (default PICK_VALUES in pickValues.js)
//   transactions      raw /league/<id>/transactions/<leg> for legs 1..regularSeasonLength, concatenated
//   players           the site's player map (fn, ln, pos, positions, experience)
//
// Scoring rule used throughout: player awards count points scored in a starting lineup, so they reward the
// managers who actually played those guys (Bench Legend is the exception: points scored on the bench).
// Trade of the Year is the other exception: it counts everything a traded player scored after the trade.

import { predictScores } from './predictOptimalScore.js';
import { playerGroup, groupOf } from './positions.js';
import { allPlayRecords } from './teamStats.js';
import { seedTeams } from './playoffs.js';
import { pickValue, pickShare, PICK_VALUES } from './pickValues.js';

const GROUPS = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF', 'DL', 'LB', 'DB'];
export const OFFENSE = ['QB', 'RB', 'WR', 'TE', 'K'];
export const DEFENSE = ['DL', 'LB', 'DB'];

// which player groups can fill each starting slot
export const SLOT_GROUPS = {
    QB: ['QB'], RB: ['RB'], WR: ['WR'], TE: ['TE'], K: ['K'], DEF: ['DEF'],
    DL: ['DL'], LB: ['LB'], DB: ['DB'],
    FLEX: ['RB', 'WR', 'TE'], REC_FLEX: ['WR', 'TE'], WRRB_FLEX: ['RB', 'WR'],
    SUPER_FLEX: ['QB', 'RB', 'WR', 'TE'], IDP_FLEX: ['DL', 'LB', 'DB'],
};

/* ---------------------------------------------------------------- small helpers */

const sum = (xs) => xs.reduce((a, b) => a + b, 0);
const num = (x) => (typeof x === 'number' && Number.isFinite(x) ? x : parseFloat(x) || 0);

/** Pick the item with the highest score (ties keep the earlier item). null for an empty list. */
const best = (list, score) => list.reduce((acc, x) => (acc === null || score(x) > score(acc) ? x : acc), null);

/** A week's entries if anybody scored (an unplayed week has all zeros). */
export const playedWeek = (entries) => {
    const list = (entries || []).filter((e) => typeof e.points === 'number');
    return list.some((e) => e.points > 0) ? list : [];
};

/** The player's position group: DE -> DL, CB -> DB, ... */
export const groupFor = (player) => (player ? playerGroup(player, GROUPS) ?? groupOf(player.pos) : null);

/** Every group a player can fill (a LB who is also listed at DL can fill both). */
const groupsFor = (player) => {
    if (!player) return [];
    const all = [player.pos, ...(player.positions ?? [])].map(groupOf).filter((g) => GROUPS.includes(g));
    return [...new Set(all)];
};

export const playerName = (players, id) => {
    const p = players?.[id];
    if (!p) return String(id);
    return `${p.fn ?? ''} ${p.ln ?? ''}`.trim() || String(id);
};

/** Rookie in `season`: Sleeper's years_exp counts from the current season, so a 2025 rookie shows 1 in 2026. */
export const isRookie = (player, season, currentSeason) =>
    player?.experience != null && Number(player.experience) - (Number(currentSeason) - Number(season)) === 0;

/** Starting slots (roster_positions without bench), in lineup order: starters[i] fills slot i. */
export const starterSlots = (rosterPositions = []) => rosterPositions.filter((p) => p !== 'BN' && p !== 'IR' && p !== 'TAXI');

const pointsOf = (entry, id, i) => num(entry.players_points?.[id] ?? entry.starters_points?.[i]);

const pairs = (entries) => {
    const byId = {};
    for (const e of entries) if (e.matchup_id != null) (byId[e.matchup_id] ||= []).push(e);
    return Object.values(byId).filter((p) => p.length === 2);
};

const median = (values) => {
    const v = [...values].sort((a, b) => a - b);
    const mid = v.length / 2;
    return v.length % 2 ? v[Math.floor(mid)] : (v[mid - 1] + v[mid]) / 2;
};

/** A team's best possible score for one week (bench players included), same method as the weekly recap. */
export function weekMax(entry, players, week, rosterPositions) {
    const pool = (entry.players || Object.keys(entry.players_points || {})).map((id) => ({
        pos: players[id]?.pos,
        positions: players[id]?.positions,
        wi: { [week]: { p: num(entry.players_points?.[id]) } },
    }));
    return Math.max(predictScores(pool, week, { roster_positions: rosterPositions }), entry.points);
}

/* ---------------------------------------------------------------- how players were acquired */

/**
 * Every completed acquisition this season, by team and player: waiver / free-agent adds, trades and
 * commissioner moves. Players with no acquisition this season were drafted or already on the roster.
 */
export function acquisitionIndex(transactions = []) {
    const index = {};
    const trades = {};
    const done = transactions
        .filter((t) => t && t.status === 'complete')
        .sort((a, b) => (a.leg ?? 0) - (b.leg ?? 0) || (a.status_updated ?? 0) - (b.status_updated ?? 0));
    for (const t of done) {
        const kind = t.type === 'trade' ? 'trade' : t.type === 'waiver' || t.type === 'free_agent' ? 'waiver' : 'other';
        if (kind === 'trade') {
            trades[t.transaction_id] = {
                id: t.transaction_id,
                leg: t.leg ?? 0,
                rosterIDs: (t.roster_ids ?? []).map(String),
                adds: Object.fromEntries(Object.entries(t.adds ?? {}).map(([p, r]) => [p, String(r)])),
                drops: Object.fromEntries(Object.entries(t.drops ?? {}).map(([p, r]) => [p, String(r)])),
                picks: (t.draft_picks ?? []).map((pk) => ({
                    season: pk.season, round: pk.round,
                    to: String(pk.owner_id), from: String(pk.previous_owner_id), original: String(pk.roster_id),
                })),
                faab: (t.waiver_budget ?? []).map((b) => ({ to: String(b.receiver), from: String(b.sender), amount: b.amount })),
            };
        }
        for (const [playerID, rosterID] of Object.entries(t.adds ?? {})) {
            (index[`${rosterID}:${playerID}`] ||= []).push({ kind, leg: t.leg ?? 0, txID: t.transaction_id });
        }
    }
    /** How `rosterID` got `playerID` as of `week`: the latest acquisition in a leg <= week, or 'original'. */
    const lookup = (rosterID, playerID, week) => {
        const events = index[`${rosterID}:${playerID}`];
        let found = null;
        for (const ev of events ?? []) if (ev.leg <= week) found = ev;
        return found ?? { kind: 'original', leg: 0, txID: null };
    };
    return { lookup, trades };
}

/* ---------------------------------------------------------------- regular season */

/** Every starter and bench appearance in the given weeks. */
function appearances(weeks, weekNumbers, rosterPositions) {
    const slots = starterSlots(rosterPositions);
    const out = [];
    for (const week of weekNumbers) {
        for (const e of playedWeek(weeks[week])) {
            const rosterID = String(e.roster_id);
            const starters = e.starters ?? [];
            const startSet = new Set();
            starters.forEach((id, i) => {
                if (!id || id === '0') return;
                startSet.add(id);
                out.push({ week, rosterID, playerID: id, points: pointsOf(e, id, i), starter: true, slot: slots[i] });
            });
            for (const id of e.players ?? []) {
                if (startSet.has(id)) continue;
                out.push({ week, rosterID, playerID: id, points: num(e.players_points?.[id]), starter: false });
            }
        }
    }
    return out;
}

/** Season starter (or bench) points per player: { playerID, points, games, byTeam: { rosterID: points }, rosterID } */
function playerTotals(list) {
    const totals = {};
    for (const a of list) {
        const t = (totals[a.playerID] ||= { playerID: a.playerID, points: 0, games: 0, byTeam: {} });
        t.points += a.points;
        t.games++;
        t.byTeam[a.rosterID] = (t.byTeam[a.rosterID] ?? 0) + a.points;
    }
    for (const t of Object.values(totals)) {
        // credit the team he scored the most for (matters for players who were traded)
        t.rosterID = best(Object.keys(t.byTeam), (id) => t.byTeam[id]);
    }
    return Object.values(totals);
}

/**
 * All-League Team: the top season starter scorers, one per starting slot.
 * Fixed-position slots are filled first, then the flex slots (narrowest first).
 */
export function allLeagueTeam(totals, players, rosterPositions) {
    const slots = starterSlots(rosterPositions).map((slot, i) => ({ slot, i, groups: SLOT_GROUPS[slot] ?? [slot] }));
    const ranked = [...totals].sort((a, b) => b.points - a.points);
    const used = new Set();
    const lineup = new Array(slots.length).fill(null);
    for (const s of [...slots].sort((a, b) => a.groups.length - b.groups.length || a.i - b.i)) {
        const pick = ranked.find((t) => !used.has(t.playerID) && groupsFor(players[t.playerID]).some((g) => s.groups.includes(g)));
        if (!pick) continue;
        used.add(pick.playerID);
        lineup[s.i] = { slot: s.slot, playerID: pick.playerID, points: pick.points, rosterID: pick.rosterID, pos: groupFor(players[pick.playerID]) };
    }
    return lineup.filter(Boolean);
}

export function regularSeasonAwards(input) {
    const { weeks = {}, players = {}, rosterPositions = [], regularSeasonLength, season, currentSeason, transactions = [] } = input;
    const weekNumbers = [];
    for (let w = 1; w <= regularSeasonLength; w++) if (playedWeek(weeks[w]).length) weekNumbers.push(w);
    if (!weekNumbers.length) return null;

    // ---- team numbers
    const teams = {};
    const team = (id) => (teams[id] ||= { rosterID: id, points: 0, max: 0, games: 0, medW: 0, medL: 0, medT: 0, medMargin: 0 });
    const teamWeeks = []; // { rosterID, week, points }
    const games = []; // decided head-to-head games
    for (const week of weekNumbers) {
        const entries = playedWeek(weeks[week]);
        const med = median(entries.map((e) => e.points));
        for (const e of entries) {
            const t = team(String(e.roster_id));
            t.points += e.points;
            t.max += weekMax(e, players, week, rosterPositions);
            t.games++;
            if (e.points > med) t.medW++; else if (e.points < med) t.medL++; else t.medT++;
            t.medMargin += e.points - med;
            teamWeeks.push({ rosterID: t.rosterID, week, points: e.points });
        }
        for (const [a, b] of pairs(entries)) {
            if (a.points === b.points) continue;
            const [w, l] = a.points > b.points ? [a, b] : [b, a];
            games.push({ week, winner: String(w.roster_id), loser: String(l.roster_id), winnerPts: w.points, loserPts: l.points, margin: w.points - l.points });
        }
    }
    const teamList = Object.values(teams);
    const luck = allPlayRecords(weekNumbers.map((w) => weeks[w]));

    // ---- player numbers
    const apps = appearances(weeks, weekNumbers, rosterPositions);
    const starts = apps.filter((a) => a.starter);
    const starterTotals = playerTotals(starts);
    const benchTotals = playerTotals(apps.filter((a) => !a.starter));
    const withInfo = (t) => (t ? { ...t, name: playerName(players, t.playerID), pos: groupFor(players[t.playerID]) } : null);
    const topIn = (list, groups, filter = () => true) =>
        withInfo(best(list.filter((t) => groups.includes(groupFor(players[t.playerID])) && filter(t)), (t) => t.points));
    const rookie = (t) => isRookie(players[t.playerID], season, currentSeason);

    // ---- acquisitions: waivers and trades
    const { lookup, trades } = acquisitionIndex(transactions);
    const waiverPts = {}; // rosterID -> points
    const pickupPts = {}; // `${rosterID}:${playerID}` -> points
    const weekPts = {}; // playerID -> week -> points, wherever he was rostered (starting or bench)
    for (const a of apps) {
        (weekPts[a.playerID] ||= {})[a.week] = a.points;
        const acq = lookup(a.rosterID, a.playerID, a.week);
        if (acq.kind === 'waiver' && a.starter) {
            waiverPts[a.rosterID] = (waiverPts[a.rosterID] ?? 0) + a.points;
            const key = `${a.rosterID}:${a.playerID}`;
            pickupPts[key] = (pickupPts[key] ?? 0) + a.points;
        }
    }
    const pickups = Object.entries(pickupPts).map(([key, points]) => {
        const [rosterID, playerID] = key.split(':');
        return { rosterID, playerID, points };
    });
    const wizard = best(Object.entries(waiverPts), ([, p]) => p);
    let waiverWizard = null;
    if (wizard && wizard[1] > 0) {
        const top = best(pickups.filter((p) => p.rosterID === wizard[0]), (p) => p.points);
        waiverWizard = { rosterID: wizard[0], points: wizard[1], top: withInfo(top) };
    }
    const topPickup = (groups) => {
        const pick = best(pickups.filter((p) => groups.includes(groupFor(players[p.playerID]))), (p) => p.points);
        return pick && pick.points > 0 ? withInfo(pick) : null;
    };

    // trade of the year: everything each player in the trade scored from the trade's week on (for whichever team had
    // him, starting or bench; Raymond's call, so later flips don't matter). A team's net = what the players it got
    // scored minus what the players it sent scored. Draft picks count as a rough season of points (pickValues.js),
    // scaled to the part of the regular season left after the trade (a 1st traded in week 12 of 14 is worth 3/14 of
    // 120), like the players, who only count from the trade's week on.
    const values = input.pickValues ?? PICK_VALUES;
    const withValue = (pk, leg) => {
        const full = pickValue(pk.round, values);
        return { ...pk, fullValue: full, value: Math.round(full * pickShare(leg, regularSeasonLength)) };
    };
    const scoredFrom = (playerID, leg) =>
        sum(Object.entries(weekPts[playerID] ?? {}).filter(([w]) => Number(w) >= leg).map(([, v]) => v));
    const playerInfo = (tr, p) => ({ playerID: p, name: playerName(players, p), pos: groupFor(players[p]), points: scoredFrom(p, tr.leg) });
    // one team's side of a trade: what it received and sent, and its net
    const tradeSide = (tr, rosterID) => {
        const received = Object.keys(tr.adds).filter((p) => tr.adds[p] === rosterID).map((p) => playerInfo(tr, p));
        const sent = Object.keys(tr.drops)
            .filter((p) => tr.drops[p] === rosterID && tr.adds[p] && tr.adds[p] !== rosterID)
            .map((p) => playerInfo(tr, p));
        const picks = tr.picks.filter((pk) => pk.to === rosterID).map((pk) => withValue(pk, tr.leg));
        const picksSent = tr.picks.filter((pk) => pk.from === rosterID).map((pk) => withValue(pk, tr.leg));
        const gained = sum(received.map((x) => x.points)) + sum(picks.map((pk) => pk.value));
        const lost = sum(sent.map((x) => x.points)) + sum(picksSent.map((pk) => pk.value));
        return {
            rosterID, received, sent, picks, picksSent,
            faab: sum(tr.faab.filter((bd) => bd.to === rosterID).map((bd) => bd.amount)),
            faabSent: sum(tr.faab.filter((bd) => bd.from === rosterID).map((bd) => bd.amount)),
            gained, lost, net: gained - lost,
        };
    };
    let tradeOfYear = null;
    for (const tr of Object.values(trades)) {
        for (const rosterID of tr.rosterIDs) {
            const side = tradeSide(tr, rosterID);
            if (side.net > 0 && (!tradeOfYear || side.net > tradeOfYear.net)) {
                tradeOfYear = {
                    rosterID,
                    net: side.net,
                    gained: side.gained,
                    lost: side.lost,
                    week: tr.leg,
                    partners: tr.rosterIDs.filter((id) => id !== rosterID),
                    received: side.received,
                    sent: side.sent,
                    picksReceived: side.picks,
                    picksSent: side.picksSent,
                    faabReceived: side.faab,
                    faabSent: side.faabSent,
                    // winner first, then the other team(s)
                    sides: [side, ...tr.rosterIDs.filter((id) => id !== rosterID).map((id) => tradeSide(tr, id))],
                };
            }
        }
    }

    const bestGame = best(starts, (a) => a.points);
    const efficiency = (t) => (t.max > 0 ? t.points / t.max : 0);
    const medPct = (t) => (t.medW + t.medT / 2) / Math.max(1, t.games);
    const luckiest = best(luck, (r) => r.luck);
    const unluckiest = best(luck, (r) => -r.luck);
    const summary = (r) => r && { rosterID: r.rosterID, luck: r.luck, wins: r.wins, losses: r.losses, ties: r.ties, expectedWins: r.expectedWins };

    return {
        weeks: weekNumbers.length,
        lastWeek: weekNumbers[weekNumbers.length - 1],
        // team
        pointsKing: (() => { const t = best(teamList, (x) => x.points); return t && { rosterID: t.rosterID, points: t.points, perGame: t.points / t.games }; })(),
        coach: (() => { const t = best(teamList.filter((x) => x.max > 0), efficiency); return t && { rosterID: t.rosterID, efficiency: efficiency(t), points: t.points, max: t.max }; })(),
        luckiest: summary(luckiest),
        unluckiest: unluckiest && unluckiest !== luckiest ? summary(unluckiest) : null,
        medianMaster: (() => {
            const t = best(teamList, (x) => medPct(x) * 1e6 + x.medMargin);
            return t && { rosterID: t.rosterID, wins: t.medW, losses: t.medL, ties: t.medT, margin: t.medMargin };
        })(),
        boomWeek: best(teamWeeks, (x) => x.points),
        bustWeek: best(teamWeeks, (x) => -x.points),
        nailBiter: best(games, (g) => -g.margin),
        waiverWizard,
        tradeOfYear,
        // player
        mvp: withInfo(best(starterTotals, (t) => t.points)),
        allLeague: allLeagueTeam(starterTotals, players, rosterPositions).map((s) => ({ ...s, name: playerName(players, s.playerID) })),
        dpoy: topIn(starterTotals, DEFENSE),
        oroy: topIn(starterTotals, OFFENSE, rookie),
        droy: topIn(starterTotals, DEFENSE, rookie),
        bestGame: bestGame && { ...bestGame, name: playerName(players, bestGame.playerID), pos: groupFor(players[bestGame.playerID]) },
        offPickup: topPickup(OFFENSE),
        defPickup: topPickup(DEFENSE),
        offBenchLegend: topIn(benchTotals, OFFENSE),
        defBenchLegend: topIn(benchTotals, DEFENSE),
    };
}

/* ---------------------------------------------------------------- playoffs */

/** NFL weeks played in bracket round `round` (1-based). Round types are Sleeper's playoff_round_type. */
export function roundWeeks(round, totalRounds, playoffWeekStart, roundType = 0) {
    const type = Number(roundType) || 0;
    if (type === 2) {
        const first = playoffWeekStart + 2 * (round - 1);
        return [first, first + 1];
    }
    const week = playoffWeekStart + round - 1;
    return type === 1 && round === totalRounds ? [week, week + 1] : [week];
}

/** The winners bracket as games with weeks, scores and seeds. */
export function bracketGames({ winnersBracket = [], weeks = {}, playoffWeekStart, playoffRoundType = 0, rosters = [], playoffTeams = null }) {
    const totalRounds = Math.max(0, ...winnersBracket.map((m) => m.r));
    const inBracket = new Set();
    for (const m of winnersBracket) for (const t of [m.t1, m.t2]) if (t != null) inBracket.add(String(t));
    const firstRound = new Set();
    for (const m of winnersBracket.filter((x) => x.r === 1)) for (const t of [m.t1, m.t2]) if (t != null) firstRound.add(String(t));

    // seeds follow the league's own rule (seedTeams), numbered among the teams Sleeper put in the bracket
    const { order } = seedTeams(
        rosters.map((r) => ({ ...r, rosterID: String(r.rosterID) })),
        { playoffTeams: playoffTeams ?? inBracket.size },
    );
    const seeds = {};
    order.map((t) => t.rosterID).filter((id) => inBracket.has(id)).forEach((id, i) => (seeds[id] = i + 1));

    const scoreFor = (rosterID, gameWeeks) => {
        let total = 0;
        for (const w of gameWeeks) {
            const e = (weeks[w] ?? []).find((x) => String(x.roster_id) === rosterID);
            if (!e) return null;
            total += num(e.points);
        }
        return total;
    };

    const games = winnersBracket
        .filter((m) => m.t1 != null && m.t2 != null)
        .map((m) => {
            const gameWeeks = roundWeeks(m.r, totalRounds, playoffWeekStart, playoffRoundType);
            const t1 = String(m.t1), t2 = String(m.t2);
            const s1 = scoreFor(t1, gameWeeks), s2 = scoreFor(t2, gameWeeks);
            const winner = m.w != null ? String(m.w) : null;
            const loser = m.l != null ? String(m.l) : null;
            return {
                m: m.m, round: m.r, place: m.p ?? null, weeks: gameWeeks,
                // championship path: every game without a placement, plus the final (p = 1)
                titlePath: m.p == null || m.p === 1,
                teams: [t1, t2], scores: { [t1]: s1, [t2]: s2 },
                winner, loser, done: winner != null && loser != null,
            };
        });
    const byes = [...inBracket].filter((id) => !firstRound.has(id));
    return { games, seeds, byes, totalRounds, teams: [...inBracket] };
}

/** Post-season awards, or null until the championship has a winner. */
export function postseasonAwards(input) {
    const { weeks = {}, players = {}, rosterPositions = [] } = input;
    const bracket = bracketGames(input);
    const { games, seeds, byes } = bracket;
    const final = games.find((g) => g.place === 1);
    if (!final?.done) return null;
    const thirdGame = games.find((g) => g.place === 3);
    const done = games.filter((g) => g.done);
    const scoreOf = (g, id) => g.scores[id] ?? 0;

    // ---- team awards
    const titleWins = {};
    for (const g of done.filter((x) => x.titlePath)) titleWins[g.winner] = (titleWins[g.winner] ?? 0) + 1;

    // Cinderella: of the teams without a bye, the one that went furthest; a tie goes to the lower seed
    const candidates = bracket.teams.filter((id) => !byes.includes(id) && (titleWins[id] ?? 0) > 0);
    const cinderellaID = best(candidates, (id) => (titleWins[id] ?? 0) * 100 + (seeds[id] ?? 0));
    const cinderella = cinderellaID && {
        rosterID: cinderellaID,
        seed: seeds[cinderellaID],
        wins: titleWins[cinderellaID],
        result: cinderellaID === final.winner ? 'champion' : final.teams.includes(cinderellaID) ? 'final' : 'semifinal',
    };

    const upsets = done
        .filter((g) => (seeds[g.winner] ?? 0) > (seeds[g.loser] ?? 0))
        .map((g) => ({
            round: g.round, place: g.place, week: g.weeks[0],
            winner: g.winner, loser: g.loser,
            winnerSeed: seeds[g.winner], loserSeed: seeds[g.loser], gap: seeds[g.winner] - seeds[g.loser],
            winnerPts: scoreOf(g, g.winner), loserPts: scoreOf(g, g.loser),
        }));
    const biggestUpset = best(upsets, (u) => u.gap * 1e6 + u.round);

    const perTeam = {};
    for (const g of done) {
        for (const id of g.teams) {
            const t = (perTeam[id] ||= { rosterID: id, points: 0, games: 0 });
            t.points += scoreOf(g, id);
            t.games++;
        }
    }
    const leader = best(Object.values(perTeam), (t) => t.points / t.games);

    // most efficient manager: playoff points / best possible lineup points over every playoff game played
    const eff = {};
    for (const g of done) {
        for (const id of g.teams) {
            for (const week of g.weeks) {
                const e = (weeks[week] ?? []).find((x) => String(x.roster_id) === id);
                if (!e) continue;
                const t = (eff[id] ||= { rosterID: id, points: 0, max: 0, games: 0 });
                t.points += num(e.points);
                t.max += weekMax(e, players, week, rosterPositions);
            }
            if (eff[id]) eff[id].games++;
        }
    }
    const coach = best(Object.values(eff).filter((t) => t.max > 0), (t) => t.points / t.max);

    // ---- player awards: starters in bracket games
    const slots = starterSlots(rosterPositions);
    const starts = [];
    const entryFor = (week, id) => (weeks[week] ?? []).find((e) => String(e.roster_id) === id);
    for (const g of done) {
        for (const id of g.teams) {
            for (const week of g.weeks) {
                const e = entryFor(week, id);
                if (!e) continue;
                (e.starters ?? []).forEach((pid, i) => {
                    if (pid && pid !== '0') starts.push({ game: g, week, rosterID: id, playerID: pid, points: pointsOf(e, pid, i), slot: slots[i] });
                });
            }
        }
    }
    const totals = playerTotals(starts);
    const withInfo = (t) => (t ? { ...t, name: playerName(players, t.playerID), pos: groupFor(players[t.playerID]) } : null);
    const topIn = (list, groups) => withInfo(best(list.filter((t) => groups.includes(groupFor(players[t.playerID]))), (t) => t.points));
    // the champion's top scorer in the final
    const finalTotals = playerTotals(starts.filter((s) => s.game === final && s.rosterID === final.winner));
    const gameName = (g) => {
        if (g.place === 1) return 'the final';
        if (g.place) return `the ${g.place === 3 ? '3rd' : `${g.place}th`}-place game`;
        const fromEnd = bracket.totalRounds - g.round;
        return fromEnd === 1 ? 'the semifinals' : fromEnd === 2 ? 'the quarterfinals' : `playoff round ${g.round}`;
    };

    // Bench blunder: a benched player who, swapped in for a starter at a slot he could play, flips a loss
    let benchBlunder = null;
    for (const g of done) {
        const margin = scoreOf(g, g.winner) - scoreOf(g, g.loser);
        for (const week of g.weeks) {
            const e = entryFor(week, g.loser);
            if (!e) continue;
            const starters = e.starters ?? [];
            const startSet = new Set(starters);
            for (const benchID of e.players ?? []) {
                if (startSet.has(benchID)) continue;
                const benchPts = num(e.players_points?.[benchID]);
                const canPlay = groupsFor(players[benchID]);
                starters.forEach((starterID, i) => {
                    const slotGroups = SLOT_GROUPS[slots[i]] ?? [slots[i]];
                    if (!canPlay.some((grp) => slotGroups.includes(grp))) return;
                    const starterPts = starterID && starterID !== '0' ? pointsOf(e, starterID, i) : 0;
                    const swing = benchPts - starterPts;
                    if (swing > margin && (!benchBlunder || swing > benchBlunder.swing)) {
                        benchBlunder = {
                            rosterID: g.loser, opponent: g.winner, week, round: g.round, place: g.place, game: gameName(g), margin, swing,
                            bench: { playerID: benchID, name: playerName(players, benchID), pos: groupFor(players[benchID]), points: benchPts },
                            starter: starterID && starterID !== '0'
                                ? { playerID: starterID, name: playerName(players, starterID), pos: groupFor(players[starterID]), points: starterPts }
                                : null,
                            slot: slots[i],
                        };
                    }
                });
            }
        }
    }

    return {
        seeds,
        champion: { rosterID: final.winner, seed: seeds[final.winner], points: scoreOf(final, final.winner), opponentPts: scoreOf(final, final.loser) },
        runnerUp: { rosterID: final.loser, seed: seeds[final.loser], points: scoreOf(final, final.loser) },
        third: thirdGame?.done ? { rosterID: thirdGame.winner, seed: seeds[thirdGame.winner], points: scoreOf(thirdGame, thirdGame.winner) } : null,
        cinderella,
        biggestUpset,
        toiletBowl: toiletBowl(input),
        mostEfficient: coach && { rosterID: coach.rosterID, efficiency: coach.points / coach.max, points: coach.points, max: coach.max, games: coach.games },
        scoringLeader: leader && { rosterID: leader.rosterID, perGame: leader.points / leader.games, games: leader.games, points: leader.points },
        offMvp: topIn(totals, OFFENSE),
        defMvp: topIn(totals, DEFENSE),
        champHero: withInfo(best(finalTotals, (t) => t.points)),
        benchBlunder,
    };
}

/**
 * Toilet Bowl: Sleeper's losers bracket here sends the lower score through each round, so the "winner" of its final
 * (p = 1) is the team that lost all the way down. null until that game is decided.
 */
export function toiletBowl({ losersBracket = [], weeks = {}, playoffWeekStart, playoffRoundType = 0, rosters = [] }) {
    const totalRounds = Math.max(0, ...losersBracket.map((m) => m.r));
    const final = losersBracket.find((m) => m.p === 1);
    if (!final || final.w == null || final.l == null) return null;
    const gameWeeks = roundWeeks(final.r, totalRounds, playoffWeekStart, playoffRoundType);
    const score = (id) => sum(gameWeeks.map((w) => num((weeks[w] ?? []).find((e) => String(e.roster_id) === id)?.points)));
    const rosterID = String(final.w), opponent = String(final.l);
    const rec = rosters.find((r) => String(r.rosterID) === rosterID);
    return {
        rosterID, opponent, points: score(rosterID), opponentPts: score(opponent), week: gameWeeks[0],
        record: rec ? { wins: rec.wins, losses: rec.losses, ties: rec.ties } : null,
    };
}

/** Both award groups for one season. `post` is null until the championship has a winner. */
export function seasonAwards(input) {
    return {
        season: input.season,
        regular: regularSeasonAwards(input),
        post: postseasonAwards(input),
    };
}

/* ---------------------------------------------------------------- playoff weeks for the weekly recap */

/**
 * One playoff week's entries limited to the winners-bracket games played that week, paired by bracket game,
 * so weeklyRecap() can build a playoff-week recap. Empty when no bracket game falls in `week`.
 */
export function playoffRecapEntries({ week, entries = [], winnersBracket = [], playoffWeekStart, playoffRoundType = 0 }) {
    const totalRounds = Math.max(0, ...winnersBracket.map((m) => m.r));
    const gameOf = {};
    for (const m of winnersBracket) {
        if (m.t1 == null || m.t2 == null) continue;
        if (!roundWeeks(m.r, totalRounds, playoffWeekStart, playoffRoundType).includes(week)) continue;
        gameOf[String(m.t1)] = m.m;
        gameOf[String(m.t2)] = m.m;
    }
    return entries
        .filter((e) => gameOf[String(e.roster_id)] != null)
        .map((e) => ({ ...e, matchup_id: `p${gameOf[String(e.roster_id)]}` }));
}

/** Bracket round label for a playoff week, e.g. "Semifinals". */
export function playoffRoundName({ week, winnersBracket = [], playoffWeekStart, playoffRoundType = 0 }) {
    const totalRounds = Math.max(0, ...winnersBracket.map((m) => m.r));
    for (let r = 1; r <= totalRounds; r++) {
        if (!roundWeeks(r, totalRounds, playoffWeekStart, playoffRoundType).includes(week)) continue;
        const fromEnd = totalRounds - r;
        return fromEnd === 0 ? 'Championship' : fromEnd === 1 ? 'Semifinals' : fromEnd === 2 ? 'Quarterfinals' : `Playoff round ${r}`;
    }
    return null;
}
