// Run with: npm test
import assert from 'assert/strict';
import { test } from 'node:test';
import { createSavedStore, isFinishedLeague, seasonJson, seasonScores, SAVED_SEASONS_VERSION, SAVED_SEASONS_MAX_AGE } from '../src/lib/AAA-Raymond/utils/savedSeasons.js';

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

test('permanent answers (finished seasons\' scores) are never refreshed', () => {
    const storage = memoryStorage();
    let t = 1000;
    createSavedStore(storage, { now: () => t }).save('scores/111/3', [{ roster_id: 1, points: 200 }], { permanent: true });
    t += SAVED_SEASONS_MAX_AGE * 50;
    assert.deepEqual(createSavedStore(storage, { now: () => t }).read('scores/111/3'), [{ roster_id: 1, points: 200 }]);
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

test('full or blocked storage keeps the answer for this page load; unreadable saved data starts empty', () => {
    const full = { getItem: () => null, setItem: () => { throw new Error('QuotaExceeded'); } };
    const store = createSavedStore(full);
    store.save('league/1/users', [1]);
    assert.deepEqual(store.read('league/1/users'), [1]);
    const garbled = createSavedStore({ getItem: () => '{not json', setItem: () => {} });
    assert.equal(garbled.read('league/1/users'), null);
    const none = createSavedStore(null); // the server: nothing is kept
    none.save('league/1/users', [1]);
    assert.equal(none.read('league/1/users'), null);
});

test('seasonJson downloads (trimmed by keep); seasonScores keeps only team, matchup and points', async () => {
    const real = globalThis.fetch;
    const calls = [];
    try {
        globalThis.fetch = async (url) => {
            calls.push(String(url));
            const body = String(url).includes('/matchups/')
                ? [{ roster_id: 1, matchup_id: 2, points: 101.5, players: ['a'], starters: ['a'] }, { roster_id: 3 }]
                : { name: 'L', extra: true };
            return new Response(JSON.stringify(body), { status: 200 });
        };
        assert.deepEqual(await seasonJson('league/9', false, ({ name }) => ({ name })), { name: 'L' });
        assert.deepEqual(await seasonScores('9', 3, true), [{ roster_id: 1, matchup_id: 2, points: 101.5 }, { roster_id: 3, matchup_id: null, points: 0 }]);
        assert.deepEqual(calls, ['https://api.sleeper.app/v1/league/9', 'https://api.sleeper.app/v1/league/9/matchups/3']);
    } finally {
        globalThis.fetch = real;
    }
});
