// Run with: npm test
import assert from 'assert/strict';
import { test } from 'node:test';
import { leagueTrends, weekResults, weekMedian, weeklyMax, leagueAverage } from '../src/lib/AAA-Raymond/utils/leagueTrends.js';

// tiny league: 4 teams, lineup QB + RB + DL, one bench spot, median game on, 2 playoff teams, 2 divisions
const leagueData = { roster_positions: ['QB', 'RB', 'DL', 'BN'], settings: { league_average_match: 1, playoff_teams: 2 } };
const players = {
    q1: { pos: 'QB' }, q2: { pos: 'QB' }, q3: { pos: 'QB' }, q4: { pos: 'QB' },
    r1: { pos: 'RB' }, r2: { pos: 'RB' }, r3: { pos: 'RB' }, r4: { pos: 'RB' }, rb5: { pos: 'RB' },
    d1: { pos: 'DE' }, d2: { pos: 'DT' }, d3: { pos: 'DL' }, d4: { pos: 'DE' },
};
// entry helper: starters QB, RB, DL with their points; optional bench player
const e = (id, m, [q, r, d], bench) => {
    const starters = [`q${id}`, `r${id}`, `d${id}`];
    const players_points = { [`q${id}`]: q, [`r${id}`]: r, [`d${id}`]: d };
    const roster = [...starters];
    if (bench) { players_points[bench.id] = bench.pts; roster.push(bench.id); }
    return { roster_id: id, matchup_id: m, points: q + r + d, starters, starters_points: [q, r, d], players: roster, players_points };
};
// week 1: 1 (30) beats 2 (20); 3 (25) beats 4 (10). Team 1 left 15 points on the bench at RB.
const week1 = [e(1, 1, [10, 10, 10], { id: 'rb5', pts: 25 }), e(2, 1, [10, 5, 5]), e(3, 2, [10, 10, 5]), e(4, 2, [5, 3, 2])];
// week 2: 2 (40) beats 3 (12); 4 (35) beats 1 (15)
const week2 = [e(1, 2, [5, 5, 5]), e(2, 1, [20, 10, 10]), e(3, 1, [4, 4, 4]), e(4, 2, [15, 10, 10])];
const matchupsData = [week2, week1]; // newest first, like standings.matchups
const divisions = { 1: 1, 2: 1, 3: 2, 4: 2 };

test('week results include the median game (top half wins)', () => {
    const r = weekResults(week1, { medianGame: true });
    assert.deepEqual(r['1'], { wins: 2, losses: 0, ties: 0 }); // 30: beat 2 and above median 22.5
    assert.deepEqual(r['2'], { wins: 0, losses: 2, ties: 0 }); // 20: below median
    assert.deepEqual(r['3'], { wins: 2, losses: 0, ties: 0 });
    assert.deepEqual(r['4'], { wins: 0, losses: 2, ties: 0 });
    assert.equal(weekMedian(week1), 22.5);
    assert.deepEqual(weekResults(week1)['1'], { wins: 1, losses: 0, ties: 0 }); // without the median game
});

test('max PF uses the best lineup from everyone rostered, never below the actual score', () => {
    assert.equal(weeklyMax(week1[0], players, leagueData), 45); // 10 QB + 25 bench RB + 10 DL
    assert.equal(weeklyMax(week1[1], players, leagueData), 20);
});

test('season series by week', () => {
    const t = leagueTrends({ matchupsData, rosterIDs: [1, 2, 3, 4], divisions, leagueData, players });
    assert.deepEqual(t.weeks, [1, 2]);
    assert.deepEqual(t.positions, ['QB', 'RB', 'DL']);
    assert.deepEqual(t.median, [22.5, 25]);
    const s1 = t.series['1'], s2 = t.series['2'], s4 = t.series['4'];
    assert.deepEqual(s1.wins, [2, 2]); // week 2: lost to 4, below the median 25
    assert.deepEqual(s1.losses, [0, 2]);
    assert.deepEqual(s2.wins, [0, 2]);
    assert.deepEqual(s1.pfWeek, [30, 15]);
    assert.deepEqual(s1.pfCum, [30, 45]);
    assert.deepEqual(s1.maxWeek, [45, 15]);
    assert.deepEqual(s1.maxCum, [45, 60]);
    assert.deepEqual(s1.effWeek.map((v) => Math.round(v)), [67, 100]);
    assert.equal(Math.round(s1.effCum[1]), 75);
    // all-play: week 1 team 1 beat all 3, week 2 beat only team 3 -> 4 of 6
    assert.deepEqual(s1.allPlay.map((v) => Math.round(v)), [100, 67]);
    assert.deepEqual(s4.allPlay.map((v) => Math.round(v)), [0, 33]); // week 2 beat teams 1 and 3 -> 2 of 6
});

