// Run with: npm test
// The position averages used to hard-code this league's lineup indexes; they now come from roster_positions.
// The reference functions below are the old code, kept here to prove the new version gives the same numbers.
import assert from 'assert/strict';
import { test } from 'node:test';
import { positionAverages, starterSlots, slotBuckets } from '../src/lib/AAA-Raymond/utils/positionAverages.js';

const LEAGUE_LINEUP = ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'FLEX', 'FLEX', 'SUPER_FLEX', 'IDP_FLEX',
    'DL', 'DL', 'DL', 'LB', 'LB', 'LB', 'DB', 'DB', 'DB', 'BN', 'BN', 'BN', 'IR'];

// ---- old implementation (leagueStandings.js before the change) ----
function addValue(map, id, key, value) {
    map[id] ??= {};
    map[id][key] = value + (map[id][key] ?? 0);
}
function oldRoster(matchupsData, week) {
    const out = {};
    for (const wk of matchupsData) for (const v of wk) {
        const s = v.starters_points, u = v.roster_id;
        const map = ['QB+Flex', 'RB', 'RB', 'WR', 'WR', 'TE', 'WRT', 'WRT', 'WRT', 'QB+Flex', 'IDP', 'DL', 'DL', 'DL', 'LB', 'LB', 'LB', 'DB', 'DB', 'DB'];
        map.forEach((key, i) => addValue(out, u, key, s[i]));
        s.forEach((x) => addValue(out, u, 'Team', x));
        s.slice(0, 10).forEach((x) => addValue(out, u, 'Off', x));
        s.slice(10, 20).forEach((x) => addValue(out, u, 'Def', x));
    }
    for (const t in out) for (const k in out[t]) out[t][k] /= week;
    return out;
}
function oldPlayer(matchupsData, week) {
    const out = {};
    for (const wk of matchupsData) for (const v of wk) {
        const s = v.starters_points, u = v.roster_id;
        const map = { 0: 'QB', 1: 'RB', 2: 'RB', 3: 'WR', 4: 'WR', 5: 'TE', 11: 'DL', 12: 'DL', 13: 'DL', 14: 'LB', 15: 'LB', 16: 'LB', 17: 'DB', 18: 'DB', 19: 'DB' };
        for (const i in map) addValue(out, u, map[i], s[i]);
        s.forEach((x) => addValue(out, u, 'Team', x));
        s.slice(0, 10).forEach((x) => addValue(out, u, 'Off', x));
        s.slice(10, 20).forEach((x) => addValue(out, u, 'Def', x));
    }
    for (const t in out) for (const k in out[t]) out[t][k] /= week;
    return out;
}

// deterministic fake season: 12 teams, 8 completed weeks, 20 starters each
let seed = 7;
const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const matchupsData = [...Array(8)].map(() =>
    [...Array(12)].map((_, t) => ({ roster_id: t + 1, starters_points: [...Array(20)].map(() => Math.round(rand() * 3000) / 100) })));

const close = (a, b) => {
    assert.deepEqual(Object.keys(a).sort(), Object.keys(b).sort());
    for (const id in a) {
        assert.deepEqual(Object.keys(a[id]).sort(), Object.keys(b[id]).sort(), `buckets for team ${id}`);
        for (const k in a[id]) assert.ok(Math.abs(a[id][k] - b[id][k]) < 1e-9, `team ${id} ${k}: ${a[id][k]} vs ${b[id][k]}`);
    }
};

test('starter slots stop at the first bench spot', () => {
    assert.equal(starterSlots(LEAGUE_LINEUP).length, 20);
    assert.deepEqual(starterSlots(['QB', 'RB']), ['QB', 'RB']);
    assert.deepEqual(slotBuckets(['DE'])[0], { roster: 'DL', player: 'DL', side: 'Def' });
});

test('per-roster averages match the old hard-coded version for this league', () => {
    close(positionAverages(matchupsData, 8, LEAGUE_LINEUP, 'roster'), oldRoster(matchupsData, 8));
});

test('per-player averages match the old hard-coded version for this league', () => {
    close(positionAverages(matchupsData, 8, LEAGUE_LINEUP, 'player'), oldPlayer(matchupsData, 8));
});

test('a different lineup no longer breaks the numbers', () => {
    const lineup = ['QB', 'RB', 'WR', 'TE', 'FLEX', 'K', 'DEF', 'BN'];
    const data = [[{ roster_id: 1, starters_points: [20, 10, 12, 8, 6, 9, 7] }]];
    const roster = positionAverages(data, 1, lineup, 'roster')[1];
    assert.equal(roster.Team, 72);
    assert.equal(roster.Off, 65);
    assert.equal(roster.Def, 7);
    assert.equal(roster.WRT, 6);
    assert.equal(roster.K, 9);
});
