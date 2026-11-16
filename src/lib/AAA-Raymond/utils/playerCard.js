// Player card math (components/PlayerCard): league points from Sleeper's per-player stats, the scoring breakdown,
// week cards, the game log and career tables (one set of stat columns per position), stat tiles, position rank and
// the player's league history (drafts, trades, waivers).
// Stats come from Sleeper's player stats endpoint (utils/playerStats.js): { week, opponent, is_away_team, stats }.
// Points = every stat x the league's scoring_settings (same key names), which reproduces the matchup points exactly.
// Plain functions, no site imports (tested in tests/playerCard.test.js).

import { playerGroup } from './positions.js';

export const CARD_GROUPS = ['QB', 'RB', 'WR', 'TE', 'DL', 'LB', 'DB'];

/** The player's card group (QB, RB, WR, TE, DL, LB, DB), or null for kickers, defenses and unknowns. */
export const cardGroup = (player) => playerGroup(player, CARD_GROUPS);

export const isDefender = (group) => group === 'DL' || group === 'LB' || group === 'DB';

const round2 = (n) => Math.round(n * 100) / 100;
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

// ---------------------------------------------------------------- scoring

/** League points for a stat line: every stat times its scoring value. */
export function scoreStats(stats = {}, scoring = {}) {
    let pts = 0;
    for (const [key, value] of Object.entries(stats ?? {})) {
        const mult = scoring?.[key];
        if (mult) pts += num(value) * mult;
    }
    return round2(pts);
}

/** Names for the breakdown rows; anything else is shown as its key in words. */
export const STAT_LABELS = {
    pass_yd: 'Passing yards', pass_td: 'Passing TDs', pass_int: 'Interceptions thrown', pass_2pt: '2-pt conversion pass',
    pass_cmp: 'Completions', pass_att: 'Pass attempts', pass_fd: 'Passing first downs',
    rush_att: 'Carries', rush_yd: 'Rushing yards', rush_td: 'Rushing TDs', rush_2pt: '2-pt conversion run', rush_fd: 'Rushing first downs',
    rec: 'Receptions', rec_yd: 'Receiving yards', rec_td: 'Receiving TDs', rec_2pt: '2-pt conversion catch', rec_fd: 'Receiving first downs',
    bonus_rec_wr: 'WR catch bonus', bonus_rec_te: 'TE catch bonus', bonus_rec_rb: 'RB catch bonus',
    fum: 'Fumbles', fum_lost: 'Fumble lost', fum_rec_td: 'Fumble recovery TD',
    kr_yd: 'Kick return yards', pr_yd: 'Punt return yards', st_td: 'Special teams TD',
    st_tkl_solo: 'Special teams tackles', st_ff: 'Special teams forced fumbles', st_fum_rec: 'Special teams fumble recoveries',
    idp_tkl_solo: 'Solo tackles', idp_tkl_ast: 'Assisted tackles', idp_tkl: 'Tackles', idp_tkl_loss: 'Tackles for loss',
    idp_sack: 'Sacks', idp_qb_hit: 'QB hits', idp_pass_def: 'Passes defended', idp_pass_def_3p: '3+ passes defended bonus',
    idp_int: 'Interceptions', idp_int_ret_yd: 'Interception return yards', idp_ff: 'Forced fumbles', idp_fum_rec: 'Fumble recoveries',
    idp_fum_ret_yd: 'Fumble return yards', idp_def_td: 'Defensive TDs', idp_safe: 'Safeties', idp_blk_kick: 'Blocked kicks',
    bonus_tkl_10p: '10+ tackles bonus', bonus_sack_2p: '2+ sacks bonus',
};

export const statLabel = (key) => {
    if (STAT_LABELS[key]) return STAT_LABELS[key];
    const words = String(key).replace(/_/g, ' ');
    return words.charAt(0).toUpperCase() + words.slice(1);
};

/** The stats that scored, biggest first: [{ key, label, value, mult, points }]. */
export function scoreBreakdown(stats = {}, scoring = {}) {
    const rows = [];
    for (const [key, value] of Object.entries(stats ?? {})) {
        const mult = scoring?.[key];
        const v = num(value);
        if (!mult || !v) continue;
        rows.push({ key, label: statLabel(key), value: v, mult, points: round2(v * mult) });
    }
    return rows.sort((a, b) => Math.abs(b.points) - Math.abs(a.points) || a.label.localeCompare(b.label));
}

// ---------------------------------------------------------------- stat columns

