// Run with: npm test
import assert from 'assert/strict';
import { test } from 'node:test';
import { buildBracket, reseed, seedOrder, sourceLabel, defaultGame, roundWeeks } from '../src/lib/AAA-Raymond/utils/playoffBracket.js';

// the real 2025 brackets (league 1181324955627573248) and playoff scores
const WB = [
    { m: 1, r: 1, l: 3, w: 12, t1: 12, t2: 3 }, { m: 2, r: 1, l: 1, w: 9, t1: 9, t2: 1 },
    { m: 3, r: 2, l: 4, w: 12, t1: 4, t2: 12, t2_from: { w: 1 } }, { m: 4, r: 2, l: 6, w: 9, t1: 6, t2: 9, t2_from: { w: 2 } },
    { p: 5, m: 5, r: 2, l: 1, w: 3, t1: 3, t2: 1, t2_from: { l: 2 }, t1_from: { l: 1 } },
    { p: 1, m: 6, r: 3, l: 12, w: 9, t1: 12, t2: 9, t2_from: { w: 4 }, t1_from: { w: 3 } },
    { p: 3, m: 7, r: 3, l: 4, w: 6, t1: 4, t2: 6, t2_from: { l: 4 }, t1_from: { l: 3 } },
];
const LB = [
    { m: 1, r: 1, l: 2, w: 8, t1: 8, t2: 2 }, { m: 2, r: 1, l: 7, w: 5, t1: 7, t2: 5 },
    { m: 3, r: 2, l: 8, w: 10, t1: 10, t2: 8, t2_from: { w: 1 } }, { m: 4, r: 2, l: 5, w: 11, t1: 11, t2: 5, t2_from: { w: 2 } },
    { p: 5, m: 5, r: 2, l: 7, w: 2, t1: 2, t2: 7, t2_from: { l: 2 }, t1_from: { l: 1 } },
    { p: 1, m: 6, r: 3, l: 10, w: 11, t1: 10, t2: 11, t2_from: { w: 4 }, t1_from: { w: 3 } },
    { p: 3, m: 7, r: 3, l: 8, w: 5, t1: 8, t2: 5, t2_from: { l: 4 }, t1_from: { l: 3 } },
];
const pts = {
    15: { 1: 246.56, 2: 227.84, 3: 199.44, 4: 293.8, 5: 251.54, 6: 219.78, 7: 252.92, 8: 205.48, 9: 302.42, 10: 211.66, 11: 178.92, 12: 206.82 },
    16: { 1: 252.8, 2: 158.42, 3: 269.9, 4: 201.06, 5: 192.92, 6: 252.18, 7: 252.14, 8: 202.64, 9: 254.26, 10: 185.54, 11: 161.82, 12: 243.64 },
    17: { 1: 211.08, 2: 197.34, 3: 276.86, 4: 167.42, 5: 211.62, 6: 167.7, 7: 211.12, 8: 241.8, 9: 221.34, 10: 187.22, 11: 178.02, 12: 202.54 },
};
const weeks = Object.fromEntries(Object.entries(pts).map(([w, byRoster]) => [w, Object.entries(byRoster).map(([r, p]) => ({ roster_id: Number(r), points: p }))]));
// seeds by the league rule (division winners 1-3, records 4-5, points 6; the rest by record then points)
const seeds = { 4: 1, 6: 2, 1: 3, 12: 4, 3: 5, 9: 6, 7: 7, 2: 8, 8: 9, 5: 10, 11: 11, 10: 12 };
const opts = { weeks, playoffWeekStart: 15, seeds };

test('round weeks follow the playoff round type', () => {
    assert.deepEqual(roundWeeks(3, 3, 15, 0), [17]);
    assert.deepEqual(roundWeeks(3, 3, 15, 1), [17, 18]);
    assert.deepEqual(roundWeeks(2, 3, 15, 2), [17, 18]);
    assert.deepEqual(seedOrder(8), [1, 8, 4, 5, 2, 7, 3, 6]);
});

test('the 2025 championship: scores, winner, labels and placement games', () => {
    const v = buildBracket(WB, opts);
    assert.equal(v.winner, '9'); // Sore Losers, the 6 seed
    assert.equal(v.winnerWins, 3);
    assert.equal(v.final.label, 'Championship');
    assert.deepEqual(v.final.sides.map((s) => [s.rosterID, s.seed, s.points, s.won]), [['12', 4, 202.54, false], ['9', 6, 221.34, true]]);
    assert.deepEqual(v.placement.map((g) => [g.label, g.winner]), [['3rd place', '6'], ['5th place', '3']]);
    assert.equal(v.games[1].label, 'Quarterfinals');
    assert.equal(v.games[3].label, 'Semifinals');
    assert.ok(Object.values(v.games).every((g) => g.status === 'final'));
});

