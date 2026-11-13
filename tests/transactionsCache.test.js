// Run with: npm test
import assert from 'assert/strict';
import { test } from 'node:test';
import { transactionsMeta, canTopUp, latestLegs, mergeTransactions, newestFirst, TRANSACTIONS_CACHE_VERSION } from '../src/lib/AAA-Raymond/utils/transactionsCache.js';

test('refresh downloads the current and previous week only', () => {
    assert.deepEqual(latestLegs({ season_type: 'regular', week: 10 }), [10, 9]);
    assert.deepEqual(latestLegs({ season_type: 'regular', week: 1 }), [1]);
    assert.deepEqual(latestLegs({ season_type: 'post', week: 16 }), [16, 15]);
    assert.deepEqual(latestLegs({ season_type: 'off', week: 0 }), [1]);
    assert.deepEqual(latestLegs({ season_type: 'regular', week: 22 }), [18, 17]);
});

test('a saved copy is topped up only for the same league and version', () => {
    const saved = { transactions: [], meta: transactionsMeta({ leagueID: '123', now: 1 }) };
    assert.equal(canTopUp(saved, { leagueID: '123' }), true);
    assert.equal(canTopUp(saved, { leagueID: '999' }), false); // new season = new league: full download
    assert.equal(canTopUp({ ...saved, meta: { ...saved.meta, version: TRANSACTIONS_CACHE_VERSION + 1 } }, { leagueID: '123' }), false);
    assert.equal(canTopUp({ transactions: [] }, { leagueID: '123' }), false); // saved before this existed
});

test('refreshed weeks replace what was saved for them; everything else is kept, newest first', () => {
    const saved = [
        { id: 'a', league: '123', leg: 10, ts: 500 }, // edited since: comes back changed
        { id: 'b', league: '123', leg: 9, ts: 400 }, // reversed by the commissioner: gone from Sleeper
        { id: 'c', league: '123', leg: 8, ts: 300 }, // older week: kept
        { id: 'd', league: '111', leg: 10, ts: 100 }, // past season, same week number: kept
    ];
    const fresh = [
        { id: 'a', league: '123', leg: 10, ts: 500, edited: true },
        { id: 'e', league: '123', leg: 10, ts: 600 }, // new
    ];
    const merged = mergeTransactions(saved, fresh, { leagueID: '123', legs: [10, 9] });
    assert.deepEqual(merged.map((t) => t.id), ['e', 'a', 'c', 'd']);
    assert.equal(merged[1].edited, true);
});

test('moves from one waiver run keep a fixed order', () => {
    const list = [{ id: '1422991486693179392', ts: 5 }, { id: '1423582488852246528', ts: 5 }, { id: '999', ts: 9 }];
    assert.deepEqual([...list].sort(newestFirst).map((t) => t.id), ['999', '1423582488852246528', '1422991486693179392']);
    assert.deepEqual([...list].reverse().sort(newestFirst).map((t) => t.id), ['999', '1423582488852246528', '1422991486693179392']);
});
