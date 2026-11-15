// Run with: npm test
import assert from 'assert/strict';
import { test } from 'node:test';
import { allPlayRecords, streakValue, streakLabel, tankathonOrder } from '../src/lib/AAA-Raymond/utils/teamStats.js';

test('streaks: Sleeper writes them either way round', () => {
    assert.equal(streakValue('3W'), 3);
    assert.equal(streakValue('W3'), 3);
    assert.equal(streakValue(' 2l '), -2);
    assert.equal(streakValue('1T'), 0);
    assert.equal(streakValue(''), 0);
    assert.equal(streakValue(null), 0);
    assert.equal(streakValue('hot'), 0);
    assert.equal(streakLabel('4W'), 'W4');
    assert.equal(streakLabel('L2'), 'L2');
    assert.equal(streakLabel(undefined), '–');
});

test('all-play: a tied score counts as half a win', () => {
    const week = [
        { roster_id: 1, matchup_id: 1, points: 100 },
        { roster_id: 2, matchup_id: 1, points: 100 },
        { roster_id: 3, matchup_id: 2, points: 90 },
        { roster_id: 4, matchup_id: 2, points: 80 },
    ];
    const r = Object.fromEntries(allPlayRecords([week]).map((x) => [x.rosterID, x]));
    assert.deepEqual([r[1].apWins, r[1].apLosses, r[1].apTies], [2, 0, 1]);
    assert.equal(r[1].expectedWins, 2.5 / 3);
    assert.deepEqual([r[1].ties, r[2].ties], [1, 1]); // their head-to-head game was a tie too
    assert.deepEqual(allPlayRecords(null), []);
});

test('Tankathon order: lowest max PF first; a max PF tie goes to lower points for', () => {
    const rows = [
        { rosterID: 1, potentialPoints: 2000, fpts: 1800 },
        { rosterID: 2, potentialPoints: 1900, fpts: 1750 },
        { rosterID: 3, potentialPoints: 2000, fpts: 1700 },
    ];
    assert.deepEqual(tankathonOrder(rows), ['2', '3', '1']);
    assert.deepEqual(tankathonOrder({}), []);
});
