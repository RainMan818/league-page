// Week-by-week trend series for the /trends page: standings place, record, points for, max PF, lineup efficiency,
// all-play win %, and position / offense / defense averages.
// Built only from data the site already has (completed weeks' matchups, league settings, players), so the page
// makes no extra Sleeper requests. Plain functions, no site imports (tested in tests/leagueTrends.test.js).
import { predictScores } from './predictOptimalScore.js';
import { seedTeams } from './playoffs.js';
import { positionAverages, slotBuckets } from './positionAverages.js';

const sum = (xs) => xs.reduce((a, b) => a + (b || 0), 0);
const oldestFirst = (matchupsData) => [...matchupsData].reverse().filter((w) => w?.length);
const entryPoints = (e) => e.points ?? sum(e.starters_points ?? []);
const isMedianGame = (leagueData) => leagueData?.settings?.league_average_match == 1;
const playoffTeamsOf = (leagueData) => leagueData?.settings?.playoff_teams || 6;
const weekEntriesFor = (weekEntries, ids) => weekEntries.filter((e) => ids.includes(String(e.roster_id)));

/** Best possible lineup for one team-week, from what every rostered player scored (never below the actual score). */
export function weeklyMax(entry, players, leagueData) {
    if (!leagueData?.roster_positions) return entry.points ?? 0;
    const pool = (entry.players || Object.keys(entry.players_points || {})).map((id) => ({
        pos: players[id]?.pos,
        positions: players[id]?.positions,
        wi: { 1: { p: entry.players_points?.[id] ?? 0 } },
    }));
    return Math.max(predictScores(pool, 1, leagueData), entry.points ?? 0);
}