test('standings place follows the league seeding rule each week', () => {
    const t = leagueTrends({ matchupsData, rosterIDs: [1, 2, 3, 4], divisions, leagueData, players });
    // week 1: division leaders 1 (2-0, 30 PF) and 3 (2-0, 25 PF) take the top seeds
    assert.deepEqual([1, 2, 3, 4].map((id) => t.series[id].place[0]), [1, 3, 2, 4]);
    // week 2: everyone 2-2. Division 1: team 2 (60 PF) leads; division 2: team 4 (45 PF) beats team 3 (37 PF)
    assert.deepEqual([1, 2, 3, 4].map((id) => t.series[id].place[1]), [3, 1, 4, 2]);
});

test('position, offense and defense averages accumulate week by week', () => {
    const t = leagueTrends({ matchupsData, rosterIDs: [1, 2, 3, 4], divisions, leagueData, players });
    const p = t.series['2'].pos;
    assert.deepEqual(p.QB, [10, 15]);
    assert.deepEqual(p.RB, [5, 7.5]);
    assert.deepEqual(p.DL, [5, 7.5]);
    assert.deepEqual(p.OFF, [15, 22.5]);
    assert.deepEqual(p.DEF, [5, 7.5]);
    assert.deepEqual(leagueAverage(t, (s) => s.pos.QB), [8.75, 9.875]); // (7.5 + 15 + 7 + 10) / 4 after week 2
});

test('no completed weeks gives empty series', () => {
    const t = leagueTrends({ matchupsData: [], rosterIDs: [1, 2], leagueData, players });
    assert.deepEqual(t.weeks, []);
    assert.deepEqual(t.series['1'].place, []);
});

// chart helpers used by the Trends page
import { spreadLabels, niceTicks, nearestIndex, scales } from '../src/lib/AAA-Raymond/components/RayTrends/chartGeometry.js';

test('end labels never overlap and stay inside the chart', () => {
    const ys = spreadLabels([100, 101, 102, 300, 299], { gap: 13, floor: 305, ceil: 10 });
    const sorted = [...ys].sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) assert.ok(sorted[i] - sorted[i - 1] >= 13 - 1e-9);
    assert.ok(Math.max(...ys) <= 305);
    assert.equal(ys[0], 100); // the first label stays level with its line
});

test('nice axis ticks', () => {
    assert.deepEqual(niceTicks(0, 1981), { min: 0, max: 2000, ticks: [0, 500, 1000, 1500, 2000] });
    assert.deepEqual(niceTicks(62, 97).ticks, [60, 70, 80, 90, 100]);
    const { X } = scales({ w: 100, h: 50, pad: { l: 0, r: 0, t: 0, b: 0 }, n: 5, min: 0, max: 1 });
    assert.equal(nearestIndex(60, X, 5), 2);
});

import { placesByWeek, movesForWeek } from '../src/lib/AAA-Raymond/utils/leagueTrends.js';

test('placesByWeek matches the full trend series', () => {
    const t = leagueTrends({ matchupsData, rosterIDs: [1, 2, 3, 4], divisions, leagueData, players });
    const p = placesByWeek({ matchupsData, rosterIDs: [1, 2, 3, 4], divisions, leagueData });
    for (const id of ['1', '2', '3', '4']) assert.deepEqual(p[id], t.series[id].place);
});

test('standings moves for a week', () => {
    const places = placesByWeek({ matchupsData, rosterIDs: [1, 2, 3, 4], divisions, leagueData });
    // week 1 places 1,3,2,4 -> week 2 places 3,1,4,2 (see the seeding test above)
    const m = movesForWeek(places, 2);
    assert.equal(m.week, 2);
    assert.deepEqual(m.risers.map((x) => [x.rosterID, x.change]), [['2', 2], ['4', 2]]);
    assert.deepEqual(m.fallers.map((x) => [x.rosterID, x.from, x.to]), [['1', 1, 3], ['3', 2, 4]]);
    assert.deepEqual(m.held, []);
    assert.equal(movesForWeek(places, 1), null); // nothing to compare week 1 with
    assert.equal(movesForWeek(places, 3), null); // not played
    assert.equal(movesForWeek({}, 2), null);
});
