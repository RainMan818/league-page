// Run with: npm test
import assert from 'assert/strict';
import { test } from 'node:test';
import { logoText, logoWords, leagueLine, siteTitle, profileIsComplete, isDynasty } from '../src/lib/AAA-Raymond/utils/siteTitle.js';

test('logo words: a short chrome line, the rest underneath, only letters the logo can draw', () => {
    assert.deepEqual(logoWords('Nerd Fantasy League'), { title: 'NERD', subtitle: 'FANTASY LEAGUE' });
    assert.deepEqual(logoWords('The Gang Attempts Dynasty FF'), { title: 'THE GANG', subtitle: 'ATTEMPTS DYNASTY FF' });
    assert.deepEqual(logoWords('The Dynasty League IDP SF'), { title: 'THE DYNASTY', subtitle: 'LEAGUE IDP SF' }); // "THE" never alone
    assert.deepEqual(logoWords('Gridiron'), { title: 'GRIDIRON', subtitle: 'FANTASY FOOTBALL' });
    assert.deepEqual(logoWords("Bob's #1 League 🏈"), { title: 'BOBS 1', subtitle: 'LEAGUE' }); // apostrophe dropped, no # or 🏈
    assert.deepEqual(logoWords(''), { title: 'FANTASY', subtitle: 'LEAGUE' });
    assert.equal(logoText('Quick qb'), 'QUICK QB');
});

const GANG = {
    name: 'The Gang Attempts Dynasty FF', season: '2026', total_rosters: 14, settings: { type: 2 },
    scoring_settings: { rec: 0.5 }, roster_positions: ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'FLEX', 'BN'],
};

test('homepage line from Sleeper settings', () => {
    assert.equal(leagueLine(GANG), '2026 14-Team Dynasty Half-PPR');
    assert.equal(leagueLine({ ...GANG, settings: { type: 0 }, scoring_settings: { rec: 1 }, roster_positions: ['QB', 'SUPER_FLEX', 'LB'] }), '2026 14-Team Redraft PPR Superflex IDP');
    assert.equal(leagueLine({ ...GANG, scoring_settings: {} }), '2026 14-Team Dynasty Standard');
    assert.equal(leagueLine(null), '');
});

test('the profile wins; whatever it leaves out comes from Sleeper', () => {
    const full = { leagueName: 'The Dynasty League IDP SF', logo: { title: 'DYNASTY', subtitle: 'LEAGUE · IDP SF' }, homepageText: '<i>x</i>', dynasty: true };
    assert.equal(profileIsComplete(full), true);
    assert.equal(profileIsComplete({ ...full, dynasty: undefined }), false); // dynasty comes from Sleeper then
    assert.deepEqual(siteTitle(full, GANG), { name: full.leagueName, logo: full.logo, homepageText: '<i>x</i>', dynasty: true });
    const onlyID = siteTitle({}, { ...GANG, name: 'Nerd Fantasy League' });
    assert.equal(profileIsComplete({}), false);
    assert.equal(onlyID.name, 'Nerd Fantasy League');
    assert.deepEqual(onlyID.logo, { title: 'NERD', subtitle: 'FANTASY LEAGUE' });
    assert.match(onlyID.homepageText, /<i>2026 14-Team Dynasty Half-PPR<\/i>/);
    assert.equal(siteTitle({ leagueName: 'Custom' }, GANG).logo.title, 'CUSTOM');
    assert.equal(siteTitle({}, null).name, 'Fantasy League'); // Sleeper unreachable
});

test('dynasty or redraft from Sleeper\'s league type, unless the profile says', () => {
    assert.equal(isDynasty(GANG), true);
    assert.equal(isDynasty({ settings: { type: 0 } }), false); // redraft (Nerd Fantasy League)
    assert.equal(isDynasty({ settings: { type: 1 } }), false); // keeper
    assert.equal(isDynasty(null), true);
    assert.equal(siteTitle({ dynasty: true }, { settings: { type: 0 } }).dynasty, true);
});
