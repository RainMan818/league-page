// Run with: npm test
import assert from 'assert/strict';
import { test } from 'node:test';
import { careerStats, managerTrophies, titleYears, managerRecords, rosterLineup, isPlaceholderText, winPct } from '../src/lib/AAA-Raymond/utils/managerProfile.js';

// manager "a" ran roster 1 every season; manager "b" took over roster 2 in 2024 (roster 2 was someone else before)
const runs = { a: { 1: [2022, 2023, 2024, 2025] }, b: { 2: [2024, 2025] } };
const owns = (who) => (rosterID, year) => (runs[who][rosterID] ?? []).includes(Number(year));

const records = {
    regularSeasonData: {
        leagueManagerRecords: {
            a: { wins: 40, losses: 20, ties: 0, fptsFor: 9000, potentialPoints: 10000 },
            b: { wins: 30, losses: 29, ties: 1, fptsFor: 9500, potentialPoints: 11000 },
            c: { wins: 20, losses: 40, ties: 0, fptsFor: 8000, potentialPoints: 9000 },
        },
        mostSeasonLongPoints: [{ rosterID: 2, year: 2023, fpts: 3600 }, { rosterID: 1, year: 2023, fpts: 3500.25 }],
        leagueWeekHighs: [{ rosterID: 1, year: 2022, week: 5, fpts: 300.5 }, { rosterID: 2, year: 2025, week: 3, fpts: 299 }],
        seasonWeekRecords: [{ year: 2025, seasonPointsHighs: [{ rosterID: 2, week: 3, fpts: 299 }, { rosterID: 1, week: 9, fpts: 250 }] }],
    },
    playoffData: { leagueManagerRecords: { a: { wins: 3, losses: 1, ties: 0, playoffAppearances: 3 } } },
};

test('career numbers and ranks', () => {
    const a = careerStats(records, 'a');
    assert.equal(a.pct, 40 / 60);
    assert.equal(a.pctRank, 1);
    assert.equal(a.pfRank, 2); // b scored more
    assert.deepEqual([a.playoffWins, a.playoffLosses, a.appearances], [3, 1, 3]);
    const b = careerStats(records, 'b');
    assert.equal(b.pct, 30.5 / 60);
    assert.deepEqual([b.playoffWins, b.appearances], [0, 0]); // never made the playoffs
    assert.equal(careerStats(records, 'nobody'), null);
    assert.equal(winPct({ wins: 0, losses: 0, ties: 0 }), null);
});

test('trophies: titles first, then newest; finishes before a takeover are marked former', () => {
    const awards = [
        { year: 2025, champion: 2, second: 1, third: 3, toilet: 4, divisions: [{ name: null, rosterID: 1 }] },
        { year: 2023, champion: 1, second: 2, third: 3, toilet: 4, divisions: [{ name: 'East', rosterID: 2 }] },
    ];
    const a = managerTrophies(awards, owns('a'));
    assert.deepEqual(a.map((t) => [t.year, t.kind]), [[2023, 'champion'], [2025, 'regular'], [2025, 'second']]);
    assert.deepEqual(titleYears(a), [2023]);
    // b only ran roster 2 from 2024, so its 2023 finishes don't count for b
    const b = managerTrophies(awards, owns('b'));
    assert.deepEqual(b.map((t) => [t.year, t.title]), [[2025, 'League Champion']]);
    // with tookOver, older finishes for the roster are kept but flagged
    const both = managerTrophies(awards, (rid) => rid === 2, 2024);
    assert.deepEqual(both.map((t) => [t.year, t.kind, t.former]), [[2025, 'champion', false], [2023, 'division', true], [2023, 'second', true]]);
});

test('record book places', () => {
    const a = managerRecords(records, 'a', owns('a'));
    assert.deepEqual(a.map((r) => [r.label, r.rankText, r.value]), [
        ['All-time wins', '1st', '40 wins'],
        ['All-time lineup IQ', '1st', '90.0%'],
        ['Single week (all-time)', '1st', '2022 W5 · 300.5'],
        ['All-time points for', '2nd', '9,000.0'],
        ['Season points', '2nd', '2023 · 3,500.3'],
        ['Single week, 2025', '2nd', 'W9 · 250.0'],
    ]);
    // b gets 2025 records but not roster 2's 2023 season (before b ran it)
    const b = managerRecords(records, 'b', owns('b'));
    assert.deepEqual(b.map((r) => r.label), ['All-time points for', 'Single week, 2025', 'All-time wins', 'Single week (all-time)', 'All-time lineup IQ']);
});

test('lineup slots, bench, IR and taxi', () => {
    const players = { q: { fn: 'Drew', ln: 'Lock', pos: 'QB', t: 'SEA' }, r: { fn: 'Run', ln: 'Ner', pos: 'RB', t: 'SF' }, b1: { fn: 'Ben', ln: 'Ch', pos: 'WR', t: 'NO' }, ir: { fn: 'Hurt', ln: 'Guy', pos: 'TE', t: 'KC' } };
    const roster = { starters: ['q', '0', 'r'], players: ['q', 'r', 'b1', 'ir'], reserve: ['ir'], taxi: [] };
    const l = rosterLineup(roster, ['QB', 'SUPER_FLEX', 'IDP_FLEX', 'BN', 'BN'], players);
    assert.deepEqual(l.starters.map((s) => [s.slot, s.name]), [['QB', 'Drew Lock'], ['SF', null], ['IDP', 'Run Ner']]);
    assert.deepEqual(l.bench.map((p) => p.name), ['Ben Ch']);
    assert.deepEqual(l.reserve.map((p) => p.name), ['Hurt Guy']);
});

test('placeholder bios are hidden', () => {
    assert.equal(isPlaceholderText('Lorem ipsum...'), true);
    assert.equal(isPlaceholderText('TODO'), true);
    assert.equal(isPlaceholderText(''), true);
    assert.equal(isPlaceholderText('Bees can perceive time'), false);
});
