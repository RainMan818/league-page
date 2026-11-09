// Ported from the scratch tests used while building the homepage insights.
// Run with: npm test
import assert from 'assert/strict';
import * as I from '../src/lib/AAA-Raymond/utils/leagueInsights.js';
import { test } from 'node:test';

test('bracket, seeding, all-play, efficiency and the season simulation', () => {

  // 1. bracket shape
  assert.deepEqual(I.seedOrder(8), [1, 8, 4, 5, 2, 7, 3, 6]);
  const label = (side) => side.seed ? `${side.seed}` : `W${side.seeds.join('/')}`;
  const shape = (n) => I.bracketRounds(n).map(r => r.map(g => `${label(g.top)}v${label(g.bottom)}`));
  assert.deepEqual(shape(6), [['4v5', '3v6'], ['1vW4/5', '2vW3/6'], ['W1/4/5vW2/3/6']]);
  assert.deepEqual(shape(4), [['1v4', '2v3'], ['W1/4vW2/3']]);
  assert.equal(I.byeCount(6), 2); assert.equal(I.byeCount(8), 0);


  // 2. seeding: division winner with a worse record still gets a top-2 seed; PF breaks ties
  const t = (id, w, l, pf, div) => ({ rosterID: id, wins: w, losses: l, ties: 0, fpts: pf, division: div });
  const teams = [t('A', 8, 1, 1000, 1), t('B', 7, 2, 990, 1), t('C', 7, 2, 995, 1), t('D', 5, 4, 900, 2), t('E', 4, 5, 950, 2)];
  const { order, divisionWinners } = I.seedTeams(teams);
  assert.deepEqual(order.map(x => x.rosterID), ['A', 'D', 'C', 'B', 'E']);
  assert.deepEqual(divisionWinners.map(x => x.rosterID).sort(), ['A', 'D']);
  assert.deepEqual(I.seedTeams(teams, { divisionWinnersFirst: false }).order.map(x => x.rosterID), ['A', 'C', 'B', 'D', 'E']);


  // 3. all-play & luck on a hand-checked week
  const wk = [
    { roster_id: 1, matchup_id: 1, points: 100 }, { roster_id: 2, matchup_id: 1, points: 90 },
    { roster_id: 3, matchup_id: 2, points: 80 }, { roster_id: 4, matchup_id: 2, points: 70 },
  ];
  const ap = Object.fromEntries(I.allPlayRecords([wk]).map(r => [r.rosterID, r]));
  assert.equal(ap['1'].apWins, 3); assert.equal(ap['2'].apWins, 2);
  assert.ok(Math.abs(ap['2'].luck + 2 / 3) < 1e-9, 'team 2 unlucky');
  assert.ok(Math.abs(ap['3'].luck - 2 / 3) < 1e-9, 'team 3 lucky');
  assert.equal(ap['1'].luck, 0);
  // unplayed week (all zeros) is ignored
  assert.equal(I.allPlayRecords([wk.map(e => ({ ...e, points: 0 }))]).length, 0);


  // 4. efficiency
  const eff = I.lineupEfficiency({ 1: { rosterID: 1, fpts: 900, potentialPoints: 1000 }, 2: { rosterID: 2, fpts: 950, potentialPoints: 1000 } });
  assert.deepEqual(eff.map(e => e.rosterID), ['2', '1']); assert.equal(eff[1].benchPts, 100);


  // 5. recap: covered in test-recap.mjs

  // 6. full synthetic league simulation
  const rand = (() => { let s = 42; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  const leagueData = { roster_positions: ['QB','RB','RB','WR','WR','TE','FLEX','FLEX','FLEX','SUPER_FLEX','IDP_FLEX','DL','DL','DL','LB','LB','LB','DB','DB','DB','BN','BN'], settings: { playoff_teams: 6, playoff_week_start: 15, divisions: 2 } };
  const posList = ['QB','QB','QB','RB','RB','RB','RB','WR','WR','WR','WR','WR','TE','TE','DL','DL','DL','DL','LB','LB','LB','LB','DB','DB','DB','DB','S'];
  const players = {}, rosters = {};
  for (let r = 1; r <= 12; r++) {
    const strength = 0.75 + r * 0.04; // team 12 strongest
    rosters[r] = { roster_id: r, settings: { division: r <= 6 ? 1 : 2 }, players: [] };
    posList.forEach((pos, i) => {
      const id = `${r}-${i}`; const wi = {};
      for (let w = 1; w <= 18; w++) wi[w] = { p: +(strength * (pos === 'QB' ? 18 : 9) * (0.8 + rand() * 0.4)).toFixed(2) };
      players[id] = { pos, positions: [pos === 'S' ? 'DB' : pos], wi, fn: 'P', ln: id };
      rosters[r].players.push(id);
    });
  }
  // round-robin-ish schedule
  const pairsFor = (w) => { const ids = [...Array(12)].map((_, i) => i + 1); const rot = ids.slice(1); for (let k = 0; k < w; k++) rot.unshift(rot.pop()); const all = [1, ...rot]; return [...Array(6)].map((_, i) => [all[i], all[11 - i]]); };
  const matchupsData = [];
  const record = Object.fromEntries([...Array(12)].map((_, i) => [i + 1, { rosterID: i + 1, wins: 0, losses: 0, ties: 0, fpts: 0, division: i < 6 ? 1 : 2 }]));
  for (let w = 1; w <= 9; w++) {
    const entries = [];
    pairsFor(w).forEach(([a, b], m) => {
      const pa = 120 + a * 3 + (rand() - 0.5) * 50, pb = 120 + b * 3 + (rand() - 0.5) * 50;
      entries.push({ roster_id: a, matchup_id: m + 1, points: pa }, { roster_id: b, matchup_id: m + 1, points: pb });
      record[a].fpts += pa; record[b].fpts += pb;
      if (pa > pb) { record[a].wins++; record[b].losses++; } else { record[b].wins++; record[a].losses++; }
    });
    matchupsData.unshift(entries);
  }
  const weeks = [10, 11, 12, 13, 14, 15, 16, 17];
  const { expected, sd, factor } = I.expectedScores({ rosters, players, leagueData, weeks, matchupsData });

  assert.ok(expected[12][10] > expected[1][10], 'stronger roster projects higher');
  const schedule = [10, 11, 12, 13, 14].map(w => ({ week: w, pairs: pairsFor(w) }));
  const t0 = Date.now();
  const sim = I.simulateSeason({ teams: Object.values(record), schedule, expected, sd, playoffTeams: 6, playoffWeeks: [15, 16, 17], sims: 10000 });

  const sum = (k) => sim.odds.reduce((a, o) => a + o[k], 0);
  assert.ok(Math.abs(sum('playoffs') - 6) < 1e-9, 'playoff odds sum to 6');
  assert.ok(Math.abs(sum('bye') - 2) < 1e-9, 'bye odds sum to 2');
  assert.ok(Math.abs(sum('division') - 2) < 1e-9, 'division odds sum to 2');
  assert.ok(Math.abs(sum('title') - 1) < 1e-9, 'title odds sum to 1');
  assert.ok(Math.abs(sum('final') - 2) < 1e-9, 'finalist odds sum to 2');
  for (const o of sim.odds) { assert.ok(o.bye <= o.playoffs + 1e-12 && o.title <= o.final + 1e-12); assert.ok(Math.abs(o.projWins + o.projLosses + o.projTies - 14) < 1e-9); }
  assert.equal(sim.projectedSeeds.length, 6);


  // deterministic: same seed -> same result
  const again = I.simulateSeason({ teams: Object.values(record), schedule, expected, sd, playoffTeams: 6, playoffWeeks: [15, 16, 17], sims: 10000 });
  assert.deepEqual(again.odds, sim.odds);
  // season over: no schedule -> seeds fixed, playoff odds are 0 or 1
  const done = I.simulateSeason({ teams: Object.values(record), schedule: [], expected, sd, playoffTeams: 6, playoffWeeks: [15, 16, 17], sims: 2000 });
  assert.ok(done.odds.every(o => o.playoffs === 0 || o.playoffs === 1));
  // median game adds a game per week
  const med = I.simulateSeason({ teams: Object.values(record), schedule, expected, sd, playoffTeams: 6, playoffWeeks: [15, 16, 17], sims: 500, medianGame: true });
  assert.ok(Math.abs(med.odds[0].projWins + med.odds[0].projLosses + med.odds[0].projTies - 19) < 1e-9);
});
