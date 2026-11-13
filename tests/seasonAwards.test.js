// End-of-season awards (src/lib/AAA-Raymond/utils/seasonAwards.js). Run with: npm test
import assert from 'assert/strict';
import { test } from 'node:test';
import {
  regularSeasonAwards, postseasonAwards, acquisitionIndex, allLeagueTeam, roundWeeks, bracketGames,
  playoffRecapEntries, playoffRoundName, isRookie,
} from '../src/lib/AAA-Raymond/utils/seasonAwards.js';
import { pickValue, pickShare } from '../src/lib/AAA-Raymond/utils/pickValues.js';

// tiny league: 4 teams, lineup QB, RB, FLEX, DL, IDP_FLEX + bench
const rosterPositions = ['QB', 'RB', 'FLEX', 'DL', 'IDP_FLEX', 'BN', 'BN'];
const P = (fn, ln, pos, experience = 3, positions = [pos]) => ({ fn, ln, pos, positions, experience });
const players = {
  q1: P('Qb', 'One', 'QB'), q2: P('Qb', 'Two', 'QB'), q3: P('Qb', 'Three', 'QB', 0), q4: P('Qb', 'Four', 'QB'),
  r1: P('Rb', 'One', 'RB'), r2: P('Rb', 'Two', 'RB', 0), r3: P('Rb', 'Three', 'RB'), r4: P('Rb', 'Four', 'RB'),
  w1: P('Wr', 'One', 'WR'), w2: P('Wr', 'Two', 'WR'), w3: P('Wr', 'Three', 'WR'), w4: P('Wr', 'Four', 'WR'),
  d1: P('De', 'One', 'DE'), d2: P('Dl', 'Two', 'DL', 0), d3: P('Dl', 'Three', 'DT'), d4: P('Dl', 'Four', 'DL'),
  l1: P('Lb', 'One', 'LB'), l2: P('Lb', 'Two', 'LB'), l3: P('Cb', 'Three', 'CB', 0), l4: P('S', 'Four', 'S'),
  fa: P('Free', 'Agent', 'WR'), bx: P('Bench', 'Guy', 'RB'),
};
// entry: starters in slot order + bench, points per player
const E = (roster_id, matchup_id, starters, bench, pts) => ({
  roster_id, matchup_id, starters, players: [...starters, ...bench], players_points: pts,
  starters_points: starters.map((id) => pts[id] ?? 0),
  points: starters.reduce((s, id) => s + (pts[id] ?? 0), 0),
});
const week1 = [
  E(1, 1, ['q1', 'r1', 'w1', 'd1', 'l1'], ['bx'], { q1: 30, r1: 20, w1: 15, d1: 10, l1: 8, bx: 40 }), // 83, bench RB 40
  E(2, 1, ['q2', 'r2', 'w2', 'd2', 'l2'], [], { q2: 20, r2: 18, w2: 10, d2: 12, l2: 9 }), // 69
  E(3, 2, ['q3', 'r3', 'w3', 'd3', 'l3'], [], { q3: 25, r3: 10, w3: 12, d3: 6, l3: 11 }), // 64
  E(4, 2, ['q4', 'r4', 'w4', 'd4', 'l4'], [], { q4: 22, r4: 12, w4: 20, d4: 5, l4: 4 }), // 63 (lost by 1)
];
const week2 = [
  E(1, 1, ['q1', 'r1', 'w1', 'd1', 'l1'], ['bx'], { q1: 10, r1: 10, w1: 10, d1: 10, l1: 10, bx: 0 }), // 50
  E(2, 1, ['q2', 'r2', 'fa', 'd2', 'l2'], ['w2'], { q2: 25, r2: 30, fa: 35, d2: 14, l2: 6, w2: 1 }), // 110, fa via waiver
  E(3, 2, ['q3', 'r3', 'w4', 'd3', 'l3'], [], { q3: 28, r3: 15, w4: 30, d3: 7, l3: 12 }), // 92, w4 via trade from 4
  E(4, 2, ['q4', 'r4', 'w3', 'd4', 'l4'], [], { q4: 18, r4: 10, w3: 5, d4: 6, l4: 3 }), // 42, w3 via trade from 3
];
const transactions = [
  { transaction_id: 't1', type: 'free_agent', status: 'complete', leg: 2, status_updated: 10, roster_ids: [2], adds: { fa: 2 }, drops: null },
  { transaction_id: 't2', type: 'trade', status: 'complete', leg: 2, status_updated: 11, roster_ids: [3, 4], adds: { w4: 3, w3: 4 }, drops: { w4: 4, w3: 3 },
    draft_picks: [{ season: '2027', round: 1, owner_id: 4, previous_owner_id: 3, roster_id: 3 }], waiver_budget: [] },
  { transaction_id: 't3', type: 'waiver', status: 'failed', leg: 2, status_updated: 12, roster_ids: [1], adds: { bx: 1 } },
];
const base = {
  season: 2025, currentSeason: 2025, rosterPositions, regularSeasonLength: 2, playoffWeekStart: 3, playoffRoundType: 0,
  weeks: { 1: week1, 2: week2 }, players, transactions,
};

