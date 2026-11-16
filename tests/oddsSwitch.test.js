// Run with: npm test
import assert from 'assert/strict';
import { test } from 'node:test';
import { oddsValue, resolveOdds, withoutOddsParam, ODDS_PARAM } from '../src/lib/AAA-Raymond/utils/oddsSwitch.js';

test('parameter values: on / off in a few spellings, anything else ignored', () => {
    for (const v of ['on', 'ON', '1', 'true', ' yes ']) assert.equal(oddsValue(v), 'on');
    for (const v of ['off', '0', 'false', 'No']) assert.equal(oddsValue(v), 'off');
    for (const v of [null, undefined, '', 'maybe', 'onn']) assert.equal(oddsValue(v), null);
});

test('the address wins, then the saved choice, then the site default', () => {
    assert.deepEqual(resolveOdds({ param: 'on', saved: 'off' }), { show: true, save: 'on' });
    assert.deepEqual(resolveOdds({ param: 'off', saved: 'on', fallback: true }), { show: false, save: 'off' });
    assert.deepEqual(resolveOdds({ param: null, saved: 'on' }), { show: true, save: null });
    assert.deepEqual(resolveOdds({ param: 'typo', saved: 'off', fallback: true }), { show: false, save: null });
    assert.deepEqual(resolveOdds({ fallback: true }), { show: true, save: null });
    assert.deepEqual(resolveOdds(), { show: false, save: null });
});

test('the parameter is taken out of the address, the rest stays', () => {
    assert.equal(ODDS_PARAM, 'odds');
    assert.equal(withoutOddsParam('https://x.app/?odds=on'), 'https://x.app/');
    assert.equal(withoutOddsParam('https://x.app/?view=standings&odds=on#top'), 'https://x.app/?view=standings#top');
    assert.equal(withoutOddsParam('https://x.app/rosters?team=3'), 'https://x.app/rosters?team=3');
});
