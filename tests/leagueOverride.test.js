// Run with: npm test
import assert from 'assert/strict';
import { test } from 'node:test';
import { parseLeagueID, readLeagueOverride, saveLeagueOverride, clearLeagueOverride, leagueFromRequest, leagueSummary, LEAGUE_OVERRIDE_KEY } from '../src/lib/AAA-Raymond/utils/leagueOverride.js';

const DEPLOYED = '1314319869289717760';
const memory = () => {
    const m = new Map();
    return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
};

test('a league ID from a number or a Sleeper link', () => {
    assert.equal(parseLeagueID(' 1313863224373841920 '), '1313863224373841920');
    assert.equal(parseLeagueID('https://sleeper.com/leagues/1328172065781448704/matchup'), '1328172065781448704');
    assert.equal(parseLeagueID('sleeper.app/leagues/1313863224373841920'), '1313863224373841920');
    assert.equal(parseLeagueID('1313 8632 2437 3841 920'), '1313863224373841920');
    assert.equal(parseLeagueID('12345'), null);
    assert.equal(parseLeagueID('my league'), null);
    assert.equal(parseLeagueID(null), null);
});

test('saved in this browser, reset back to the deployed league', () => {
    const s = memory();
    assert.equal(readLeagueOverride(s, DEPLOYED), null);
    assert.equal(saveLeagueOverride(s, '1313863224373841920'), true);
    assert.equal(readLeagueOverride(s, DEPLOYED), '1313863224373841920');
    clearLeagueOverride(s);
    assert.equal(readLeagueOverride(s, DEPLOYED), null);
    // the deployed league itself, junk, or blocked storage count as no switch
    s.setItem(LEAGUE_OVERRIDE_KEY, DEPLOYED);
    assert.equal(readLeagueOverride(s, DEPLOYED), null);
    s.setItem(LEAGUE_OVERRIDE_KEY, 'abc');
    assert.equal(readLeagueOverride(s, DEPLOYED), null);
    assert.equal(saveLeagueOverride(s, 'abc'), false);
    const blocked = { getItem: () => { throw new Error('SecurityError'); }, setItem: () => { throw new Error('SecurityError'); } };
    assert.equal(readLeagueOverride(blocked, DEPLOYED), null);
    assert.equal(saveLeagueOverride(blocked, '1313863224373841920'), false);
});

test('server routes take the league from the request', () => {
    assert.equal(leagueFromRequest(new URL('http://x/api/fetch_trending?league=1313863224373841920'), DEPLOYED), '1313863224373841920');
    assert.equal(leagueFromRequest(new URL('http://x/api/fetch_trending?league=evil'), DEPLOYED), DEPLOYED);
    assert.equal(leagueFromRequest(new URL('http://x/api/fetch_trending'), DEPLOYED), DEPLOYED);
});

test('what Settings shows about a league', () => {
    assert.equal(leagueSummary(null), null); // Sleeper answers null for an unknown ID
    assert.deepEqual(leagueSummary({ league_id: '1', name: 'Nerd Fantasy League', season: '2026', total_rosters: 12, sport: 'nfl', avatar: 'abc' }),
        { id: '1', name: 'Nerd Fantasy League', season: '2026', teams: 12, sport: 'nfl', avatar: 'https://sleepercdn.com/avatars/thumbs/abc' });
});
