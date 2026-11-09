README.md

# Progress
- Custom logic lives in `src/lib/AAA-Raymond/`; upstream files only wire it in (see CLAUDE.md for the full list)
- Homepage custom content is one component: `AAA-Raymond/components/RayHome`
- Custom sections load data through `AAA-Raymond/utils/leagueContext.js`; weekly matchups through
  `AAA-Raymond/utils/weeklyMatchups.js` (one shared download)
- Logic tests live in `tests/` (`npm test`)

# Notes
- All custom files are in AAA-Raymond directory

# TODO
- New, sortable, filterable table component (start from `AAA-Raymond/components/Insights/TeamBreakdown.svelte`
  and `RayStandings/StandingsTable.svelte`, which share the same sorting code)
