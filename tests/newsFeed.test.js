// Run with: npm test
import assert from 'assert/strict';
import { test } from 'node:test';
import { newsItems, plainText, timeAgo, sourceOf, sourceCounts } from '../src/lib/AAA-Raymond/utils/newsFeed.js';

const NOW = Date.UTC(2026, 10, 15, 9, 0); // Nov 15 2026, 1:00 AM Pacific

test('plain text: tags, entities and the WordPress footer go', () => {
    assert.equal(plainText('<p>Rich &amp; Garret&#8217;s mailbag.</p> <p>The post <a href="x">Mailbag</a> appeared first on Dynasty Nerds.</p>'), 'Rich & Garret’s mailbag.');
    assert.equal(plainText('a&#160;b'), 'a b');
    const long = plainText('word '.repeat(100), 20);
    assert.ok(long.endsWith('…') && long.length <= 21);
});

test('time ago', () => {
    assert.equal(timeAgo(NOW - 20 * 1000, NOW), 'just now');
    assert.equal(timeAgo(NOW - 25 * 60000, NOW), '25m ago');
    assert.equal(timeAgo(NOW - 13 * 3600000, NOW), '13h ago');
    assert.equal(timeAgo(NOW - 3 * 86400000, NOW), '3d ago');
    assert.equal(timeAgo(Date.UTC(2026, 9, 30, 20), NOW), 'Oct 30');
});

test('sources: known sites, Reddit, anything else', () => {
    assert.equal(sourceOf('Dynasty League Football').label, 'DLF');
    const r = sourceOf('r/DynastyFF - u/someone');
    assert.equal(r.key, 'r/DynastyFF');
    assert.equal(r.ab, 'R');
    assert.equal(sourceOf('Some Site').ab, 'SO');
});

test('news rows: newest first, links decoded, kinds, duplicates dropped', () => {
    const rows = newsItems([
        { title: 'Old', author: 'Dynasty League Football', ts: NOW - 86400000, link: 'https://dlf.com/a', article: 'We look at rookies.' },
        { title: 'Ep. 947 &#124; Rookies', author: 'Dynasty Nerds', ts: NOW - 3600000, link: 'https://www.dynastynerds.com/podcast/x/?utm_source=rss&#038;utm_medium=rss', article: '<p>Should you sell?</p>' },
        { title: 'Show for 11/13', author: 'Fantasy Footballers', ts: NOW - 7200000, link: 'https://www.thefantasyfootballers.com/ep1', article: 'Start/sit.' },
        { title: 'Trade help', author: 'r/DynastyFF - u/x', ts: NOW - 60000, link: 'https://www.reddit.com/r/DynastyFF/1', article: '<a href="https://i.redd.it/x.png" class="body-link">https://i.redd.it/x.png</a>' },
        { title: 'Old', author: 'Dynasty League Football', ts: NOW - 86400000, link: 'https://dlf.com/a' }, // repeat
        { title: 'Show for 11/12', author: 'Fantasy Footballers', ts: NOW - 90000000, link: 'https://www.thefantasyfootballers.com/ep1' }, // same link, new episode
    ], NOW);
    assert.deepEqual(rows.map((r) => r.title), ['Trade help', 'Ep. 947 | Rookies', 'Show for 11/13', 'Old', 'Show for 11/12']);
    assert.equal(rows[1].link, 'https://www.dynastynerds.com/podcast/x/?utm_source=rss&utm_medium=rss');
    assert.deepEqual(rows.map((r) => r.kind), ['Post', 'Podcast', 'Podcast', 'Article', 'Podcast']);
    assert.equal(rows[0].excerpt, ''); // link-only post
    assert.equal(rows[1].ago, '1h ago');
    assert.deepEqual(sourceCounts(rows).map((c) => [c.label, c.n]), [['Dynasty Nerds', 1], ['DLF', 1], ['Footballers', 2], ['r/DynastyFF', 1]]);
});
