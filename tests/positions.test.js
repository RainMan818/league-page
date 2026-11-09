// Run with: npm test
import assert from 'assert/strict';
import { test } from 'node:test';
import { groupOf, playerGroup, idpGroup, posColor, playerPhoto, IDP_GROUPS } from '../src/lib/AAA-Raymond/utils/positions.js';
import { positionGroup, RECAP_POSITIONS } from '../src/lib/AAA-Raymond/utils/leagueInsights.js';

test('specific defender positions fold into DL / LB / DB', () => {
    assert.equal(groupOf('DE'), 'DL');
    assert.equal(groupOf('NT'), 'DL');
    assert.equal(groupOf('OLB'), 'LB');
    assert.equal(groupOf('CB'), 'DB');
    assert.equal(groupOf('S'), 'DB');
    assert.equal(groupOf('WR'), 'WR');
    assert.equal(groupOf('XYZ'), 'XYZ'); // unknown positions pass through
});

test('idpGroup: own position first, then other fantasy positions; undefined for offense', () => {
    assert.equal(idpGroup({ pos: 'CB' }), 'DB');
    assert.equal(idpGroup({ pos: 'LB', positions: ['LB', 'DL'] }), 'LB');
    assert.equal(idpGroup({ pos: 'OL', positions: ['DL'] }), 'DL');
    assert.equal(idpGroup({ pos: 'WR', positions: ['WR'] }), undefined);
    assert.equal(idpGroup(null), undefined);
});

test('recap positionGroup keeps its old behavior', () => {
    assert.equal(positionGroup(null), null);
    assert.equal(positionGroup({ pos: 'DE' }), 'DL');
    assert.equal(positionGroup({ pos: 'FS' }), 'DB');
    assert.equal(positionGroup({ pos: 'OL', positions: ['TE'] }), 'TE'); // falls back to another recap position
    assert.equal(positionGroup({ pos: 'OL', positions: ['OL'] }), 'OL'); // nothing fits: own position
    assert.equal(playerGroup({ pos: 'K' }, RECAP_POSITIONS), 'K');
    assert.deepEqual(IDP_GROUPS, ['DL', 'LB', 'DB']);
});

test('colors and photos', () => {
    assert.equal(posColor('CB'), 'var(--or-pos-DB)');
    assert.equal(posColor('WR'), 'var(--or-pos-WR)');
    assert.equal(posColor('???'), 'var(--or-pos-K)');
    assert.match(playerPhoto('4046', 'QB'), /players\/thumb\/4046\.jpg/);
    assert.match(playerPhoto('SF', 'DEF'), /team_logos\/nfl\/sf\.png/);
});
