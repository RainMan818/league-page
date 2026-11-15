// Run with: npm test
import assert from 'assert/strict';
import { test } from 'node:test';
import { createSharedFetch, sleeperJson } from '../src/lib/AAA-Raymond/utils/sleeperFetch.js';

// a fake fetch that counts calls and returns Response objects
const fakeFetch = (status = 200) => {
    const calls = [];
    const f = async (url) => {
        calls.push(url);
        return new Response(JSON.stringify({ url, n: calls.length }), { status });
    };
    f.calls = calls;
    return f;
};

test('callers asking for the same URL at once share one request, and each can read the answer', async () => {
    const f = fakeFetch();
    const shared = createSharedFetch(f);
    const [a, b] = await Promise.all([shared('u/1'), shared('u/1')]);
    assert.deepEqual(await a.json(), { url: 'u/1', n: 1 });
    assert.deepEqual(await b.json(), { url: 'u/1', n: 1 });
    await (await shared('u/1')).json(); // later asks reuse it too
    await shared('u/2');
    assert.deepEqual(f.calls, ['u/1', 'u/2']);
});

test('failed requests are not kept', async () => {
    const f = fakeFetch(429);
    const shared = createSharedFetch(f);
    await shared('u/1');
    await shared('u/1');
    assert.equal(f.calls.length, 2);
});

test('sharing can be turned off (the server)', async () => {
    const f = fakeFetch();
    const shared = createSharedFetch(f, { share: false });
    await shared('u/1');
    await shared('u/1');
    assert.equal(f.calls.length, 2);
});

test('a request that throws is not kept, so the next ask tries again', async () => {
    let n = 0;
    const flaky = async () => {
        n++;
        if (n === 1) throw new Error('offline');
        return new Response('{}', { status: 200 });
    };
    const shared = createSharedFetch(flaky);
    await assert.rejects(shared('u/x'), /offline/);
    assert.equal((await shared('u/x')).status, 200);
    assert.equal(n, 2);
});

test('sharing can be turned off (the server), and forget() drops one URL', async () => {
    const f = fakeFetch();
    const off = createSharedFetch(f, { share: false });
    await off('u/1');
    await off('u/1');
    assert.equal(f.calls.length, 2);
    const g = fakeFetch();
    const on = createSharedFetch(g);
    await on('u/2');
    on.forget('u/2');
    await on('u/2');
    assert.equal(g.calls.length, 2);
});

test('sleeperJson: Sleeper path in, JSON out; an error status throws', async () => {
    const real = globalThis.fetch;
    try {
        globalThis.fetch = async (url) => (String(url).endsWith('/bad') ? new Response('nope', { status: 404 }) : new Response(JSON.stringify({ url }), { status: 200 }));
        assert.deepEqual(await sleeperJson('league/1/rosters'), { url: 'https://api.sleeper.app/v1/league/1/rosters' });
        await assert.rejects(sleeperJson('league/1/bad'), /Sleeper league\/1\/bad: 404/);
    } finally {
        globalThis.fetch = real;
    }
});
