// Run with: npm test
import assert from 'assert/strict';
import { test } from 'node:test';
import { sleeperManagers, managersFor } from '../src/lib/AAA-Raymond/utils/siteManagers.js';

const ltm = {
    currentSeason: 2026,
    teamManagersMap: {
        2026: { 10: { team: { name: 'Shadynasty' }, managers: ['u10'] }, 2: { team: { name: 'AiMz' }, managers: ['u2', 'u2b'] }, 3: { team: { name: 'Open' }, managers: [] } },
        2025: { 1: { team: { name: 'Old' }, managers: ['gone'] } },
    },
    users: { u10: { display_name: 'dan' }, u2: { display_name: 'amy' }, gone: { display_name: 'old' } },
};

test('a league without a managers list gets one manager per current team, by roster number', () => {
    assert.deepEqual(sleeperManagers(ltm), [
        { managerID: 'u2', name: 'amy', roster: 2 }, // co-managed: the first manager
        { managerID: 'u10', name: 'dan', roster: 10 },
    ]); // roster 3 has no owner; last season's managers aren't listed
    assert.deepEqual(sleeperManagers(null), []);
});

test('the profile\'s managers win when there are any', () => {
    const configured = [{ managerID: 'u10', name: 'Dan B.' }];
    assert.equal(managersFor(configured, ltm), configured);
    assert.equal(managersFor([], ltm).length, 2);
});
