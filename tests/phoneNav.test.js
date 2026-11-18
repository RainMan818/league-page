// Run with: npm test
import assert from 'assert/strict';
import { test } from 'node:test';
import { rowAndMore, isCurrent, isExternal } from '../src/lib/AAA-Raymond/components/PhoneNav/phoneNav.js';

const TABS = [
    { label: 'Home', dest: '/' }, { label: 'Matchups', dest: '/matchups' }, { label: 'Standings', dest: '/standings' },
    { label: 'Trends', dest: '/trends' }, { label: 'Trades & Waivers', dest: '/transactions' }, { label: 'Blog', dest: '/blog' },
    { label: 'Clubhouse', nest: true, children: [{ label: 'Rosters', dest: '/rosters' }, { label: 'Managers', dest: '/managers' }, { label: 'Go to Sleeper', dest: 'https://sleeper.app/leagues/1' }] },
];

test('the row has the main pages (short labels); More has the Clubhouse pages, plus the blog when it is on', () => {
    const { row, more, moreLabel } = rowAndMore(TABS);
    assert.deepEqual(row.map((t) => t.short), ['Home', 'Matchups', 'Standings', 'Trends', 'Moves']);
    assert.deepEqual(more.map((t) => t.label), ['Rosters', 'Managers', 'Go to Sleeper']);
    assert.equal(moreLabel, 'Clubhouse');
    assert.deepEqual(rowAndMore(TABS, { enableBlog: true }).more.map((t) => t.label).at(-1), 'Blog');
});

test('the page you are on', () => {
    assert.equal(isCurrent('/', '/'), true);
    assert.equal(isCurrent('/', '/standings'), false);
    assert.equal(isCurrent('/standings', '/standings'), true);
    assert.equal(isCurrent('/blog', '/blog/some-post'), true);
    assert.equal(isCurrent('/managers', '/manager'), true); // one manager's page
    assert.equal(isCurrent('/matchups', '/matchupsX'), false);
    assert.equal(isCurrent('https://sleeper.app/leagues/1', '/'), false);
    assert.equal(isExternal('https://sleeper.app/leagues/1'), true);
    assert.equal(isExternal('/rosters'), false);
});