const count = (key) => (s) => num(s?.[key]);
const tackles = (s) => num(s?.idp_tkl) || num(s?.idp_tkl_solo) + num(s?.idp_tkl_ast);
const cell = (value, text = String(value)) => ({ text, zero: !value });

const COLUMNS = {
    passCmp: { label: 'CMP', cell: (s) => cell(num(s?.pass_att), `${num(s?.pass_cmp)}/${num(s?.pass_att)}`) },
    passYd: { label: 'YDS', cell: (s) => cell(count('pass_yd')(s), count('pass_yd')(s).toLocaleString('en-US')) },
    passTd: { label: 'TD', cell: (s) => cell(count('pass_td')(s)) },
    passInt: { label: 'INT', cell: (s) => cell(count('pass_int')(s)) },
    rushAtt: { label: 'ATT', cell: (s) => cell(count('rush_att')(s)) },
    rushYd: { label: 'YDS', cell: (s) => cell(count('rush_att')(s) || count('rush_yd')(s), count('rush_yd')(s).toLocaleString('en-US')) },
    rushTd: { label: 'TD', cell: (s) => cell(count('rush_td')(s)) },
    rec: { label: 'REC', cell: (s) => cell(num(s?.rec_tgt) || num(s?.rec), `${num(s?.rec)}/${num(s?.rec_tgt)}`) },
    recYd: { label: 'YDS', cell: (s) => cell(count('rec')(s) || count('rec_yd')(s), count('rec_yd')(s).toLocaleString('en-US')) },
    recTd: { label: 'TD', cell: (s) => cell(count('rec_td')(s)) },
    tkl: { label: 'TKL', cell: (s) => cell(tackles(s)) },
    solo: { label: 'SOLO', cell: (s) => cell(count('idp_tkl_solo')(s)) },
    tfl: { label: 'TFL', cell: (s) => cell(count('idp_tkl_loss')(s)) },
    sack: { label: 'SCK', cell: (s) => cell(count('idp_sack')(s), String(count('idp_sack')(s))) },
    hit: { label: 'HIT', cell: (s) => cell(count('idp_qb_hit')(s)) },
    pd: { label: 'PD', cell: (s) => cell(count('idp_pass_def')(s)) },
    int: { label: 'INT', cell: (s) => cell(count('idp_int')(s)) },
    ff: { label: 'FF', cell: (s) => cell(count('idp_ff')(s)) },
    fr: { label: 'FR', cell: (s) => cell(count('idp_fum_rec')(s)) },
};

export const STAT_GROUPS = {
    passing: { label: 'PASSING', cols: ['passCmp', 'passYd', 'passTd', 'passInt'] },
    rushing: { label: 'RUSHING', cols: ['rushAtt', 'rushYd', 'rushTd'] },
    receiving: { label: 'RECEIVING', cols: ['rec', 'recYd', 'recTd'] },
    tackles: { label: 'TACKLES', cols: ['tkl', 'solo', 'tfl'] },
    passRush: { label: 'RUSH', cols: ['sack', 'hit'] },
    coverage: { label: 'COVER', cols: ['pd', 'int'] },
    fumbles: { label: 'FUM', cols: ['ff', 'fr'] },
};

/**
 * Stat groups in the order a position reads them: the same columns for every non-QB offensive player (and every
 * defender), with the position's main group first (Raymond's call: WR/TE receiving first, RB rushing first).
 */
export const GROUP_ORDER = {
    QB: ['passing', 'rushing'],
    RB: ['rushing', 'receiving'],
    WR: ['receiving', 'rushing'],
    TE: ['receiving', 'rushing'],
    DL: ['tackles', 'passRush', 'coverage', 'fumbles'],
    LB: ['tackles', 'passRush', 'coverage', 'fumbles'],
    DB: ['tackles', 'coverage', 'passRush', 'fumbles'],
};

/** [{ key, label, cols: [{ key, label }] }] for a card group ([] for kickers / defenses). */
export const statGroups = (group) =>
    (GROUP_ORDER[group] ?? []).map((key) => ({
        key,
        label: STAT_GROUPS[key].label,
        cols: STAT_GROUPS[key].cols.map((c) => ({ key: c, label: COLUMNS[c].label })),
    }));

/** One stat line's cells in statGroups order: [[{ text, zero }]] (one list per group). */
export const statCells = (stats, group) =>
    (GROUP_ORDER[group] ?? []).map((key) => STAT_GROUPS[key].cols.map((c) => COLUMNS[c].cell(stats ?? {})));

