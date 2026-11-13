// Run with: npm test
import assert from 'assert/strict';
import { test } from 'node:test';
import { recordsMeta, isRecordsFresh, RECORDS_CACHE_VERSION } from '../src/lib/AAA-Raymond/utils/recordsCache.js';

const now = Date.UTC(2026, 10, 12, 8, 0);
const saved = recordsMeta({ season: 2026, lastScored: 9, now });

test('saved records stay fresh until Sleeper scores another week', () => {
    assert.deepEqual(saved, { version: RECORDS_CACHE_VERSION, savedAt: now, season: '2026', lastScored: 9 });
    assert.equal(isRecordsFresh(saved, { season: '2026', lastScored: 9 }), true);
    assert.equal(isRecordsFresh(saved, { season: '2026', lastScored: 10 }), false);
});

test('age alone never makes them stale (only a newly scored week does)', () => {
    const muchLater = now + 30 * 24 * 3600e3;
    assert.equal(isRecordsFresh(saved, { season: '2026', lastScored: 9, now: muchLater }), true);
});

test('a new season, an older version or records saved before this check are rebuilt', () => {
    assert.equal(isRecordsFresh(saved, { season: '2027', lastScored: 0, now }), false);
    assert.equal(isRecordsFresh({ ...saved, version: RECORDS_CACHE_VERSION - 1 }, { season: '2026', lastScored: 9, now }), false);
    assert.equal(isRecordsFresh(undefined, { season: '2026', lastScored: 9, now }), false);
});
