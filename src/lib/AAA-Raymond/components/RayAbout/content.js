// About page text (Clubhouse / More, Nov 17, canvas option C): what each page shows (Raymond, Nov 18: describe the
// content, not the buttons). Keyed by the page's address in src/lib/utils/tabs.js, so the list follows the nav (a
// page missing here is left out; a page missing from the nav, like Constitution without house rules, isn't shown).
// A "how" line can be a string or { text, when } where `when` is one of the league facts passed to aboutPages:
// houseRules, median, dynasty (or "!dynasty" etc. for the opposite). Plain module, no site imports
// (tests/about.test.js).

export const PLAYER_TIP = "Tap any player's name or photo, on any page, to open his card: weekly scores, stats and history.";

export const PAGES = {
    '/': {
        what: 'Welcome to the league!',
        how: [
            "Recap: the week's results and standouts, the teams that rose and fell in the standings, and season awards once they're decided.",
            'Power Rankings: every team ranked on its outlook for the rest of the season.',
            'Standings: the projected playoff bracket and a breakdown of every team.',
            { text: 'Payouts: the weekly and season-long prizes.', when: 'houseRules' },
            'Recent Moves: the latest trades and waivers.',
        ],
    },
    '/matchups': {
        what: "Weekly matchups & playoffs",
        how: [
            'Every matchup with live scores; expand to view lineups.',
            { text: 'An M badge marks each team that beat the league median that week.', when: 'median' },
            "Playoffs: the championship and Toilet Bowl brackets for every season, with each game's lineups.",
        ],
    },
    '/standings': {
        what: 'Race to the top and the first overall pick',
        how: [
            'Teams in playoff seed order, with a playoff cut line.',
            { text: "Each team's all-play record, lineup efficiency and projected draft pick.", when: 'dynasty' },
            { text: "Each team's all-play record and lineup efficiency.", when: '!dynasty' },
            'Points per week at every position, shaded from low (cyan) to high (pink).',
        ],
    },
    '/trends': {
        what: 'Every team, week by week.',
        how: [
            'Charts of standings place, points for, max PF, lineup efficiency and all-play record over the season.',
            'Team points at every position.',
        ],
    },
    '/transactions': {
        what: 'Trades & waivers.',
        how: [
            'Every trade and waiver claim, grouped by day.',
            'Adds & drops with FAAB bids, and trades for days.',
        ],
    },
    '/rosters': {
        what: 'In depth team details.',
        how: [
            { text: "Each team's starting lineup, depth chart and future draft picks.", when: 'dynasty' },
            { text: "Each team's starting lineup and depth chart.", when: '!dynasty' },
            'See a team\'s positional scoring & age compares with the rest of the league.',
            "View the team depth chart based on rest-of-season projections.",
        ],
    },
    '/players': {
        what: 'Dive into per player stats.',
        how: [
            'Top free agents: the best players by season points and points per game.',
            'Trending free agents: players whose snaps or scoring are on the rise.'
        ],
    },
    '/drafts': {
        what: { dynasty: 'Every draft board.', otherwise: 'Every draft board.' },
        how: [
            'View historical drafts for the league.',
            "Select a team to light up its picks on every board.",
        ],
    },
    '/managers': {
        what: 'Who runs each team.',
        how: [
            'A card for each manager: team, years in the league, all-time record, titles and this season.',
            "Each manager's page: career numbers, trophy case, charts, current lineup and recent moves.",
        ],
    },
    '/rivalry': {
        what: 'Any two managers, head to head.',
        how: [
            'Their head-to-head record, current streak, biggest win and closest game.',
            "How their careers compare, every game they've played and the trades between them.",
        ],
    },
    '/awards': {
        what: 'Season awards and the All-League team.',
        how: [
            'Regular-season and post-season awards for every finished season.',
            'The All-League team: the best player at each lineup spot.',
        ],
    },
    '/records': {
        what: 'The league record book.',
        how: [
            'Headline records, record lists and team rankings, for the regular season or playoffs, all-time or one season.',
            'Records count per team, adding up every manager who ran it.',
        ],
    },
    '/constitution': {
        what: "The league's rules.",
        how: [
            "Every league rule in numbered sections, with this season's changes marked New.",
            'Each rule has its own link to share.',
        ],
    },
    '/resources': {
        what: 'Trade tools, rankings and news.',
        how: [
            'Trade calculators, rankings, podcasts and communities in one place.',
            'The latest fantasy football news from several sources.',
        ],
    },
    '/settings': {
        what: 'Try the site with your own league.',
        how: [
            'Point the site at your own Sleeper league (experimental), saved in your browser only.',
            "Reset brings the site's league back.",
        ],
    },
};

const holds = (when, facts) => (when.startsWith('!') ? !facts[when.slice(1)] : !!facts[when]);

/** One page's text for this league: { what, how: [string] }. */
export function pageText(entry, facts = {}) {
    const what = typeof entry.what === 'string' ? entry.what : (facts.dynasty ? entry.what.dynasty : entry.what.otherwise);
    const how = entry.how.filter((h) => typeof h === 'string' || holds(h.when, facts)).map((h) => (typeof h === 'string' ? h : h.text));
    return { what, how };
}

/**
 * The About list from the nav tabs: { main, club }, each [{ dest, icon, label, what, how }]. Main = top-level pages,
 * club = the Clubhouse menu; external links, the About page itself and pages with no text here are left out.
 */
export function aboutPages(tabs, facts = {}) {
    const entry = (t) => (PAGES[t.dest] ? { dest: t.dest, icon: t.icon, label: t.label, ...pageText(PAGES[t.dest], facts) } : null);
    const main = tabs.filter((t) => !t.nest).map(entry).filter(Boolean);
    const club = tabs.filter((t) => t.nest).flatMap((t) => t.children ?? []).map(entry).filter(Boolean);
    return { main, club };
}
