// Run with: npm test
// House rules (The Dynasty League's own) vs plain rules for another league (leagueInfo.js profile houseRules).
import assert from 'assert/strict';
import { test } from 'node:test';
import { setHouseRules, houseRulesOn } from '../src/lib/AAA-Raymond/utils/leagueRules.js';
import { seedTeams, pointsWildcardSeeds } from '../src/lib/AAA-Raymond/utils/playoffs.js';
import { leagueDraftOrder } from '../src/lib/AAA-Raymond/utils/draftOrder.js';

// same 12 teams as draftOrder.test.js, but jsamp (8-10) has the most points among the teams outside the top 5
const T = (rosterID, wins, losses, fpts, potentialPoints, division) => ({ rosterID, wins, losses, ties: 0, fpts, potentialPoints, division });
const teams = [
    T('lokk', 15, 3, 2251.2, 2674.1, 3), T('globo', 14, 4, 2293.1, 2886.3, 3), T('gibbs', 13, 5, 2093.8, 2539.9, 2),
    T('roens', 12, 6, 2114.5, 2474.3, 3), T('sud', 11, 7, 2083.7, 2689.7, 1), T('sore', 10, 8, 2194.3, 2823.5, 1),
    T('jsamp', 8, 10, 2400.0, 2387.0, 1), T('xav', 7, 11, 1832.2, 2199.7, 1), T('jordan', 6, 12, 1872.0, 2306.7, 2),
    T('fergi', 4, 14, 1768.6, 1910.6, 2), T('lucien', 4, 14, 1757.8, 2036.6, 3), T('oscar', 4, 14, 1662.5, 1998.0, 2),
];
const sixth = () => seedTeams(teams, { playoffTeams: 6 }).order[5].rosterID;

test('house rules are on unless the league profile turns them off', () => {
    assert.equal(houseRulesOn(), true);
    assert.equal(pointsWildcardSeeds(), 1);
    assert.equal(sixth(), 'jsamp'); // the points wildcard, despite an 8-10 record
    setHouseRules(false);
    try {
        assert.equal(pointsWildcardSeeds(), 0);
        assert.equal(sixth(), 'sore'); // plain: next best record
    } finally {
        setHouseRules(true);
    }
    assert.equal(sixth(), 'jsamp');
});

test('plain draft order: missed the playoffs worst record first, then playoff teams worst place first', () => {
    const { order } = leagueDraftOrder(teams, { playoffTeams: 6, houseRules: false });
    // non-playoff teams by record (4-14 ties: fewer points first), playoff places projected by seed
    assert.deepEqual(order, ['oscar', 'lucien', 'fergi', 'jordan', 'xav', 'jsamp', 'sore', 'roens', 'globo', 'sud', 'gibbs', 'lokk']);
    // house rule: lowest max PF first, then 5th, 6th, 3rd, 4th, runner-up, champion (jsamp is the points wildcard)
    const house = leagueDraftOrder(teams, { playoffTeams: 6, houseRules: true }).order;
    assert.deepEqual(house.slice(0, 6), ['fergi', 'oscar', 'lucien', 'xav', 'jordan', 'sore']);
    assert.deepEqual(house.slice(6), ['roens', 'jsamp', 'sud', 'globo', 'gibbs', 'lokk']);
});
