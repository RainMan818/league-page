# CLAUDE.md

Fantasy football league site for **The Dynasty League IDP SF**, built on the open-source
[League Page](https://github.com/nmelhado/league-page) template (SvelteKit 2, Svelte 5, SMUI).
All data comes live from the public Sleeper API.

## Commands
- `npm run dev` — local dev server
- `npm test` — logic tests in `tests/` (plain `node --test`, no extra packages). Run after changing anything in
  `src/lib/AAA-Raymond/utils/` or `RayTransactions/transactionView.js`.
- `npm run build` / `npm run preview` — production build
- Raymond runs commands in **Git Bash** (Windows): give bash syntax, not PowerShell (`VAR=1 cmd`, heredocs such as
  `git commit -F- <<'EOF'` are fine).
- After a change, give Raymond **only the `git commit` command** (a `git commit -F- <<'EOF' … EOF` block with the
  message): no `cd`, `npm test` or `git add` chain (Nov 16). He stages and tests himself.
- SvelteKit 2.70.4 with `@sveltejs/adapter-vercel` 6.3.5 (Nov 15), so `npm run build` works locally on Node 24
  (adapter 5.x refused Node 24 outside Vercel; Node 24 support arrived in 6.2.0). Update the two together: adapter
  6.3.1+ reads `builder.config.kit.experimental.remoteFunctions`, which old SvelteKit (2.16) doesn't have, so the
  build crashes ("Cannot read properties of undefined (reading 'remoteFunctions')") even though the adapter's peer
  range says `^2.4.0`. After changing packages, restart `npm run dev` (a dev server started before the update fails
  with "`__SVELTEKIT_APP_VERSION__` is not defined"). Build output goes to `.vercel/` (ignored).
- Deploys to Vercel (default adapter). Docker build uses adapter-node (`npm run docker-run`).
- Node is pinned to 24.x in `package.json` `engines`. Don't loosen it to `>=`: Vercel then jumps to the newest
  Node, and Node 26 broke the `smui-theme` build step (yargs `require is not defined`).

## League facts
- Sleeper league ID `1314319869289717760`, set in `src/lib/utils/leagueInfo.js` with manager bios (the site can also
  run another league: see "Switching leagues" below)
- 12 teams, dynasty, half-PPR, superflex, IDP, **3 divisions of 4** (Sleeper settings), plus a weekly
  league-median game (records are 2 games per week). The rules are on the Constitution page.
- Starting lineup (Sleeper `roster_positions`): QB, RB×2, WR×2, TE, FLEX×3, SUPER_FLEX, IDP_FLEX, DL×3, LB×3, DB×3.
  Code reads the lineup from `roster_positions`; nothing hard-codes slot indexes any more.

## Switching leagues (Nov 16)
- `src/lib/utils/leagueInfo.js`: keep one `export const deployedLeagueID = ...` line live (renamed Nov 17; `leagueID`
  is that or the visitor's Settings choice, see below). **A league needs only its ID**
  (Nov 17): `src/routes/+layout.js` passes `data.site` = { name, logo: { title, subtitle }, homepageText, dynasty } to
  every page, from the league's profile in `LEAGUES` with anything missing filled in from Sleeper (`utils/siteTitle.js`:
  name = Sleeper's league name, logo = first words up to 9 letters / the rest (`logoWords`, "THE" never alone),
  homepage line like "2026 12-Team Redraft Half-PPR Superflex" (`leagueLine`), dynasty = Sleeper league type 2).
  Profile fields (all optional): `leagueName`, `logo`, `homepageText`, `dynasty`, `houseRules`, `managers` (`[]` or
  missing = built from Sleeper). Header (Nav), phone menu title (NavSmall), homepage name/line and Resources read
  `data.site`; don't use leagueInfo's `leagueName` / `logo` / `homepageText` exports in pages (profile-only values).
  Logo glyphs: A-Z (Q added Nov 17), digits, space, · and -; apostrophes are dropped, anything else becomes a space.
  The logo is as wide as its wider line (a long subtitle no longer spills). Third league: Nerd Fantasy League
  `1328172065781448704` (12 teams, redraft, 3 divisions, no median, QB/RB×2/WR×2/FLEX×2/SUPER_FLEX/DEF, no TE slot).
- Redraft / keeper leagues (`data.site.dynasty` false): no projected next draft (`getUpcomingDraft` returns
  `{ draft: null, notProjected: true }` once this season's draft is done; the Drafts page says the order is set on
  Sleeper), no Pick column on Standings / Team Breakdown, redraft links on Resources.
- Median game seasons are read from the records (`hadMedianGame` in managerProfile.js: Sleeper's record has more
  games than the head-to-head one), not a year, so manager-page notes work for any league. Second league: The Gang Attempts Dynasty FF
  `1313863224373841920` (14 teams, 2 named divisions, median game, no superflex, no IDP, 6 playoff teams, 4 rookie
  rounds, $1000 FAAB, history back to 2019). File switching is local only (Raymond, Nov 16); the deployedLeagueID line
  should be The Dynasty League when committing, since Vercel deploys it.
- **houseRules** (The Dynasty League's own rules, `utils/leagueRules.js`, set by leagueInfo.js when it loads; on by
  default so tests are unchanged): Constitution page (nav entry; `/constitution` redirects home otherwise; its
  `+page.js` must keep `prerender = true` as a literal, a computed value broke every page), homepage Payouts tab (the
  phone toggle just has one button fewer), Toilet Bowl 3rd-round pick (`leagueDrafts.js`), the points-wildcard
  seed (`pointsWildcardSeeds()` in playoffs.js) and the max-PF draft order. Without them: division winners then best
  records, and the draft in reverse order of finish (`leagueDraftOrder(..., { houseRules })`, tests/leagueRules.test.js).
- **IDP is read from the lineup**, nothing to configure: `hasIdpSlots` / `hasSuperflex` (positions.js). Without IDP:
  Standings averages drop defensive columns and the offense/defense split, "QB+SF" becomes "QB" (`lineupColumns` in
  positionAverages.js); Trends drops Total offense/defense; Rosters drops the Defense/DL/LB/DB breakdown rows, the QB+SF
  and IDP slot rows, and RosterAnalysis's Off./Def./DL/LB/DB columns and bars; awards drop the defensive cards and the
  "Offensive" prefix (SeasonAwards decides from the All-League team's slots; seasonAwards.js `leagueGroups` counts a
  WR/CB like Travis Hunter as a WR there; awards cache v11); Players shows offense only and `/api/fetch_trending`
  downloads offense-only stats. tests/lineupColumns.test.js.
- **Managers**: `utils/siteManagers.js` `managersFor(configured, leagueTeamManagers)`: the profile's list, else one per
  current team from Sleeper (owner's name, team avatar, roster order). Used by the Managers routes, manager pages,
  `gotoManager`; the nav / footer always show Managers now.
- **Saved data per league** (`utils/leagueStorage.js`): `transactions:<leagueID>` (an old shared copy moves to the
  league in its meta), `records:<leagueID>` (the old shared copy is dropped: one rebuild), `pstats/v1/<leagueID>/...`,
  `rr-trends-hidden:<id>`, `rr-rosters-team:<id>`. Player data (`playersInfo`, ~2.7M chars) stays one copy tagged
  `playersLeague`, downloaded again when the league changes (both leagues' copies wouldn't fit in localStorage).
  `/api/fetch_trending` caches by league and is fetched with `?league=` so the browser's 10-minute cache can't cross.
  `src/lib/stores.js` imports leagueInfo.js so the dev server resets its stores when the league changes.
- **Visitor's own league (Settings page, Nov 17, experimental)**: `/settings` (Clubhouse / More tile, `tabs.js`;
  `RaySettings/index.svelte`) takes a league ID or a Sleeper league link, looks it up once on Sleeper (not found /
  non-NFL / same league errors), previews it and switches. The ID is saved in localStorage `rr-league-id`
  (`utils/leagueOverride.js`: `parseLeagueID` 15-20 digits, `readLeagueOverride` ignores bad values and the deployed
  ID; tests/leagueOverride.test.js) and the site reloads on "/". leagueInfo.js reads it in the browser:
  `leagueID = override ?? deployedLeagueID`, `leagueOverridden`, `deployedLeagueName`. "Reset to <deployed league>"
  clears it. While overridden, `RaySettings/LeagueBanner.svelte` (in +layout.svelte) shows "Viewing <name> ·
  experimental · Settings" under the header (one line; "experimental" hidden under 480px).
  **The server always renders the deployed league**, so: `app.html` hides the body (class `rr-otherLeague`, 5s safety
  timeout) when the key exists, and `+layout.svelte` renders nothing until mount for overridden visitors (`ready`
  gate) so the page is a full client render (hydration would keep the server's `{@html}` logo / homepage line).
  Server routes take the league from the request: `/api/fetch_trending?league=` and `/api/fetch_players_info?league=`
  (`leagueFromRequest`, falls back to the deployed league on a bad value; per-league caches; players info has a CDN
  cache `s-maxage=3600`). Anything else that runs on the server for one league would show the deployed league.
- The Pick column's tooltip follows house rules (max-PF rule or reverse order of finish).
- Trends has 16 team colors (`--rr-team-0..15`). RosterAnalysis's color scales survive min = max (all-zero groups).

## Where custom code lives
- **All custom work goes in `src/lib/AAA-Raymond/`.** This keeps merges from the upstream template easy.
- Only touch template files to wire custom code in. Keep those edits small and mark them `AAA-Raymond`.
- `src/lib/version.js` must stay in sync with `package.json`; don't bump it by hand.
- Be gentle with the Sleeper API (Raymond's request): reuse data that's already loaded instead of adding requests.
  Every Sleeper request goes through `utils/sleeperFetch.js` (`sleeperFetch`, or `sleeperJson(path)`): one request
  per URL per page load, shared by every section that asks at the same time (`tests/sleeperFetch.test.js`). Use it for
  new code too; plain `fetch` only for something that must be re-downloaded (the Matchups "Refresh scores" button).
  Finished seasons (previous leagues with status "complete") never change, so their league info, users, rosters,
  playoff brackets and drafts are saved in the browser (`utils/savedSeasons.js`, localStorage `rr-pastSeasons`,
  about 250K characters, refreshed weekly; `tests/savedSeasons.test.js`). The template loaders that read past seasons
  (`getLeagueData`, `getLeagueTeamManagers`, `getLeagueRosters`, `getAwards`, `getPreviousDrafts`) use it; the
  current league is never saved. Use `seasonJson(path, finished)` for any new past-season download.
  Measured Nov 12 2026 (fresh page load after the first visit, browser): Home 20, Matchups 18 (+2 for the playoff
  bracket, +3 for a past season's), Standings / Trends /
  Managers 18, Rosters 19 (18 + the league's `traded_picks`, measured Nov 14), Drafts 8, a manager page 20, Trades & Waivers / Records / Rivalry 6 (72 with two managers
  picked), Trophy Room 4; 238 for one load of every page (1,318 before the request work started).

### Pages
- **Home** — `RayHome` is the only custom line in `src/routes/+page.svelte`. One section at a time, picked with
  Recap / Power Rankings / Standings / Payouts tabs under the league title. Under 760px wide (Nov 17, Raymond: no
  more fixed bottom bar) it's a pill toggle in the site's segmented-toggle look (Shared/Toggle.svelte, the Matchups
  Regular Season / Playoffs and Trades / Waivers / Both buttons): uppercase Roboto, selected = solid pink, "Rankings"
  for Power Rankings so four fit (tighter padding under 380px; checked at 320px). Desktop keeps the icon tabs:
  Recap = weekly recap (`Insights/RecapPanel` + `WeeklyRecap`, previous/next and a week picker) ending with
  "Movers" (`RayStandings/StandingsMovers`: risers / fallers that week, from `placesByWeek()` + `movesForWeek()` in
  `utils/leagueTrends.js`; hidden for week 1 and playoff weeks) and season awards;
  Power Rankings = `RayPowerRankings` (straight on the page like the other tabs: no card, Nov 16); Standings = `Insights` (playoff projection bracket
  + sortable Team Breakdown table); Payouts = `RayPayouts` (below). The last pick is remembered (localStorage
  `rr-home-view`); `/?view=recap|rankings|standings|payouts` opens one directly. A section is built the first time it's opened, then kept. The sidebar's "Recent Moves" is
  `RayTransactions/RecentMoves` (newest 6 waivers + 6 trades, `RECENT_PER_TYPE`), swapped in via `components.js`.
  **Payouts tab** (Nov 16, canvas option B) — `RayPayouts/index.svelte`, the Constitution's in-season prizes
  (`RayConstitution/content.js` "In-season payouts"; amounts in `PAYOUTS`, `utils/payouts.js`, `tests/payouts.test.js`).
  Money list = **only prizes already paid** (Raymond's call): each final week's top score ($10; a tied week splits
  it), and once the regular season is fully scored (`bracketIsSet`) the highest single week, top offensive / IDP
  player and division winners; the Toilet Bowl once its final is decided (`toiletBowl` in `utils/seasonAwards.js`,
  losers bracket requested only after the regular season). Then the 14 weekly cards (paid / LIVE leader / to come),
  and the races: highest single-week score (leader only, final weeks only: no runner-up, no live score), top
  offensive and IDP players (top 3, rostered players only), division leaders as a Division / team / record table
  (seeded with the league's tiebreakers, `seedTeams`), Toilet Bowl ("decided in week 17" until then). **Top players:
  credited to the team that has him now, and all his regular-season points count, bench weeks included** (Raymond,
  Nov 16); points from `/api/fetch_trending` (the Players page route, cached on the server). "Highest score of the
  regular season" = best single week (confirmed with the league). Data: standings (final weeks' scores and records),
  `getLeagueMatchups` (the live week, already cached on the homepage), the trending route: no extra Sleeper
  requests during the season. Layout sizes by the room it gets (`container-type`; the homepage sidebar sits beside
  it on desktop, so it stacks there).
  End of season (`seasonPhase` in `utils/seasonData.js`, from Sleeper's `last_scored_leg` and the NFL state):
  once every regular-season week is scored, the recap gains the playoff weeks (winners-bracket games only) and
  `SeasonAwards/HomeAwards` shows the regular-season awards below it. Once the championship is decided the awards
  move to the top (post-season + regular season, with a toggle) and the recap stays below them through NFL week 18
  (about a week after the week-17 final, Raymond's call), then disappears.
- **Trophy Room** (`/awards`) — just `SeasonAwards/TrophyRoomAwards`: a season picker for every season whose regular
  season is over (2022 onward). Opens on the regular-season awards (`prefer="regular"`); the toggle has Regular season
  on the left everywhere (the homepage still opens on the post-season once the championship is decided).
  All-League Team: offense in the left column (QB … SF), defense in the right (IDP, DL, LB, DB), stacked on phones.
  It counts **every point a player scored during the season** (Raymond, Nov 18; awards cache v12);
  the other player awards (MVP, DPOY, rookies) still count starting-lineup points only. The template's podium list (the deleted `src/lib/Awards/Awards.svelte`, `getAwards()`) is no
  longer shown; `src/routes/awards/+page.js` only loads team managers. The homepage sidebar's "Fantasy Champ" still
  uses `getAwards()`.
- **Matchups** — `RayMatchups/MatchupWeeks` + `Matchup` (versus strips; click for every starter with photos;
  bench behind "Show bench"; "M" badge = beat the league median, median shown under the list when the league
  plays median games). Swapped in by one import in `src/lib/Matchups/MatchupsAndBrackets.svelte`.
  Playoffs = `RayMatchups/PlayoffBracket` (option A "neon bracket tree"; the page's Championship / Toilet Bowl buttons
  pick the bracket): season picker (every season), round columns with connector lines (the champion's path in pink,
  orange in the Toilet Bowl), a champion card (last place in the Toilet Bowl), placement games, and the selected
  game's lineups (`RayMatchups/Matchup` with `current={false}` for past seasons: no projections, opponents or NFL
  teams). Phones get one list per round. Before the regular season is fully scored the teams come from today's seeds
  (league rule, `reseed` in `utils/playoffBracket.js`) with later games as "Winner of #4 / #5", not Sleeper's
  placeholder bracket. A playoff week in progress shows LIVE + "Refresh scores" (one request, 30-second cooldown).
  The Toilet Bowl here is lose-to-move-on (Sleeper records the lower score as `w`); `buildBracket` reads that from the
  results. Card in `RayMatchups/BracketCard`. Requests: the two brackets (saved for finished seasons) and the playoff
  weeks that have started; the template's `getBrackets()` is no longer loaded on the Matchups page.
- **Standings** — `RayStandings` (`StandingsTable`: sortable, seed order, dashed playoff line, division pills,
  Division leader / Wildcard / Points wildcard tags, plus draft pick (`utils/draftOrder.js`), all-play and lineup efficiency) and two `PositionAverages` tables (two-sided heat scale:
  cyan = low, pink = high; by value in "Averages", evenly by rank in "Ranking").
- **Trends** (`/trends`, nav tab after Standings) — `RayTrends` (option A "dashboard grid"): standings place,
  points for, max PF, lineup efficiency, all-play %, total offense / defense and each position, week by week.
  Every team starts shown in a fixed color (`--rr-team-0..11`, darker set in day mode); the team buttons show/hide
  teams on every chart (no limit; remembered in localStorage) and hovering one picks out its lines. `TrendChart`
  draws at its real width with a week crosshair + tooltip. End labels lead with the team's latest rank ("3rd Globo_Gym");
  on phones the big charts show just the rank number; the position charts have no end labels (hover for values).
  Points for / Max PF default to the season average per week (totals bunch up as weeks add up), with a small
  Each week / Avg / week / Total / vs avg switch on each (`Shared/Toggle` with `small`); "Each week" is each week's
  own score (`pfWeek` / `maxWeek`) with that week's league average dashed (Raymond, Nov 23-24).
  Data from `utils/leagueTrends.js`.
- **Trades & Waivers** (and manager pages) — `RayTransactions/TransactionFeed`: one card per day, one line per team
  (waivers: + added / − dropped and FAAB bid; trades: team ← what it received, picks show "via <team>").
  Swapped into the template's `TransactionsPage.svelte`. Date parsing/grouping in `transactionView.js`.
  Transactions are saved in the browser (localStorage `transactions`, with `meta`). A page load downloads only the
  current and previous week of the current league and merges them in (2 requests; `utils/transactionsCache.js`,
  `tests/transactionsCache.test.js`); the full download (every week of every season) happens only the first time,
  after a new season starts or when `TRANSACTIONS_CACHE_VERSION` is bumped (bump it if the saved entry shape changes).
  Sections that ask at the same time share one refresh. Nothing is downloaded on the server.
- **Drafts** — `RayDrafts/DraftBoard` (dark cells, top edge in the position color, position tag (solid chip; text
  color `--or-pos-chip-text` per theme), traded picks as "→ owner" / "by <team>"). Swapped in by one import in
  `src/lib/Drafts/index.svelte`, which is also wrapped in `RayDrafts/DraftsLayout`. Clicking a team's name (or a
  "by <team>" tag) spotlights that franchise's picks on every board (others dim) and opens `DraftPicksPanel`
  (sticky right column ≥1100px, bottom sheet below; rows jump to the pick; Escape or ✕ clears). The small ↗ on
  each team header opens the manager page. Shared state in `RayDrafts/draftHighlight.svelte.js`; teams match by
  roster ID, compared as numbers (the boards mix string and number roster IDs).
- **Records** (`/records`) — `RayRecords` (option A "record book"): Regular season / Playoffs switch, All-time or one
  season, four headline records, record lists (top 5, "Top 10" expands; ties are left out of Closest wins; the season
  still being played is "(so far)" in Best seasons and skipped in Worst seasons) and one sortable Team rankings table
  (`Shared/SortableTable`; pink = league best). **Records are per team (Sleeper roster), not per manager**: all-time
  rows add up every season of a roster whoever ran it (Team Fergilatr = calarseneau 2022–23 + Zack Miller since 2024,
  noted as "also calarseneau '22–'23"); a single season shows that season's team and manager. Numbers in
  `utils/recordBook.js` (`tests/recordBook.test.js`) from the template's `getLeagueRecords()` (`leagueRosterRecords`
  per team-season) and transaction totals (`totals.seasons`, per roster). Swapped in for the template's `Records` in
  `components.js`. Records are saved in the browser (localStorage `records`) and rebuilt only when Sleeper scores a new
  week (`last_scored_leg`), the season changes or `RECORDS_CACHE_VERSION` in `utils/recordsCache.js` is bumped (bump it
  whenever the records math changes). A rebuild downloads only the current season's weeks (Nov 15: 12 requests at
  week 9, was about 90): finished seasons' weekly scores, brackets and playoff weeks come from the browser's saved
  copies (`savedSeasons.js` `seasonScores` / `seasonJson`, shared with Rivalry and the Trophy Room), and the playoff
  downloads are skipped until the playoffs start. Records are never built on the server.
- **Rivalry** (`/rivalry`) — `RayRivalry/index.svelte` (+ `utils/rivalry.js`, `tests/rivalry.test.js`): two manager
  pickers (URL `player_one` / `player_two`), head-to-head record with points in their games, last meeting, streak,
  biggest win, closest game, career comparison (all-time, regular season unless noted), every meeting (click for both
  lineups) and the trades between them.
- **Rosters** — `RayRosters/index.svelte` (option B, revised; rendered by `src/routes/rosters/+page.svelte`). Team
  strip in seed order (URL `?team=<rosterID>`, remembered in localStorage `rr-rosters-team`; "All teams" shows the old
  `RosterAnalysis` table and charts), then one team: header (manager, record, seed, PF; players, taxi / IR, future
  picks), starting lineup (Sleeper's current lineup, slot chips softly tinted in the position colors, flex slots as
  gradients, no points), position breakdown (points per week by player position and by lineup slot from the Standings
  position averages, then average age, each with the league average and rank, pink = highest / cyan = lowest; then
  "Player count", with the league average only: no rank or shading, Raymond, Nov 18), depth chart and draft picks. Depth chart "starting" = the best lineup from **season-level** projections:
  projected points per game over the rest of the regular season (at least 4 weeks), byes skipped
  (`seasonProjection` + `predictLineup`), so a bye week never benches a starter; no projections (offseason) → Sleeper's
  current lineup. Math in `utils/rosterBreakdown.js` (`tests/rosterBreakdown.test.js`). `RosterAnalysis/utils.js`
  groups players the same way (`rosterGroup`; single-position DL players used to be counted on offense).
- **Managers** (`/managers`) and **manager pages** (`/manager?manager=N`, N = index in `managersFor(...)`: leagueInfo.js `managers`, or Sleeper's teams) —
  `RayManagers/ManagersList` (option A "trading cards": team, years in the league, favorite NFL team, all-time
  record, titles, this season's record; sort by league order / titles / all-time win % / this season) and
  `RayManagers/ManagerPage` (a bar above the banner, Nov 18: ← previous manager, All managers ("All" on
  phones), next →, repeated at the bottom of the page; banner with facts and bio; tiles for all-time, playoffs, titles, points
  for and this season; trophy case + league records; profile; "Season by season" charts (`RayManagers/SeasonCharts`:
  wins as bars from zero, head-to-head only (the weekly median game is left out, Raymond's call: `h2hWins` etc.),
  points for and max PF as zoomed lines, each with league rank and league average, hover tooltip, table view;
  regular season, finished seasons the manager ran only, from `seasonHistory()` over `leagueRosterRecords`; the current season joins once Sleeper's league status is `complete`); starting lineup with
  offense in the left column and defense in the right (`rosterLineup` returns `offense` / `defense`), then taxi
  always shown and Bench and IR as separate sections collapsed by default; recent moves, expandable to all of them).
  Swapped in for the template's `AllManagers` / `Manager` in `components.js`.
  Placeholder bios ("Lorem ipsum...", "TODO") are hidden. **Manager pages count per manager** (Raymond's call):
  career numbers come from `leagueManagerRecords`, so a manager's page shows only the seasons they ran the team
  (unlike Records, which counts per team). Numbers in `utils/managerProfile.js`
  (`tests/managerProfile.test.js`); site glue (team managers, standings places, NFL team names) in
  `RayManagers/managerInfo.js`.
- **Constitution** (`/constitution`, prerendered) — `RayConstitution`. **The rules text lives in
  `RayConstitution/content.js`** (sections → subsections → blocks: `p`, `list`, `steps`, `table`, `note`, `example`;
  simple HTML allowed; `isNew: true` tags a rule "New" and links it from the top). `index.svelte` is layout only: key
  facts strip (`GLANCE`), "New this season" links, sticky contents column with scroll highlight (a collapsible Contents
  box under 1000px), numbered section cards; every rule number links to itself (`#taxi-2`). Rewritten Nov 14 2026 from
  the league's pinned Sleeper messages plus live Sleeper settings (lineup, 22 bench, 4 IR, 6 taxi ≤2 yrs, $100 FAAB,
  6 veto votes, no trade deadline, 6-round linear rookie draft, scoring). Dues are $70 ($50 pot + $20 in-season
  payouts); `dues` in leagueInfo.js (50) is no longer used by this page.
- **Resources** (`/resources`) — `RayResources` (option A, Nov 15; rendered by `src/routes/resources/+page.svelte`):
  the template's links in four cards (`RayResources/links.js`: trade values & calculators, analysis & rankings,
  podcasts, community; `dynastyOnly` / `redraftOnly` / `premium` as in the template, premium shown as "Paywall"), then
  "Latest news" from `/api/fetch_serverside_news` with source filter chips, 9 rows then "Show 15 more". Rows open the
  story in a new tab. `utils/newsFeed.js` (`tests/newsFeed.test.js`) builds the rows: plain-text title / excerpt
  (WordPress "The post … appeared first on …" dropped), entity-decoded links (feeds send `&#038;`), source badge,
  Article / Podcast / Post, time ago; duplicates are link + title (the Footballers link every episode to their home
  page). No Sleeper requests. The FantasyPros trade chart address is built by `fantasyProsChartUrl(date)` with a
  two-digit month (`/2026/03/`; the template wrote `/2026/3/`, which broke the link January through September;
  `tests/resourceLinks.test.js`).
- **About** (`/about`, last in the Clubhouse menu / phone More panel, Nov 17, canvas option C "list") — `RayAbout`:
  one line on the player card, then one row per page (icon, name, one-line purpose), Main pages and Clubhouse side
  by side from 760px. Tap a row to open what the page shows and an Open button (several can be open; lines describe the content,
  not the buttons: Raymond, Nov 18). **Text lives in
  `RayAbout/content.js`** (`PAGES`, keyed by the page's address); the list follows `tabs.js` (`aboutPages`: a nav
  page with no text is left out, external links and About itself too), so new pages need an entry there. A line can
  be `{ text, when }` with `when` = `houseRules` / `median` / `dynasty` (or `!houseRules` etc.): Payouts, the "M"
  badge, the Standings Pick column and "plus the next one" on Drafts only show for leagues that have them. median
  comes from `getLeagueData()` after mount (shared request), dynasty from `data.site`. tests/about.test.js. Raymond
  dropped the "getting around" tips (only the player card line stayed).
- **Error page** (404, 500, ...) — `RayError` (wired in by `src/routes/+error.svelte`), "Wide right" (Nov 15):
  an inline SVG of neon goalposts on a starry night field, a dashed kick path and a football sailing past the right
  upright, with the status code in outlined Orbitron beside "NO GOOD". Deliberately unlike the header (no sun, grid
  or chrome letters); the scene is dark in both themes and keeps a 760:360 aspect ratio; the dashes and ball stop
  under `prefers-reduced-motion`. Then a kicker ("Wide right" / "Flag on the play"), a title, the text, and Back to
  Home + Go back (Try again for 5xx). SvelteKit's own "Not Found" / "Internal Error" messages are hidden; any other
  `error.message` is shown.
  Don't use a `<nav>` element in page content: the theme styles every `nav` as the header.
- **Players** (`/players`, in the Clubhouse menu after Rosters, Nov 15) — `RayPlayers/index.svelte` (canvas option A "leaderboard";
  rendered by `src/routes/players/+page.svelte`): **Trending free agents** = free agents (on no roster) whose role is growing.
  Raymond's rules (`TREND_RULES` in `utils/trending.js`, `tests/trending.test.js`): snaps over his team's last **2**
  games against its earlier games, points per game over the last **3** against earlier; listed when snaps are up 15+
  points or points per game up 4+, with 40%+ of snaps and a typical (median) recent game of 5+ points, so one spike
  week doesn't carry a quiet player; ranked by snap jump / 10 + (typical recent game − earlier average). Missed games
  count as 0 (that's the point: a bigger role). Injury fill-in = a teammate at the same position (CB ≠ S, DE ≠ DT
  when both are specific) who played 55%+ of snaps before his recent games, then missed one; shown with that
  player's status: "now Out / on IR" (players map `is`), "back for the latest game: his snaps may drop", or "not
  listed injured". Also his own injury status and Sleeper's most-added count (24 h). Filter chips (All / Offense /
  IDP / position), "Include injury fill-ins" switch, 15 rows then "Show 15 more"; names open the player card.
  Phone: name, then snaps and points side by side, bars, reasons. **Data: `src/routes/api/fetch_trending/+server.js`**
  downloads Sleeper's weekly stats files (`api.sleeper.com/stats/nfl/<season>/<week>`, every player, ~1.6 MB each) for
  the finished weeks (`completedWeeks`), trims each to `[playerID, team, snap %, league points]` (`trimWeek`, ~25 KB a
  week; 9 weeks = 212 KB) and keeps them in server memory (the last two weeks refresh every 6 hours for stat
  corrections, older weeks never), 4 at a time; plus `players/nfl/trending/add` (hourly). The answer has
  `cache-control: public, max-age=600, s-maxage=3600, stale-while-revalidate=86400`, so visitors share the CDN copy.
  A cold start fetches nflState + league + every finished week (12 requests at week 10; 1.3 s locally).
  **Top free agents** (first section since Raymond reordered it, Nov 16; was "Best available"): free agents on an NFL team ranked by season points ("Total points")
  or points per game played ("Per game", 3+ games, `BEST_RULES`), with games, last 3 (his team's last 3 games, missed
  games as 0), snap share over the last 2, the same weekly bars, his injury status and Sleeper adds; own filter
  chips. **Weekly bars in both sections = points** (height scaled to the player's best week shown; snap % in the hover
  text and the Snaps column; Raymond's call, Nov 16). `bestAvailable` in `utils/trending.js` (tests in `tests/trending.test.js`); same route data, no extra requests.
- **Player card** (every page, Nov 15) — `PlayerCard/index.svelte` (option A with tabs; canvas boards PlayerCardA4 /
  PlayerCardRB / PlayerCardIDP), mounted once in `src/routes/+layout.svelte`. **Any element with
  `data-player-id="<Sleeper ID>"` opens it** (the card listens for clicks and Enter / Space on the page, capture phase,
  so a row's own click handler doesn't also fire); add `role="button" tabindex="0"` with it. Wired on Rosters (lineup,
  depth chart), Matchups (lineups), manager pages (lineup), Drafts (past picks), Trades & Waivers (player names) and
  the recap's players of the week. `openPlayerCard(id)` in `PlayerCard/playerCard.svelte.js` opens it from code.
  Pop-up ≥700px, bottom sheet below (fixed height so tabs don't jump); Escape / ✕ / backdrop close it.
  Overview: tiles (points and per game through Sleeper's last scored week, position rank among rostered players or the
  best game, projected per game over the next 4 game weeks), a scrollable strip of week cards (played / LIVE weeks
  open their scoring breakdown: every stat × the league's scoring; projected, bye and "didn't play" weeks are shown,
  not clickable) and the breakdown. Stats: six stat tiles per position and the game log. History: "Transactions"
  (draft picks, trades with what every team got, waiver claims / pickups / drops) and the career table.
  **Game log and career share one set of columns per position** (`statGroups` in `utils/playerCard.js`, Raymond's
  calls): WK/SEASON, OPP/G, SNAPS/PTS, PTS/PER G, then the stat groups; non-QB offense = Receiving + Rushing (WR/TE
  receiving first, RB rushing first), QB = Passing + Rushing, IDP = Tackles (TKL, SOLO, TFL), Rush (SCK, HIT), Cover
  (PD, INT), Fumbles (FF, FR), DB with Cover before Rush. Group labels are gray, column headers cyan, zeros dimmed;
  no group is highlighted over another. No "league scoring" labels anywhere: every point is this league's.
  Math in `utils/playerCard.js` (`tests/playerCard.test.js`, real Sleeper answers whose points match the matchups);
  glue in `PlayerCard/cardData.js`. Requests: opening a card = 1 (the season week by week, shared per page load); the
  rank only uses matchups the page already loaded (no download, else the tile shows the best game); History adds the
  drafts and transactions loaders (shared with those pages, mostly saved) and one request per past season the first
  time (`utils/playerStats.js` `seasonTotals`, saved for good under `pstats/v1/<id>/<season>` in `rr-pastSeasons`;
  bump `PLAYER_STATS_VERSION` if `trimStats` changes). Before a season's first game the card shows last season.
  Team names follow the site rule (each team's current name in every season); manager names are per season.

### Shared building blocks
- `utils/leagueContext.js` — `loadLeagueBasics()` (nflState, managers, leagueData, rosters, `divisions`
  = { [rosterID]: division }, players, `onTeamClick`)
  and `loadLeagueContext({ standingsData, leagueTeamManagersData })` (adds `standings` and
  `teams` = { [rosterID]: { name, avatar } }). Sections passed the same standingsData promise share one result.
- `utils/weeklyMatchups.js` + `utils/matchupEntries.js` — every regular-season week's matchups, downloaded once by
  the template's `getLeagueMatchups()` (cached in `matchupsStore`) and converted back to Sleeper's raw entries.
  Standings, the recap and the playoff projection's remaining schedule all read this; don't fetch `/matchups/{week}`
  directly.
- `utils/leagueStandings.js` — standings, division records, position averages (`helper.js` exports it as
  `getLeagueStandings`). `standings.matchups` is completed weeks, newest first (index 0 = last completed week).
- `utils/positions.js` — position grouping (DE→DL, CB→DB, …: `groupOf`, `playerGroup`, `idpGroup`), position colors
  (`posColor` → `--or-pos-*`, Sleeper's colors) and `playerPhoto`. Use it instead of writing new position maps.
- `utils/positionAverages.js` — per-week averages by lineup slot / player position, from `roster_positions`.
- `utils/predictOptimalScore.js` — `predictLineup(players, week, leagueData)` = best projected lineup
  (`{ score, picks: [{ slot, id, p }] }`, players need an `id`); `predictScores` is its score (max PF everywhere).
  Optimal assignment (Nov 14): players best first, any slot their Sleeper positions allow, others moved to make room
  (augmenting paths); free slots at the player's listed position first. Week pools include taxi/IR players, so it runs
  ~0.1–2% above Sleeper's `ppts`; the old slot-order greedy ran up to 3% under.
- `utils/rosterBreakdown.js` — Rosters page: `rosterAgeCounts` (players / average age per position, `rosterGroup`
  = listed position first), `leagueRanks` (average + dense rank, 1 = highest), `rankShade`, `projectionWeeks` /
  `seasonProjection`, `depthChart`, `pickSeasons` / `ownedPicks` (future picks from `traded_picks`).
- `utils/leagueTrends.js` — week-by-week series for the Trends page (place via `seedTeams`, record incl. median game,
  PF, max PF via `predictScores`, efficiency, all-play, position / OFF / DEF averages) from `standings.matchups`.
  Pass `officialMax` (standings `potentialPoints`): weekly max PF is fitted to Sleeper's season max PF (`fitToTotal`,
  never below the week's actual score), so Trends totals, ranks and efficiency match Standings exactly.
  `placesByWeek()` + `movesForWeek()` give the recap's Movers; both share one record/seeding loop with `leagueTrends()`.
- `utils/playoffBracket.js` — the Matchups playoff bracket: `buildBracket` (games, scores, status, placement games,
  tree layout, champion), `reseed` (teams by seed before the playoffs), `sourceLabel`, `defaultGame`
  (`tests/playoffBracket.test.js`, built on the real 2025 brackets).
- `utils/playoffs.js` — the league seeding rule (`seedTeams`, also used by Standings, Trends and the awards), bracket
  shape and the Monte Carlo playoff projection (`expectedScores`, `simulateSeason`).
- `utils/teamStats.js` — all-play record & luck, lineup efficiency, Tankathon order, streaks (`streakValue`, `streakLabel`).
- `utils/draftOrder.js` — rookie draft order by the league rule (`leagueDraftOrder`, `tests/draftOrder.test.js`):
  picks 1–6 non-playoff teams by lowest max PF (`tankathonOrder` on those teams), then 5th, 6th, 3rd, 4th,
  runner-up, champion. Playoff places come from the winners bracket (`playoffPlaces`: real winners where played, the
  better seed otherwise) and are projected by seed until it's set (`bracketIsSet`: regular season fully scored).
  Used by the Standings Pick column, the homepage Team Breakdown and the Drafts board's upcoming draft
  (`leagueDrafts.js` `buildFromScratch`, marked; its accuracy bar now counts weeks scored, not games).
  `leagueContext.js` `loadWinnersBracket()` fetches the bracket only once it's set. `TOILET_BOWL_PICK` +
  `toiletBowlWinner(losersBracket)` (read like `leagueAwards.js`): the upcoming draft carries `extraPicks`
  ([{ round: 3, pick: 13, label, rosterID|null }], from the 2027 draft on), drawn by `DraftBoard` as a full-width
  strip after round 3 ("TBD" until the Toilet Bowl final).
- `utils/weeklyRecap.js` — the weekly recap (`weeklyRecap`, `positionGroup`, `RECAP_POSITIONS`).
- `utils/matchupEntries.js` also has the one-week helpers `pairMatchups` and `playedEntries`.
- `utils/managerProfile.js` — Managers pages: career stats with ranks (records; `careerStats(..., { active })`: the
  manager page ranks win % and points for among current managers only), trophies (award podiums; Sleeper's
  divisions here are unnamed, so each division winner is "Division Champion" and the best record among them, points
  for breaking ties, is "Regular Season Champion"), league
  record-book places, season-by-season history (`seasonHistory`), lineup slots / bench, placeholder-bio check.
- `utils/seasonAwards.js` — end-of-season award math (plain functions, `tests/seasonAwards.test.js`). Player awards
  count points scored in a starting lineup. Waiver Wizard and the Pickups credit each start to how the
  team got that player (latest waiver, free-agent, trade or commissioner add in a leg <= that week; otherwise
  drafted/kept). Pickup of the Year and Bench Legend are split into offense and defense. Trade of the Year = everything the players a
  team received scored from the trade's week on (any team, starting or bench, Raymond's call; later flips don't
  matter), minus the same for the players it sent; traded draft picks count as a rough season
  of points for their round (`utils/pickValues.js`, measured from this league's 2023–2026 rookie drafts), scaled to the
  part of the regular season left after the trade (`pickShare`: a 1st traded in week 12 of 14 counts 3/14 of 120). Rookies: `experience` (Sleeper years_exp, as of the current season) minus seasons since.
  Playoff seeds use `seedTeams` (the league rule) numbered among the teams Sleeper put in the winners bracket;
  this matched Sleeper's brackets for 2023–2025. Cinderella = the non-bye team that went furthest (ties: lower seed).
  Championship Hero = the champion's top scorer in the final. Most Efficient Manager = playoff points ÷ max points
  over the winners-bracket games played. Toilet Bowl = the `w` of the losers-bracket final: Sleeper's losers bracket
  here records the LOWER score as the winner (losers advance), so that's the team that lost all the way down.
- `utils/seasonData.js` — loads one season for the awards: the shared regular-season matchups for the current
  league, plus the winners and losers brackets, scored playoff weeks and transaction legs 1..regular-season length
  (one request per URL per page load, shared with the recap). Results are saved in localStorage: past seasons for
  good, the current season for 3 hours. **Bump `CACHE_VERSION` whenever the award math changes**, or browsers keep
  showing the old results. A season's older-version result is kept until its new one is saved, and is shown if Sleeper
  fails (on Nov 9 Sleeper answered 404 for the 2025 league's rosters and winners bracket for a while).
- `utils/predictOptimalScore.js` — best projected lineup (`predictScores`, also exported from `helper.js`).
- `utils/colorScale.js` — the green/yellow/red palette for heat-scaled numbers.
- `components/Shared/` — `Loading` (loading/error message), `Toggle` (segmented control; SMUI button groups are
  restyled to match in `outrun.css`), `TeamChip` (avatar + team name, clickable),
  `PosChip` (solid position tag in its position color), `SortableTable` (click-to-sort table shell with an optional
  group header row and a sticky team column; Team Breakdown and the Standings table render their own cells into it), `format.js` (pct, pts, record, `ordinal` "3rd"…),
  `common.css` (`rr-tableWrap` / `rr-table` tables and `rr-pageSub` subtitles). The table selectors are two classes
  deep, so a component's scoped override needs more (e.g. `.rr-avg table.rr-avgTable td`).
- `Insights/config.js` — `SHOW_PLAYOFF_ODDS = false` hides all percentages, projected records and title odds
  (bracket shows seeds only) from everyone. Raymond doesn't want league mates seeing the odds yet.
  **Secret switch (Nov 15):** `?odds=on` on any page shows them in that browser from then on, `?odds=off` hides them
  again (localStorage `rr-odds`; the parameter is removed from the address so screenshots and copied links don't show
  it). Logic in `utils/oddsSwitch.js` (`tests/oddsSwitch.test.js`); `Insights/OddsSwitch.svelte` (mounted in
  `src/routes/+layout.svelte`) applies it; `PlayoffProjection` and `TeamBreakdown` read `Insights/playoffOdds.svelte.js`
  instead of the constant. Each browser (and a home-screen app) keeps its own choice. Not real security: anyone
  reading the site's code could find it.
- `RayPowerRankings` uses the template's `src/lib/BarChart.svelte` with `controlsOnTop` (Raymond's addition).

### Template files we changed (check these after merging template updates)
- `src/lib/Matchups/MatchupsAndBrackets.svelte`: `PlayoffBracket` instead of the template's `Brackets` (shown before
  the playoffs too), buttons renamed Championship / Toilet Bowl, no `bracketsData`, and Regular Season goes back to
  the week you were on (else the current week) instead of week 1; `src/routes/matchups/+page.js`
  no longer loads `getBrackets()`.
- Wiring: `src/routes/+page.svelte`, `src/routes/+error.svelte`, `src/routes/constitution/+page.svelte`, `src/routes/awards/` (season awards only), `src/routes/standings/+page.js` (passes `fetch`), `src/routes/trends/` (new), `src/routes/rosters/+page.js`
  (standings only) and `+page.svelte` (renders `RayRosters`), `src/routes/resources/+page.svelte` (renders `RayResources`), `src/lib/components.js`, `src/lib/utils/helper.js`, `src/lib/utils/tabs.js` (nav tabs; the template's "League Info" menu is renamed "Clubhouse" and has Players),
  `src/lib/Matchups/MatchupsAndBrackets.svelte`, `src/lib/Drafts/index.svelte`,
  `src/lib/Transactions/TransactionsPage.svelte` (also: the bottom page buttons scroll to the list's heading, measured
  when clicked and done after the URL update; the template measured once at load and scrolled to the page top).
- `src/lib/Pagination.svelte`: an `onchange(dest)` prop, called when a page is picked.
- `src/lib/Nav/index.svelte` (Nov 17): under 950px it renders `AAA-Raymond/components/PhoneNav` (option C from the
  canvas "Site pages on phones" row) instead of the template's ☰ drawer; `src/lib/Nav/NavSmall.svelte` is no longer
  used (left in place). PhoneNav: an icon row under the logo (Home, Matchups, Standings, Trends, "Moves" = Trades &
  Waivers, More); More drops a panel of the nested menu's pages (the desktop "Clubhouse" dropdown, plus Blog when
  it's on) as tiles. **Only the page you're on is pink** (row button or tile; `/manager` counts as Managers); More gets
  a cyan outline while open. Pages come from `tabs.js` (`phoneNav.js` `rowAndMore` / `isCurrent`,
  tests/phoneNav.test.js). Plain links (preload on hover); Escape, a tap outside or picking a page closes the panel.
  Colors are theme variables (`--or-toggle-*`, `--or-footer-bg`), so day mode works. Under 360px the row's labels
  shrink to 8.5px so "Matchups" / "Standings" don't touch. The homepage's views switch on phones is a pill toggle
  under the league name (RayHome; it replaced the fixed bottom bar the same day).
- `src/lib/Footer.svelte`: Raymond's credit line under the template's (kept) copyright / "Built by" lines: "Outrun
  redesign and custom features by RainMan · Buy me a coffee" (https://buymeacoffee.com/rainman001), Nov 17.
- Settings / visitor's league (Nov 17, see "Switching leagues"): `src/app.html` (hide-until-ready script + style),
  `src/routes/+layout.svelte` (`ready` gate, LeagueBanner), `src/routes/settings/+page.svelte` (new, renders
  `RaySettings`), `src/lib/utils/tabs.js` (Clubhouse "Settings" after Go to Sleeper, then "About";
  `src/routes/about/+page.svelte` renders `RayAbout`), `src/routes/api/fetch_trending`
  and `src/routes/api/fetch_players_info` (`?league=`), `src/lib/utils/helperFunctions/players.js` (sends `?league=`).
- League switching (Nov 16): `src/lib/utils/leagueInfo.js` (profiles), `src/lib/stores.js`, `src/lib/Nav/index.svelte`
  (logo from the profile), `NavLarge` / `NavSmall` / `Footer` (Managers always shown), `src/routes/+page.svelte`
  (champ click), `src/routes/managers/` and `src/routes/manager/` (Sleeper managers), `src/routes/constitution/+page.js`,
  `leagueTransactions.js` / `leagueRecords.js` / `players.js` (per-league storage), `leagueDrafts.js` (Toilet Bowl pick
  only with house rules; no projected draft for redraft leagues), `universalFunctions.js` (`gotoManager`), and (Nov 17)
  the new root `src/routes/+layout.js`, `src/routes/+page.svelte` / `NavSmall` (name and line from `data.site`),
  `src/lib/Drafts/index.svelte` (redraft note).
- `goto` options are `noScroll` / `keepFocus` (camelCase). The template wrote `noscroll` / `keepfocus`, which SvelteKit
  ignores, so changing the Matchups week, the bracket buttons, Rivalry managers and Trades & Waivers pages/search all
  jumped to the page top; fixed in the files the site uses (Nov 16). With `noScroll`, SvelteKit restores the scroll
  position from when `goto` started once navigation ends, so scroll yourself after `await goto(...)`, not before.
- `src/lib/utils/helperFunctions/leagueMatchups.js` keeps extra fields per team (`players`, `playersPoints`,
  `matchup_id`, `total`) for the bench and the shared matchups loader.
- `src/lib/BarChart.svelte` (`controlsOnTop`).
- `src/lib/utils/helperFunctions/leagueRecords.js` `analyzeRosters`: points per game is points per WEEK (games ÷ 2 when
  the league plays the median game; 2026 seasons were halved before). `getLeagueRecords`: the in-session check looks at
  `regularSeasonData` (it checked a key one level down and never matched), saved records carry `meta` and stay fresh
  until a new week is scored (`utils/recordsCache.js`), and nothing is built on the server. `processRegularSeason`
  also saves each team-season's head-to-head record without the median game (`h2hWins` / `h2hLosses` / `h2hTies`,
  from `recordBook.js` `headToHeadRecords`; `RECORDS_CACHE_VERSION` 3). Sleeper's `wins`/`losses` include the median.
  Weekly scores come from `seasonScores` (saved for good for finished seasons), and `processPlayoffs` returns before
  downloading anything until the playoffs start.
- `src/lib/utils/helperFunctions/leagueBrackets.js` `getBrackets` (used only by the records): brackets via
  `seasonJson` and playoff weeks via `seasonScores` (saved for finished seasons); a team's playoff points are its weekly
  total (`weekPoints`) instead of adding up `starters_points`. Checked Nov 15: all 4,520 record values match the old
  build (the new totals just lose float noise, e.g. 345.98 instead of 345.97999999999996).
- Every file in `src/lib/utils/helperFunctions/` that calls Sleeper imports `sleeperFetch` instead of `fetch` (marked).
- `src/lib/utils/helperFunctions/leagueTransactions.js`: the saved-copy top-up (entries carry `league`, `leg`, `ts`;
  `computeTotals` split out; newest-first order with a transaction-ID tie-break).
- `leagueData.js`, `leagueTeamManagers.js`, `leagueRosters.js`, `leagueAwards.js`, `leagueDrafts.js` (helperFunctions):
  finished seasons come from `utils/savedSeasons.js`. `getLeagueTeamManagers` now loads each season's league info
  before its users and rosters; `getAwards` gets past league info through `getLeagueData`; saved draft picks keep
  only the fields the boards use.
- `src/lib/utils/helperFunctions/universalFunctions.js` `getTeamData`: a team without a Sleeper team name is called
  "Team <Sleeper username>" (the template used the user's display name, which leagueInfo.js replaces with the
  manager's real name).
- Theme: `src/routes/+layout.svelte` (also mounts the player card and the odds switch), `src/app.html`, `src/lib/Nav/index.svelte`, `NavLarge.svelte` (also: the Clubhouse drop-down is measured against `.parent` on open and
  on window resize, and only its height animates; the template measured once from the window edge, so it drifted after a
  resize, Nov 16), `static/manifest.json`.
- `src/lib/Footer.svelte`: hides the Blog link when `enableBlog` is off (like the nav).
- `src/routes/blog/+page.js` and `blog/[slug]/+page.js`: with `enableBlog` off they answer 404 (the site's error page)
  instead of returning `false`, which made the page components crash with a 500.
- Records → Playoffs: the template's round names become "Wild Card round" / "Semifinal round" / "Championship round"
  (`recordBook.js` `weekLabel`; placement games share those weeks, so it names the round, not the game). Rivalry's
  meeting labels (`rivalry.js`) also call a first round with byes "Wild Card".
- `TransactionFeed` day counts: real day totals ("8 of 11 waivers"), but a kind with nothing shown that day isn't
  counted (`transactionView.js` `dayCountLabel`; the homepage list picks trades and waivers separately).
- Logic that used to live in components / server endpoints is in plain, tested modules: `utils/feedText.js`
  (`decodeEntities`, news titles) and `utils/playerSchedule.js` (`weekSchedule` / `opponentFor`, players' opponents).
- Lineup-slot averages are labelled "QB+SF" (QB + superflex) and "Flex" (RB/WR/TE flex) on Standings
  (`RayStandings/constants.js`) and Rosters (`SLOT_INFO`); the data keys stay `QB+Flex` / `WRT` / `IDP`
  (`positionAverages.js`), so don't rename those without updating every user.
- `RosterAnalysis/TeamTable.svelte`: columns "Team" / "All" (whole-roster average); team names are buttons calling
  `gotoManager({ leagueTeamManagers, rosterID })` (SMUI's `Cell` drops `on:click` under Svelte 5, and the old call
  passed the row number).
- News (Resources): `src/lib/utils/helperFunctions/news.js` only calls `/api/fetch_serverside_news`, which now also
  fetches Reddit (blocked from the browser by CORS; usually blocked server-side too, so it adds nothing) and lets any
  failed feed add nothing instead of breaking the section. Feed titles get HTML entities decoded (`decodeEntities`).
- `src/routes/api/fetch_trending/+server.js` (new, ours) and `src/routes/players/` (new): the Players page.
- `src/routes/api/fetch_players_info/+server.js`: a projection entry without an opponent (player listed out that week)
  gets it from that week's schedule built from every other entry (team -> opponent); bye weeks stay null. Browsers
  keep player data 24 hours (`playersInfo` in localStorage), so fixes here show up after that.

### Template files deleted (Nov 15)
Unused template components and old helper copies were deleted with `git rm` once every page had a Ray* replacement
(an import graph from the routes and tests showed nothing reached them): `src/lib/Awards/`, `Managers/`, `News/`,
`PowerRankings/`, `Records/`, `Rivalry/`, `Rosters/`, `Standings/`, `src/lib/Resources.svelte`, the unused files in
`src/lib/Drafts/` (`Draft`, `DraftRow`), `src/lib/Matchups/` (`MatchupWeeks`, `Brackets`, `BracketsColumn`,
`Matchup`) and `src/lib/Transactions/` (`Transactions`, `WaiverTransaction`, `TradeTransaction`, `TransactionMove`),
`src/lib/utils/helperFunctions/leagueStandings.js`, `predictOptimalScore.js` and `rivalryMatchups.js` (its
`getRivalryMatchups` export left `helper.js`), the two committed `.DS_Store` files, plus our own unused
`PositionAverages/PositionAverages.svelte` and `RayError/codeSvg.js`. `src/lib/components.js` no longer exports
News, Resources, Awards, Rosters, PowerRankings or Standings. If a template update changes one of these files, git
reports a modify/delete conflict: keep the deletion (`git rm <file>`).

## Playoff projection
- Monte Carlo (10,000 runs, fixed seed so numbers are stable between loads) of the remaining regular season and the playoffs.
- Team strength: Sleeper projected best lineup (`predictScores`) scaled to the league's actual scoring, blended 70/30
  with the team's season average; spread from each team's weekly scores shrunk toward the league's.
- Seeding (league rule, per Raymond): division winners take the top seeds, the next seeds go to the best remaining
  records, and the last seed goes to the highest points for among everyone not yet in, regardless of record.
  With 3 divisions: 1-3 division winners, 4-5 records, 6 points for. Seeds 1-2 get byes. Record ties are broken by
  points for. Settings: `DIVISION_WINNERS_GET_TOP_SEEDS`, `POINTS_WILDCARD_SEEDS` in `utils/playoffs.js`.
  Playoff team count and start week come from Sleeper league settings. Median games are supported.
- Hidden once the regular season ends (points to the Matchups bracket).
- Sleeper fills in the winners bracket before the season ends (it can even look like last year's); the awards only
  read it once the regular season is fully scored.

## Look and feel (outrun theme)
- Theme lives in `src/lib/AAA-Raymond/theme/outrun.css`, imported in `src/routes/+layout.svelte`.
  It overrides the template's color variables (`--fff`, `--f8f8f8`, ... named after the original
  light colors) and SMUI's `--mdc-theme-*` variables. Selectors start with `html:root` to win over template styles.
- Night is the default. Sunset day mode = `<html data-theme="day">`, set by the header toggle
  (`src/lib/Nav/index.svelte`), saved in localStorage, applied before paint by the inline script in `src/app.html`.
  Day mode also loads `/smui.css` on top of `/smui-dark.css`.
- Position colors: `--or-pos-QB` … `--or-pos-DB` (Sleeper's colors at night, darker shades in day mode).
- Main page headings: Orbitron 34px with the pink glow (Matchups, Drafts, Standings match).
- Header backdrop: `horizon-night.svg` / `horizon-day.svg` in the theme folder.
- Logo: `src/lib/AAA-Raymond/components/OutrunLogo/` draws hand-built block letters (`glyphs.js`) as SVG,
  so it doesn't depend on fonts. Change the words via the `title`/`subtitle` props; letters missing from
  `glyphs.js` are skipped. Headings use the Orbitron web font (loaded in `app.html`).
- Favicon and app icons: `static/outrun-icon.svg`, `static/favicons/outrun-*.png`.

## Gotchas
- Sleeper roster slot names: `IDP_FLEX`, `SUPER_FLEX`, `FLEX`, `REC_FLEX`, `WRRB_FLEX`, `BN`.
  Defender `position` can be specific (DE, DT, CB, S): group with `utils/positions.js`.
- Position averages are keyed by roster ID; display names come from `getTeamFromTeamManagers`.
  Never hardcode usernames.
- Team names: always take them from the team managers data (`getTeamFromTeamManagers` / `getTeamNameFromTeamManagers`
  or `teams` from `loadLeagueContext`), never from `users[...].display_name`: that's the manager's real name
  (leagueInfo.js), and teams without a Sleeper team name default to "Team <username>" (`user_name`).
- Files use Windows (CRLF) line endings; keep them.
- Headings: the theme styles every h1-h6 with `html:root :is(h1, ...)` (Orbitron, glow), which beats a component's
  plain `h2 {}`; scope it under a class (`.rr-group h2`) and set `text-shadow: none` for a label-style heading.
- No `margin: auto` sideways on a box inside a flex column (e.g. the Rosters card): it stops the box stretching, so it
  grows to its widest content (a wide table) and the whole page slides sideways on phones. RosterAnalysis had this
  under 400px (fixed Nov 16).
- Prefix class names in custom components (`rr-`): the template has global rules on generic names
  (e.g. `.slot { width: 22px !important }`) that will break your layout.
- Svelte 5 scoped styles only add one class of specificity, so global rules like the shared table styles can win
  over a component's own rule; check computed styles when an override "doesn't work".
- Player projections in the players map are strings (`wi[week].p = "22.01"`); `parseFloat` before doing math.
- Big computed objects held in Svelte state should use `$state.raw` (deep proxies break object identity).
- Weekly recap numbers can differ slightly from Sleeper's own weekly report: Sleeper snapshots it before stat corrections.
- Transaction dates from the template look like "Nov 4 2026, 2:6AM" (minutes not padded); parse them with
  `transactionView.js`.
- Division records are counted once in `getLeagueStandings` (they used to be double-counted).
- Player stats (the player card, Nov 15): Sleeper's
  unofficial `https://api.sleeper.com/stats/nfl/player/<id>?season_type=regular&season=<year>&grouping=week` (or
  `grouping=season`) returns one player's whole season in one request: opponent, snaps, targets and every stat.
  Multiplying each stat by the league's `scoring_settings` (same key names) reproduces the matchup points exactly
  (checked: Amon-Ra St. Brown, week 1, 28.7 both ways). The bulk `stats/nfl/<year>?season_type=regular&position[]=...`
  file is about 4.9 MB, so anything built on it (e.g. best available free agents) needs a trimming, cached server
  route like `fetch_players_info`. The players map (`loadPlayers`) has `fn`, `ln`, `pos`, `positions`, `t`, `age`,
  `experience`, `number`, `wi` (weekly projection + opponent).
- The template's stores (`standingsStore`, `matchupsStore`, ...) are module-level, so on the server they persist
  between requests until the instance restarts. The browser re-runs the loads after hydration, so pages show fresh
  data, but server-rendered HTML can be a little stale.

## Open TODOs
- (none)

## TODO (not a priority)
- Reuse `TeamChip`, the week-arrow buttons and the "M" badge in Matchups, the transaction feed and the draft board
- Add one line, export const ssr = false, in a new src/routes/+layout. 
  - Why? 
    - Every time Vercel starts a fresh server, which it does often on a small site after it sits idle, the first visits make another 20–35 Sleeper requests per page type. They come from Vercel’s address and nothing uses them.
    - What the server builds is only the header, nav and loading messages.

