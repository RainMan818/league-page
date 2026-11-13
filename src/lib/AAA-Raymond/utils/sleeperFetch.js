// One request per Sleeper URL per page load. Every loader on the site (template helpers and ours) goes through
// this, so sections that ask for the same thing at the same time share one request instead of each sending its own
// (the homepage used to ask for each season's league, rosters and users 3-12 times). The answer is kept until the
// page is reloaded, like the template's stores. Failed requests aren't kept, so the next ask tries again.
// On the server nothing is shared (it would be shared between visitors and never refresh).
// Plain module (no site imports; tested in tests/sleeperFetch.test.js).

/** A fetch that shares one request per URL. Each caller gets its own copy of the response to read. */
export function createSharedFetch(fetchImpl, { share = true } = {}) {
    const requests = new Map();
    const shared = (url, options) => {
        if (!share) return fetchImpl(url, options);
        const key = String(url);
        if (!requests.has(key)) {
            const p = Promise.resolve(fetchImpl(url, options)).then(
                (res) => {
                    if (!res.ok) requests.delete(key);
                    return res;
                },
                (err) => {
                    requests.delete(key);
                    throw err;
                }
            );
            requests.set(key, p);
        }
        return requests.get(key).then((res) => res.clone());
    };
    shared.forget = (url) => requests.delete(String(url));
    return shared;
}

const inBrowser = typeof window !== 'undefined';

export const sleeperFetch = createSharedFetch((url, options) => fetch(url, options), { share: inBrowser });

/** JSON for a Sleeper API path ("league/123/rosters"), shared the same way; throws on an error status. */
export async function sleeperJson(path) {
    const res = await sleeperFetch(`https://api.sleeper.app/v1/${path}`);
    if (!res.ok) throw new Error(`Sleeper ${path}: ${res.status}`);
    return res.json();
}
