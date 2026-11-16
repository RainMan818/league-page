// Run with: npm test
import assert from 'assert/strict';
import { test } from 'node:test';
import { RESOURCE_GROUPS, resourceGroups, fantasyProsChartUrl } from '../src/lib/AAA-Raymond/components/RayResources/links.js';

test('FantasyPros chart address uses a two-digit month', () => {
    assert.equal(
        fantasyProsChartUrl(new Date(2026, 2, 15)),
        'https://www.fantasypros.com/2026/03/fantasy-football-rankings-dynasty-trade-value-chart-march-2026-update/'
    );
    assert.match(fantasyProsChartUrl(new Date(2026, 10, 1)), /\/2026\/11\/.*-november-2026-update\/$/);
});

test('dynasty leagues get the dynasty links, redraft leagues the redraft ones', () => {
    const all = (groups) => groups.flatMap((g) => g.links);
    const dynasty = all(resourceGroups(true));
    const redraft = all(resourceGroups(false));
    assert.ok(dynasty.length && redraft.length);
    assert.ok(dynasty.every((l) => !l.redraftOnly));
    assert.ok(redraft.every((l) => !l.dynastyOnly));
    assert.ok(dynasty.some((l) => l.name === 'r/DynastyFF'));
    assert.ok(!redraft.some((l) => l.name === 'r/DynastyFF'));
    // groups left empty by the filter are dropped
    assert.ok(resourceGroups(false).every((g) => g.links.length));
});

test('every link is a unique https address with a name and a note', () => {
    const links = RESOURCE_GROUPS.flatMap((g) => g.links);
    for (const l of links) {
        assert.match(l.url, /^https:\/\//, l.name);
        assert.ok(l.name && l.note, l.url);
    }
    assert.equal(new Set(links.map((l) => l.url)).size, links.length);
});