test('team awards: points, coach, median, boom/bust, nail-biter', () => {
  const a = regularSeasonAwards(base);
  assert.equal(a.weeks, 2);
  assert.equal(a.pointsKing.rosterID, '2'); assert.equal(a.pointsKing.points, 179);
  assert.equal(a.boomWeek.rosterID, '2'); assert.equal(a.boomWeek.points, 110); assert.equal(a.boomWeek.week, 2);
  assert.equal(a.bustWeek.rosterID, '4'); assert.equal(a.bustWeek.points, 42);
  assert.equal(a.nailBiter.winner, '3'); assert.equal(a.nailBiter.margin, 1); assert.equal(a.nailBiter.week, 1);
  // team 1 left a 40-point RB on the bench in week 1 (flex w1 15 -> bx 40), so it's the least efficient; others are perfect
  assert.notEqual(a.coach.rosterID, '1');
  assert.equal(a.coach.efficiency, 1);
  // median: wk1 median (69+64)/2=66.5 -> 1,2 above; wk2 (50+92)/2=71 -> 2,3 above. team 2 is 2-0
  assert.equal(a.medianMaster.rosterID, '2'); assert.equal(a.medianMaster.wins, 2);
});

test('waivers, trades and pickups use how the player was acquired', () => {
  const a = regularSeasonAwards(base);
  assert.equal(a.waiverWizard.rosterID, '2'); assert.equal(a.waiverWizard.points, 35); assert.equal(a.waiverWizard.top.playerID, 'fa');
  assert.equal(a.offPickup.playerID, 'fa'); assert.equal(a.offPickup.rosterID, '2');
  assert.equal(a.defPickup, null); // no defender was picked up
  // trade: team 3 got w4 (30) and sent w3 (5 for team 4) plus a 2027 1st (120 by default, but traded in week 2 of a
  // 2-week season, so half of it counts: 60): team 3 = 30 - 5 - 60 = -35, team 4 = 5 + 60 - 30 = +35
  assert.equal(a.tradeOfYear.rosterID, '4'); assert.equal(a.tradeOfYear.net, 35);
  assert.deepEqual(a.tradeOfYear.received.map((p) => p.playerID), ['w3']);
  assert.deepEqual(a.tradeOfYear.sent.map((p) => p.playerID), ['w4']);
  assert.equal(a.tradeOfYear.picksReceived.length, 1);
  assert.equal(a.tradeOfYear.picksReceived[0].value, 60); assert.equal(a.tradeOfYear.picksReceived[0].fullValue, 120);
  // both sides of the deal, winner first
  assert.deepEqual(a.tradeOfYear.sides.map((sd) => [sd.rosterID, sd.net]), [['4', 35], ['3', -35]]);
  assert.deepEqual(a.tradeOfYear.sides[1].received.map((p) => [p.playerID, p.points]), [['w4', 30]]);
  assert.equal(a.tradeOfYear.sides[0].picks[0].round, 1);
  // with a cheap 1st (10 pts, half counts: 5) the player side wins instead: team 3 = 30 - 5 - 5 = +20
  const cheap = regularSeasonAwards({ ...base, pickValues: { 1: 10 } });
  assert.equal(cheap.tradeOfYear.rosterID, '3'); assert.equal(cheap.tradeOfYear.net, 20);
  assert.equal(cheap.tradeOfYear.picksSent[0].value, 5);
  // trades count bench points too: team 1 gets bx (40 on the bench in week 1) for l2 (9 + 6 as a starter) -> +25
  const benchTrade = { transaction_id: 't4', type: 'trade', status: 'complete', leg: 1, status_updated: 5, roster_ids: [1, 2],
    adds: { bx: 1, l2: 2 }, drops: { bx: 2, l2: 1 }, draft_picks: [], waiver_budget: [] };
  const bench = regularSeasonAwards({ ...base, pickValues: { 1: 10 }, transactions: [...transactions, benchTrade] });
  assert.equal(bench.tradeOfYear.rosterID, '1'); assert.equal(bench.tradeOfYear.net, 25);
  assert.deepEqual(bench.tradeOfYear.received.map((p) => [p.playerID, p.points]), [['bx', 40]]);
  // a traded player's points count from the trade's week on, for whichever team had him: q3 (25 in week 1, 28 in
  // week 2, always on team 3 in the data) traded in week 2 is worth 28
  const later = { transaction_id: 't6', type: 'trade', status: 'complete', leg: 2, status_updated: 20, roster_ids: [1, 3],
    adds: { q3: 1 }, drops: { q3: 3 }, draft_picks: [], waiver_budget: [] };
  const flip = regularSeasonAwards({ ...base, pickValues: { 1: 10 }, transactions: [...transactions, later] });
  assert.equal(flip.tradeOfYear.rosterID, '1'); assert.equal(flip.tradeOfYear.net, 28);
  assert.deepEqual(flip.tradeOfYear.sides.map((sd) => [sd.rosterID, sd.net]), [['1', 28], ['3', -28]]);
  // failed claims don't count
  const { lookup } = acquisitionIndex(transactions);
  assert.equal(lookup('1', 'bx', 2).kind, 'original');
  assert.equal(lookup('2', 'fa', 1).kind, 'original'); // not yet added in week 1
  assert.equal(lookup('2', 'fa', 2).kind, 'waiver');
});