/** Share of the team's snaps on the player's side of the ball, 0-100 (null without snap counts). */
export function snapShare(stats, group) {
    const [mine, team] = isDefender(group) ? ['def_snp', 'tm_def_snp'] : ['off_snp', 'tm_off_snp'];
    const t = num(stats?.[team]);
    return t ? Math.round((100 * num(stats?.[mine])) / t) : null;
}

/** Add stat lines together (season totals from weeks). */
export function sumStats(lines = []) {
    const out = {};
    for (const s of lines) {
        for (const [k, v] of Object.entries(s ?? {})) {
            if (Number.isFinite(Number(v))) out[k] = round2((out[k] ?? 0) + Number(v));
        }
    }
    return out;
}

// ---------------------------------------------------------------- weeks

/** Last week that counts for fantasy: the regular season plus the playoff rounds (capped at NFL week 18). */
export function lastFantasyWeek(settings = {}) {
    const start = num(settings?.playoff_week_start) || 15;
    const teams = num(settings?.playoff_teams) || 6;
    return Math.min(18, start - 1 + Math.ceil(Math.log2(Math.max(2, teams))));
}

/** A week the player took part in: games played > 0 (or, without a gp count, any stat at all). */
export const played = (entry) => !!entry?.stats && (entry.stats.gp != null ? num(entry.stats.gp) > 0 : Object.keys(entry.stats).length > 0);

/**
 * One card per week 1..lastWeek: { week, status, opp, away, points, proj }.
 * status: 'played' | 'live' (the current week, stats coming in) | 'projected' | 'bye' | 'out' (no stats although the
 * team played: inactive or injured). Byes come from the projections (no opponent that week).
 * weekly = Sleeper's per-week answer ({ [week]: entry | null }); projections = the players map's wi ({ [week]: { p, o } }).
 * currentWeek = the NFL week in progress (null in the offseason / a past season: every week is final).
 */
export function weekCards({ weekly = {}, projections = {}, scoring = {}, lastWeek = 17, currentWeek = null }) {
    const cards = [];
    for (let week = 1; week <= lastWeek; week++) {
        const entry = weekly?.[week];
        const wi = projections?.[week];
        const proj = wi?.p != null && wi.p !== '' ? round2(parseFloat(wi.p) || 0) : null;
        const projOpp = wi?.o ?? null;
        if (played(entry)) {
            cards.push({
                week,
                status: currentWeek != null && week === currentWeek ? 'live' : 'played',
                opp: entry.opponent ?? projOpp,
                away: entry.is_away_team ?? null,
                points: scoreStats(entry.stats, scoring),
                proj,
            });
        } else if (wi && !projOpp) {
            cards.push({ week, status: 'bye', opp: null, away: null, points: null, proj: null });
        } else if (currentWeek == null || week < currentWeek) {
            cards.push({ week, status: entry?.opponent || projOpp ? 'out' : 'bye', opp: entry?.opponent ?? projOpp, away: entry?.is_away_team ?? null, points: null, proj });
        } else {
            cards.push({ week, status: 'projected', opp: projOpp, away: null, points: null, proj });
        }
    }
    return cards;
}

/** The week the card opens on: the live week, else the latest played week, else null. */
export function defaultWeek(cards = []) {
    const live = cards.find((c) => c.status === 'live');
    if (live) return live.week;
    const done = cards.filter((c) => c.status === 'played');
    return done.length ? done[done.length - 1].week : null;
}

/** "@ DAL" / "vs DAL" (just "DAL" when home or away isn't known yet). */
export const opponentLabel = (opp, away) => (!opp ? '' : away == null ? opp : `${away ? '@' : 'vs'} ${opp}`);

/**
 * Game log rows, newest first: { week, status, opp, away, snaps, points, cells }. Weeks after the last played one
 * are left out; byes and missed games stay in as rows without stats.
 */
export function gameLog({ weekly = {}, cards = [], scoring = {}, group }) {
    const lastPlayed = Math.max(0, ...cards.filter((c) => c.status === 'played' || c.status === 'live').map((c) => c.week));
    return cards
        .filter((c) => c.week <= lastPlayed && c.status !== 'projected')
        .map((c) => {
            const stats = weekly?.[c.week]?.stats;
            if (!stats || c.status === 'bye' || c.status === 'out') return { week: c.week, status: c.status, opp: c.opp, away: c.away };
            return { week: c.week, status: c.status, opp: c.opp, away: c.away, snaps: snapShare(stats, group), points: scoreStats(stats, scoring), cells: statCells(stats, group) };
        })
        .reverse();
}

