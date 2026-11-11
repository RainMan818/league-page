// Ported from the scratch tests used while building the homepage insights.
// Run with: npm test
import assert from 'assert/strict';
import { seedTeams, simulateSeason } from '../src/lib/AAA-Raymond/utils/playoffs.js';
import { test } from 'node:test';

test('league seeding rule: division winners, record wildcards, one points-for wildcard', () => {
  const t = (id, w, l, pf, div) => ({ rosterID: id, wins: w, losses: l, ties: 0, fpts: pf, division: div });
  // 12 teams, 3 divisions; K has a losing record but the most points among non-qualifiers
  const teams = [
    t('A', 13, 3, 2000, 1), t('B', 12, 4, 1950, 1), t('C', 9, 7, 1700, 1), t('D', 4, 12, 1500, 1),
    t('E', 12, 4, 1900, 2), t('F', 10, 6, 1800, 2), t('G', 6, 10, 1600, 2), t('H', 2, 14, 1400, 2),
    t('I', 10, 6, 1750, 3), t('J', 8, 8, 1650, 3), t('K', 7, 9, 1890, 3), t('L', 4, 12, 1450, 3),
  ];
  const { order, divisionWinners } = seedTeams(teams, { playoffTeams: 6, pointsWildcards: 1 });
  const seeds = order.slice(0, 6).map(x => x.rosterID);
  // division winners: A (div1 13-3), E (div2 12-4), I (div3 10-6) -> seeds 1-3 by record
  // best remaining records: B 12-4, F 10-6 -> seeds 4-5
  // highest PF among the rest (C 1700, J 1650, K 1890, ...) -> K seed 6 despite 7-9
  assert.deepEqual(seeds, ['A', 'E', 'I', 'B', 'F', 'K']);
  assert.deepEqual(divisionWinners.map(x => x.rosterID).sort(), ['A', 'E', 'I']);
  // with 4 "division winners" worth of top seeds, rule still ends with one PF seed
  const four = teams.map(x => ({ ...x, division: { A: 1, B: 2, C: 1, D: 1, E: 3, F: 3, G: 3, H: 3, I: 4, J: 4, K: 4, L: 4 }[x.rosterID] }));
  assert.deepEqual(seedTeams(four, { playoffTeams: 6, pointsWildcards: 1 }).order.slice(0, 6).map(x => x.rosterID), ['A', 'B', 'E', 'I', 'F', 'K']);
  // pointsWildcards 0 -> pure record after division winners
  assert.deepEqual(seedTeams(teams, { playoffTeams: 6, pointsWildcards: 0 }).order.slice(0, 6).map(x => x.rosterID), ['A', 'E', 'I', 'B', 'F', 'C']);
  // a team already in on record is never double counted for the PF seed
  const pfLeader = teams.map(x => x.rosterID === 'B' ? { ...x, fpts: 3000 } : x);
  assert.equal(new Set(seedTeams(pfLeader, { playoffTeams: 6 }).order.slice(0, 6).map(x => x.rosterID)).size, 6);
  // every team appears exactly once in the full order
  assert.equal(new Set(order.map(x => x.rosterID)).size, 12);
  // simulation with no games left reproduces the rule exactly
  const sim = simulateSeason({ teams, schedule: [], expected: {}, sd: {}, playoffTeams: 6, playoffWeeks: [15, 16, 17], sims: 200 });
  assert.deepEqual(sim.projectedSeeds, ['A', 'E', 'I', 'B', 'F', 'K']);
  assert.equal(sim.odds.find(o => o.rosterID === 'K').playoffs, 1);
  assert.equal(sim.odds.find(o => o.rosterID === 'C').playoffs, 0);
});
