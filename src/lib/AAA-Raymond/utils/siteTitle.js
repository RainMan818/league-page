// The league's name, header logo words, homepage line and dynasty-or-not (Nov 17). A league's profile in leagueInfo.js
// can set any of them (leagueName, logo, homepageText, dynasty); whatever it leaves out comes from the league on
// Sleeper, so a league with only an ID line still shows its own name. src/routes/+layout.js passes the result to every page as `data.site`.
// Plain functions, no site imports (tests/siteTitle.test.js).
import { GLYPHS } from '../components/OutrunLogo/glyphs.js';
import { hasIdpSlots, hasSuperflex } from './positions.js';

export const LOGO_TITLE_MAX = 9; // letters (with spaces) on the big chrome line before the rest moves to the subtitle
const FALLBACK = { name: 'Fantasy League', logo: { title: 'FANTASY', subtitle: 'LEAGUE' } };

/** Only characters the logo can draw (letters, digits, space, ·, -), uppercase, single spaces; apostrophes dropped. */
export const logoText = (text) =>
    [...String(text ?? '').replace(/['’`]/g, '').toUpperCase()]
        .map((ch) => (GLYPHS[ch] ? ch : ' '))
        .join('')
        .replace(/\s+/g, ' ')
        .trim();

/**
 * Split a league name into the logo's two lines: the first word(s) up to LOGO_TITLE_MAX characters on the chrome line
 * ("THE" never stands alone), the rest on the subtitle. "Nerd Fantasy League" -> NERD / FANTASY LEAGUE.
 */
export function logoWords(name) {
    const words = logoText(name).split(' ').filter(Boolean);
    if (!words.length) return { ...FALLBACK.logo };
    const title = [words.shift()];
    while (words.length && (title.join(' ').length + 1 + words[0].length <= LOGO_TITLE_MAX || title.join(' ') === 'THE')) {
        title.push(words.shift());
    }
    return { title: title.join(' '), subtitle: words.join(' ') || 'FANTASY FOOTBALL' };
}

const KIND = { 0: 'Redraft', 1: 'Keeper', 2: 'Dynasty' };
const ppr = (rec) => (rec >= 1 ? 'PPR' : rec >= 0.5 ? 'Half-PPR' : rec > 0 ? `${rec} PPR` : 'Standard');

/** "2026 14-Team Dynasty Half-PPR" (+ Superflex / IDP) from Sleeper's league settings. */
export function leagueLine(league) {
    if (!league) return '';
    const parts = [
        league.season,
        league.total_rosters ? `${league.total_rosters}-Team` : null,
        KIND[league.settings?.type],
        ppr(Number(league.scoring_settings?.rec) || 0),
        hasSuperflex(league.roster_positions) ? 'Superflex' : null,
        hasIdpSlots(league.roster_positions) ? 'IDP' : null,
    ];
    return parts.filter(Boolean).join(' ');
}

const escape = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const homepageHtml = (line) => (line ? `\n  <div style="text-align: center;">\n  <i>${escape(line)}</i>\n  </div>\n` : '');

/** Does the profile set everything (then Sleeper isn't needed)? */
export const profileIsComplete = (profile) =>
    !!(profile?.leagueName && profile?.logo && profile?.homepageText != null && typeof profile?.dynasty === 'boolean');

/** Sleeper league type 2 = dynasty (0 redraft, 1 keeper); unknown counts as dynasty, like the site always did. */
export const isDynasty = (league) => (league?.settings?.type == null ? true : Number(league.settings.type) === 2);

/** { name, logo: { title, subtitle }, homepageText, dynasty } from the profile, filled in from the Sleeper league. */
export function siteTitle(profile = {}, league = null) {
    const name = profile?.leagueName ?? league?.name ?? FALLBACK.name;
    return {
        name,
        logo: profile?.logo ?? logoWords(name),
        homepageText: profile?.homepageText ?? homepageHtml(leagueLine(league)),
        dynasty: typeof profile?.dynasty === 'boolean' ? profile.dynasty : isDynasty(league),
    };
}
