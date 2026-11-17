// Trending free agents (Players page): free agents whose role is growing, from Sleeper's weekly stats for every player.
// The server route (src/routes/api/fetch_trending) trims each week to [playerID, team, snap %, league points]
// (trimWeek); the page builds the rows (trendingPlayers). Raymond's rules:
// - snaps: his team's last 2 games against its earlier games (a jump in snaps is the first sign of a bigger role)
// - points per game: the last 3 games against earlier, and a typical (median) recent game must clear the bar too,
//   so one spike week doesn't carry a normally quiet player
// - shown when snaps are up 15+ points or points per game up 4+, with 40%+ of snaps and a typical game of 5+ points
// - injury fill-in: a teammate at his position who played 55%+ of snaps earlier missed one of his recent games
// Plain functions, no site imports (tested in tests/trending.test.js).
import { groupOf, playerGroup } from './positions.js';
import { scoreStats, snapShare, isDefender } from './playerCard.js';

export const TREND_RULES = {
    snapGames: 2,
    pointGames: 3,
    minSnapJump: 15,
    minPointJump: 4,
    minRecentSnaps: 40,
    minTypicalPoints: 5,
    minEarlierGames: 2,
    starterSnaps: 55,
    shownWeeks: 6,
};

export const TREND_GROUPS = ['QB', 'RB', 'WR', 'TE', 'DL', 'LB', 'DB'];
export const OFFENSE = ['QB', 'RB', 'WR', 'TE'];

