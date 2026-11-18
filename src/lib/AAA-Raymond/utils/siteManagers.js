// The Managers pages' list (Nov 16): the managers in the league's profile (leagueInfo.js) when it has some, otherwise
// one per current team from Sleeper (the team's owner, by roster number), so a league without bios still gets the
// Managers list, manager pages and team links. Plain functions, no site imports (tests/siteManagers.test.js).

/**
 * One entry per current team from team managers data ({ currentSeason, teamManagersMap, users }):
 * [{ managerID, name, roster }] in roster order. Photos come from the team avatar (managerInfo.js managerBasics).
 */
export function sleeperManagers(leagueTeamManagers) {
    const teams = leagueTeamManagers?.teamManagersMap?.[leagueTeamManagers?.currentSeason] ?? {};
    return Object.keys(teams)
        .sort((a, b) => Number(a) - Number(b))
        .flatMap((rosterID) => {
            const managerID = teams[rosterID]?.managers?.[0];
            if (!managerID) return []; // an empty team (no owner yet)
            const user = leagueTeamManagers.users?.[managerID];
            return [{ managerID: String(managerID), name: user?.display_name ?? user?.user_name ?? teams[rosterID]?.team?.name ?? `Team ${rosterID}`, roster: Number(rosterID) }];
        });
}

/** The list the site uses: the profile's managers, or Sleeper's when the profile has none. */
export const managersFor = (configured, leagueTeamManagers) => (configured?.length ? configured : sleeperManagers(leagueTeamManagers));
