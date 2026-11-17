// Run with: npm test
// Weeks modeled on the real Nov 15 2026 data (Sleeper weekly stats, weeks 4-9): Isaiah McDuffie (GB LB) took over
// when Zaire Franklin went out in week 7.
import assert from 'assert/strict';
import { test } from 'node:test';
import {
    completedWeeks, trimWeek, seasonSeries, teamLines, trend, isTrendingUp, samePosition, fillIns, shownWeeks,
    trendingPlayers, weeksLabel, matchesFilter, TREND_RULES, bestAvailable, BEST_RULES,
} from '../src/lib/AAA-Raymond/utils/trending.js';

// [id, team, snap %, points] per week; GB has a bye in week 5 here
const WEEKS = {
    4: [['mcduffie', 'GB', 40, 2.5], ['franklin', 'GB', 100, 12], ['spike', 'GB', 50, 1], ['nyj', 'NYJ', 60, 5], ['cb1', 'NYJ', 100, 6]],
    5: [['nyj', 'NYJ', 62, 5], ['cb1', 'NYJ', 100, 6], ['s1', 'NYJ', 30, 2]],
    6: [['mcduffie', 'GB', 55, 5], ['franklin', 'GB', 100, 10], ['spike', 'GB', 52, 2], ['nyj', 'NYJ', 61, 6], ['cb1', 'NYJ', 100, 7], ['s1', 'NYJ', 35, 2]],
    7: [['mcduffie', 'GB', 100, 14], ['spike', 'GB', 50, 30], ['nyj', 'NYJ', 60, 5], ['s1', 'NYJ', 40, 6]],
    8: [['mcduffie', 'GB', 100, 6.5], ['spike', 'GB', 48, 1], ['nyj', 'NYJ', 63, 6], ['s1', 'NYJ', 45, 6], ['cb1', 'NYJ', 100, 8]],
    9: [['mcduffie', 'GB', 95, 24.5], ['spike', 'GB', 51, 2], ['nyj', 'NYJ', 60, 5], ['s1', 'NYJ', 90, 9]],
};
const PLAYERS = {
    mcduffie: { fn: 'Isaiah', ln: 'McDuffie', pos: 'LB', t: 'GB' },
    franklin: { fn: 'Zaire', ln: 'Franklin', pos: 'LB', t: 'GB', is: 'Out' },
    spike: { fn: 'One', ln: 'Week', pos: 'LB', t: 'GB' },
    nyj: { fn: 'Steady', ln: 'Guy', pos: 'WR', t: 'NYJ' },
    cb1: { fn: 'Corner', ln: 'Back', pos: 'CB', t: 'NYJ' },
    s1: { fn: 'Safety', ln: 'Valve', pos: 'S', t: 'NYJ' },
};

