// Run with: npm test
import assert from 'assert/strict';
import { test } from 'node:test';
import { playedWeek, groupFor, playerName, starterSlots, weekMax } from '../src/lib/AAA-Raymond/utils/seasonAwards.js';

test('a week counts once somebody has scored', () => {
    assert.deepEqual(playedWeek([{ points: 0 }, { points: 0 }]), []);
    assert.deepEqual(playedWeek(null), []);
    const week = [{ roster_id: 1, points: 10 }, { roster_id: 2, points: 0 }, { roster_id: 3 }];
    assert.deepEqual(playedWeek(week).map((e) => e.roster_id), [1, 2]);
});

test('position groups and names', () => {
    assert.equal(groupFor({ pos: 'DE' }), 'DL');
    assert.equal(groupFor({ pos: 'CB' }), 'DB');
    assert.equal(groupFor({ pos: 'LB', positions: ['LB', 'DL'] }), 'LB');
    assert.equal(groupFor(null), null);
    const players = { 1: { fn: 'Josh', ln: 'Allen' }, 2: { fn: 'Bears' }, 3: {} };
    assert.equal(playerName(players, 1), 'Josh Allen');
    assert.equal(playerName(players, 2), 'Bears');
    assert.equal(playerName(players, 3), '3'); // no name: fall back to the ID
    assert.equal(playerName(players, 'x9'), 'x9');
});

test('starting slots leave out bench, IR and taxi', () => {
    assert.deepEqual(starterSlots(['QB', 'RB', 'SUPER_FLEX', 'BN', 'BN', 'IR', 'TAXI']), ['QB', 'RB', 'SUPER_FLEX']);
    assert.deepEqual(starterSlots(), []);
});

test("a week's best possible score counts bench players, never less than what was scored", () => {
    const players = { q1: { pos: 'QB' }, q2: { pos: 'QB' }, r1: { pos: 'RB' }, r2: { pos: 'RB' } };
    const slots = ['QB', 'RB', 'BN', 'BN'];
    const entry = { players: ['q1', 'q2', 'r1', 'r2'], players_points: { q1: 10, q2: 25, r1: 8, r2: 12 }, points: 18 };
    assert.equal(weekMax(entry, players, 3, slots), 37); // q2 + r2 from the bench
    // Sleeper's own total wins if it's higher (e.g. a stat correction)
    assert.equal(weekMax({ ...entry, points: 40 }, players, 3, slots), 40);
});
