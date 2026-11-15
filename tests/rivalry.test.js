// Run with: npm test
import assert from 'assert/strict';
import { test } from 'node:test';
import { rivalryMeetings, rivalrySummary } from '../src/lib/AAA-Raymond/utils/rivalry.js';

// Ian P. (roster 1) vs Derek (roster 4): the real games, plus two other teams on the side
const week = (m, a, b, other = 3) => [
    { roster_id: 1, matchup_id: m, points: a },
    { roster_id: 4, matchup_id: m, points: b },
    { roster_id: other, matchup_id: m + 1, points: 150 },
];
const apart = (a, b) => [{ roster_id: 1, matchup_id: 1, points: a }, { roster_id: 4, matchup_id: 2, points: b }];
const season = (season, weeks, extra = {}) => ({ season, leagueID: `L${season}`, rosterA: 1, rosterB: 4, playoffWeekStart: 15, roundType: 0, weeks, winnersBracket: [], ...extra });

const seasons = [
    season(2026, { 4: apart(200, 210), 5: week(3, 274.68, 224.68), 10: week(2, 120.5, 98.1) }, { current: true, lastScored: 9, liveWeek: 10 }),
    season(2025, { 7: week(5, 238.98, 261.3) }),
    season(2024, { 1: week(1, 217.48, 231.6), 12: week(4, 198.94, 296.6), 15: [{ roster_id: 1, points: 236.38 }, { roster_id: 4, points: 345.98 }] },
        { winnersBracket: [{ m: 1, r: 1, t1: 4, t2: 1, w: 4, l: 1 }, { m: 3, r: 2, t1: 6, t2: 4 }, { m: 6, r: 3, p: 1, t1: 4, t2: 9 }] }),
    season(2023, { 3: week(2, 288.92, 287.84), 14: week(6, 215.68, 279.78), 16: [{ roster_id: 1, points: 344.02 }, { roster_id: 4, points: 240.22 }] },
        { winnersBracket: [{ m: 1, r: 1, t1: 9, t2: 3 }, { m: 3, r: 2, t1: 4, t2: 1, w: 1, l: 4 }, { m: 6, r: 3, p: 1, t1: 1, t2: 12 }] }),
    season(2022, { 9: week(1, 241.38, 227.82), 12: week(3, 230.48, 257.84) }),
    { ...season(2021, { 3: week(1, 1, 2) }), rosterB: null }, // one of them wasn't in the league
];

test('every meeting: regular season and playoff games, newest first, the live week flagged', () => {
    const m = rivalryMeetings(seasons);
    assert.deepEqual(m.map((x) => `${x.season}-${x.week}`), ['2026-10', '2026-5', '2025-7', '2024-15', '2024-12', '2024-1', '2023-16', '2023-14', '2023-3', '2022-12', '2022-9']);
    assert.equal(m[0].live, true);
    assert.equal(m[0].winner, null);
    const qf = m.find((x) => x.season === 2024 && x.kind === 'playoff');
    assert.equal(qf.label, 'Quarterfinal');
    assert.deepEqual([qf.a, qf.b, qf.winner, qf.margin], [236.38, 345.98, 'b', 109.6]);
    assert.equal(m.find((x) => x.season === 2023 && x.kind === 'playoff').label, 'Semifinal');
    assert.ok(!m.some((x) => x.season === 2026 && x.week === 4)); // they played other teams that week
});

test('the series: record, points, streak, biggest and closest (live games not counted)', () => {
    const s = rivalrySummary(rivalryMeetings(seasons));
    assert.equal(s.count, 10);
    assert.deepEqual(s.overall, { a: 4, b: 6, t: 0 });
    assert.deepEqual(s.regular, { a: 3, b: 5, t: 0 });
    assert.deepEqual(s.playoffs, { a: 1, b: 1, t: 0 });
    assert.deepEqual(s.points, { a: 2486.94, b: 2653.66 });
    assert.equal(s.last.season, 2026);
    assert.deepEqual(s.streak, { side: 'a', n: 1 });
    assert.deepEqual(s.snapped, { side: 'b', n: 4 }); // Derek had won 4 in a row
    assert.deepEqual([s.biggest.season, s.biggest.margin], [2024, 109.6]);
    assert.deepEqual([s.closest.season, s.closest.week, s.closest.margin], [2023, 3, 1.08]);
    assert.equal(s.live.week, 10);
});

test('managers who never met', () => {
    const s = rivalrySummary(rivalryMeetings([{ ...seasons[1], rosterB: 1 }]));
    assert.equal(s.count, 0);
    assert.equal(s.streak, null);
    assert.equal(s.biggest, null);
});
