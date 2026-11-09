# CLAUDE.md

Fantasy football league site for **The Dynasty League IDP SF**, built on the open-source
[League Page](https://github.com/nmelhado/league-page) template (SvelteKit 2, Svelte 5, SMUI).
All data comes live from the public Sleeper API.

## Commands
- `npm run dev` — local dev server
- `npm run build` / `npm run preview` — production build
- Deploys to Vercel (default adapter). Docker build uses adapter-node (`npm run docker-run`).
- Node is pinned to 24.x in `package.json` `engines`. Don't loosen it to `>=`: Vercel then jumps to the newest
  Node, and Node 26 broke the `smui-theme` build step (yargs `require is not defined`).

## League facts
- Sleeper league ID `1314319869289717760`, set in `src/lib/utils/leagueInfo.js` with manager bios
- 12 teams, dynasty, half-PPR, superflex, IDP, **3 divisions of 4** (Sleeper settings), plus a weekly
  league-median game (records are 2 games per week). The constitution text still describes 2 divisions.
- Starting lineup order (index into Sleeper `starters` / `starters_points`):
  0 QB, 1-2 RB, 3-4 WR, 5 TE, 6-8 FLEX, 9 SUPER_FLEX, 10 IDP_FLEX, 11-13 DL, 14-16 LB, 17-19 DB.
  `src/lib/AAA-Raymond/utils/leagueStandings.js` hardcodes these indexes; update it if the lineup changes.

## Where custom code lives
- **All custom work goes in `src/lib/AAA-Raymond/`.** This keeps merges from the upstream template easy.
- Only touch upstream files to wire custom code in (imports and exports in `src/lib/components.js`,
  `src/lib/utils/helper.js`, route pages). Keep those edits small.
- `src/lib/version.js` must stay in sync with `package.json`; don't bump it by hand.

Custom pieces:
- `RayHome`: all custom homepage content, the only custom line in `src/routes/+page.svelte`: weekly recap
  (`Insights/RecapPanel`), then Power Rankings (`RayPowerRankings`), then Insights, stacked at every screen size.
- `utils/leagueContext.js`: shared data loading. `loadLeagueBasics()` gives nflState, managers, leagueData,
  rosters, players and `onTeamClick`; `loadLeagueContext({ standingsData, leagueTeamManagersData })` adds
  `standings` and `teams` ({ [rosterID]: { name, avatar } }). Sections passed the same standingsData promise share
  one result. Use these instead of calling the helpers one by one.
- `Shared/Loading.svelte`: the "loading..." message + progress bar (`progress={false}` for errors/empty states).
- `Insights`: playoff projection bracket and one sortable Team Breakdown table (record, division record, PF, PA,
  streak, Tankathon pick + max PF, all-play, luck, efficiency). The weekly recap (`WeeklyRecap`, Sleeper-style
  weekly report) renders in `RecapPanel`, which has previous/next arrows and a week picker for every completed
  week (built from `standings.matchups`, no extra fetches; defaults to the latest week).
- `Insights/config.js`: `SHOW_PLAYOFF_ODDS = false` hides all percentages, projected records and title odds
  (bracket shows seeds only). Raymond doesn't want league mates seeing the odds yet.
  `index.svelte` loads data in the browser and computes; `InsightsView` and the section components only render.
  Logic lives in `utils/leagueInsights.js` (plain functions, no site imports).
- `RosterAnalysis`: age, count and spread by position for each team (top of the /rosters page)
- `RayStandings` + `PositionAverages`: the /standings page
- `RayPowerRankings`: rest-of-season projections using `utils/predictOptimalScore.js`. `index.svelte` is our own
  loader, so the upstream `src/lib/PowerRankings/` files are untouched (and unused). Uses upstream
  `src/lib/BarChart.svelte` with `controlsOnTop` (Raymond's addition, default off) so the graph buttons sit
  between the header and the chart.
- `utils/leagueStandings.js`: standings, division records, position averages.
  `helper.js` exports it as `getLeagueStandings`.

## Playoff projection
- Monte Carlo (10,000 runs, fixed seed so numbers are stable between loads) of the remaining regular season and the playoffs.
- Team strength: Sleeper projected best lineup (`predictScores`) scaled to the league's actual scoring, blended 70/30
  with the team's season average; spread from each team's weekly scores shrunk toward the league's.
- Seeding (league rule, per Raymond): division winners take the top seeds, the next seeds go to the best remaining
  records, and the last seed goes to the highest points for among everyone not yet in, regardless of record.
  With 3 divisions: 1-3 division winners, 4-5 records, 6 points for. Seeds 1-2 get byes. Record ties are broken by
  points for. Settings: `DIVISION_WINNERS_GET_TOP_SEEDS`, `POINTS_WILDCARD_SEEDS` in `leagueInsights.js`. Toggle `DIVISION_WINNERS_GET_TOP_SEEDS` in `leagueInsights.js` if the rules change.
  Playoff team count and start week come from Sleeper league settings. Median games are supported.
- Hidden once the regular season ends (points to the Matchups bracket).

## Look and feel (outrun theme)
- Theme lives in `src/lib/AAA-Raymond/theme/outrun.css`, imported in `src/routes/+layout.svelte`.
  It overrides the template's color variables (`--fff`, `--f8f8f8`, ... named after the original
  light colors) and SMUI's `--mdc-theme-*` variables. Selectors start with `html:root` to win over template styles.
- Night is the default. Sunset day mode = `<html data-theme="day">`, set by the header toggle
  (`src/lib/Nav/index.svelte`), saved in localStorage, applied before paint by the inline script in `src/app.html`.
  Day mode also loads `/smui.css` on top of `/smui-dark.css`.
- Header backdrop: `horizon-night.svg` / `horizon-day.svg` in the theme folder.
- Logo: `src/lib/AAA-Raymond/components/OutrunLogo/` draws hand-built block letters (`glyphs.js`) as SVG,
  so it doesn't depend on fonts. Change the words via the `title`/`subtitle` props; letters missing from
  `glyphs.js` are skipped. Headings use the Orbitron web font (loaded in `app.html`).
- Favicon and app icons: `static/outrun-icon.svg`, `static/favicons/outrun-*.png`.

## Gotchas
- Sleeper roster slot names: `IDP_FLEX`, `SUPER_FLEX`, `FLEX`, `REC_FLEX`, `WRRB_FLEX`, `BN`.
  Defender `position` can be specific (DE, DT, CB, S), so group IDPs via `idpGroup()` in predictOptimalScore.
- Position averages are keyed by roster ID; display names come from `getTeamFromTeamManagers`.
  Never hardcode usernames.
- Files use Windows (CRLF) line endings; keep them.
- Prefix class names in custom components (`rr-`): the template has global rules on generic names
  (e.g. `.slot { width: 22px !important }`) that will break your layout.
- Player projections in the players map are strings (`wi[week].p = "22.01"`); `parseFloat` before doing math.
- Big computed objects held in Svelte state should use `$state.raw` (deep proxies break object identity).
- Weekly recap numbers can differ slightly from Sleeper's own weekly report: Sleeper snapshots it before stat corrections.
- Standings `matchups` is newest week first (index 0 = last completed week).
- Division records are counted once in `getLeagueStandings` (they used to be double-counted).
- `src/lib/utils/helperFunctions/leagueStandings.js` and `predictOptimalScore.js` are old, unused copies.
  They should eventually be restored to the upstream versions.

## Open TODOs
- Finish moving custom logic out of upstream files (see `src/README.md`)
- Build a sortable, filterable table component
