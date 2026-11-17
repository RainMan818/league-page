// Run with: npm test
// Real 2026 numbers (Nov 16, week 10 live): each week's top two scores, division leaders, top players.
import assert from 'assert/strict';
import { test } from 'node:test';
import {
    PAYOUTS, weekScores, weekWinner, weeklyPrizes, highestWeek, playerTotals, ownersOf, topPlayers, divisionLeaders,
    recordText, moneyList, potSummary, weeksWon,
} from '../src/lib/AAA-Raymond/utils/payouts.js';

// roster IDs: 1 Sudbury, 3 roensb, 4 Lokked, 6 Gibbs, 7 jsamp17, 8 Lovelands, 9 Sore Winners, 11 Fergilatr, 12 Globo_Gym
const TOP2 = {
    1: [[1, 269.74], [6, 256.1]], 2: [[12, 307.28], [9, 284.44]], 3: [[9, 281], [4, 247.7]], 4: [[12, 323.74], [4, 292.4]],
    5: [[9, 321.42], [8, 280.64]], 6: [[1, 254.52], [4, 241.8]], 7: [[9, 270.9], [12, 249.5]], 8: [[12, 273.44], [4, 273.34]],
    9: [[4, 269.38], [11, 261.38]],
};
const entries = (pairs) => pairs.map(([roster_id, points]) => ({ roster_id, points }));
const FINISHED = Object.fromEntries(Object.entries(TOP2).map(([w, p]) => [w, entries(p)]));
const LIVE = { week: 10, entries: entries([[4, 322.74], [1, 263.1]]) };

test('week scores and winners (ties share the week)', () => {
    assert.deepEqual(weekScores(FINISHED[8]), [{ rosterID: '12', points: 273.44 }, { rosterID: '4', points: 273.34 }]);
    assert.deepEqual(weekWinner(FINISHED[8]), { rosterIDs: ['12'], points: 273.44 });
    assert.deepEqual(weekWinner(entries([[1, 200], [2, 200], [3, 150]])), { rosterIDs: ['1', '2'], points: 200 });
    assert.equal(weekWinner(entries([[1, 0], [2, 0]])), null); // week not played yet
    assert.equal(weekWinner([]), null);
});

test('weekly prizes: paid weeks, the live week, the rest upcoming', () => {
    const w = weeklyPrizes({ finished: FINISHED, live: LIVE, regularSeasonLength: 14 });
    assert.equal(w.length, 14);
    assert.deepEqual(w.map((x) => x.status[0]).join(''), 'pppppppppluuuu');
    assert.deepEqual(w.slice(0, 9).map((x) => x.rosterIDs[0]), ['1', '12', '9', '12', '9', '1', '9', '12', '4']);
    assert.deepEqual(w[9], { week: 10, status: 'live', rosterIDs: ['4'], points: 322.74 });
    assert.equal(weeklyPrizes({ finished: FINISHED, regularSeasonLength: 14 })[9].status, 'upcoming');
});

test('highest single week: final regular-season weeks only (the live 322.74 doesn\'t count yet)', () => {
    assert.deepEqual(highestWeek(FINISHED, 14), { rosterID: '12', week: 4, points: 323.74 });
    assert.deepEqual(highestWeek({ ...FINISHED, 15: entries([[3, 400]]) }, 14), { rosterID: '12', week: 4, points: 323.74 }); // playoff week
    assert.deepEqual(highestWeek({ 2: entries([[5, 300]]), 1: entries([[6, 300]]) }, 14), { rosterID: '6', week: 1, points: 300 }); // tie: first to do it
    assert.equal(highestWeek({}, 14), null);
});

