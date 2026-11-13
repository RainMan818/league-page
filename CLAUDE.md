# CLAUDE.md

Fantasy football league site for **The Dynasty League IDP SF**, built on the open-source
[League Page](https://github.com/nmelhado/league-page) template (SvelteKit 2, Svelte 5, SMUI).
All data comes live from the public Sleeper API.

## Commands
- `npm run dev` — local dev server
- `npm test` — logic tests in `tests/` (plain `node --test`, no extra packages). Run after changing anything in
  `src/lib/AAA-Raymond/utils/` or `RayTransactions/transactionView.js`.
- `npm run build` / `npm run preview` — production build
- Deploys to Vercel (default adapter). Docker build uses adapter-node (`npm run docker-run`).
- Node is pinned to 24.x in `package.json` `engines`. Don't loosen it to `>=`: Vercel then jumps to the newest
  Node, and Node 26 broke the `smui-theme` build step (yargs `require is not defined`).

## League facts
- Sleeper league ID `1314319869289717760`, set in `src/lib/utils/leagueInfo.js` with manager bios
- 12 teams, dynasty, half-PPR, superflex, IDP, **3 divisions of 4** (Sleeper settings), plus a weekly
  league-median game (records are 2 games per week). The constitution text still describes 2 divisions.
- Starting lineup (Sleeper `roster_positions`): QB, RB×2, WR×2, TE, FLEX×3, SUPER_FLEX, IDP_FLEX, DL×3, LB×3, DB×3.
  Code reads the lineup from `roster_positions`; nothing hard-codes slot indexes any more.

## Where custom code lives
- **All custom work goes in `src/lib/AAA-Raymond/`.** This keeps merges from the upstream template easy.
- Only touch template files to wire custom code in. Keep those edits small and mark them `AAA-Raymond`.
- `src/lib/version.js` must stay in sync with `package.json`; don't bump it by hand.
- Be gentle with the Sleeper API (Raymond's request): reuse data that's already loaded instead of adding requests.
  Every Sleeper request goes through `utils/sleeperFetch.js` (`sleeperFetch`, or `sleeperJson(path)`): one request
  per URL per page load, shared by every section that asks at the same time (`tests/sleeperFetch.test.js`). Use it for
  new code too; plain `fetch` only for something that must be re-downloaded (the Matchups "Refresh scores" button).
  Measured Nov 2026 (cold page load, browser): Home 40, Matchups 36, Standings / Trends / Rosters 30, Drafts 36,
  Managers 38, a manager page 40, Trades & Waivers / Records / Rivalry 18 (84 with two managers picked), Trophy Room 16.

### Pages
- **Home** — `RayHome` is the only custom line in `src/routes/+page.svelte`. One section at a time, picked with
  Recap / Power Rankings / Standings tabs under the league title (a fixed bottom bar under 760px wide):
  Recap = weekly recap (`Insights/RecapPanel` + `WeeklyRecap`, previous/next and a week picker) ending with
  "Movers" (`RayStandings/StandingsMovers`: risers / fallers that week, from `placesByWeek()` + `movesForWeek()` in
  `utils/leagueTrends.js`; hidden for week 1 and playoff weeks) and season awards;
  Power Rankings = `RayPowerRankings` (in a card); Standings = `Insights` (playoff projection bracket
  + sortable Team Breakdown table). The last pick is remembered (localStorage `rr-home-view`); `/?view=recap|rankings|standings`
  opens one directly. A section is built the first time it's opened, then kept. The sidebar's "Recent Moves" is
  `RayTransactions/RecentMoves` (newest 6 waivers + 6 trades, `RECENT_PER_TYPE`), swapped in via `components.js`.
  End of season (`seasonPhase` in `utils/seasonData.js`, from Sleeper's `last_scored_leg` and the NFL state):
  once every regular-season week is scored, the recap gains the playoff weeks (winners-bracket games only) and
  `SeasonAwards/HomeAwards` shows the regular-season awards below it. Once the championship is decided the awards
  move to the top (post-season + regular season, with a toggle) and the recap stays below them through NFL week 18
  (about a week after the week-17 final, Raymond's call), then disappears.
- **Trophy Room** (`/awards`) — just `SeasonAwards/TrophyRoomAwards`: a season picker for every season whose regular
  season is over (2022 onward). The template's podium list (`src/lib/Awards/Awards.svelte`, `getAwards()`) is no
  longer shown; `src/routes/awards/+page.js` only loads team managers. The homepage sidebar's "Fantasy Champ" still
  uses `getAwards()`.
- **Matchups** — `RayMatchups/MatchupWeeks` + `Matchup` (versus strips; click for every starter with photos;
  bench behind "Show bench"; "M" badge = beat the league median, median shown under the list when the league
  plays median games). Swapped in by one import in `src/lib/Matchups/MatchupsAndBrackets.svelte`; the playoff
  bracket still uses the template's `Matchup.svelte`.
- **Standings** — `RayStandings` (`StandingsTable`: sortable, seed order, dashed playoff line, division pills,
  Division leader / Wildcard / Points wildcard tags) and two `PositionAverages` tables (two-sided heat scale:
  cyan = low, pink = high; by value in "Averages", evenly by rank in "Ranking").
- **Trends** (`/trends`, nav tab after Standings) — `RayTrends` (option A "dashboard grid"): standings place,
  points for, max PF, lineup efficiency, all-play %, total offense / defense and each position, week by week.
  Every team starts shown in a fixed color (`--rr-team-0..11`, darker set in day mode); the team buttons show/hide
  teams on every chart (no limit; remembered in localStorage) and hovering one picks out its lines. `TrendChart`
  draws at its real width with a week crosshair + tooltip. End labels lead with the team's latest rank ("3rd Globo_Gym");
  on phones the big charts show just the rank number; the position charts have no end labels (hover for values).
  Points for / Max PF default to the season average per week (totals bunch up as weeks add up), with a small
  Per week / Total / vs avg switch on each (`Shared/Toggle` with `small`).
  Data from `utils/leagueTrends.js`.
- **Trades & Waivers** (and manager pages) — `RayTransactions/TransactionFeed`: one card per day, one line per team
  (waivers: + added / − dropped and FAAB bid; trades: team ← what it received, picks show "via <team>").
  Swapped into the template's `TransactionsPage.svelte`. Date parsing/grouping in `transactionView.js`.
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
  whenever the records math changes). A rebuild downloads every week of every season (about 90 Sleeper requests);
  records are never built on the server.
- **Rosters** — `RosterAnalysis` at the top of the page (age, count and spread by position).
- **Managers** (`/managers`) and **manager pages** (`/manager?manager=N`, N = index in leagueInfo.js `managers`) —
  `RayManagers/ManagersList` (option A "trading cards": team, years in the league, favorite NFL team, all-time
  record, titles, this season's record; sort by league order / titles / all-time win % / this season) and
  `RayManagers/ManagerPage` (banner with facts, bio and previous/next; tiles for all-time, playoffs, titles, points
  for and this season; trophy case + league records; profile; starting lineup with bench / IR & taxi; recent moves,
  expandable to all of them). Swapped in for the template's `AllManagers` / `Manager` in `components.js`.
  Placeholder bios ("Lorem ipsum...", "TODO") are hidden. **Manager pages count per manager** (Raymond's call):
  career numbers come from `leagueManagerRecords`, so a manager's page shows only the seasons they ran the team
  (unlike Records, which counts per team). Numbers in `utils/managerProfile.js`
  (`tests/managerProfile.test.js`); site glue (team managers, standings places, NFL team names) in
  `RayManagers/managerInfo.js`.

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
- `utils/leagueTrends.js` — week-by-week series for the Trends page (place via `seedTeams`, record incl. median game,
  PF, max PF via `predictScores`, efficiency, all-play, position / OFF / DEF averages) from `standings.matchups`.
  `placesByWeek()` + `movesForWeek()` give the recap's Movers; both share one record/seeding loop with `leagueTrends()`.
- `utils/playoffs.js` — the league seeding rule (`seedTeams`, also used by Standings, Trends and the awards), bracket
  shape and the Monte Carlo playoff projection (`expectedScores`, `simulateSeason`).
- `utils/teamStats.js` — all-play record & luck, lineup efficiency, Tankathon order, streaks (`streakValue`, `streakLabel`).
- `utils/weeklyRecap.js` — the weekly recap (`weeklyRecap`, `positionGroup`, `RECAP_POSITIONS`).
- `utils/matchupEntries.js` also has the one-week helpers `pairMatchups` and `playedEntries`.
- `utils/managerProfile.js` — Managers pages: career stats with ranks (records), trophies (award podiums), league
  record-book places, lineup slots / bench, placeholder-bio check.
- `utils/seasonAwards.js` — end-of-season award math (plain functions, `tests/seasonAwards.test.js`). Player awards
  count points scored in a starting lineup. Waiver Wizard and the Pickups credit each start to how the
  team got that player (latest waiver, free-agent, trade or commissioner add in a leg <= that week; otherwise
  drafted/kept). Pickup of the Year is split into offense and defense. Trade of the Year = everything the players a
  team received scored from the trade's week on (any team, starting or bench, Raymond's call; later flips don't
  matter), minus the same for the players it sent; traded draft picks count as a rough season
  of points for their round (`utils/pickValues.js`, measured from this league's 2023–2026 rookie drafts). Rookies: `experience` (Sleeper years_exp, as of the current season) minus seasons since.
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
  (bracket shows seeds only). Raymond doesn't want league mates seeing the odds yet.
- `RayPowerRankings` uses the template's `src/lib/BarChart.svelte` with `controlsOnTop` (Raymond's addition).

### Template files we changed (check these after merging template updates)
- Wiring: `src/routes/+page.svelte`, `src/routes/awards/` (season awards only), `src/routes/standings/+page.js` (passes `fetch`), `src/routes/trends/` (new), `src/routes/rosters/+page.js`
  and `+page.svelte`, `src/lib/components.js`, `src/lib/utils/helper.js`, `src/lib/utils/tabs.js` (nav tabs),
  `src/lib/Matchups/MatchupsAndBrackets.svelte`, `src/lib/Drafts/index.svelte`,
  `src/lib/Transactions/TransactionsPage.svelte`.
- `src/lib/utils/helperFunctions/leagueMatchups.js` keeps extra fields per team (`players`, `playersPoints`,
  `matchup_id`, `total`) for the bench and the shared matchups loader.
- `src/lib/BarChart.svelte` (`controlsOnTop`), `src/lib/Managers/Manager.svelte` (broken-icon fallback; no longer shown).
- `src/lib/utils/helperFunctions/leagueRecords.js` `analyzeRosters`: points per game is points per WEEK (games ÷ 2 when
  the league plays the median game; 2026 seasons were halved before). `getLeagueRecords`: the in-session check looks at
  `regularSeasonData` (it checked a key one level down and never matched), saved records carry `meta` and stay fresh
  until a new week is scored (`utils/recordsCache.js`), and nothing is built on the server.
- `src/lib/utils/helperFunctions/universalFunctions.js` `getTeamData`: a team without a Sleeper team name is called
  "Team <Sleeper username>" (the template used the user's display name, which leagueInfo.js replaces with the
  manager's real name).
- Theme: `src/routes/+layout.svelte`, `src/app.html`, `src/lib/Nav/index.svelte`, `NavLarge.svelte`, `static/manifest.json`.

### Template files no longer used (leave them unedited so template merges stay clean)
- `src/lib/Transactions/Transactions.svelte`, `WaiverTransaction.svelte`, `TradeTransaction.svelte`, `TransactionMove.svelte`
- `src/lib/Drafts/Draft.svelte`, `DraftRow.svelte`
- `src/lib/Awards/Awards.svelte` (Trophy Room podiums; replaced by the season awards)
- `src/lib/Matchups/MatchupWeeks.svelte`
- `src/lib/Managers/` (`AllManagers`, `Manager`, `ManagerRow`, `ManagerAwards`, `ManagerFantasyInfo`)
- `src/lib/Records/` (`index`, `AllTimeRecords`, `PerSeasonRecords`, `RecordsAndRankings`, `RecordTeam`)
- `src/lib/PowerRankings/index.svelte`, `PowerRankingsDisplay.svelte`
- `src/lib/Standings/` (the /standings route uses `RayStandings`)
- `src/lib/utils/helperFunctions/leagueStandings.js` and `predictOptimalScore.js` (old copies; should eventually be
  restored to the upstream versions)

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
- The template's stores (`standingsStore`, `matchupsStore`, ...) are module-level, so on the server they persist
  between requests until the instance restarts. The browser re-runs the loads after hydration, so pages show fresh
  data, but server-rendered HTML can be a little stale.

## Open TODOs
- Reuse `TeamChip`, the week-arrow buttons and the "M" badge in Matchups, the transaction feed and the draft board
- Bench Legend should be split into offense and defense
- For trade of the year scoring, if a pick is traded late in the season it should not be calculated for full value (i.e. a 1st round pick with only games left should not be worth 120pts)
- default trophy room to show regular season.  Make regular season the first option in the toggle (on the left side)
- ordering on the Awards page "All-league team" is strange.  Move the SF spot to top of the right-hand column.  So that it pushes other rows down one. Also, put the IDP slot 
- most of the remaining requests are the 15 season-history requests on nearly every page. Saving finished seasons would remove 12 of them.
- Align content of Team Breakdown and Standings 

## TODO (not a priority)
- The fix: add one line, export const ssr = false, in a new src/routes/+layout. 
  - Why? 
    - Every time Vercel starts a fresh server, which it does often on a small site after it sits idle, the first visits make another 20–35 Sleeper requests per page type. They come from Vercel’s address and nothing uses them.
    - What the server builds is only the header, nav and loading messages.

