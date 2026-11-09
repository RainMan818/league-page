// Run with: npm test
import assert from 'assert/strict';
import { test } from 'node:test';
import { parseTransactionDate, transactionSides, groupByDay, sortNewestFirst } from '../src/lib/AAA-Raymond/components/RayTransactions/transactionView.js';

const players = {
    1: { fn: 'Sam', ln: 'Roush', pos: 'TE', t: 'CHI' },
    2: { fn: 'Kyle', ln: 'Louis', pos: 'LB', t: 'MIA' },
    3: { fn: 'Josh', ln: 'Hines-Allen', pos: 'DE', t: 'JAX' },
    SF: { fn: 'San Francisco', ln: '49ers', pos: 'DEF', t: 'SF' },
};
const waiver = { id: 'w', type: 'waiver', date: 'Nov 8 2026, 7:11AM', season: 2026, rosters: [5], moves: [[{ type: 'Added', player: '1', bid: 12 }], [{ type: 'Dropped', player: '2' }]] };
const trade = {
    id: 't', type: 'trade', date: 'Oct 13 2026, 6:54AM', season: 2026, rosters: [4, 5], moves: [
        [{ type: 'trade', player: '3' }, 'origin'],
        ['origin', { type: 'trade', pick: { season: '2027', round: 4, original_owner: 2 } }],
        [{ type: 'trade', budget: { amount: 10 } }, 'origin'],
        [{ type: 'trade', player: 'SF' }, 'origin'],
    ],
};

test('dates: minutes padded, 12 AM/PM handled, bad input -> null', () => {
    const d = parseTransactionDate('Nov 4 2026, 2:6AM');
    assert.equal(d.time, '2:06 AM');
    assert.equal(d.dayLabel, 'Wed, Nov 4');
    assert.equal(parseTransactionDate('Nov 1 2026, 12:0PM').date.getHours(), 12);
    assert.equal(parseTransactionDate('Nov 1 2026, 12:5AM').date.getHours(), 0);
    assert.equal(parseTransactionDate('garbage'), null);
});

test('waiver: adds, drops and the FAAB bid', () => {
    const s = transactionSides(waiver, players);
    assert.equal(s.length, 1);
    assert.deepEqual(s[0].items.map((i) => `${i.kind}:${i.name}:${i.info}`), ['add:Sam Roush:TE · CHI', 'drop:Kyle Louis:LB · MIA']);
    assert.equal(s[0].bid, 12);
});

test('trade: what each team received (players, picks via another team, FAAB, defenses)', () => {
    const s = transactionSides(trade, players, (id) => `T${id}`);
    assert.deepEqual(s.map((x) => x.rosterID), [4, 5]);
    assert.deepEqual(s[0].items.map((i) => `${i.kind}:${i.name}:${i.info}`), ['player:Josh Hines-Allen:DE · JAX', 'budget:$10 FAAB:', 'player:San Francisco 49ers:DEF']);
    assert.deepEqual(s[1].items.map((i) => `${i.name}:${i.info}`), ['2027 4th round pick:via T2']);
});

test('grouping by day and newest-first sorting', () => {
    const g = groupByDay([waiver, { ...waiver, id: 'w2', date: 'Nov 8 2026, 6:00AM' }, trade]);
    assert.deepEqual(g.map((x) => `${x.label}:${x.items.length}`), ['Sun, Nov 8:2', 'Tue, Oct 13:1']);
    assert.deepEqual(sortNewestFirst([trade, waiver]).map((t) => t.id), ['w', 't']);
});
