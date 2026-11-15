// Run with: npm test
import assert from 'assert/strict';
import { test } from 'node:test';
import { predictLineup, predictScores, getStarterPositions } from '../src/lib/AAA-Raymond/utils/predictOptimalScore.js';

const P = (id, pos, pts, positions) => ({ id, pos, positions: positions ?? [pos], wi: { 1: { p: String(pts) } } });
const league = (slots) => ({ roster_positions: [...slots, 'BN', 'BN'] });

test('starting slots are everything before the bench (or every slot when there is no bench)', () => {
    assert.deepEqual(getStarterPositions(league(['QB', 'FLEX'])), ['QB', 'FLEX']);
    assert.deepEqual(getStarterPositions({ roster_positions: ['QB', 'RB'] }), ['QB', 'RB']);
});

test('players are moved to make room for a better lineup', () => {
    // the DL/LB player takes the DL slot first (his listed position); the pure DL can only play DL, so the
    // DL/LB player moves to LB to make room: 10 + 8, not 10 alone
    const players = [P('x', 'DL', 10, ['DL', 'LB']), P('d', 'DL', 8)];
    const { score, picks } = predictLineup(players, 1, league(['DL', 'LB']));
    assert.equal(score, 18);
    assert.deepEqual(picks.map((p) => [p.slot, p.id]), [['DL', 'd'], ['LB', 'x']]);
});

test('a player can fill any slot his Sleeper positions allow', () => {
    // a TE who is also WR-eligible fills the WR slot
    const players = [P('t', 'TE', 12, ['TE', 'WR']), P('t2', 'TE', 9)];
    assert.deepEqual(predictLineup(players, 1, league(['WR', 'TE'])).picks.map((p) => [p.slot, p.id]), [['WR', 't'], ['TE', 't2']]);
});

test('flex slots take the best player left after the regular slots, by listed position first', () => {
    const players = [P('r1', 'RB', 20), P('r2', 'RB', 15), P('w1', 'WR', 14), P('q1', 'QB', 25), P('q2', 'QB', 11)];
    const { score, picks } = predictLineup(players, 1, league(['QB', 'RB', 'WR', 'FLEX', 'SUPER_FLEX']));
    assert.equal(score, 25 + 20 + 14 + 15 + 11);
    assert.deepEqual(picks.map((p) => [p.slot, p.id]), [['QB', 'q1'], ['RB', 'r1'], ['WR', 'w1'], ['FLEX', 'r2'], ['SUPER_FLEX', 'q2']]);
});

test('unfillable slots stay empty; no players, no points', () => {
    const { score, picks } = predictLineup([P('k', 'K', 9)], 1, league(['QB', 'K']));
    assert.equal(score, 9);
    assert.deepEqual(picks.map((p) => p.slot), ['K']);
    assert.equal(predictScores([], 1, league(['QB'])), 0);
    assert.equal(predictScores(null, 1, league(['QB'])), 0);
});

test('a missing week counts as zero points', () => {
    assert.equal(predictScores([P('q', 'QB', 30)], 2, league(['QB'])), 0);
});