test('tree layout: byes on the outside, each game centred between what feeds it, the champion path lit', () => {
    const v = buildBracket(WB, opts);
    const at = (pred) => v.nodes.find(pred);
    assert.equal(v.leafCount, 4);
    assert.equal(at((n) => n.kind === 'bye' && n.rosterID === '4').center, 0.5); // #1 bye on top
    assert.equal(at((n) => n.m === 1 && n.kind === 'game').center, 1.5);
    assert.equal(at((n) => n.m === 2 && n.kind === 'game').center, 2.5);
    assert.equal(at((n) => n.kind === 'bye' && n.rosterID === '6').center, 3.5); // #2 bye at the bottom
    assert.equal(at((n) => n.m === 3).center, 1);
    assert.equal(at((n) => n.m === 4).center, 3);
    assert.equal(at((n) => n.m === 6).center, 2);
    assert.equal(at((n) => n.m === 6).col, 2);
    const style = (fromCol, fromCenter) => v.lines.find((l) => l.fromCol === fromCol && l.fromCenter === fromCenter).style;
    assert.equal(style(0, 2.5), 'win'); // Sore Losers' quarterfinal
    assert.equal(style(1, 3), 'win');
    assert.equal(style(0, 1.5), 'adv'); // Globo_Gym advanced, but lost the final
    assert.equal(style(0, 0.5), 'dim'); // a bye
});

test('the Toilet Bowl: the lower score moves on, places count from the bottom', () => {
    const v = buildBracket(LB, { ...opts, losers: true, totalTeams: 12 });
    assert.equal(v.losersAdvance, true);
    assert.equal(v.final.label, 'Toilet Bowl');
    assert.equal(v.winner, '11'); // Team Fergilatr finishes last
    assert.deepEqual(v.placement.map((g) => g.label), ['9th place', '7th place']);
    assert.equal(v.games[1].label, 'Round 1');
});

test('before the playoffs: teams come from the seeds, not Sleeper\'s placeholder', () => {
    // winners: seeds 1..6 = rosters 4, 6, 1, 12, 3, 9 (the 2025 seeding gives Sleeper's own 2025 bracket back)
    const w = reseed(WB, ['4', '6', '1', '12', '3', '9']);
    const g = Object.fromEntries(w.map((m) => [m.m, m]));
    assert.deepEqual([g[1].t1, g[1].t2], ['12', '3']); // #4 v #5
    assert.deepEqual([g[2].t1, g[2].t2].sort(), ['1', '9']); // #3 v #6
    assert.equal(g[3].t1, '4'); // #1 waits for #4 / #5
    assert.equal(g[4].t1, '6');
    assert.equal(g[6].w, null);
    assert.equal(g[5].t1, null); // placement games stay "loser of"
    // losers: seed 1 = the worst team
    const l = Object.fromEntries(reseed(LB, ['10', '11', '5', '8', '2', '7']).map((m) => [m.m, m]));
    assert.deepEqual([l[1].t1, l[1].t2].sort(), ['2', '8']);
    assert.deepEqual([l[2].t1, l[2].t2].sort(), ['5', '7']);
    assert.equal(l[3].t1, '10');
    assert.equal(l[4].t1, '11');
    // shown with no scores, and later rounds say where their teams come from
    const v = buildBracket(w, { playoffWeekStart: 15, seeds, lastScored: 9, liveWeek: null });
    assert.ok(Object.values(v.games).every((x) => x.status === 'upcoming' && x.sides.every((s) => s.points === null)));
    assert.equal(sourceLabel(v.games[3].sides[1], v.games), 'Winner of #4 / #5');
    assert.equal(sourceLabel(v.games[5].sides[0], v.games), 'Loser of #4 / #5');
    assert.equal(sourceLabel(v.games[6].sides[0], v.games), 'Semifinal 1 winner'); // a semifinal team is still TBD
    assert.equal(sourceLabel(v.games[7].sides[1], v.games), 'Semifinal 2 loser');
    assert.equal(defaultGame(v), 1);
});

test('during a playoff week: live games score, later ones wait', () => {
    const live = WB.map((m) => (m.r >= 2 ? { ...m, w: null, l: null, ...(m.r === 3 ? { t1: null, t2: null } : {}) } : m));
    const v = buildBracket(live, { ...opts, weeks: { 15: weeks[15], 16: weeks[16] }, lastScored: 15, liveWeek: 16 });
    assert.equal(v.games[1].status, 'final');
    assert.equal(v.games[3].status, 'live');
    assert.equal(v.games[3].sides[1].points, 243.64);
    assert.equal(v.games[6].status, 'upcoming');
    assert.equal(v.winner, null);
    assert.equal(defaultGame(v), 3);
    assert.ok(v.lines.every((l) => l.style !== 'win'));
});
