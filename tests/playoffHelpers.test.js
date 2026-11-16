// Run with: npm test
import assert from 'assert/strict';
import { test } from 'node:test';
import { seedOrder, bracketRounds, byeCount, rankTeams, weeklyScores } from '../src/lib/AAA-Raymond/utils/playoffs.js';

test('bracket order and byes', () => {
    assert.deepEqual(seedOrder(4), [1, 4, 2, 3]);
    assert.deepEqual(seedOrder(8), [1, 8, 4, 5, 2, 7, 3, 6]);
    assert.equal(byeCount(6), 2);
    assert.equal(byeCount(8), 0);
    assert.equal(byeCount(1), 1); // never less than a 2-team bracket
});

test('a 6-team bracket: two wild-card games, the top two seeds wait', () => {
    const rounds = bracketRounds(6);
    assert.equal(rounds.length, 3);
    assert.deepEqual(rounds[0].map((g) => [g.top.seed, g.bottom.seed]), [[4, 5], [3, 6]]);
    // seed 1 meets the 4/5 winner, seed 2 the 3/6 winner
    assert.deepEqual(rounds[1].map((g) => [g.top.seed ?? g.top.seeds, g.bottom.seed ?? g.bottom.seeds]), [[1, [4, 5]], [2, [3, 6]]]);
    assert.deepEqual(rounds[2][0].seeds.sort((a, b) => a - b), [1, 2, 3, 4, 5, 6]);
});

test('ranking: wins (a tie is half), then points for', () => {
    const teams = [
        { rosterID: 1, wins: 8, losses: 6, ties: 0, fpts: 2000 },
        { rosterID: 2, wins: 8, losses: 5, ties: 1, fpts: 1500 },
        { rosterID: 3, wins: 8, losses: 6, ties: 0, fpts: 2100 },
    ];
    assert.deepEqual(rankTeams(teams).map((t) => t.rosterID), [2, 3, 1]);
    assert.deepEqual(teams.map((t) => t.rosterID), [1, 2, 3]); // input left alone
});

test('weekly scores skip weeks nobody has played yet', () => {
    const scores = weeklyScores([
        [{ roster_id: 1, points: 120.5 }, { roster_id: 2, points: 98 }],
        [{ roster_id: 1, points: 0 }, { roster_id: 2, points: 0 }], // not played
        [{ roster_id: 1, points: 101 }, { roster_id: 2, points: 0 }, { roster_id: 3 }], // 2 scored 0; 3 has no points
    ]);
    assert.deepEqual(scores, { 1: [120.5, 101], 2: [98, 0] });
});
