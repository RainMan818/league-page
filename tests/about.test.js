// Run with: npm test
import assert from 'assert/strict';
import { test } from 'node:test';
import { aboutPages, pageText, PAGES } from '../src/lib/AAA-Raymond/components/RayAbout/content.js';

const tabs = [
    { icon: 'home', label: 'Home', dest: '/' },
    { icon: 'sports', label: 'Matchups', dest: '/matchups' },
    { icon: 'article', label: 'Blog', dest: '/blog' },
    {
        icon: 'view_comfy', label: 'Clubhouse', nest: true, children: [
            { icon: 'format_list_numbered', label: 'Drafts', dest: '/drafts' },
            { icon: 'sports_football', label: 'Go to Sleeper', dest: 'https://sleeper.app/leagues/1' },
            { icon: 'settings', label: 'Settings', dest: '/settings' },
            { icon: 'info', label: 'About', dest: '/about' },
        ],
    },
];

test('the list follows the nav: main pages, then the Clubhouse menu, without links or pages with no text', () => {
    const { main, club } = aboutPages(tabs);
    assert.deepEqual(main.map((p) => p.label), ['Home', 'Matchups']);
    assert.deepEqual(club.map((p) => p.label), ['Drafts', 'Settings']);
    assert.equal(club[0].icon, 'format_list_numbered');
});

test('lines follow the league', () => {
    const home = (f) => pageText(PAGES['/'], f).how.join(' ');
    assert.match(home({ houseRules: true }), /Payouts/);
    assert.doesNotMatch(home({ houseRules: false }), /Payouts/);
    const matchups = (f) => pageText(PAGES['/matchups'], f).how.join(' ');
    assert.match(matchups({ median: true }), /M badge/);
    assert.doesNotMatch(matchups({}), /M badge/);
    assert.equal(pageText(PAGES['/drafts'], { dynasty: true }).what, 'Every draft board, plus the next one.');
    assert.equal(pageText(PAGES['/drafts'], { dynasty: false }).what, 'Every draft board.');
    assert.doesNotMatch(pageText(PAGES['/standings'], {}).how.join(' '), /draft pick/);
    assert.match(pageText(PAGES['/standings'], { dynasty: true }).how.join(' '), /draft pick/);
    assert.doesNotMatch(pageText(PAGES['/rosters'], {}).how.join(' '), /draft picks/);
});

test('every page in the real nav has text, and every line is a sentence', () => {
    for (const dest of ['/', '/matchups', '/standings', '/trends', '/transactions', '/rosters', '/players', '/drafts',
        '/managers', '/rivalry', '/awards', '/records', '/constitution', '/resources', '/settings']) {
        assert.ok(PAGES[dest], dest);
        const { what, how } = pageText(PAGES[dest], { houseRules: true, median: true, dynasty: true });
        for (const s of [what, ...how]) assert.match(s, /[.)]$/, `${dest}: ${s}`);
    }
});