/** Season so far from the weekly answer: { games, points, stats (summed), snaps (share) }. throughWeek limits it. */
export function seasonSoFar({ weekly = {}, scoring = {}, group, throughWeek = 18 }) {
    const lines = Object.entries(weekly ?? {})
        .filter(([w, e]) => Number(w) <= throughWeek && played(e))
        .map(([, e]) => e.stats);
    const stats = sumStats(lines);
    return { games: lines.length, points: scoreStats(stats, scoring), stats, snaps: snapShare(stats, group) };
}

/** Average projection over the next `n` weeks after `afterWeek` that have a game: { avg, from, to } or null. */
export function upcomingProjection(projections = {}, afterWeek, lastWeek, n = 4) {
    const weeks = [];
    for (let w = afterWeek + 1; w <= lastWeek && weeks.length < n; w++) {
        const wi = projections?.[w];
        if (wi?.o) weeks.push({ w, p: parseFloat(wi.p) || 0 });
    }
    if (!weeks.length) return null;
    return { avg: round2(weeks.reduce((s, x) => s + x.p, 0) / weeks.length), from: weeks[0].w, to: weeks[weeks.length - 1].w };
}

// ---------------------------------------------------------------- tiles

const plural = (n, one, many = `${one}s`) => (Number(n) === 1 ? one : many);
const perGame = (total, games) => (games ? (total / games).toFixed(1) : '0.0');
const pct = (part, whole) => (whole ? `${Math.round((100 * part) / whole)}%` : '—');

/** Six season stat tiles for the Stats tab: [{ value, label }]. */
export function statTiles(group, stats = {}, games = 0, snaps = null) {
    const s = (k) => num(stats?.[k]);
    const snapTile = { value: snaps == null ? '—' : `${snaps}%`, label: 'of snaps' };
    const tkl = tackles(stats);
    switch (group) {
        case 'QB':
            return [
                { value: s('pass_yd').toLocaleString('en-US'), label: 'passing yards' },
                { value: s('pass_td'), label: plural(s('pass_td'), 'passing TD') },
                { value: s('pass_int'), label: plural(s('pass_int'), 'interception') },
                { value: pct(s('pass_cmp'), s('pass_att')), label: 'completions' },
                { value: s('rush_yd').toLocaleString('en-US'), label: 'rushing yards' },
                { value: s('rush_td'), label: plural(s('rush_td'), 'rushing TD') },
            ];
        case 'RB':
            return [
                { value: s('rush_att'), label: plural(s('rush_att'), 'carry', 'carries') },
                { value: s('rush_yd').toLocaleString('en-US'), label: 'rush yards' },
                { value: s('rush_att') ? (s('rush_yd') / s('rush_att')).toFixed(1) : '0.0', label: 'yds / carry' },
                { value: s('rec'), label: plural(s('rec'), 'catch', 'catches') },
                { value: s('rec_yd').toLocaleString('en-US'), label: 'rec yards' },
                { value: s('rush_td') + s('rec_td'), label: plural(s('rush_td') + s('rec_td'), 'TD') },
            ];
        case 'WR':
        case 'TE':
            return [
                { value: s('rec'), label: plural(s('rec'), 'catch', 'catches') },
                { value: s('rec_tgt'), label: plural(s('rec_tgt'), 'target') },
                { value: s('rec_yd').toLocaleString('en-US'), label: 'rec yards' },
                { value: s('rec_td') + s('rush_td'), label: plural(s('rec_td') + s('rush_td'), 'TD') },
                snapTile,
                { value: pct(s('rec'), s('rec_tgt')), label: 'catch rate' },
            ];
        case 'LB':
            return [
                { value: tkl, label: plural(tkl, 'tackle') },
                { value: perGame(tkl, games), label: 'tackles / game' },
                { value: s('idp_tkl_loss'), label: plural(s('idp_tkl_loss'), 'tackle for loss', 'tackles for loss') },
                { value: s('idp_sack'), label: plural(s('idp_sack'), 'sack') },
                { value: s('idp_pass_def'), label: plural(s('idp_pass_def'), 'pass defended', 'passes defended') },
                snapTile,
            ];
        case 'DL':
            return [
                { value: s('idp_sack'), label: plural(s('idp_sack'), 'sack') },
                { value: s('idp_tkl_loss'), label: plural(s('idp_tkl_loss'), 'tackle for loss', 'tackles for loss') },
                { value: s('idp_qb_hit'), label: plural(s('idp_qb_hit'), 'QB hit') },
                { value: tkl, label: plural(tkl, 'tackle') },
                { value: s('idp_ff'), label: plural(s('idp_ff'), 'forced fumble') },
                snapTile,
            ];
        case 'DB':
            return [
                { value: tkl, label: plural(tkl, 'tackle') },
                { value: perGame(tkl, games), label: 'tackles / game' },
                { value: s('idp_pass_def'), label: plural(s('idp_pass_def'), 'pass defended', 'passes defended') },
                { value: s('idp_int'), label: plural(s('idp_int'), 'interception') },
                { value: s('idp_tkl_loss'), label: plural(s('idp_tkl_loss'), 'tackle for loss', 'tackles for loss') },
                snapTile,
            ];
        default:
            return [];
    }
}

