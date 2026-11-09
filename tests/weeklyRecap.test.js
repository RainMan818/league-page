// Ported from the scratch tests used while building the homepage insights.
// Run with: npm test
import assert from 'assert/strict';
import { weeklyRecap, positionGroup } from '../src/lib/AAA-Raymond/utils/leagueInsights.js';
import { test } from 'node:test';

test('weekly recap awards, players of the week and benchwarmers', () => {
  const W = 8;
  const leagueData = { roster_positions: ['QB', 'RB', 'WR', 'FLEX', 'DL', 'BN', 'BN'] };
  // players: id -> pos, projection, opponent
  const P = (fn, ln, pos, proj, o) => ({ fn, ln, pos, positions: [pos], wi: { [W]: { p: String(proj), o } } });
  const players = {
    q1: P('Joe', 'Burrow', 'QB', 20, 'TEN'), q2: P('Kirk', 'Cousins', 'QB', 15, 'NYJ'), q3: P('Jared', 'Goff', 'QB', 18, 'MIN'), q4: P('Bo', 'Nix', 'QB', 17, 'KC'),
    r1: P('Bijan', 'Robinson', 'RB', 18, 'TB'), r2: P('Tyler', 'Allgeier', 'RB', 8, 'DAL'), r3: P('Breece', 'Hall', 'RB', 14, 'MIA'), r4: P('Josh', 'Jacobs', 'RB', 15, 'CHI'),
    w1: P('Tee', 'Higgins', 'WR', 14, 'TEN'), w2: P('Puka', 'Nacua', 'WR', 16, 'SF'), w3: P('Drake', 'London', 'WR', 13, 'TB'), w4: P('Malik', 'Nabers', 'WR', 15, 'PHI'),
    d1: P('Garrett', 'Karlaftis', 'DE', 8, 'DEN'), d2: P('Chop', 'Robinson', 'DL', 6, 'NE'), d3: P('Myles', 'Garrett', 'DE', 9, 'PIT'), d4: P('Aidan', 'Hutchinson', 'DL', 9, 'GB'),
    x1: P('Extra', 'Back', 'RB', 5, 'ATL'),
  };
  // team 1: starters q1 r1 w1 r? flex w2? ; bench q2, r2 (bench RB scores big -> max > points)
  const e = (roster_id, matchup_id, starters, bench, pts) => {
    const players_points = { ...pts };
    return { roster_id, matchup_id, starters, players: [...starters, ...bench], players_points, points: starters.reduce((s, id) => s + (pts[id] ?? 0), 0) };
  };
  const week = [
    e(1, 1, ['q1', 'r1', 'w1', 'w2', 'd1'], ['q2', 'r2'], { q1: 39.78, r1: 20, w1: 37.5, w2: 10, d1: 26, q2: 28.68, r2: 34.7 }), // 133.28, max: q1 39.78 + r2 34.7 + w1 37.5 + flex r1 20 (vs w2 10) + d1 26 = 157.98
    e(2, 1, ['q3', 'r3', 'w3', 'r4', 'd3'], ['x1'], { q3: 25, r3: 30.5, w3: 20, r4: 30, d3: 25, x1: 2 }), // 130.5 (loses 133.28 vs 130.5 -> narrow)
    e(3, 2, ['q4', 'x1', 'w4', 'r2', 'd2'], [], { q4: 10, x1: 5, w4: 8, r2: 3, d2: 19 }), // 45  -- shares players only for test simplicity
    e(4, 2, ['q2', 'r4', 'w3', 'w4', 'd4'], [], { q2: 30, r4: 40, w3: 25, w4: 10, d4: 20 }), // 125 -> blowout 80
  ];
  // fix team 3/4 so ids don't collide in players_points semantics (fine: each entry has its own points)
  const rc = weeklyRecap(week, players, { week: W, leagueData });
  assert.equal(rc.bestTeam.rosterID, '1'); assert.ok(Math.abs(rc.bestTeam.points - 133.28) < 1e-9);
  assert.equal(rc.worstTeam.rosterID, '3');
  assert.ok(Math.abs(rc.byRoster['1'].projected - (20 + 18 + 14 + 16 + 8)) < 1e-9, 'starter projection sum');
  assert.ok(Math.abs(rc.byRoster['1'].max - 157.98) < 1e-6, `max ${rc.byRoster['1'].max}`);
  assert.equal(rc.awards.blowout.winner, '4'); assert.equal(rc.awards.blowout.margin, 80);
  assert.equal(rc.awards.narrowWin.winner, '1'); assert.ok(Math.abs(rc.awards.narrowWin.margin - 2.78) < 1e-9);
  assert.equal(rc.awards.highestInLoss.rosterID, '2'); assert.equal(rc.awards.highestInLoss.oppRosterID, '1');
  assert.equal(rc.awards.lowestInWin.rosterID, '4');
  // efficiency: t1 133.28/157.98=.844; t2 130.5/ (q3 25 + r3 30.5 + w3 20 + flex max(r4 30) + d3 25 =130.5) = 1.0 ; t4 = 125/125=1? t4 has no bench -> 1.0; t3 no bench -> 1.0
  assert.equal(rc.awards.worstManager.rosterID, '1');
  // over/under vs starter projections: t4 proj q2 15 + r4 15 + w3 13 + w4 15 + d4 9 = 67 -> +58 ; t3 proj 17+5+15+8+6=51 -> -6
  assert.equal(rc.awards.overachiever.rosterID, '2'); /* 130.5 vs proj 69 = +61.5 beats team 4's +58 */ assert.equal(rc.awards.underachiever.rosterID, '3');
  // players of the week by position; DE counts as DL
  assert.deepEqual(rc.playersOfWeek.map(p => `${p.pos}:${p.name}:${p.points}:${p.opponent}`), ['QB:J. Burrow:39.78:TEN', 'RB:J. Jacobs:40:CHI', 'WR:T. Higgins:37.5:TEN', 'DL:G. Karlaftis:26:DEN']);
  assert.deepEqual(rc.benchwarmers.map(p => `${p.pos}:${p.name}:${p.points}`), ['QB:K. Cousins:28.68', 'RB:T. Allgeier:34.7']);
  assert.equal(positionGroup({ pos: 'CB' }), 'DB'); assert.equal(positionGroup({ pos: 'S' }), 'DB');
});