test('rookie awards, DPOY, best game, bench legend', () => {
  const a = regularSeasonAwards(base);
  // q3 (rookie QB) 25+28 = 53 beats q2 45, so q3 is MVP too
  assert.equal(a.oroy.playerID, 'q3'); assert.equal(a.oroy.points, 53);
  assert.equal(a.droy.playerID, 'd2'); assert.equal(a.droy.pos, 'DL'); assert.equal(a.droy.points, 26); // d2 26 > l3 23
  assert.equal(a.dpoy.playerID, 'd2');
  assert.equal(a.bestGame.playerID, 'fa'); assert.equal(a.bestGame.points, 35);
  // bench legend is split: bx (RB, 40 on the bench) is the offensive one; no defender sat on a bench
  assert.equal(a.offBenchLegend.playerID, 'bx'); assert.equal(a.offBenchLegend.points, 40);
  assert.equal(a.defBenchLegend, null);
  // a 2025 rookie has years_exp 1 in 2026
  assert.ok(isRookie({ experience: 1 }, 2025, 2026));
  assert.ok(!isRookie({ experience: 1 }, 2026, 2026));
});

test('MVP is the top starter scorer', () => {
  const a = regularSeasonAwards(base);
  assert.equal(a.mvp.playerID, 'q3');
});

test('All-League fills fixed slots first, then flex', () => {
  const totals = [
    { playerID: 'q1', points: 100, rosterID: '1' }, { playerID: 'q2', points: 90, rosterID: '2' },
    { playerID: 'r1', points: 80, rosterID: '1' }, { playerID: 'r2', points: 70, rosterID: '2' },
    { playerID: 'd1', points: 50, rosterID: '1' }, { playerID: 'l3', points: 45, rosterID: '3' }, { playerID: 'd2', points: 40, rosterID: '2' },
  ];
  const team = allLeagueTeam(totals, players, rosterPositions);
  assert.deepEqual(team.map((s) => `${s.slot}:${s.playerID}`), ['QB:q1', 'RB:r1', 'FLEX:r2', 'DL:d1', 'IDP_FLEX:l3']);
});

/* ------------------------------------------------------------------ playoffs */

