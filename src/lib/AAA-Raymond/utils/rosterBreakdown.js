// Numbers for the Rosters page: players and average age per position (whole roster, taxi and IR included),
// league average and rank for any per-team number, the depth chart order, and each team's future draft picks.
// Plain functions, no site imports (tested in tests/rosterBreakdown.test.js).
import { playerGroup } from './positions.js';

export const OFFENSE_GROUPS = ['QB', 'RB', 'WR', 'TE'];
export const DEFENSE_GROUPS = ['DL', 'LB', 'DB'];
export const ROSTER_GROUPS = [...OFFENSE_GROUPS, ...DEFENSE_GROUPS];
/** Breakdown rows in display order (Team, then each side and its positions). */
export const BREAKDOWN_ROWS = ['Team', 'Off', ...OFFENSE_GROUPS, 'Def', ...DEFENSE_GROUPS];

/** QB..DB for a rostered player: their listed position first (a DE counts as DL), then their other positions. */
export const rosterGroup = (player) => playerGroup(player, ROSTER_GROUPS);

const sideOf = (group) => (OFFENSE_GROUPS.includes(group) ? 'Off' : DEFENSE_GROUPS.includes(group) ? 'Def' : null);

/**
 * { Team, Off, Def, QB, ..., DB: { count, age } } for a list of player IDs. `age` is the average of the players with
 * a known age (null if none). Players outside QB..DB (kickers, team defenses, unknown IDs) aren't counted.
 */
export function rosterAgeCounts(playerIDs = [], players = {}) {
    const lists = Object.fromEntries(BREAKDOWN_ROWS.map((k) => [k, { count: 0, ages: [] }]));
    for (const id of playerIDs ?? []) {
        const player = players?.[id];
        const group = rosterGroup(player);
        if (!group) continue;
        const age = Number(player.age);
        for (const key of ['Team', sideOf(group), group]) {
            lists[key].count += 1;
            if (player.age != null && Number.isFinite(age) && age > 0) lists[key].ages.push(age);
        }
    }
    return Object.fromEntries(
        Object.entries(lists).map(([k, { count, ages }]) => [k, { count, age: ages.length ? ages.reduce((a, b) => a + b, 0) / ages.length : null }])
    );
}

/**
 * League average and rank for one number per team. values: { [rosterID]: number | null }.
 * Returns { avg, rank: { [rosterID]: 1 = highest }, maxRank } (ties share a rank, like the Standings tables;
 * teams without a value get no rank and don't count toward the average).
 */
export function leagueRanks(values = {}) {
    const known = Object.entries(values).filter(([, v]) => v != null && Number.isFinite(Number(v)));
    const unique = [...new Set(known.map(([, v]) => Number(v)))].sort((a, b) => b - a);
    return {
        avg: known.length ? known.reduce((sum, [, v]) => sum + Number(v), 0) / known.length : null,
        rank: Object.fromEntries(known.map(([id, v]) => [id, unique.indexOf(Number(v)) + 1])),
        maxRank: unique.length,
    };
}

/** 0 (lowest in the league) .. 1 (highest) for a rank, for the two-sided pink/cyan shading. 0.5 when all tie. */
export const rankShade = (rank, maxRank) => (!rank || maxRank <= 1 ? 0.5 : 1 - (rank - 1) / (maxRank - 1));

/**
 * The weeks a season-level projection averages over: this week through the end of the regular season, and never
 * fewer than `minWeeks` (late in the season it reaches back, so one game doesn't decide it). [] once the regular
 * season is over.
 */
export function projectionWeeks(week, regularSeasonLength, minWeeks = 4) {
    const last = Number(regularSeasonLength) || 0;
    const from = Math.max(1, Number(week) || 1);
    if (from > last) return [];
    const first = Math.max(1, Math.min(from, last - minWeeks + 1));
    return Array.from({ length: last - first + 1 }, (_, i) => first + i);
}