test('finished weeks: before the week in progress, all of a past season, none before it starts', () => {
    assert.deepEqual(completedWeeks({ season: '2026', season_type: 'regular', week: 10 }, '2026', 17), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
    assert.deepEqual(completedWeeks({ season: '2026', season_type: 'regular', week: 1 }, '2026', 17), []);
    assert.equal(completedWeeks({ season: '2026', season_type: 'off', week: 18 }, '2026', 17).length, 17);
    assert.equal(completedWeeks({ season: '2027', season_type: 'pre', week: 1 }, '2026', 17).length, 17);
    assert.deepEqual(completedWeeks({ season: '2026', season_type: 'pre', week: 1 }, '2026', 17), []);
});

test('trimming a week: players who played, snap share on their side of the ball, league points', () => {
    const scoring = { idp_tkl_solo: 1, idp_tkl_ast: 0.5, rec: 0.5, rec_yd: 0.1 };
    const rows = trimWeek([
        { player_id: '7782', team: 'GB', stats: { gp: 1, def_snp: 57, tm_def_snp: 60, idp_tkl_solo: 8, idp_tkl_ast: 4 }, player: { position: 'LB', fantasy_positions: ['LB'] } },
        { player_id: '1', team: 'NYJ', stats: { gp: 1, off_snp: 70, tm_off_snp: 70, rec: 4, rec_yd: 50 }, player: { position: 'WR' } },
        { player_id: '2', team: 'NYJ', stats: { gp: 0, tm_off_snp: 70 }, player: { position: 'WR' } }, // inactive
        { player_id: '3', team: 'NYJ', stats: { gp: 1, xpm: 3 }, player: { position: 'K' } }, // kicker
        { player_id: '4', team: 'TB', stats: { gp: 1, def_snp: 71, tm_def_snp: 70 }, player: { position: 'DB' } }, // Sleeper's 101%
    ], scoring);
    assert.deepEqual(rows, [['7782', 'GB', 95, 10], ['1', 'NYJ', 100, 7], ['4', 'TB', 100, 0]]);
});

test('series by player and team; a player\'s lines count missed games as zero', () => {
    const s = seasonSeries(WEEKS);
    assert.deepEqual(s.teamWeeks.GB, [4, 6, 7, 8, 9]); // GB bye in week 5
    assert.deepEqual(s.weeks, [4, 5, 6, 7, 8, 9]);
    assert.deepEqual(teamLines(s, 'franklin', 'GB').map((l) => (l.played ? l.snap : '-')), [100, 100, '-', '-', '-']);
});

test('trend: snaps over the last 2 games, points over the last 3 with a typical game', () => {
    const s = seasonSeries(WEEKS);
    const t = trend(teamLines(s, 'mcduffie', 'GB'));
    assert.deepEqual(t.snap, { earlier: 65, recent: 97.5, jump: 32.5 });
    assert.deepEqual(t.points, { earlier: 3.8, recent: 15, typical: 14, jump: 11.2 });
    assert.deepEqual(t.recentWeeks, [7, 8, 9]);
    assert.equal(isTrendingUp(t), true);
    // one 30-point week: points per game jumps, but a typical recent game is 2 points and snaps are flat
    const spike = trend(teamLines(s, 'spike', 'GB'));
    assert.equal(spike.points.jump, 9.5);
    assert.equal(spike.points.typical, 2);
    assert.equal(isTrendingUp(spike), false);
    // steady player: nothing changes
    assert.equal(isTrendingUp(trend(teamLines(s, 'nyj', 'NYJ'))), false);
    // too few games to compare
    assert.equal(trend(teamLines(s, 'mcduffie', 'GB').slice(0, 4)), null);
});

test('same position: same group, and cornerbacks aren\'t safeties', () => {
    assert.equal(samePosition('LB', 'LB'), true);
    assert.equal(samePosition('DB', 'CB'), true);
    assert.equal(samePosition('CB', 'S'), false);
    assert.equal(samePosition('DE', 'DT'), false);
    assert.equal(samePosition('LB', 'DB'), false);
    assert.equal(samePosition('WR', null), false);
});

test('injury fill-ins: the starter who missed his recent games, with the starter\'s status', () => {
    const s = seasonSeries(WEEKS);
    const f = fillIns({ id: 'mcduffie', team: 'GB', pos: 'LB', recentWeeks: [7, 8, 9], series: s, players: PLAYERS });
    assert.deepEqual(f, [{ id: 'franklin', missed: [7, 8, 9], status: 'Out', snaps: 100 }]);
    // the safety took over snaps, but the cornerback who missed weeks 7 and 9 plays another position
    assert.deepEqual(fillIns({ id: 's1', team: 'NYJ', pos: 'S', recentWeeks: [7, 8, 9], series: s, players: PLAYERS }), []);
    // the same cornerback seen from another corner: missed 7 and 9, played week 8, not back for the latest game
    const cb2 = fillIns({ id: 'x', team: 'NYJ', pos: 'CB', recentWeeks: [7, 8, 9], series: s, players: PLAYERS });
    assert.deepEqual(cb2.map((x) => `${x.id}:${x.missed.join(',')}:${x.status}`), ['cb1:7,9:healthy']);
    // back for the latest game
    const back = { ...WEEKS, 9: [...WEEKS[9], ['franklin', 'GB', 90, 8]] };
    const s2 = seasonSeries(back);
    assert.equal(fillIns({ id: 'mcduffie', team: 'GB', pos: 'LB', recentWeeks: [7, 8, 9], series: s2, players: { ...PLAYERS, franklin: { ...PLAYERS.franklin, is: null } } })[0].status, 'back');
});

test('bars: the last weeks with byes and missed games, recent games marked', () => {
    const s = seasonSeries(WEEKS);
    const w = shownWeeks(s, 'mcduffie', 'GB', [7, 8, 9], 6);
    assert.deepEqual(w.map((x) => (x.bye ? 'bye' : x.played ? `${x.snap}${x.recent ? '*' : ''}` : '-')), ['40', 'bye', '55', '100*', '100*', '95*']);
});

test('the list: free agents only, trending up, best first, with fill-ins and Sleeper adds', () => {
    const rows = trendingPlayers({ weeks: WEEKS, players: PLAYERS, rostered: ['franklin', 'nyj'], adds: { mcduffie: 1234 } });
    assert.deepEqual(rows.map((r) => r.id), ['mcduffie', 's1']);
    assert.equal(rows[0].group, 'LB');
    assert.equal(rows[0].adds, 1234);
    assert.deepEqual(rows[0].fillIns.map((f) => f.id), ['franklin']);
    assert.ok(rows[0].score > rows[1].score);
    assert.equal(rows[0].score, 13.5); // 32.5 snap jump / 10 + (14 typical - 3.8 earlier) = 13.45
    assert.deepEqual(trendingPlayers({ weeks: WEEKS, players: PLAYERS, rostered: ['mcduffie', 's1'] }).map((r) => r.id), []);
    assert.equal(TREND_RULES.snapGames, 2);
    assert.equal(TREND_RULES.pointGames, 3);
});

test('labels and filters', () => {
    assert.equal(weeksLabel([9]), 'week 9');
    assert.equal(weeksLabel([7, 8, 9]), 'weeks 7–9');
    assert.equal(weeksLabel([7, 9]), 'weeks 7, 9');
    assert.equal(weeksLabel([]), '');
    const lb = { group: 'LB' }, wr = { group: 'WR' };
    assert.equal(matchesFilter(lb, 'All'), true);
    assert.equal(matchesFilter(lb, 'IDP'), true);
    assert.equal(matchesFilter(lb, 'Offense'), false);
    assert.equal(matchesFilter(wr, 'Offense'), true);
    assert.equal(matchesFilter(wr, 'WR'), true);
    assert.equal(matchesFilter(wr, 'TE'), false);
});

test('best available: free agents on an NFL team, by total or per game (3+ games)', () => {
    const players = { ...PLAYERS, gone: { fn: 'No', ln: 'Team', pos: 'WR', t: null }, two: { fn: 'Two', ln: 'Games', pos: 'WR', t: 'NYJ' } };
    const weeks = { ...WEEKS, 8: [...WEEKS[8], ['gone', 'NYJ', 90, 40], ['two', 'NYJ', 80, 20]], 9: [...WEEKS[9], ['two', 'NYJ', 85, 22]] };
    const total = bestAvailable({ weeks, players, rostered: ['franklin'], adds: { nyj: 50 } });
    assert.deepEqual(total.map((r) => `${r.id}:${r.points}`), ['mcduffie:52.5', 'two:42', 'spike:36', 'nyj:32', 'cb1:27', 's1:25']);
    assert.ok(!total.some((r) => r.id === 'franklin' || r.id === 'gone')); // rostered / no NFL team
    const m = total[0];
    assert.deepEqual({ games: m.games, perGame: m.perGame, recent: m.recent, snaps: m.snaps }, { games: 5, perGame: 10.5, recent: 15, snaps: 98 });
    assert.deepEqual(m.weeks.filter((w) => w.recent).map((w) => w.week), [7, 8, 9]);
    assert.equal(total.find((r) => r.id === 'nyj').adds, 50);
    const perGame = bestAvailable({ weeks, players, rostered: ['franklin'], sort: 'perGame' });
    assert.deepEqual(perGame.map((r) => `${r.id}:${r.perGame}`), ['mcduffie:10.5', 'spike:7.2', 'cb1:6.8', 'nyj:5.3', 's1:5']); // 'two' has 2 games
    assert.equal(BEST_RULES.minGamesPerGame, 3);
});
