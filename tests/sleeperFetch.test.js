// Run with: npm test
import assert from 'assert/strict';
import { test } from 'node:test';
import { createSharedFetch } from '../src/lib/AAA-Raymond/utils/sleeperFetch.js';

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