// 6-team bracket like Sleeper's: byes for 1 & 2, weeks 15-17
const rosters = [
  { rosterID: 1, wins: 10, losses: 4, ties: 0, fpts: 1500, division: 1 }, // div 1 winner -> seed 1
  { rosterID: 2, wins: 9, losses: 5, ties: 0, fpts: 1400, division: 2 }, // div 2 winner -> 2
  { rosterID: 3, wins: 8, losses: 6, ties: 0, fpts: 1300, division: 3 }, // div 3 winner -> 3
  { rosterID: 4, wins: 9, losses: 5, ties: 0, fpts: 1350, division: 1 }, // record -> 4
  { rosterID: 5, wins: 8, losses: 6, ties: 0, fpts: 1250, division: 2 }, // record -> 5
  { rosterID: 6, wins: 5, losses: 9, ties: 0, fpts: 1340, division: 3 }, // points wildcard -> 6
  { rosterID: 7, wins: 7, losses: 7, ties: 0, fpts: 1200, division: 1 },
];
const wb = [
  { m: 1, r: 1, t1: 4, t2: 5, w: 5, l: 4 }, // 5 over 4
  { m: 2, r: 1, t1: 3, t2: 6, w: 6, l: 3 }, // 6 over 3 (upset gap 3)
  { m: 3, r: 2, t1: 1, t2: 5, t2_from: { w: 1 }, w: 5, l: 1 }, // 5 over 1 (gap 4)
  { m: 4, r: 2, t1: 2, t2: 6, t2_from: { w: 2 }, w: 2, l: 6 },
  { m: 5, r: 2, p: 5, t1: 4, t2: 3, t1_from: { l: 1 }, t2_from: { l: 2 }, w: 3, l: 4 },
  { m: 6, r: 3, p: 1, t1: 5, t2: 2, t1_from: { w: 3 }, t2_from: { w: 4 }, w: 2, l: 5 },
  { m: 7, r: 3, p: 3, t1: 1, t2: 6, t1_from: { l: 3 }, t2_from: { l: 4 }, w: 1, l: 6 },
];
const S = (id, pts, bench = {}) => {
  const starters = Object.keys(pts);
  return E(id, null, starters, Object.keys(bench), { ...pts, ...bench });
};
const pweeks = {
  15: [S(4, { q4: 50, r4: 20, w4: 10, d4: 5, l4: 5 }), S(5, { q1: 60, r1: 25, w1: 10, d1: 4, l1: 3 }),
       S(3, { q3: 40, r3: 20, w3: 10, d3: 8, l3: 2 }), S(6, { q2: 45, r2: 22, w2: 15, d2: 9, l2: 4 })],
  16: [S(1, { q4: 30, r4: 20, w4: 10, d4: 5, l4: 5 }, { bx: 50 }), S(5, { q1: 40, r1: 20, w1: 15, d1: 10, l1: 10 }), // 1: 70 vs 95; bx 50 for w4 10 = +40 > 25
       S(2, { q2: 50, r2: 30, w2: 20, d2: 10, l2: 10 }), S(6, { q3: 40, r3: 20, w3: 10, d3: 10, l3: 5 }),
       S(4, { q1: 10, r1: 10, w1: 10, d1: 10, l1: 10 }), S(3, { q2: 20, r2: 10, w2: 10, d2: 10, l2: 10 })],
  17: [S(5, { q1: 30, r1: 20, w1: 10, d1: 30, l1: 5 }), S(2, { q2: 70, r2: 20, w2: 10, d2: 5, l2: 5 }),
       S(1, { q4: 40, r4: 10, w4: 10, d4: 10, l4: 10 }), S(6, { q3: 20, r3: 10, w3: 10, d3: 10, l3: 10 })],
};
// toilet bowl: the lower score "wins" and advances, so roster 7 (90 vs 120) takes it
pweeks[15].push(S(7, { q4: 40, r4: 20, w4: 10, d4: 10, l4: 10 }), S(8, { q4: 50, r4: 30, w4: 20, d4: 10, l4: 10 }));
const lb = [{ m: 1, r: 1, p: 1, t1: 7, t2: 8, w: 7, l: 8 }];
const playoffInput = { ...base, regularSeasonLength: 14, playoffWeekStart: 15, weeks: pweeks, winnersBracket: wb, losersBracket: lb, rosters };

test('seeds follow the league rule among bracket teams', () => {
  const { seeds, byes } = bracketGames(playoffInput);
  assert.deepEqual(seeds, { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6 });
  assert.deepEqual(byes.sort(), ['1', '2']);
});

