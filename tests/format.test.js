// Run with: npm test
import assert from 'assert/strict';
import { test } from 'node:test';
import { pct, pts, signed, record, projRecord, ordinal } from '../src/lib/AAA-Raymond/components/Shared/format.js';

test('percent: odds are never shown as a sure thing unless every run agreed', () => {
    assert.equal(pct(null), '–');
    assert.equal(pct(0), '–');
    assert.equal(pct(0.004), '<1%');
    assert.equal(pct(0.42), '42%');
    assert.equal(pct(0.996), '>99%');
    assert.equal(pct(1), '100%');
});

test('points, signed numbers and records', () => {
    assert.equal(pts(null), '–');
    assert.equal(pts(207.176), '207.2');
    assert.equal(pts('12'), '12.0');
    assert.equal(signed(3.14159), '+3.1');
    assert.equal(signed(-2.5, 2), '−2.50'); // a real minus sign
    assert.equal(signed(0), '0.0');
    assert.equal(record(9, 5), '9-5');
    assert.equal(record(9, 4, 1), '9-4-1');
    assert.equal(projRecord(9.44, 4.56), '9.4-4.6');
});

test('ordinals, including 11th-13th', () => {
    const want = { 1: '1st', 2: '2nd', 3: '3rd', 4: '4th', 11: '11th', 12: '12th', 13: '13th', 21: '21st', 22: '22nd', 23: '23rd', 101: '101st', 111: '111th', 112: '112th' };
    for (const [k, v] of Object.entries(want)) assert.equal(ordinal(Number(k)), v);
});
