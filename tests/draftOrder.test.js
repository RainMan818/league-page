// Run with: npm test
import assert from 'assert/strict';
import { test } from 'node:test';
import { playoffPlaces, leagueDraftOrder, teamsFromRosters, toiletBowlWinner, bracketIsSet } from '../src/lib/AAA-Raymond/utils/draftOrder.js';

// 12 teams, 3 divisions; this season's standings after week 9 (max PF = potentialPoints)
const T = (rosterID, wins, losses, fpts, potentialPoints, division) => ({ rosterID, wins, losses, ties: 0, fpts, potentialPoints, division });
const teams = [
    T('lokk', 15, 3, 2251.2, 2674.1, 3), T('globo', 14, 4, 2293.1, 2886.3, 3), T('gibbs', 13, 5, 2093.8, 2539.9, 2),
    T('roens', 12, 6, 2114.5, 2474.3, 3), T('sud', 11, 7, 2083.7, 2689.7, 1), T('sore', 10, 8, 2194.3, 2823.5, 1),
    T('jsamp', 8, 10, 1932.2, 2387.0, 1), T('xav', 7, 11, 1832.2, 2199.7, 1), T('jordan', 6, 12, 1872.0, 2306.7, 2),
    T('fergi', 4, 14, 1768.6, 1910.6, 2), T('lucien', 4, 14, 1757.8, 2036.6, 3), T('oscar', 4, 14, 1662.5, 1998.0, 2),
];

test('draft order: non-playoff teams by max PF, playoff teams projected by seed', () => {
    const { order, seeds } = leagueDraftOrder(teams, { playoffTeams: 6 });
    // seeds: 1 lokk, 2 gibbs, 3 sud (division winners), 4 globo, 5 roens (records), 6 sore (points)
    assert.deepEqual([seeds.lokk, seeds.gibbs, seeds.sud, seeds.globo, seeds.roens, seeds.sore], [1, 2, 3, 4, 5, 6]);
    assert.deepEqual(order, ['fergi', 'oscar', 'lucien', 'xav', 'jordan', 'jsamp', 'roens', 'sore', 'sud', 'globo', 'gibbs', 'lokk']);
});

// 6-team bracket with byes for seeds 1-2 (Sleeper shape)
const bracket = (w = {}) => [
    { r: 1, m: 1, t1: 'sud', t2: 'sore', w: w[1] ?? null },
    { r: 1, m: 2, t1: 'globo', t2: 'roens', w: w[2] ?? null },
    { r: 2, m: 3, t1: 'lokk', t2_from: { w: 2 }, w: w[3] ?? null },
    { r: 2, m: 4, t1: 'gibbs', t2_from: { w: 1 }, w: w[4] ?? null },
    { r: 2, m: 5, t1_from: { l: 1 }, t2_from: { l: 2 }, p: 5, w: w[5] ?? null },
    { r: 3, m: 6, t1_from: { w: 3 }, t2_from: { w: 4 }, p: 1, w: w[6] ?? null },
    { r: 3, m: 7, t1_from: { l: 3 }, t2_from: { l: 4 }, p: 3, w: w[7] ?? null },
];

test('playoff places: real results where played, the better seed otherwise', () => {
    const seeds = { lokk: 1, gibbs: 2, sud: 3, globo: 4, roens: 5, sore: 6 };
    assert.deepEqual(playoffPlaces(bracket(), seeds), { lokk: 1, gibbs: 2, sud: 3, globo: 4, roens: 5, sore: 6 });
    // 6 seed upsets the 3 seed in round 1: sore plays on (projected 4th), sud drops to the 5th place game
    const upset = playoffPlaces(bracket({ 1: 'sore' }), seeds);
    assert.deepEqual([upset.sore, upset.sud], [4, 5]);
    assert.deepEqual(playoffPlaces([], seeds), {});
});

test('draft order follows the bracket once games are played', () => {
    // sore wins it all from the 6 seed; lokk loses the final
    const done = bracket({ 1: 'sore', 2: 'globo', 3: 'lokk', 4: 'sore', 5: 'sud', 6: 'sore', 7: 'gibbs' });
    const { order, places } = leagueDraftOrder(teams, { playoffTeams: 6, bracket: done });
    assert.deepEqual([places.sore, places.lokk, places.gibbs, places.globo, places.sud, places.roens], [1, 2, 3, 4, 5, 6]);
    assert.deepEqual(order.slice(6), ['sud', 'roens', 'gibbs', 'globo', 'lokk', 'sore']);
});

test('teams from Sleeper rosters', () => {
    const [t] = teamsFromRosters({ 4: { roster_id: 4, settings: { wins: 9, losses: 5, ties: 0, fpts: 3540, fpts_decimal: 64, ppts: 4272, ppts_decimal: 5, division: 3 } } });
    assert.deepEqual(t, { rosterID: '4', wins: 9, losses: 5, ties: 0, fpts: 3540.64, fptsAgainst: 0, potentialPoints: 4272.05, division: 3 });
});

test("Toilet Bowl winner: the last round's main game, once played", () => {
    const losers = [
        { r: 1, m: 1, t1: 7, t2: 10, w: 10, l: 7 },
        { r: 2, m: 3, t1_from: { w: 1 }, t2: 12, w: null },
        { r: 2, m: 4, t1_from: { l: 1 }, t2: 9, w: 9, p: 3 },
    ];
    assert.equal(toiletBowlWinner(losers), null); // final not played yet
    losers[1].w = 12;
    assert.equal(toiletBowlWinner(losers), '12');
    assert.equal(toiletBowlWinner([]), null);
});

test('the bracket is read once the regular season is fully scored or the league is finished', () => {
    assert.equal(bracketIsSet({ status: 'in_season', settings: { last_scored_leg: 9, playoff_week_start: 15 } }), false);
    assert.equal(bracketIsSet({ status: 'in_season', settings: { last_scored_leg: 14, playoff_week_start: 15 } }), true);
    assert.equal(bracketIsSet({ status: 'complete', settings: {} }), true);
    assert.equal(bracketIsSet(null), false);
});

test('other playoff sizes: playoff teams pick worst finish first; odd brackets are ignored', () => {
    const four = leagueDraftOrder(teams, { playoffTeams: 4 });
    // seeds 1-4 (lokk, gibbs, sud, globo) pick last, 4th place first, champion (by seed) last
    assert.deepEqual(four.order.slice(-4), ['globo', 'sud', 'gibbs', 'lokk']);
    assert.equal(four.order.length, 12);
    assert.deepEqual(playoffPlaces({ not: 'a bracket' }, {}), {});
    assert.deepEqual(playoffPlaces([{ r: 1, m: 1, t1: 'a', t2_from: { w: 9 } }], {}), {}); // a side that can't be filled yet
});