// ---------------------------------------------------------------- league context

/** { [playerID]: points } from the league's weekly matchups (template matchupWeeks), weeks 1..throughWeek. */
export function leaguePoints(matchupWeeks = [], throughWeek = Infinity) {
    const pts = {};
    (matchupWeeks ?? []).forEach((wk, i) => {
        if (i + 1 > throughWeek) return;
        for (const teams of Object.values(wk?.matchups ?? {})) {
            for (const t of teams ?? []) {
                for (const [id, p] of Object.entries(t?.playersPoints ?? {})) pts[id] = (pts[id] ?? 0) + num(p);
            }
        }
    });
    for (const id of Object.keys(pts)) pts[id] = round2(pts[id]);
    return pts;
}

/**
 * The player's rank by points among rostered players of the same card group: { rank, of } (rank null when the
 * player isn't on a roster). groupOfPlayer(id) -> card group.
 */
export function positionRank(playerID, group, rosteredIDs = [], points = {}, groupOfPlayer = () => null) {
    const id = String(playerID);
    const pool = [...new Set([...rosteredIDs.map(String), id])].filter((p) => groupOfPlayer(p) === group);
    const rostered = new Set(rosteredIDs.map(String));
    const of = pool.filter((p) => rostered.has(p)).length;
    if (!rostered.has(id)) return { rank: null, of };
    const mine = num(points[id]);
    return { rank: 1 + pool.filter((p) => p !== id && rostered.has(p) && num(points[p]) > mine).length, of };
}

/**
 * Where the player is in the league now: { rosterID, status: 'starting' | 'bench' | 'taxi' | 'ir' } or null (free agent).
 * rosters = Sleeper rosters ({ roster_id, players, starters, taxi, reserve }), as a list or keyed by roster ID.
 */
export function rosterSpot(playerID, rosters = {}) {
    const id = String(playerID);
    for (const r of Object.values(rosters ?? {})) {
        if (!(r?.players ?? []).map(String).includes(id)) continue;
        const has = (list) => (list ?? []).map(String).includes(id);
        const status = has(r.starters) ? 'starting' : has(r.taxi) ? 'taxi' : has(r.reserve) ? 'ir' : 'bench';
        return { rosterID: r.roster_id, status };
    }
    return null;
}

// ---------------------------------------------------------------- history

/** "2.04" for a pick: the same numbering as the draft board (snake with an optional third-round reversal). */
export function pickInRound(round, slot, teams, { type = 'snake', reversalRound = 0 } = {}) {
    if (type === 'snake') {
        const reversed = reversalRound
            ? (round < reversalRound && round % 2 === 0) || (round >= reversalRound && round % 2 === 1)
            : round % 2 === 0;
        return reversed ? teams - slot + 1 : slot;
    }
    return reversalRound && round >= reversalRound ? teams - slot + 1 : slot;
}

/**
 * The player's draft picks from the template's drafts (getPreviousDrafts: { year, draft: [round][col] = { player,
 * newOwner? }, draftOrder: [rosterID per col], draftType, reversalRound }):
 * [{ kind: 'draft', season, round, pick, overall, label, rosterID }], oldest first.
 */
