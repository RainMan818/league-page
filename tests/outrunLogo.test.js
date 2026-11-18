// Run with: npm test
import assert from 'assert/strict';
import { test } from 'node:test';
import { layoutText, GLYPHS } from '../src/lib/AAA-Raymond/components/OutrunLogo/glyphs.js';
import { logoSvg } from '../src/lib/AAA-Raymond/components/OutrunLogo/logo.js';

test('every letter of the site title has a glyph', () => {
    for (const ch of 'DYNASTYLEAGUEIDPSF') assert.ok(GLYPHS[ch], ch);
});

test('text layout: widths add up, unknown characters are skipped, case does not matter', () => {
    const a = GLYPHS.A.w;
    assert.deepEqual(layoutText('A', 14).width, a);
    assert.equal(layoutText('AA', 14).width, 2 * a + 14);
    assert.deepEqual(layoutText('a'), layoutText('A'));
    assert.equal(layoutText('A#A', 14).width, layoutText('AA', 14).width);
    assert.deepEqual(layoutText(''), { width: 0, paths: [] });
    // second letter starts after the first plus the gap
    assert.match(layoutText('AA', 14).paths[1], new RegExp(`^M${a + 14},`));
});

test('logo SVG: sized to the title, labelled for screen readers', () => {
    const svg = logoSvg();
    assert.match(svg, /^<svg class="outrunLogo"/);
    assert.match(svg, /aria-label="DYNASTY LEAGUE · IDP SF"/);
    const width = (s) => Number(s.match(/viewBox="0 0 (\d+) /)[1]);
    assert.ok(width(logoSvg({ title: 'DYNASTYDYNASTY' })) > width(svg));
});

test('every letter A-Z has a glyph (league names from Sleeper)', () => {
    for (const ch of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') assert.ok(GLYPHS[ch], ch);
});

test('a long subtitle widens the logo instead of spilling past it; the usual logo is unchanged', () => {
    const width = (s) => Number(s.match(/viewBox="0 0 (\d+) /)[1]);
    const short = logoSvg({ title: 'NERD', subtitle: 'LEAGUE' });
    const long = logoSvg({ title: 'NERD', subtitle: 'FANTASY FOOTBALL LEAGUE OF EXTRAORDINARY GENTLEMEN' });
    assert.ok(width(long) > width(short));
    assert.match(logoSvg(), /translate\(36 18\) skewX/); // DYNASTY: title left edge = pad + slant, as before
});
