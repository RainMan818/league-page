// The league constitution, shown by ./index.svelte at /constitution.
// Edit the rules here; the page lays them out. Each section has an id (used for #links) and a list of subsections,
// numbered automatically (Section 3 → 3.1, 3.2, ...). Text may contain simple HTML (<b>, <i>, <a>).
//
// Block types inside a subsection's `blocks`:
//   { p: "text" }                         paragraph
//   { list: ["...", "..."] }              bullet list
//   { steps: ["...", "..."] }             numbered list
//   { table: { cols: [...], rows: [[...], ...], foot: [...] } }   table (foot = optional total row)
//   { note: "text" }                      highlighted note
//   { example: "text" }                   worked example
// Set `isNew: true` on a subsection to tag it "New" (rules added this season).

export const UPDATED = 'Updated for the 2026 season';

export const GLANCE = [
    { value: '12', label: 'Teams', sub: '3 divisions of 4' },
    { value: '½ PPR', label: 'Scoring', sub: 'Superflex + IDP' },
    { value: '14', label: 'Weeks', sub: 'Regular season + median' },
    { value: '6', label: 'Playoff teams', sub: 'Weeks 15–17' },
    { value: '$70', label: 'Dues', sub: '$50 pot + $20 in-season' },
];

export const SECTIONS = [
    {
        id: 'format',
        title: 'League Format',
        subsections: [
            {
                title: 'The league',
                blocks: [
                    { p: '<b>The Dynasty League IDP SF</b> is a 12-team dynasty league on Sleeper: half-PPR scoring, a superflex spot and individual defensive players (IDP). Rosters carry over from season to season; new players arrive through the rookie draft and waivers.' },
                ],
            },
            {
                title: 'Divisions',
                blocks: [
                    { p: 'The league is split into <b>3 divisions of 4 teams</b>. Divisions are reshuffled at random every 3 years.' },
                ],
            },
            {
                title: 'Regular season schedule',
                blocks: [
                    { p: 'The regular season runs <b>weeks 1–14</b>. Each team plays the other teams in its division <b>twice</b> and every other team <b>once</b>.' },
                ],
            },
            {
                title: 'Median scoring',
                isNew: true,
                blocks: [
                    { p: 'Every week each team also plays the <b>league median</b>. Score above the median and you get an extra win; score below it and you get an extra loss. Each week counts for two results, so a 14-week season adds up to 28.' },
                ],
            },
        ],
    },
    {
        id: 'rosters',
        title: 'Rosters',
        subsections: [
            {
                title: 'Starting lineup',
                blocks: [
                    {
                        table: {
                            cols: ['Slot', 'Count', 'Eligible'],
                            rows: [
                                ['QB', '1', 'QB'],
                                ['RB', '2', 'RB'],
                                ['WR', '2', 'WR'],
                                ['TE', '1', 'TE'],
                                ['Flex', '3', 'RB / WR / TE'],
                                ['Superflex', '1', 'QB / RB / WR / TE'],
                                ['IDP Flex', '1', 'DL / LB / DB'],
                                ['DL', '3', 'DL'],
                                ['LB', '3', 'LB'],
                                ['DB', '3', 'DB'],
                            ],
                            foot: ['Starters', '20', ''],
                        },
                    },
                ],
            },
            {
                title: 'Bench, IR and taxi',
                blocks: [
                    {
                        list: [
                            '<b>22 bench</b> spots.',
                            '<b>4 IR</b> spots. A player must be listed as Out (or COVID) in Sleeper to go on IR.',
                            '<b>6 taxi</b> spots (see Section 3).',
                        ],
                    },
                ],
            },
        ],
    },
    {
        id: 'taxi',
        title: 'Taxi Squad',
        subsections: [
            {
                title: 'Taxi rules',
                blocks: [
                    {
                        steps: [
                            'You can place up to <b>6 players</b> on your taxi squad, each with at most <b>2 years of experience</b> in Sleeper.',
                            'Taxi squads <b>lock after the first game of the season</b>.',
                            'During the season you can promote a player from your taxi squad to your main roster at any time, but you can’t add players to your taxi squad again until the offseason.',
                        ],
                    },
                ],
            },
            {
                title: 'Taxi poaching',
                blocks: [
                    { p: 'Any manager can try to pry a player off another team’s taxi squad:' },
                    {
                        steps: [
                            'Propose the trade <b>publicly in the Sleeper league chat</b>.',
                            'The offer must include a pick at least <b>one round better</b> than the round the player was drafted in. It must be the <b>earliest</b> pick of that round you own, and no more than <b>two drafts away</b>.',
                            'A player drafted in the <b>1st round</b> of a rookie draft takes an offer of <b>two 1sts</b> to force the promotion.',
                            'A player drafted in the <b>startup draft</b> takes a <b>2nd or better</b>.',
                            'A player picked up <b>off waivers</b> takes a <b>4th or better</b>.',
                            'Once the offer is made, the owner has <b>one week</b> to promote the player to the main roster, accept the trade, or make a different deal involving the player with someone else.',
                        ],
                    },
                    { example: 'Tyjae Spears was drafted in the 2nd round. To poach him off a taxi squad you’d have to offer a 1st: your next 1st if you own it, otherwise the one after that. A 1st three drafts out can’t be used until the next rookie draft is done.' },
                ],
            },
        ],
    },
    {
        id: 'trades',
        title: 'Trades',
        subsections: [
            {
                title: 'What can be traded',
                blocks: [
                    { p: 'Players, draft picks up to 3 drafts away, and FAAB from the current season. Trades process immediately in Sleeper.' },
                ],
            },
            {
                title: 'Trade deadline',
                blocks: [
                    { p: 'There is <b>no trade deadline</b>. Trades are open all season.' },
                ],
            },
            {
                title: 'Vetoes',
                blocks: [
                    { p: 'It takes <b>6 veto votes</b> to overturn a trade. Vetoes are only for collusion or an egregious mismatch of value (think a starting RB1 for a backup kicker). Not liking a trade is not a reason to veto it.' },
                ],
            },
            {
                title: 'No lending players',
                blocks: [
                    { p: 'A player traded away can’t be traded back to the same team within <b>6 weeks</b> of the original trade. Teams that do this are subject to the collusion penalties below.' },
                ],
            },
            {
                title: 'Collusion',
                blocks: [
                    { p: 'Offering or accepting bribes, trading anything other than players, draft picks or FAAB, organizing veto votes against a fair trade, or any other form of collusion puts every team involved at risk of these penalties:' },
                    {
                        steps: [
                            '<b>First offense:</b> FAAB budget cut by 80%.',
                            '<b>Second offense:</b> no transactions of any kind (trades or waivers) for the next 18 weeks of games.',
                            '<b>Third offense:</b> the managers not involved meet to decide what happens next.',
                        ],
                    },
                    { p: 'Trades found to be collusion are reversed. If one affected games already played, those results are revised.' },
                    { note: 'The commissioner errs on the side of letting managers run their teams as they see fit, so collusion has to be clear. The commissioner can still ask the teams in a heavily lopsided trade to explain their thinking.' },
                ],
            },
        ],
    },
    {
        id: 'waivers',
        title: 'Waivers',
        subsections: [
            {
                title: 'FAAB',
                blocks: [
                    { p: 'Waivers use free-agent bidding (FAAB). Each team gets <b>$100</b> per season; <b>$0 bids</b> are allowed. Claims process automatically in Sleeper, and budgets reset each new season.' },
                ],
            },
        ],
    },
    {
        id: 'scoring',
        title: 'Scoring',
        subsections: [
            {
                title: 'Offense',
                blocks: [
                    {
                        table: {
                            cols: ['Stat', 'Points'],
                            rows: [
                                ['Passing yards', '0.04 per yard (1 per 25)'],
                                ['Passing TD', '4'],
                                ['Interception thrown', '−2'],
                                ['Rushing / receiving yards', '0.1 per yard (1 per 10)'],
                                ['Rushing attempt', '0.1'],
                                ['Rushing / receiving TD', '6'],
                                ['Reception: RB', '0.5'],
                                ['Reception: WR', '1 (0.5 + 0.5 bonus)'],
                                ['Reception: TE', '1.5 (0.5 + 1 bonus)'],
                                ['2-point conversion', '2'],
                                ['Fumble lost', '−2'],
                                ['Fumble recovery TD', '6'],
                                ['Kick / punt return yards', '0.04 per yard'],
                            ],
                        },
                    },
                ],
            },
            {
                title: 'Defense (IDP)',
                blocks: [
                    {
                        table: {
                            cols: ['Stat', 'Points'],
                            rows: [
                                ['Solo tackle', '1'],
                                ['Assisted tackle', '0.5'],
                                ['Tackle for loss', '3'],
                                ['Sack', '4'],
                                ['QB hit', '1'],
                                ['Pass defended', '3'],
                                ['Interception', '6'],
                                ['Forced fumble', '4'],
                                ['Fumble recovery', '2'],
                                ['Defensive TD', '6'],
                                ['Safety', '10'],
                                ['Blocked kick', '6'],
                                ['INT / fumble return yards', '0.04 per yard'],
                            ],
                        },
                    },
                    { p: 'Special teams plays score too: TD 6, solo tackle 1, forced fumble 4, fumble recovery 2.' },
                ],
            },
            {
                title: 'Changing the scoring',
                blocks: [
                    { p: 'Sleeper’s league settings are the official scoring. The scoring system never changes without a majority vote of the league.' },
                ],
            },
        ],
    },
    {
        id: 'playoffs',
        title: 'Playoffs',
        subsections: [
            {
                title: 'Format',
                blocks: [
                    { p: '<b>6 teams</b> make the playoffs, played in <b>weeks 15–17</b>. Each round is one week and the winner advances. Week 18 isn’t used.' },
                ],
            },
            {
                title: 'Seeding',
                blocks: [
                    {
                        table: {
                            cols: ['Seed', 'Who gets it'],
                            rows: [
                                ['1–3', 'The team with the best record in each division'],
                                ['4–5', 'The next two best records'],
                                ['6', 'The most points for among teams not already in, regardless of record'],
                            ],
                        },
                    },
                    { p: 'Seeds 1 and 2 get a first-round bye.' },
                ],
            },
            {
                title: 'Tiebreakers',
                blocks: [
                    { p: 'When teams finish with the same record:' },
                    { steps: ['Points for', 'Head-to-head record', 'Division record', 'Points against', 'Coin flip', 'Duel to the death'] },
                ],
            },
            {
                title: 'Toilet Bowl',
                isNew: true,
                blocks: [
                    { p: 'The teams that miss the playoffs play the Toilet Bowl in Sleeper’s losers bracket, where the <b>lower score advances</b> each round. The Toilet Bowl winner gets <b>$10</b> and pick <b>3.13</b> in the next rookie draft.' },
                ],
            },
        ],
    },
    {
        id: 'draft',
        title: 'Rookie Draft',
        subsections: [
            {
                title: 'Format',
                blocks: [
                    { p: 'A <b>linear 6-round</b> rookie draft on Sleeper, held each offseason. Open roster spots can be filled from waivers right after the draft. If a trade is being worked out during the draft, either side can ask the commissioner to pause it.' },
                ],
            },
            {
                title: 'Draft order',
                blocks: [
                    {
                        table: {
                            cols: ['Pick', 'Team'],
                            rows: [
                                ['1–6', 'Non-playoff teams, lowest max points for first'],
                                ['7', '5th place'],
                                ['8', '6th place'],
                                ['9', '3rd place'],
                                ['10', '4th place'],
                                ['11', 'Runner-up'],
                                ['12', 'Champion'],
                            ],
                        },
                    },
                    { p: '<b>Max points for</b> is what a team would have scored with its best possible lineup every week. The <b>Pick</b> column on the <a href="/standings">Standings</a> page shows where each team would pick if the season ended today (playoff teams by seed until the playoffs are played), and the <a href="/drafts">Drafts</a> page shows the full projected board.' },
                    { note: 'The Toilet Bowl winner also gets an extra pick at <b>3.13</b>, right after the last pick of round 3.' },
                ],
            },
        ],
    },
    {
        id: 'tanking',
        title: 'Tanking',
        subsections: [
            {
                title: 'Full lineups',
                blocks: [
                    { p: 'No team may intentionally leave starting spots empty. Leaving spots empty on purpose to improve draft position can be punished, up to and including losing draft picks.' },
                ],
            },
        ],
    },
    {
        id: 'managers',
        title: 'Managers',
        subsections: [
            {
                title: 'Removing managers',
                blocks: [
                    { p: 'Short of repeatedly failing to set a valid lineup or confirmed collusion, no manager is removed against their will. Taking part in the league chat, trade talks and the waiver wire is strongly encouraged.' },
                ],
            },
            {
                title: 'Replacing managers',
                blocks: [
                    { p: 'When a manager needs to be replaced, the commissioner looks for someone with a connection to at least some of the league, who is eager to take on a dynasty commitment and will stay active.' },
                ],
            },
            {
                title: 'Replacement incentive',
                blocks: [
                    { p: 'If a manager quits or is removed, the incoming manager gets <b>50% off</b> their first year’s dues.' },
                ],
            },
        ],
    },
    {
        id: 'money',
        title: 'Dues & Payouts',
        subsections: [
            {
                title: 'Dues',
                blocks: [
                    { p: 'Dues are <b>$70</b> per team: <b>$50</b> for the season prize pool plus <b>$20</b> for in-season payouts. Everyone must be paid in full before the regular season starts. A manager who pays late owes a 10% penalty, which goes to the winner’s payout.' },
                ],
            },
            {
                title: 'Season prizes',
                blocks: [
                    {
                        table: {
                            cols: ['Finish', 'Payout'],
                            rows: [
                                ['Champion', '$450'],
                                ['Runner-up', '$100'],
                                ['3rd place', '$50'],
                            ],
                            foot: ['Total', '$600'],
                        },
                    },
                ],
            },
            {
                title: 'In-season payouts',
                isNew: true,
                blocks: [
                    {
                        table: {
                            cols: ['Award', 'Payout'],
                            rows: [
                                ['Top-scoring team each week (weeks 1–14)', '$10 a week ($140)'],
                                ['Each division winner', '$20 each ($60)'],
                                ['Toilet Bowl winner', '$10'],
                                ['Highest score of the regular season', '$10'],
                                ['Team with the highest-scoring offensive player (regular season)', '$10'],
                                ['Team with the highest-scoring IDP player (regular season)', '$10'],
                            ],
                            foot: ['Total', '$240'],
                        },
                    },
                ],
            },
            {
                title: 'Adjustments',
                blocks: [
                    { p: 'Late-payment penalties are added to the champion’s payout. If the pot comes up short (for example, a replacement manager paying half), the difference comes out of the champion’s prize.' },
                ],
            },
            {
                title: 'Raising dues',
                blocks: [
                    { p: 'Raising dues takes a <b>⅔ majority</b> vote. A manager no longer comfortable with the buy-in is encouraged to find a co-manager to split the cost.' },
                ],
            },
        ],
    },
];
