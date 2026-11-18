// Run with: npm test
// Leagues with and without IDP / superflex (Nov 16): which position columns and labels the pages show.
import assert from 'assert/strict';
import { test } from 'node:test';
import { hasIdpSlots, hasSuperflex } from '../src/lib/AAA-Raymond/utils/positions.js';
import { lineupColumns } from '../src/lib/AAA-Raymond/utils/positionAverages.js';
import { rosterPositionAveragesColumnOrder as BY_SLOT, playerPositionAveragesColumnOrder as BY_POS } from '../src/lib/AAA-Raymond/components/RayStandings/constants.js';

// The Dynasty League IDP SF and The Gang Attempts Dynasty FF (Sleeper roster_positions, Nov 2026)
const DYNASTY = ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'FLEX', 'FLEX', 'SUPER_FLEX', 'IDP_FLEX', 'DL', 'DL', 'DL', 'LB', 'LB', 'LB', 'DB', 'DB', 'DB', 'BN', 'BN'];
const GANG = ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'FLEX', 'BN', 'BN', 'BN'];

test('IDP and superflex come from the lineup', () => {
    assert.equal(hasIdpSlots(DYNASTY), true);
    assert.equal(hasIdpSlots(GANG), false);
    assert.equal(hasIdpSlots(['QB', 'DE', 'CB', 'BN']), true); // specific defensive slots
    assert.equal(hasIdpSlots(['QB', 'K', 'DEF']), false); // a team defense isn't IDP
    assert.equal(hasIdpSlots(undefined), false);
    assert.equal(hasSuperflex(DYNASTY), true);
    assert.equal(hasSuperflex(GANG), false);
});

test('The Dynasty League keeps every column', () => {
    assert.deepEqual(lineupColumns(BY_SLOT, DYNASTY, 'roster'), BY_SLOT);
    assert.deepEqual(lineupColumns(BY_POS, DYNASTY, 'player'), BY_POS);
});

test('a league without IDP or superflex: offense only, QB instead of QB+SF, no offense/defense split', () => {
    assert.deepEqual(lineupColumns(BY_SLOT, GANG, 'roster').map((c) => c.name), ['Total', 'QB', 'RB', 'WR', 'TE', 'Flex']);
    assert.deepEqual(lineupColumns(BY_POS, GANG, 'player').map((c) => c.name), ['Total', 'QB', 'RB', 'WR', 'TE']);
    assert.equal(lineupColumns(BY_SLOT, GANG, 'roster')[1].field, 'QB+Flex'); // same data key
});

import { allLeagueTeam, groupFor, leagueGroups } from '../src/lib/AAA-Raymond/utils/seasonAwards.js';

test('a WR who is also listed at CB is a WR in a league without IDP (awards)', () => {
    const hunter = { fn: 'Travis', ln: 'Hunter', pos: 'CB', positions: ['WR', 'CB'] };
    assert.equal(groupFor(hunter), 'DB'); // an IDP league
    assert.equal(groupFor(hunter, leagueGroups(GANG)), 'WR');
    assert.deepEqual(leagueGroups(DYNASTY), leagueGroups([])); // all groups
    const team = allLeagueTeam([{ playerID: 'th', points: 48.8, rosterID: '3' }], { th: hunter }, GANG);
    assert.deepEqual(team.map((s) => `${s.slot}:${s.pos}`), ['WR:WR']);
});