export function draftHistory(playerID, drafts = []) {
    const id = String(playerID);
    const out = [];
    for (const d of drafts ?? []) {
        const teams = (d.draftOrder ?? []).length;
        (d.draft ?? []).forEach((row, ri) => {
            (row ?? []).forEach((c, col) => {
                if (!c || String(c.player) !== id) return;
                const round = ri + 1;
                const pick = pickInRound(round, col + 1, teams, { type: d.draftType, reversalRound: d.reversalRound });
                out.push({
                    kind: 'draft',
                    season: Number(d.year),
                    round,
                    pick,
                    overall: (round - 1) * teams + pick,
                    label: `${round}.${String(pick).padStart(2, '0')}`,
                    rosterID: Number(c.newOwner ?? d.draftOrder[col]),
                });
            });
        });
    }
    return out.sort((a, b) => a.season - b.season || a.overall - b.overall);
}

/**
 * Trades and waiver moves that involve the player (the template's digested transactions, newest first in, oldest
 * first out): [{ kind: 'trade' | 'add' | 'drop', id, ts, date, season, rosterID (who got / dropped him), bid,
 * transaction }]. A trade keeps the whole transaction so the card can list what every team got.
 */
export function transactionHistory(playerID, transactions = []) {
    const id = String(playerID);
    const out = [];
    for (const t of transactions ?? []) {
        for (const move of t.moves ?? []) {
            move.forEach((c, i) => {
                if (!c || c === 'origin' || String(c.player) !== id) return;
                const kind = t.type === 'trade' ? 'trade' : c.type === 'Dropped' ? 'drop' : 'add';
                out.push({ kind, id: t.id, ts: t.ts ?? null, date: t.date, season: t.season, rosterID: t.rosters?.[i], bid: c.bid ?? null, transaction: t });
            });
        }
    }
    // a waiver claim that drops someone else lists the player once; keep one entry per transaction and kind
    const seen = new Set();
    return out
        .filter((e) => {
            const k = `${e.id}|${e.kind}`;
            if (seen.has(k)) return false;
            seen.add(k);
            return true;
        })
        .reverse();
}

/** Draft picks and transactions in one timeline, oldest first (a season's draft comes before its moves). */
export function leagueHistory(drafts = [], transactions = []) {
    const order = (e) => (e.kind === 'draft' ? [e.season, 0, e.overall] : [e.season, 1, e.ts ?? 0]);
    return [...drafts, ...transactions].sort((a, b) => {
        const [x, y] = [order(a), order(b)];
        return x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
    });
}

/** Seasons for the career table: the league's seasons the player was in the NFL (experience = years before this one). */
export function careerSeasons(leagueSeasons = [], currentSeason, experience = 0) {
    const rookie = Number(currentSeason) - num(experience);
    return [...new Set(leagueSeasons.map(Number))].filter((y) => y >= rookie && y <= Number(currentSeason)).sort((a, b) => a - b);
}

/**
 * Career rows: [{ season, games, points, perGame, cells }] from each season's stat totals ({ [season]: stats });
 * seasons without a game are left out.
 */
export function careerRows(seasonStats = {}, scoring = {}, group) {
    return Object.entries(seasonStats ?? {})
        .map(([season, stats]) => ({ season: Number(season), stats }))
        .filter((r) => r.stats && num(r.stats.gp) > 0)
        .sort((a, b) => a.season - b.season)
        .map(({ season, stats }) => {
            const points = scoreStats(stats, scoring);
            const games = num(stats.gp);
            return { season, games, points, perGame: round2(points / games), cells: statCells(stats, group) };
        });
}

/** The stat keys worth keeping from Sleeper's answer: everything the league scores plus what the card shows. */
export const DISPLAY_KEYS = [
    'gp', 'off_snp', 'tm_off_snp', 'def_snp', 'tm_def_snp',
    'pass_att', 'pass_cmp', 'pass_yd', 'pass_td', 'pass_int', 'rush_att', 'rush_yd', 'rush_td', 'rec', 'rec_tgt', 'rec_yd', 'rec_td',
    'idp_tkl', 'idp_tkl_solo', 'idp_tkl_ast', 'idp_tkl_loss', 'idp_sack', 'idp_qb_hit', 'idp_pass_def', 'idp_int', 'idp_ff', 'idp_fum_rec',
];

/** A stat line trimmed to DISPLAY_KEYS and the keys the league scores (Sleeper sends about 80, many of them ranks). */
export function trimStats(stats = {}, scoring = {}) {
    const keep = {};
    for (const [k, v] of Object.entries(stats ?? {})) {
        if ((DISPLAY_KEYS.includes(k) || scoring?.[k]) && Number.isFinite(Number(v)) && Number(v) !== 0) keep[k] = Number(v);
    }
    return keep;
}
