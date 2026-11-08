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
- 12 teams, dynasty, half-PPR, superflex, IDP, 2 divisions
- Starting lineup order (index into Sleeper `starters` / `starters_points`):
  0 QB, 1-2 RB, 3-4 WR, 5 TE, 6-8 FLEX, 9 SUPER_FLEX, 10 IDP_FLEX, 11-13 DL, 14-16 LB, 17-19 DB.
  `src/lib/AAA-Raymond/utils/leagueStandings.js` hardcodes these indexes; update it if the lineup changes.

## Where custom code lives
- **All custom work goes in `src/lib/AAA-Raymond/`.** This keeps merges from the upstream template easy.
- Only touch upstream files to wire custom code in (imports and exports in `src/lib/components.js`,
  `src/lib/utils/helper.js`, route pages). Keep those edits small.
- `src/lib/version.js` must stay in sync with `package.json`; don't bump it by hand.

Custom pieces:
- `RayHome`: homepage block with Tankathon and RosterAnalysis
- `Tankathon`: draft order by potential points, worst first
- `RosterAnalysis`: age, count and spread by position for each team
- `RayStandings` + `PositionAverages`: the /standings page
- `RayPowerRankings`: rest-of-season projections using `utils/predictOptimalScore.js`
- `utils/leagueStandings.js`: standings, division records, position averages.
  `helper.js` exports it as `getLeagueStandings`.

## Gotchas
- Sleeper roster slot names: `IDP_FLEX`, `SUPER_FLEX`, `FLEX`, `REC_FLEX`, `WRRB_FLEX`, `BN`.
  Defender `position` can be specific (DE, DT, CB, S), so group IDPs via `idpGroup()` in predictOptimalScore.
- Position averages are keyed by roster ID; display names come from `getTeamFromTeamManagers`.
  Never hardcode usernames.
- Files use Windows (CRLF) line endings; keep them.
- `src/lib/utils/helperFunctions/leagueStandings.js` and `predictOptimalScore.js` are old, unused copies.
  They should eventually be restored to the upstream versions.

## Open TODOs
- Finish moving custom logic out of upstream files (see `src/README.md`)
- Build a sortable, filterable table component