test('post-season awards', () => {
  const a = postseasonAwards(playoffInput);
  assert.equal(a.champion.rosterID, '2'); assert.equal(a.runnerUp.rosterID, '5'); assert.equal(a.third.rosterID, '1');
  // 5 seed reached the final: furthest of the non-bye teams
  assert.equal(a.cinderella.rosterID, '5'); assert.equal(a.cinderella.wins, 2); assert.equal(a.cinderella.result, 'final');
  assert.equal(a.biggestUpset.winner, '5'); assert.equal(a.biggestUpset.gap, 4);
  // points per game: 5 -> 102, 95, 95 = 97.3; 2 -> 120, 110 = 115
  assert.equal(a.scoringLeader.rosterID, '2'); assert.equal(a.scoringLeader.perGame, 115);
  // q2 (test players are shared between teams): 45 for team 6, 50 + 70 for team 2, 20 for team 3 = 185
  assert.equal(a.offMvp.playerID, 'q2'); assert.equal(a.offMvp.points, 185); assert.equal(a.offMvp.rosterID, '2');
  // d1: 4 + 10 + 30 for team 5 + 10 for team 4 = 54
  assert.equal(a.defMvp.playerID, 'd1'); assert.equal(a.defMvp.points, 54);
  assert.equal(a.champHero.playerID, 'q2'); assert.equal(a.champHero.points, 70); assert.equal(a.champHero.rosterID, '2');
  assert.equal(a.toiletBowl.rosterID, '7'); assert.equal(a.toiletBowl.points, 90); assert.equal(a.toiletBowl.opponentPts, 120);
  assert.equal(a.toiletBowl.week, 15); assert.deepEqual(a.toiletBowl.record, { wins: 7, losses: 7, ties: 0 });
  // team 1 benched a 50-point RB in week 16, everyone else started their whole roster
  assert.notEqual(a.mostEfficient.rosterID, '1'); assert.equal(a.mostEfficient.efficiency, 1);
  assert.equal(a.benchBlunder.rosterID, '1'); assert.equal(a.benchBlunder.bench.playerID, 'bx');
  assert.equal(a.benchBlunder.starter.playerID, 'w4'); assert.equal(a.benchBlunder.game, 'the semifinals'); assert.equal(a.benchBlunder.margin, 25); assert.equal(a.benchBlunder.swing, 40);
});

test('a traded pick counts for the part of the regular season left after the trade', () => {
  assert.equal(pickShare(1, 14), 1); // offseason / week 1: all of it
  assert.equal(pickShare(12, 14), 3 / 14); // weeks 12, 13, 14 left
  assert.equal(pickShare(14, 14), 1 / 14);
  assert.equal(pickShare(16, 14), 0); // after the regular season
  assert.equal(pickShare(0, 14), 1);
  assert.equal(Math.round(120 * pickShare(12, 14)), 26);
});

test('pick values by round', () => {
  assert.equal(pickValue(1), 120); assert.equal(pickValue(3), 40); assert.equal(pickValue(6), 15); assert.equal(pickValue(9), 15);
  assert.equal(pickValue(2, { 1: 100, 2: 40 }), 40);
});

test('no post-season awards before the final is decided', () => {
  const open = wb.map((m) => (m.p === 1 ? { ...m, w: null, l: null } : m));
  assert.equal(postseasonAwards({ ...playoffInput, winnersBracket: open }), null);
});

test('round weeks and playoff recap entries', () => {
  assert.deepEqual(roundWeeks(1, 3, 15, 0), [15]);
  assert.deepEqual(roundWeeks(3, 3, 15, 1), [17, 18]);
  assert.deepEqual(roundWeeks(2, 3, 15, 2), [17, 18]);
  const entries = playoffRecapEntries({ week: 16, entries: pweeks[16], winnersBracket: wb, playoffWeekStart: 15 });
  assert.equal(entries.length, 6);
  assert.equal(entries.find((e) => e.roster_id === 1).matchup_id, entries.find((e) => e.roster_id === 5).matchup_id);
  assert.equal(playoffRoundName({ week: 17, winnersBracket: wb, playoffWeekStart: 15 }), 'Championship');
  assert.equal(playoffRoundName({ week: 16, winnersBracket: wb, playoffWeekStart: 15 }), 'Semifinals');
});
