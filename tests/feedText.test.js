// Run with: npm test
import assert from 'assert/strict';
import { test } from 'node:test';
import { decodeEntities } from '../src/lib/AAA-Raymond/utils/feedText.js';

test('feed titles: numeric, hex and named entities become plain text', () => {
    assert.equal(decodeEntities('Week 10 &#124; Starts &amp; Sits'), 'Week 10 | Starts & Sits');
    assert.equal(decodeEntities('Ja&#x2019;Marr &lt;3 &quot;CheatChart&quot; &apos;26&nbsp;'), 'Ja’Marr <3 "CheatChart" \'26 ');
    assert.equal(decodeEntities('&AMP; is case-insensitive'), '& is case-insensitive');
});

test('unknown entities and plain text are left alone; missing titles become empty', () => {
    assert.equal(decodeEntities('Fantasy &hellip; Football'), 'Fantasy &hellip; Football');
    assert.equal(decodeEntities('No entities here'), 'No entities here');
    assert.equal(decodeEntities(undefined), '');
    assert.equal(decodeEntities(null), '');
});