/**
 * Projected points per game over `weeks`, skipping byes (Sleeper projections list no opponent that week), so a
 * bye doesn't move anyone out of the lineup. Weeks a player is ruled out still count (as 0). 0 with no games.
 */
export function seasonProjection(player, weeks = []) {
    const games = weeks.map((w) => player?.wi?.[w]).filter((wi) => wi && wi.o);
    if (!games.length) return 0;
    return games.reduce((sum, wi) => sum + (parseFloat(wi.p) || 0), 0) / games.length;
}

/**
 * Depth chart: { [group]: [{ id, tag, projection }] } for QB..DB, each list ordered starters, bench, taxi ("T"),
 * IR, then by projection (highest first). starters: Set of IDs drawn as starting; projections: { [id]: number }.
 */
export function depthChart({ playerIDs = [], players = {}, starters = new Set(), taxi = [], reserve = [], projections = {} }) {
    const taxiSet = new Set(taxi ?? []);
    const irSet = new Set(reserve ?? []);
    const order = { start: 0, bench: 1, T: 2, IR: 3 };
    const groups = Object.fromEntries(ROSTER_GROUPS.map((g) => [g, []]));
    for (const id of playerIDs ?? []) {
        const player = players?.[id];
        const group = rosterGroup(player);
        if (!group) continue;
        const tag = irSet.has(id) ? 'IR' : taxiSet.has(id) ? 'T' : starters.has(id) ? 'start' : 'bench';
        groups[group].push({ id, tag, projection: projections[id] ?? 0 });
    }
    for (const g of ROSTER_GROUPS) {
        groups[g].sort((a, b) => order[a.tag] - order[b.tag] || b.projection - a.projection);
    }
    return groups;
}

/** Draft seasons whose picks are still to come: from next year (this year if the draft hasn't happened), 2 or more. */
export function pickSeasons(leagueData, tradedPicks = []) {
    const season = Number(leagueData?.season);
    if (!season) return [];
    const draftDone = !['pre_draft', 'drafting'].includes(leagueData?.status);
    const first = draftDone ? season + 1 : season;
    const traded = (tradedPicks ?? []).map((p) => Number(p.season)).filter((s) => s >= first);
    const last = Math.max(first + 1, ...traded);
    return Array.from({ length: last - first + 1 }, (_, i) => first + i);
}

/**
 * Future picks each team owns. Every team starts with its own pick in each season and round; Sleeper's traded_picks
 * list says where traded ones went (roster_id = the team the pick originally belonged to, owner_id = who has it now).
 * Returns { [rosterID]: [{ season, round, from }] } sorted by season then round, own picks first
 * (`from` = original team's roster ID for picks that came in a trade, null for their own).
 */
export function ownedPicks({ rosterIDs = [], tradedPicks = [], seasons = [], rounds = 0 }) {
    const owner = new Map();
    for (const season of seasons) {
        for (let round = 1; round <= rounds; round++) {
            for (const rid of rosterIDs) owner.set(`${season}-${round}-${rid}`, String(rid));
        }
    }
    for (const p of tradedPicks ?? []) {
        const key = `${Number(p.season)}-${Number(p.round)}-${p.roster_id}`;
        if (owner.has(key) && p.owner_id != null) owner.set(key, String(p.owner_id));
    }
    const out = Object.fromEntries(rosterIDs.map((rid) => [String(rid), []]));
    for (const [key, ownerID] of owner) {
        const [season, round, original] = key.split('-');
        out[ownerID]?.push({ season: Number(season), round: Number(round), from: original === ownerID ? null : original });
    }
    for (const list of Object.values(out)) {
        list.sort((a, b) => a.season - b.season || a.round - b.round || (a.from == null ? -1 : 0) - (b.from == null ? -1 : 0) || (Number(a.from) || 0) - (Number(b.from) || 0));
    }
    return out;
}