test('player totals and the top rostered players by side of the ball', () => {
    const weeks = {
        8: [['jsn', 'SEA', 90, 30], ['gibbs', 'DET', 80, 25], ['allen', 'BUF', 100, 20], ['rousseau', 'BUF', 85, 15], ['fa', 'NYJ', 70, 99], ['cash', 'MIN', 100, 18]],
        9: [['jsn', 'SEA', 90, 20.36], ['gibbs', 'DET', 80, 20], ['allen', 'BUF', 100, 29], ['rousseau', 'BUF', 85, 12], ['cash', 'MIN', 100, 8]],
        15: [['allen', 'BUF', 100, 50]], // playoffs: not regular season
    };
    const totals = playerTotals(weeks, 14);
    assert.deepEqual(totals, { jsn: 50.36, gibbs: 45, allen: 49, rousseau: 27, fa: 99, cash: 26 });
    const players = { jsn: { pos: 'WR' }, gibbs: { pos: 'RB' }, allen: { pos: 'QB' }, rousseau: { pos: 'DL' }, fa: { pos: 'WR' }, cash: { pos: 'LB' } };
    const owners = ownersOf({ 9: { roster_id: 9, players: ['jsn'] }, 6: { roster_id: 6, players: ['gibbs'] }, 7: { roster_id: 7, players: ['allen', 'cash'] }, 3: { roster_id: 3, players: ['rousseau'] } });
    const off = topPlayers({ totals, players, owners, groups: ['QB', 'RB', 'WR', 'TE'], n: 3 });
    assert.deepEqual(off.map((p) => `${p.id}:${p.rosterID}:${p.points}`), ['jsn:9:50.36', 'allen:7:49', 'gibbs:6:45']); // the free agent's 99 doesn't count
    const idp = topPlayers({ totals, players, owners, groups: ['DL', 'LB', 'DB'] });
    assert.deepEqual(idp.map((p) => `${p.id}:${p.group}`), ['rousseau:DL', 'cash:LB']);
});

test('division leaders, in division order, with records', () => {
    const leaders = divisionLeaders([
        { id: '4', division: 3, wins: 15, losses: 3, ties: 0 },
        { id: '6', division: 2, wins: 13, losses: 5, ties: 0 },
        { rosterID: 1, division: 1, wins: 11, losses: 7, ties: 0 },
    ]);
    assert.deepEqual(leaders.map((d) => `D${d.division}:${d.rosterID}:${recordText(d)}`), ['D1:1:11-7', 'D2:6:13-5', 'D3:4:15-3']);
    assert.equal(recordText({ wins: 11, losses: 6, ties: 1 }), '11-6-1');
});

test('money list: only prizes already paid, biggest first', () => {
    const weekly = weeklyPrizes({ finished: FINISHED, live: LIVE, regularSeasonLength: 14 });
    const during = moneyList({ weekly, regularDone: false, high: { rosterID: '12' }, topOffense: { rosterID: '9' }, divisions: [{ division: 1, rosterID: '1' }] });
    assert.deepEqual(during.map((t) => `${t.rosterID}:$${t.amount}`), ['12:$30', '9:$30', '1:$20', '4:$10']);
    assert.equal(weeksWon(during[0].prizes), '3 weeks (2, 4, 8)');
    assert.deepEqual(potSummary({ money: during, regularSeasonLength: 14, divisionCount: 3 }), { paid: 90, total: 240 });

    // after the regular season: the season prizes are paid too; a tied week splits its $10
    const tied = [...weekly.slice(0, 9), { week: 10, status: 'paid', rosterIDs: ['4', '1'], points: 300 }];
    const after = moneyList({
        weekly: tied, regularDone: true, high: { rosterID: '12', week: 4, points: 323.74 }, topOffense: { rosterID: '9' }, topIdp: { rosterID: '3' },
        divisions: [{ division: 1, rosterID: '1' }, { division: 2, rosterID: '6' }, { division: 3, rosterID: '4' }], toilet: 10,
    });
    const by = Object.fromEntries(after.map((t) => [t.rosterID, t.amount]));
    assert.deepEqual(by, { 12: 40, 9: 40, 1: 45, 4: 35, 6: 20, 3: 10, 10: 10 });
    assert.equal(after[0].rosterID, '1');
    assert.equal(potSummary({ money: after }).paid, 200);
    assert.equal(PAYOUTS.division, 20);
});
