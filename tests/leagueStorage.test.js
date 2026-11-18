// Run with: npm test
import assert from 'assert/strict';
import { test } from 'node:test';
import { leagueKey, readLeagueItem, writeLeagueItem, playersBelongTo } from '../src/lib/AAA-Raymond/utils/leagueStorage.js';

const memory = (init = {}) => {
    const m = new Map(Object.entries(init));
    return {
        getItem: (k) => (m.has(k) ? m.get(k) : null),
        setItem: (k, v) => m.set(k, String(v)),
        removeItem: (k) => m.delete(k),
        keys: () => [...m.keys()].sort(),
    };
};

test('each league has its own entry', () => {
    const s = memory();
    assert.equal(leagueKey('records', '123'), 'records:123');
    assert.equal(writeLeagueItem(s, 'records', 'A', { n: 1 }), true);
    writeLeagueItem(s, 'records', 'B', { n: 2 });
    assert.deepEqual(readLeagueItem(s, 'records', 'A'), { n: 1 });
    assert.deepEqual(readLeagueItem(s, 'records', 'B'), { n: 2 });
    assert.equal(readLeagueItem(s, 'records', 'C'), null);
});

test('an old shared copy moves to the league it belongs to, and stays put for another league', () => {
    const old = JSON.stringify({ meta: { leagueID: 'A' }, transactions: [1] });
    const belongs = (v) => v?.meta?.leagueID === 'B';
    const s = memory({ transactions: old });
    assert.equal(readLeagueItem(s, 'transactions', 'B', { belongs }), null);
    assert.deepEqual(s.keys(), ['transactions']); // still there for league A
    const own = (v) => v?.meta?.leagueID === 'A';
    assert.deepEqual(readLeagueItem(s, 'transactions', 'A', { belongs: own }).transactions, [1]);
    assert.deepEqual(s.keys(), ['transactions:A']);
});

test('an old shared copy that can\'t be told apart is dropped when asked', () => {
    const s = memory({ records: '{"playoffData":{}}' });
    assert.equal(readLeagueItem(s, 'records', 'A', { dropShared: true }), null);
    assert.deepEqual(s.keys(), []);
});

test('broken or blocked storage reads as nothing saved', () => {
    assert.equal(readLeagueItem(memory({ 'records:A': '{oops' }), 'records', 'A'), null);
    assert.equal(readLeagueItem(null, 'records', 'A'), null);
    assert.equal(writeLeagueItem(null, 'records', 'A', {}), false);
    const full = { ...memory(), setItem: () => { throw new Error('QuotaExceededError'); } };
    assert.equal(writeLeagueItem(full, 'records', 'A', {}), false);
});

test('player data counts only for the league it was saved for', () => {
    assert.equal(playersBelongTo('A', 'A'), true);
    assert.equal(playersBelongTo(123, '123'), true);
    assert.equal(playersBelongTo('A', 'B'), false);
    assert.equal(playersBelongTo(null, 'A'), false); // saved before the tag
});
