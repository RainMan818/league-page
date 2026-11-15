// Run with: npm test
import assert from 'assert/strict';
import { test } from 'node:test';
import { weekSchedule, opponentFor } from '../src/lib/AAA-Raymond/utils/playerSchedule.js';

// 2026 week 9: Rams at Commanders; Pittsburgh on bye (no projection has an opponent for them)
const week9 = [
    { player_id: '1', team: 'LAR', opponent: 'WAS' },
    { player_id: '2', team: 'WAS', opponent: 'LAR' },
    { player_id: '3973', team: 'LAR', opponent: null }, // Myles Garrett, listed out that week
    { player_id: '4', team: 'PIT', opponent: null },
    { player_id: '5' }, // free agent
];

test('the week\'s schedule comes from every projection that has an opponent', () => {
    assert.deepEqual(weekSchedule(week9), { LAR: 'WAS', WAS: 'LAR' });
    assert.deepEqual(weekSchedule([]), {});
    assert.deepEqual(weekSchedule(null), {});
});

test('a missing opponent is filled from the schedule; bye weeks stay empty', () => {
    const s = weekSchedule(week9);
    assert.equal(opponentFor(week9[0], s), 'WAS'); // its own
    assert.equal(opponentFor(week9[2], s, 'LAR'), 'WAS'); // filled: Garrett vs WAS
    assert.equal(opponentFor({ opponent: null }, s, 'LAR'), 'WAS'); // no team on the entry: the player's current team
    assert.equal(opponentFor(week9[3], s, 'PIT'), null); // bye
    assert.equal(opponentFor(week9[4], s), null);
    assert.equal(opponentFor(undefined, s), null);
});