const round1 = (n) => Math.round(n * 10) / 10;
const avg = (list) => (list.length ? list.reduce((s, x) => s + x, 0) / list.length : 0);
const median = (list) => {
    if (!list.length) return 0;
    const s = [...list].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/**
 * The finished weeks of a season to read: before the week in progress during the regular season, every fantasy
 * week once the season is over (or for a past season), none before it starts.
 */
export function completedWeeks(nflState, season, lastWeek = 17) {
    const all = (n) => Array.from({ length: Math.max(0, n) }, (_, i) => i + 1);
    const nflSeason = Number(nflState?.season);
    if (Number(season) < nflSeason) return all(lastWeek);
    if (Number(season) > nflSeason) return [];
    if (nflState?.season_type === 'regular') return all(Math.min(lastWeek, (Number(nflState.week) || 1) - 1));
    if (nflState?.season_type === 'post' || nflState?.season_type === 'off') return all(lastWeek);
    return [];
}

/**
 * One week of Sleeper's weekly stats ([{ player_id, team, stats, player: { position, fantasy_positions } }]) as
 * [[playerID, team, snap %, league points]] for the players who played (offense and IDP only).
 */
export function trimWeek(entries = [], scoring = {}) {
    const rows = [];
    for (const e of entries ?? []) {
        const stats = e?.stats;
        if (!e?.player_id || !e.team || !stats || !(Number(stats.gp) > 0)) continue;
        const group = playerGroup({ pos: e.player?.position, positions: e.player?.fantasy_positions }, TREND_GROUPS);
        if (!group) continue;
        const snap = Math.min(100, snapShare(stats, group) ?? 0);
        rows.push([String(e.player_id), e.team, snap, scoreStats(stats, scoring)]);
    }
    return rows;
}

/**
 * The trimmed weeks ({ [week]: rows }) by player and team:
 * { byPlayer: { [id]: { [week]: { team, snap, pts } } }, teamWeeks: { [team]: [weeks played, ascending] }, weeks }.
 */
export function seasonSeries(weeks = {}) {
    const byPlayer = {};
    const teamWeeks = {};
    const list = Object.keys(weeks ?? {}).map(Number).sort((a, b) => a - b);
    for (const w of list) {
        for (const [id, team, snap, pts] of weeks[w] ?? []) {
            (byPlayer[id] ??= {})[w] = { team, snap, pts };
            (teamWeeks[team] ??= new Set()).add(w);
        }
    }
    for (const t of Object.keys(teamWeeks)) teamWeeks[t] = [...teamWeeks[t]].sort((a, b) => a - b);
    return { byPlayer, teamWeeks, weeks: list };
}

/** A player's games for a team: [{ week, played, snap, pts }] for every week that team played (0 when he didn't). */
export function teamLines(series, id, team) {
    const mine = series.byPlayer[String(id)] ?? {};
    return (series.teamWeeks[team] ?? []).map((week) => {
        const g = mine[week];
        return g && g.team === team ? { week, played: true, snap: g.snap, pts: g.pts } : { week, played: false, snap: 0, pts: 0 };
    });
}

/** The team a player is on now: the players map's team, else the team of his latest game. */
export function currentTeam(series, id, player) {
    if (player?.t) return player.t;
    const mine = series.byPlayer[String(id)] ?? {};
    const last = Object.keys(mine).map(Number).sort((a, b) => b - a)[0];
    return last ? mine[last].team : null;
}

/**
 * Snaps and points, recent against earlier: { snap: { earlier, recent, jump }, points: { earlier, recent, typical,
 * jump }, recentWeeks (the points window), earlierGames } or null without enough games.
 */
export function trend(lines = [], rules = TREND_RULES) {
    const { snapGames, pointGames, minEarlierGames } = rules;
    const window = Math.max(snapGames, pointGames);
    if (lines.length < window + minEarlierGames) return null;
    const snapRecent = lines.slice(-snapGames);
    const snapEarlier = lines.slice(0, -snapGames);
    const ptsRecent = lines.slice(-pointGames);
    const ptsEarlier = lines.slice(0, -pointGames);
    const snap = { earlier: round1(avg(snapEarlier.map((l) => l.snap))), recent: round1(avg(snapRecent.map((l) => l.snap))) };
    const points = {
        earlier: round1(avg(ptsEarlier.map((l) => l.pts))),
        recent: round1(avg(ptsRecent.map((l) => l.pts))),
        typical: round1(median(ptsRecent.map((l) => l.pts))),
    };
    snap.jump = round1(snap.recent - snap.earlier);
    points.jump = round1(points.recent - points.earlier);
    return { snap, points, recentWeeks: ptsRecent.map((l) => l.week), earlierGames: ptsEarlier.length };
}

/** Whether a trend makes the list. */
export const isTrendingUp = (t, rules = TREND_RULES) =>
    !!t &&
    t.snap.recent >= rules.minRecentSnaps &&
    t.points.typical >= rules.minTypicalPoints &&
    (t.snap.jump >= rules.minSnapJump || t.points.jump >= rules.minPointJump);

/**
 * Order: snap jump (per 10 points of snaps) plus how much a typical (median) recent game beats his earlier average,
 * so a single spike week can't put a player on top (the table still shows the real average).
 */
export const trendScore = (t) => t.snap.jump / 10 + (t.points.typical - t.points.earlier);

/** Same position for the injury check: same group, and the same specific position when both have one (CB vs S). */
export function samePosition(a, b) {
    const ga = groupOf(a), gb = groupOf(b);
    if (!a || !b || ga !== gb) return false;
    return a === ga || b === gb || a === b;
}

/**
 * Teammates he's filling in for: same team and position, 55%+ of snaps before his recent games, then missed at
 * least one of them. [{ id, missed: [weeks], status }], status = 'back' (played the team's latest game) or the
 * players map's injury status ('IR', 'Out', ...) or 'healthy'.
 */
export function fillIns({ id, team, pos, recentWeeks, series, players, rules = TREND_RULES }) {
    const out = [];
    if (!recentWeeks?.length) return out;
    const teamGames = series.teamWeeks[team] ?? [];
    const latest = teamGames[teamGames.length - 1];
    const first = recentWeeks[0];
    for (const [mate, games] of Object.entries(series.byPlayer)) {
        if (mate === String(id)) continue;
        const p = players?.[mate];
        if (!samePosition(pos, p?.pos ?? null)) continue;
        if (currentTeam(series, mate, p) !== team) continue;
        const lines = teamLines(series, mate, team);
        const before = lines.filter((l) => l.week < first);
        if (!before.length || avg(before.map((l) => l.snap)) < rules.starterSnaps) continue;
        const missed = lines.filter((l) => recentWeeks.includes(l.week) && !l.played).map((l) => l.week);
        if (!missed.length) continue;
        const back = games[latest]?.team === team;
        out.push({ id: mate, missed, status: back ? 'back' : p?.is ?? 'healthy', snaps: round1(avg(before.map((l) => l.snap))) });
    }
    return out.sort((a, b) => b.snaps - a.snaps);
}

/** The last `n` weeks up to the last finished one, for the bars: [{ week, bye, played, snap, pts, recent }]. */
export function shownWeeks(series, id, team, recentWeeks = [], n = TREND_RULES.shownWeeks) {
    const last = series.weeks[series.weeks.length - 1] ?? 0;
    const played = new Set(series.teamWeeks[team] ?? []);
    const mine = series.byPlayer[String(id)] ?? {};
    const out = [];
    for (let w = Math.max(1, last - n + 1); w <= last; w++) {
        const g = mine[w];
        const on = !!g && g.team === team;
        out.push({ week: w, bye: !played.has(w), played: on, snap: on ? g.snap : null, pts: on ? g.pts : null, recent: recentWeeks.includes(w) });
    }
    return out;
}

/**
 * The Trending free agents list: free agents (not on any roster) whose role is growing, best first:
 * [{ id, group, team, trend, score, weeks, fillIns, adds }]. players = the site's players map; adds = Sleeper's
 * trending adds ({ [id]: count }).
 */
export function trendingPlayers({ weeks = {}, players = {}, rostered = [], adds = {}, rules = TREND_RULES }) {
    const series = seasonSeries(weeks);
    const onRoster = new Set((rostered ?? []).map(String));
    const rows = [];
    for (const id of Object.keys(series.byPlayer)) {
        if (onRoster.has(id)) continue;
        const p = players?.[id];
        const group = playerGroup(p, TREND_GROUPS);
        if (!group) continue;
        const team = currentTeam(series, id, p);
        if (!team) continue;
        const t = trend(teamLines(series, id, team), rules);
        if (!isTrendingUp(t, rules)) continue;
        rows.push({
            id,
            group,
            team,
            trend: t,
            score: round1(trendScore(t)),
            weeks: shownWeeks(series, id, team, t.recentWeeks, rules.shownWeeks),
            fillIns: fillIns({ id, team, pos: p.pos, recentWeeks: t.recentWeeks, series, players, rules }),
            adds: adds?.[id] ?? null,
        });
    }
    return rows.sort((a, b) => b.score - a.score || b.trend.points.typical - a.trend.points.typical);
}

/** "week 9", "weeks 7–9", "weeks 7, 9". */
export function weeksLabel(weeks = []) {
    if (!weeks.length) return '';
    if (weeks.length === 1) return `week ${weeks[0]}`;
    const run = weeks.every((w, i) => i === 0 || w === weeks[i - 1] + 1);
    return run ? `weeks ${weeks[0]}–${weeks[weeks.length - 1]}` : `weeks ${weeks.join(', ')}`;
}

/** Filter chips: 'All', 'Offense', 'IDP' or one group. */
export const matchesFilter = (row, filter) =>
    filter === 'All' || (filter === 'Offense' ? OFFENSE.includes(row.group) : filter === 'IDP' ? isDefender(row.group) : row.group === filter);
