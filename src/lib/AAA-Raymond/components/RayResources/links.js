// Resources page links (from the template's Resources.svelte), grouped. dynastyOnly / redraftOnly work as in the
// template (this league is dynasty); premium = some or all of it is behind a paywall.

/**
 * FantasyPros posts a new chart each month at a dated address, e.g.
 * /2026/03/fantasy-football-rankings-dynasty-trade-value-chart-march-2026-update/ (two-digit month; the template
 * wrote /2026/3/, which broke the link January through September).
 */
export function fantasyProsChartUrl(date = new Date()) {
    const year = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const month = date.toLocaleString('en-US', { month: 'long' }).toLowerCase();
    return `https://www.fantasypros.com/${year}/${mm}/fantasy-football-rankings-dynasty-trade-value-chart-${month}-${year}-update/`;
}
const fantasyProsChart = fantasyProsChartUrl();

export const RESOURCE_GROUPS = [
    {
        title: 'Trade values & calculators',
        color: 'var(--or-cyan, #05d9e8)',
        links: [
            { name: 'FantasyPros Dynasty Trade Value Chart', url: fantasyProsChart, note: 'fantasypros.com · updated monthly', dynastyOnly: true },
            { name: 'DynastyProcess Trade Calculator', url: 'https://apps.dynastyprocess.com/calculator/', note: 'apps.dynastyprocess.com', dynastyOnly: true },
            { name: 'Dynasty 101 Trade Calculator', url: 'https://dynasty101.com/trade-calculator/', note: 'dynasty101.com', dynastyOnly: true },
            { name: 'FantasyCalc Trade Calculator', url: 'https://www.fantasycalc.com/trade-calculator', note: 'fantasycalc.com' },
            { name: 'Fantasy Football Trade Analyzer', url: 'https://fantasyfootballcalculator.com/trade-analyzer', note: 'fantasyfootballcalculator.com', redraftOnly: true },
        ],
    },
    {
        title: 'Analysis & rankings',
        color: 'var(--or-pink, #ff2a6d)',
        links: [
            { name: 'Dynasty League Football', url: 'https://dynastyleaguefootball.com/', note: 'dynastyleaguefootball.com', premium: true, dynastyOnly: true },
            { name: 'Dynasty Nerds GM', url: 'https://gm.dynastynerds.com/', note: 'gm.dynastynerds.com', premium: true, dynastyOnly: true },
            { name: 'FTN Fantasy', url: 'https://www.ftnfantasy.com/nfl', note: 'ftnfantasy.com', premium: true },
        ],
    },
    {
        title: 'Podcasts',
        color: 'var(--or-purple, #b537f2)',
        links: [{ name: 'The Fantasy Footballers', url: 'https://www.thefantasyfootballers.com/', note: 'thefantasyfootballers.com', premium: true }],
    },
    {
        title: 'Community',
        color: 'var(--or-pos-TE, #ffae58)',
        links: [
            { name: 'r/DynastyFF', url: 'https://www.reddit.com/r/DynastyFF/', note: 'reddit.com', dynastyOnly: true },
            { name: 'r/fantasyfootball', url: 'https://www.reddit.com/r/fantasyfootball/', note: 'reddit.com', redraftOnly: true },
            { name: 'r/TradeAnalyzerFF', url: 'https://www.reddit.com/r/TradeAnalyzerFF/', note: 'reddit.com · get a trade judged' },
        ],
    },
];

/** The groups with only the links that fit this league type. */
export const resourceGroups = (dynasty) =>
    RESOURCE_GROUPS.map((g) => ({ ...g, links: g.links.filter((l) => (dynasty ? !l.redraftOnly : !l.dynastyOnly)) })).filter((g) => g.links.length);
