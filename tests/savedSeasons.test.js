// Run with: npm test
import assert from 'assert/strict';
import { test } from 'node:test';
import { createSavedStore, isFinishedLeague, SAVED_SEASONS_VERSION, SAVED_SEASONS_MAX_AGE } from '../src/lib/AAA-Raymond/utils/savedSeasons.js';

const memoryStorage = () => {
    const m = new Map();
    return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), map: m };
};

test('only finished past leagues are kept, never the current one', () => {
    assert.equal(isFinishedLeague({ league_id: '111', status: 'complete' }, '999'), true);
    assert.equal(isFinishedLeague({ league_id: '999', status: 'complete' }, '999'), false); // the season just finished
    assert.equal(isFinishedLeague({ league_id: '111', status: 'in_season' }, '999'), false);
    assert.equal(isFinishedLeague(undefined, '999'), false);
});

test('saved answers survive a page load and are refreshed after a week', () => {
    const storage = memoryStorage();
    let t = 1000;
    createSavedStore(storage, { now: () => t }).save('league/111/users', [{ user_id: 'a' }]);
    const next = createSavedStore(storage, { now: () => t }); // a new page load reads the same entry
    assert.deepEqual(next.read('league/111/users'), [{ user_id: 'a' }]);
    assert.equal(next.read('league/111/rosters'), null);
    t += SAVED_SEASONS_MAX_AGE + 1;
    assert.equal(next.read('league/111/users'), null);
});

test('callers get copies; an older version or broken storage starts empty', () => {
    const storage = memoryStorage();
    const store = createSavedStore(storage);
    store.save('league/111', { season: '2024' });
    const copy = store.read('league/111');
    copy.season = 'changed';
    assert.equal(store.read('league/111').season, '2024');

    storage.setItem('rr-pastSeasons', JSON.stringify({ version: SAVED_SEASONS_VERSION + 1, items: { x: { savedAt: Date.now(), data: 1 } } }));
    assert.equal(createSavedStore(storage).read('x'), null);
    storage.setItem('rr-pastSeasons', '{not json');
    assert.equal(createSavedStore(storage).read('x'), null);
    // no storage (the server): nothing kept, nothing breaks
    const none = createSavedStore(null);
    none.save('a', 1);
    assert.equal(none.read('a'), null);
});
