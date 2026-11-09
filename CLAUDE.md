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

### Pages
- **Home** — `RayHome` is the only custom line in `src/routes/+page.svelte`: weekly recap (`Insights/RecapPanel`
  + `WeeklyRecap`, previous/next and a week picker), then Power Rankings (`RayPowerRankings`, in a card), then
  `Insights` (playoff projection bracket + sortable Team Breakdown table). The sidebar's "Recent Moves" is
  `RayTransactions/RecentMoves` (newest 6 waivers + 6 trades, `RECENT_PER_TYPE`), swapped in via `components.js`.
- **Matchups** — `RayMatchups/MatchupWeeks` + `Matchup` (versus strips; click for every starter with photos;
  bench behind "Show bench"; "M" badge = beat the league median, median shown under the list when the league
  plays median games). Swapped in by one import in `src/lib/Matchups/MatchupsAndBrackets.svelte`; the playoff
  bracket still uses the template's `Matchup.svelte`.
- **Standings** — `RayStandings` (`StandingsTable`: sortable, seed order, dashed playoff line, division pills,
  Division leader / Wildcard / Points wildcard tags) and two `PositionAverages` tables (two-sided heat scale:
  cyan = low, pink = high; by value in "Averages", evenly by rank in "Ranking").
- **Trades & Waivers** (and manager pages) — `RayTransactions/TransactionFeed`: one card per day, one line per team
  (waivers: + added / − dropped and FAAB bid; trades: team ← what it received, picks show "via <team>").
  Swapped into the template's `TransactionsPage.svelte`. Date parsing/grouping in `transactionView.js`.
- **Drafts** — `RayDrafts/DraftBoard` (dark cells, top edge in the position color, position tag, traded picks as
  "→ owner" / "by <team>"). Swapped in by one import in `src/lib/Drafts/index.svelte`.
- **Rosters** — `RosterAnalysis` at the top of the page (age, count and spread by position).

### Shared building blocks
- `utils/leagueContext.js` — `loadLeagueBasics()` (nflState, managers, leagueData, rosters, players, `onTeamClick`)
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
- `utils/leagueInsights.js` — recap, seeding, bracket, simulation, all-play/luck, efficiency (plain functions).
- `utils/predictOptimalScore.js` — best projected lineup (`predictScores`, also exported from `helper.js`).
- `utils/colorScale.js` — the green/yellow/red palette for heat-scaled numbers.
- `components/Shared/` — `Loading` (loading/error message), `Toggle` (segmented control; SMUI button groups are
  restyled to match in `outrun.css`), `TeamChip` (avatar + team name, clickable), `format.js` (pct, pts, record…),
  `common.css` (`rr-tableWrap` / `rr-table` tables and `rr-pageSub` subtitles). The table selectors are two classes
  deep, so a component's scoped override needs more (e.g. `.rr-avg table.rr-avgTable td`).
- `Insights/config.js` — `SHOW_PLAYOFF_ODDS = false` hides all percentages, projected records and title odds
  (bracket shows seeds only). Raymond doesn't want league mates seeing the odds yet.
- `RayPowerRankings` uses the template's `src/lib/BarChart.svelte` with `controlsOnTop` (Raymond's addition).

### Template files we changed (check these after merging template updates)
- Wiring: `src/routes/+page.svelte`, `src/routes/standings/+page.js` (passes `fetch`), `src/routes/rosters/+page.js`
  and `+page.svelte`, `src/lib/components.js`, `src/lib/utils/helper.js`, `src/lib/utils/tabs.js` (nav tabs),
  `src/lib/Matchups/MatchupsAndBrackets.svelte`, `src/lib/Drafts/index.svelte`,
  `src/lib/Transactions/TransactionsPage.svelte`.
- `src/lib/utils/helperFunctions/leagueMatchups.js` keeps extra fields per team (`players`, `playersPoints`,
  `matchup_id`, `total`) for the bench and the shared matchups loader.
- `src/lib/BarChart.svelte` (`controlsOnTop`), `src/lib/Managers/Manager.svelte` (broken-icon fallback).
- Theme: `src/routes/+layout.svelte`, `src/app.html`, `src/lib/Nav/index.svelte`, `NavLarge.svelte`, `static/manifest.json`.

### Template files no longer used (leave them unedited so template merges stay clean)
- `src/lib/Transactions/Transactions.svelte`, `WaiverTransaction.svelte`, `TradeTransaction.svelte`, `TransactionMove.svelte`
- `src/lib/Drafts/Draft.svelte`, `DraftRow.svelte`
- `src/lib/Matchups/MatchupWeeks.svelte`
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
  points for. Settings: `DIVISION_WINNERS_GET_TOP_SEEDS`, `POINTS_WILDCARD_SEEDS` in `leagueInsights.js`.
  Playoff team count and start week come from Sleeper league settings. Median games are supported.
- Hidden once the regular season ends (points to the Matchups bracket).

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
- One shared sortable-table component (TeamBreakdown and StandingsTable each have their own sorting code)
- Split `utils/leagueInsights.js` (recap / playoffs / luck)
- Reuse `TeamChip`, the week-arrow buttons and the "M" badge in Matchups, the transaction feed and the draft board
