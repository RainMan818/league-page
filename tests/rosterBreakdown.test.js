// Run with: npm test
import assert from 'assert/strict';
import { test } from 'node:test';
import { rosterAgeCounts, leagueRanks, rankShade, depthChart, pickSeasons, ownedPicks, rosterGroup, projectionWeeks, seasonProjection } from '../src/lib/AAA-Raymond/utils/rosterBreakdown.js';
import { predictLineup, predictScores } from '../src/lib/AAA-Raymond/utils/predictOptimalScore.js';

const players = {
    q1: { pos: 'QB', age: 30, wi: { 5: { p: '20' } } },
    q2: { pos: 'QB', age: 24, wi: { 5: { p: '18' } } },
    r1: { pos: 'RB', age: 25, wi: { 5: { p: '15' } } },
    w1: { pos: 'WR', age: 27, wi: { 5: { p: '12' } } },
    d1: { pos: 'DL', age: 26, wi: { 5: { p: '8' } } }, // single-position DL: defense, not offense
    e1: { pos: 'DE', age: 28, wi: { 5: { p: '6' } } },
    l1: { pos: 'LB', positions: ['LB', 'DL'], age: 23, wi: { 5: { p: '9' } } },
    k1: { pos: 'K', age: 35 },
    noAge: { pos: 'DB' },
};

test('positions group by listed position; DL players count on defense', () => {
    assert.equal(rosterGroup(players.e1), 'DL');
    assert.equal(rosterGroup(players.l1), 'LB');
    assert.equal(rosterGroup(players.k1), null);
    const b = rosterAgeCounts(Object.keys(players), players);
    assert.equal(b.Team.count, 8); // kicker left out
    assert.equal(b.Off.count, 4);
    assert.equal(b.Def.count, 4);
    assert.equal(b.DL.count, 2);
    assert.equal(b.DL.age, 27);
    assert.equal(b.DB.count, 1);
    assert.equal(b.DB.age, null); // no known age
    assert.equal(b.Off.age, (30 + 24 + 25 + 27) / 4);
    assert.equal(b.TE.count, 0);
});

test('league average and dense rank, 1 = highest', () => {
    const r = leagueRanks({ 1: 10, 2: 30, 3: 30, 4: 5, 5: null });
    assert.equal(r.avg, 18.75);
    assert.deepEqual(r.rank, { 1: 2, 2: 1, 3: 1, 4: 3 });
    assert.equal(r.maxRank, 3);
    assert.equal(rankShade(1, 3), 1);
    assert.equal(rankShade(3, 3), 0);
    assert.equal(rankShade(1, 1), 0.5);
});

test('best projected lineup returns the picks and the same score as predictScores', () => {
    const league = { roster_positions: ['QB', 'RB', 'WR', 'SUPER_FLEX', 'DL', 'IDP_FLEX', 'BN', 'BN'] };
    const list = Object.entries(players).map(([id, p]) => ({ id, ...p }));
    const { score, picks } = predictLineup(list, 5, league);
    assert.equal(score, 20 + 15 + 12 + 18 + 8 + 9);
    assert.equal(score, predictScores(list, 5, league));
    assert.deepEqual(picks.map((p) => [p.slot, p.id]), [['QB', 'q1'], ['RB', 'r1'], ['WR', 'w1'], ['SUPER_FLEX', 'q2'], ['DL', 'd1'], ['IDP_FLEX', 'l1']]);
    assert.equal(picks[0].p, 20);
});

test('depth chart orders starters, bench, taxi, IR, then projection', () => {
    const projections = { q1: 20, q2: 18, d1: 8, e1: 6 };
    const groups = depthChart({ playerIDs: Object.keys(players), players, starters: new Set(['d1']), taxi: ['e1'], reserve: [], projections });
    assert.deepEqual(groups.DL.map((p) => [p.id, p.tag]), [['d1', 'start'], ['e1', 'T']]);
    const qb = depthChart({ playerIDs: ['q2', 'q1'], players, projections }).QB;
    assert.deepEqual(qb.map((p) => p.id), ['q1', 'q2']); // bench by projection
    const ir = depthChart({ playerIDs: ['q1', 'q2'], players, starters: new Set(['q1']), reserve: ['q1'], projections }).QB;
    assert.deepEqual(ir.map((p) => p.tag), ['bench', 'IR']); // IR wins over starting
});

test('season projection: rest of the regular season per game, byes skipped', () => {
    assert.deepEqual(projectionWeeks(10, 14), [10, 11, 12, 13, 14]);
    assert.deepEqual(projectionWeeks(13, 14), [11, 12, 13, 14]); // at least 4 weeks
    assert.deepEqual(projectionWeeks(15, 14), []); // regular season over
    const cmc = { wi: { 10: { p: '20', o: 'SEA' }, 11: { p: '0' }, 12: { p: '22', o: 'LAR' } } }; // bye in week 11
    assert.equal(seasonProjection(cmc, [10, 11, 12]), 21);
    const out = { wi: { 10: { p: '0', o: 'SEA' }, 11: { p: '0', o: 'ARI' }, 12: { p: '15', o: 'LAR' } } }; // ruled out 2 weeks
    assert.equal(seasonProjection(out, [10, 11, 12]), 5);
    assert.equal(seasonProjection({}, [10]), 0);
});

test('pick seasons start next year once the draft is done', () => {
    assert.deepEqual(pickSeasons({ season: '2026', status: 'in_season' }), [2027, 2028]);
    assert.deepEqual(pickSeasons({ season: '2026', status: 'pre_draft' }), [2026, 2027]);
    assert.deepEqual(pickSeasons({ season: '2026', status: 'in_season' }, [{ season: '2029' }, { season: '2026' }]), [2027, 2028, 2029]);
});

test('owned picks follow traded_picks', () => {
    const traded = [
        { season: '2027', round: 1, roster_id: 2, owner_id: 1, previous_owner_id: 2 },
        { season: '2027', round: 2, roster_id: 1, owner_id: 2, previous_owner_id: 1 },
        { season: '2027', round: 3, roster_id: 2, owner_id: 2, previous_owner_id: 1 }, // traded back home
        { season: '2031', round: 1, roster_id: 1, owner_id: 2 }, // outside the seasons shown
    ];
    const out = ownedPicks({ rosterIDs: [1, 2], tradedPicks: traded, seasons: [2027], rounds: 3 });
    assert.deepEqual(out['1'], [
        { season: 2027, round: 1, from: null },
        { season: 2027, round: 1, from: '2' },
        { season: 2027, round: 3, from: null },
    ]);
    assert.deepEqual(out['2'], [
        { season: 2027, round: 2, from: null },
        { season: 2027, round: 2, from: '1' },
        { season: 2027, round: 3, from: null },
    ]);
});
