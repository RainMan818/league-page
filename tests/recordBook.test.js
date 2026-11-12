// Run with: npm test
import assert from 'assert/strict';
import { test } from 'node:test';
import { weeksOf, teamRows, teamSeasons, recordLists, recordYears } from '../src/lib/AAA-Raymond/utils/recordBook.js';

// roster 11 changed hands after 2023 (two managers, one team); 2026 has the median game (2 games a week)
const data = {
    leagueRosterRecords: {
        11: { years: [
            { year: 2022, wins: 8, losses: 6, ties: 0, fpts: 2800, fptsAgainst: 2700, fptsPerGame: 200, potentialPoints: 3200, pOGames: 1, byes: 0 },
            { year: 2023, wins: 8, losses: 6, ties: 0, fpts: 3500, fptsAgainst: 3200, fptsPerGame: 250, potentialPoints: 4000, pOGames: 0, byes: 0 },
            { year: 2026, wins: 4, losses: 13, ties: 1, fpts: 1710, fptsAgainst: 2000, fptsPerGame: 190, potentialPoints: 2100, pOGames: 0, byes: 0 },
        ] },
        3: { years: [
            { year: 2022, wins: 10, losses: 4, ties: 0, fpts: 3000, fptsAgainst: 2600, fptsPerGame: 214.29, potentialPoints: 3500, pOGames: 1, byes: 1 },
            { year: 2026, wins: 12, losses: 6, ties: 0, fpts: 2160, fptsAgainst: 1900, fptsPerGame: 240, potentialPoints: 2500, pOGames: 0, byes: 0 },
        ] },
    },
    leagueWeekHighs: [{ rosterID: 3, fpts: 300, week: 4, year: 2022 }],
    leagueWeekLows: [{ rosterID: 11, fpts: 120, week: 2, year: 2026 }],
    allTimeBiggestBlowouts: [{ year: 2022, week: 3, differential: 150, home: { rosterID: 3, fpts: 280 }, away: { rosterID: 11, fpts: 130 } }],
    allTimeClosestMatchups: [
        { year: 2023, week: 9, differential: 0, home: { rosterID: 3, fpts: 250 }, away: { rosterID: 11, fpts: 250 } },
        { year: 2022, week: 5, differential: 0.04, home: { rosterID: 11, fpts: 244.14 }, away: { rosterID: 3, fpts: 244.1 } },
    ],
    seasonWeekRecords: [
        { year: 2026, seasonPointsHighs: [{ rosterID: 3, fpts: 290, week: 6 }], seasonPointsLows: [], biggestBlowouts: [], closestMatchups: [] },
        { year: 2022, seasonPointsHighs: [], seasonPointsLows: [], biggestBlowouts: [], closestMatchups: [] },
    ],
};
const txSeasons = { 2022: { 11: { trade: 1, waiver: 10 } }, 2023: { 11: { trade: 2, waiver: 5 } }, 2027: { 11: { trade: 1, waiver: 0 } } };

test('weeks come from points per week, so median-game seasons count weeks, not games', () => {
    assert.equal(weeksOf({ wins: 4, losses: 13, ties: 1, fpts: 1800, fptsPerGame: 200 }), 9);
    assert.equal(weeksOf({ wins: 10, losses: 4, ties: 0, fpts: 3000, fptsPerGame: 214.29 }), 14);
    assert.equal(weeksOf({ wins: 3, losses: 1, ties: 0, fpts: 400, fptsPerGame: 0 }), 4); // no per-game number: games
});

test('all-time rows add up every season a team played, whoever managed it', () => {
    const r = teamRows(data, { txSeasons }).find((x) => x.rosterID === '11');
    assert.deepEqual(r.years, [2022, 2023, 2026]);
    assert.deepEqual([r.wins, r.losses, r.ties], [20, 25, 1]);
    assert.equal(r.pf, 8010);
    assert.equal(r.weeks, 37); // 14 + 14 + 9
    assert.equal(r.ppw, 8010 / 37);
    assert.equal(r.iq, 8010 / 9300);
    assert.deepEqual([r.trades, r.waivers], [4, 15]); // every season's moves, the offseason too
    assert.equal(r.playoffTrips, 1);
});

test('a season view shows only that season', () => {
    const r = teamRows(data, { year: 2023, txSeasons }).find((x) => x.rosterID === '11');
    assert.deepEqual([r.wins, r.losses, r.pf, r.weeks, r.trades, r.waivers], [8, 6, 3500, 14, 2, 5]);
    assert.equal(teamRows(data, { year: 2023 }).length, 1); // roster 3 has no 2023 season here
});

test('season lists rank by points per week; the season being played is "so far" and not a worst season', () => {
    const s = teamSeasons(data, { inProgressYear: 2026 });
    assert.deepEqual(s.map((x) => [x.rosterID, x.year]), [['11', 2023], ['3', 2026], ['3', 2022], ['11', 2022], ['11', 2026]]);
    assert.equal(s[1].soFar, true);
    const lists = recordLists(data, { inProgressYear: 2026 });
    assert.deepEqual(lists.worstSeasons.map((x) => [x.rosterID, x.year]), [['11', 2022], ['3', 2022], ['11', 2023]]);
});

test('closest wins skip ties; season view reads that season\'s lists', () => {
    const all = recordLists(data);
    assert.deepEqual(all.closeWins.map((g) => g.margin), [0.04]);
    assert.equal(all.blowouts[0].winner.rosterID, 3);
    const y = recordLists(data, { year: 2026 });
    assert.deepEqual(y.weekHighs, [{ rosterID: 3, fpts: 290, week: 6, year: 2026 }]);
    assert.deepEqual(y.bestSeasons, []);
    assert.deepEqual(recordYears(data), [2026, 2022]);
});
