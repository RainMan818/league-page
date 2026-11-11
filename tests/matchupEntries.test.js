// Run with: npm test
import assert from 'assert/strict';
import { test } from 'node:test';
import { toEntry, entriesByWeek, completedWeeksNewestFirst, toTemplateMatchups, weekStatus, firstUnfinishedWeek } from '../src/lib/AAA-Raymond/utils/matchupEntries.js';
import { pairMatchups } from '../src/lib/AAA-Raymond/utils/leagueInsights.js';

// shape of the template's processed matchups (getLeagueMatchups -> matchupWeeks)
const tpl = (roster_id, matchup_id, starterPoints, total) => ({
    roster_id, matchup_id, starters: ['a', 'b'], points: starterPoints, players: ['a', 'b', 'c'], playersPoints: { a: 1, b: 2, c: 3 }, total,
});
const matchupWeeks = [
    { week: 1, matchups: { 1: [tpl(1, 1, [10, 5], 15), tpl(2, 1, [8, 4], 12)], 2: [tpl(3, 2, [1, 1], 2), tpl(4, 2, [2, 2], 4)] } },
    { week: 2, matchups: { 1: [tpl(1, 1, [3, 3], undefined), tpl(3, 1, [9, 9], 18)] } },
];

test('template entries convert back to the Sleeper shape', () => {
    const e = toEntry(tpl(1, 1, [10, 5], 15));
    assert.deepEqual(e, { roster_id: 1, matchup_id: 1, points: 15, starters: ['a', 'b'], starters_points: [10, 5], players: ['a', 'b', 'c'], players_points: { a: 1, b: 2, c: 3 } });
    assert.equal(toEntry(tpl(1, 1, [3, 3], undefined)).points, 6); // no total -> sum of starters
});

test('weeks are keyed by week number and pair back up by matchup', () => {
    const weeks = entriesByWeek(matchupWeeks);
    assert.deepEqual(Object.keys(weeks), ['1', '2']);
    assert.equal(weeks[1].length, 4);
    const pairs = pairMatchups(weeks[1]).map(([a, b]) => [a.roster_id, b.roster_id].sort().join('v'));
    assert.deepEqual(pairs.sort(), ['1v2', '3v4']);
});

test('completed weeks come newest first, missing weeks as empty', () => {
    const weeks = entriesByWeek(matchupWeeks);
    const out = completedWeeksNewestFirst(weeks, 3);
    assert.equal(out.length, 3);
    assert.deepEqual(out[0], []); // week 3 not downloaded
    assert.equal(out[1][0].roster_id, 1); // week 2
    assert.equal(out[2].length, 4); // week 1
});

test('a refreshed week converts to the template shape and back', () => {
    const raw = [
        { roster_id: 1, matchup_id: 1, points: 15, starters: ['a'], starters_points: [15], players: ['a', 'b'], players_points: { a: 15, b: 2 } },
        { roster_id: 2, matchup_id: 1, points: 12, starters: ['c'], starters_points: [12], players: ['c'], players_points: { c: 12 } },
    ];
    const tpl = toTemplateMatchups(raw);
    assert.deepEqual(Object.keys(tpl), ['1']);
    assert.equal(tpl[1].length, 2);
    // round trip: template shape -> raw entries gives the original back
    assert.deepEqual(entriesByWeek([{ week: 9, matchups: tpl }])[9], raw);
});

test('week status: final before the current week, live on it, upcoming after', () => {
    assert.equal(weekStatus(8, 9), 'final');
    assert.equal(weekStatus(9, 9), 'live');
    assert.equal(weekStatus(10, 9), 'upcoming');
    assert.equal(weekStatus(3, null), 'final');
});

test('a week Sleeper has scored is final even while it is still the display week', () => {
    assert.equal(weekStatus(9, 9, 9), 'final');
    assert.equal(weekStatus(10, 9, 9), 'upcoming');
    assert.equal(weekStatus(9, 9, 8), 'live');
});

test('first unfinished week uses the later of display_week and last scored week + 1', () => {
    const reg = (display_week) => ({ season_type: 'regular', display_week });
    const league = (last_scored_leg) => ({ settings: { last_scored_leg } });
    assert.equal(firstUnfinishedWeek(reg(9), league(9), 14), 10); // Tuesday: week 9 scored, display_week not flipped yet
    assert.equal(firstUnfinishedWeek(reg(10), league(9), 14), 10); // Wednesday on
    assert.equal(firstUnfinishedWeek(reg(9), league(8), 14), 9); // week 9 still being played
    assert.equal(firstUnfinishedWeek(reg(16), league(15), 14), 15); // capped after the regular season
    assert.equal(firstUnfinishedWeek({ season_type: 'post' }, league(16), 14), 15);
    assert.equal(firstUnfinishedWeek({ season_type: 'pre' }, league(0), 14), 0);
    assert.equal(firstUnfinishedWeek(reg(3), {}, 14), 3); // no league settings
});