/** League median score for one week. */
export function weekMedian(weekEntries) {
    const sorted = weekEntries.map((e) => e.points).sort((x, y) => x - y);
    if (!sorted.length) return 0;
    const mid = sorted.length / 2;
    return sorted.length % 2 ? sorted[Math.floor(mid)] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Head-to-head and (optionally) league-median results for one week.
 * Returns { [rosterID]: { wins, losses, ties } } for that week only.
 */
export function weekResults(weekEntries, { medianGame = false } = {}) {
    const res = {};
    const add = (id, k) => { (res[id] ??= { wins: 0, losses: 0, ties: 0 })[k]++; };
    const byMatchup = {};
    for (const e of weekEntries) {
        res[String(e.roster_id)] ??= { wins: 0, losses: 0, ties: 0 };
        if (e.matchup_id != null) (byMatchup[e.matchup_id] ??= []).push(e);
    }
    for (const pair of Object.values(byMatchup)) {
        if (pair.length !== 2) continue;
        const [a, b] = pair;
        if (a.points > b.points) { add(String(a.roster_id), 'wins'); add(String(b.roster_id), 'losses'); }
        else if (b.points > a.points) { add(String(b.roster_id), 'wins'); add(String(a.roster_id), 'losses'); }
        else { add(String(a.roster_id), 'ties'); add(String(b.roster_id), 'ties'); }
    }
    if (medianGame && weekEntries.length > 1) {
        // league median game: the top half of the league's scores win
        const median = weekMedian(weekEntries);
        for (const e of weekEntries) {
            add(String(e.roster_id), e.points > median ? 'wins' : e.points < median ? 'losses' : 'ties');
        }
    }
    return res;
}

/**
 * Season record and points for after each week (weeksData oldest first).
 * Returns [{ [rosterID]: { wins, losses, ties, pf } }, ...], one snapshot per week.
 */
function runningRecords(weeksData, ids, medianGame) {
    const totals = Object.fromEntries(ids.map((id) => [id, { wins: 0, losses: 0, ties: 0, pf: 0 }]));
    return weeksData.map((weekEntries) => {
        const entries = weekEntriesFor(weekEntries, ids);
        const results = weekResults(entries, { medianGame });
        for (const e of entries) {
            const t = totals[String(e.roster_id)], r = results[String(e.roster_id)];
            t.wins += r.wins; t.losses += r.losses; t.ties += r.ties;
            t.pf += entryPoints(e);
        }
        return Object.fromEntries(ids.map((id) => [id, { ...totals[id] }]));
    });
}

/** Standings place for one records snapshot, by the league seeding rule: { [rosterID]: place }. */
function seedPlaces(records, ids, divisions, playoffTeams) {
    const { order } = seedTeams(
        ids.map((id) => ({ rosterID: id, ...records[id], fpts: records[id].pf, division: divisions[id] ?? null })),
        { playoffTeams }
    );
    return Object.fromEntries(order.map((t, k) => [t.rosterID, k + 1]));
}

/**
 * All the trend series.
 *  matchupsData: completed weeks, newest first (standings.matchups), Sleeper-style entries
 *  rosterIDs:    every team's roster ID
 *  divisions:    { [rosterID]: division number } (for the seeding rule)
 *  leagueData:   Sleeper league (roster_positions, settings.playoff_teams, settings.league_average_match)
 *  players:      the site's player map (positions, for max PF)
 *
 * Returns {
 *   weeks: [1..n], teamIDs, positions: ['QB', ...],
 *   series: { [rosterID]: { place, wins, losses, ties, pfWeek, pfCum, maxWeek, maxCum, effWeek, effCum, allPlay,
 *                            pos: { QB: [...], ..., OFF: [...], DEF: [...] } } },
 *   median: [league median per week],
 * }  Every array has one value per completed week (index 0 = week 1).
 */
export function leagueTrends({ matchupsData = [], rosterIDs = [], divisions = {}, leagueData = {}, players = {} }) {
    const weeksData = oldestFirst(matchupsData);
    const n = weeksData.length;
    const ids = rosterIDs.map(String);
    const playoffTeams = playoffTeamsOf(leagueData);
    const rosterPositions = leagueData?.roster_positions ?? [];
    const records = runningRecords(weeksData, ids, isMedianGame(leagueData));

    // which position groups the lineup has, in lineup order (QB, RB, WR, TE, ..., DL, LB, DB)
    const positions = [...new Set(slotBuckets(rosterPositions).map((b) => b.player).filter(Boolean))];

    const series = Object.fromEntries(ids.map((id) => [id, {
        place: [], wins: [], losses: [], ties: [], pfWeek: [], pfCum: [], maxWeek: [], maxCum: [],
        effWeek: [], effCum: [], allPlay: [], pos: Object.fromEntries([...positions, 'OFF', 'DEF'].map((p) => [p, []])),
    }]));
    const totals = Object.fromEntries(ids.map((id) => [id, { max: 0, apW: 0, apG: 0 }])); // max PF, all-play wins / games
    const median = [];

    weeksData.forEach((weekEntries, w) => {
        const entries = weekEntriesFor(weekEntries, ids);
        median.push(weekMedian(entries));

        for (const e of entries) {
            const id = String(e.roster_id);
            const t = totals[id], s = series[id];
            const points = entryPoints(e);
            const max = weeklyMax(e, players, leagueData);
            t.max += max;
            // all-play: beat everyone who scored less this week
            for (const o of entries) {
                if (o === e) continue;
                t.apG++;
                t.apW += points > o.points ? 1 : points === o.points ? 0.5 : 0;
            }
            s.pfWeek.push(points);
            s.maxWeek.push(max);
            s.effWeek.push(max > 0 ? (points / max) * 100 : 0);
        }

        // record, points for and standings place after this week; teams without an entry (shouldn't happen) score 0
        const rec = records[w];
        const place = seedPlaces(rec, ids, divisions, playoffTeams);
        for (const id of ids) {
            const t = totals[id], s = series[id], r = rec[id];
            if (s.pfWeek.length < w + 1) { s.pfWeek.push(0); s.maxWeek.push(0); s.effWeek.push(0); }
            s.place.push(place[id]);
            s.wins.push(r.wins); s.losses.push(r.losses); s.ties.push(r.ties);
            s.pfCum.push(r.pf); s.maxCum.push(t.max);
            s.effCum.push(t.max > 0 ? (r.pf / t.max) * 100 : 0);
            s.allPlay.push(t.apG ? (t.apW / t.apG) * 100 : 0);
        }

        // season averages per position (and offense / defense) after this week
        const sinceStart = weeksData.slice(0, w + 1).reverse(); // positionAverages wants newest first
        const avg = positionAverages(sinceStart, w + 1, rosterPositions, 'player');
        for (const id of ids) {
            const a = avg[id] ?? avg[Number(id)] ?? {};
            for (const p of positions) series[id].pos[p].push(a[p] ?? 0);
            series[id].pos.OFF.push(a.Off ?? 0);
            series[id].pos.DEF.push(a.Def ?? 0);
        }
    });

    return { weeks: Array.from({ length: n }, (_, i) => i + 1), teamIDs: ids, positions, series, median };
}

/** League average of one series per week, e.g. leagueAverage(trends, (s) => s.pos.QB). */
export function leagueAverage(trends, pick) {
    const rows = trends.teamIDs.map((id) => pick(trends.series[id]));
    return trends.weeks.map((_, w) => sum(rows.map((r) => r[w])) / (rows.length || 1));
}

/**
 * Standings place after every completed week (league seeding rule), without the heavier trend math.
 * Returns { [rosterID]: [place after week 1, after week 2, ...] }.
 */
export function placesByWeek({ matchupsData = [], rosterIDs = [], divisions = {}, leagueData = {} }) {
    const ids = rosterIDs.map(String);
    const playoffTeams = playoffTeamsOf(leagueData);
    const places = Object.fromEntries(ids.map((id) => [id, []]));
    for (const rec of runningRecords(oldestFirst(matchupsData), ids, isMedianGame(leagueData))) {
        const place = seedPlaces(rec, ids, divisions, playoffTeams);
        for (const id of ids) places[id].push(place[id]);
    }
    return places;
}

/**
 * How each team's standings place changed in one week (from the week before), given placesByWeek() output.
 * Returns null for week 1 or a week that hasn't been played, else { week, risers, fallers, held } where each item is
 * { rosterID, from, to, change } (change > 0 = moved up). Risers / fallers are biggest move first.
 */
export function movesForWeek(places, week) {
    const ids = Object.keys(places ?? {});
    const weeksPlayed = ids.length ? places[ids[0]].length : 0;
    if (!(week >= 2 && week <= weeksPlayed)) return null;
    const items = ids.map((id) => {
        const from = places[id][week - 2], to = places[id][week - 1];
        return { rosterID: id, from, to, change: from - to };
    });
    const byPlace = (a, b) => a.to - b.to;
    return {
        week,
        risers: items.filter((m) => m.change > 0).sort((a, b) => b.change - a.change || byPlace(a, b)),
        fallers: items.filter((m) => m.change < 0).sort((a, b) => a.change - b.change || byPlace(a, b)),
        held: items.filter((m) => m.change === 0).sort(byPlace),
    };
}
