// Shared data loading for the custom (AAA-Raymond) sections.
// The site helpers already cache each request; this keeps the "which requests, then build the team list"
// code in one place so every section gets the same shapes.
import {
    getNflState,
    getLeagueData,
    getLeagueRosters,
    getLeagueTeamManagers,
    loadPlayers,
    waitForAll,
    gotoManager,
} from '$lib/utils/helper';
import { getTeamFromTeamManagers } from '$lib/utils/helperFunctions/universalFunctions';

/**
 * League data that doesn't need standings: NFL state, team managers, league settings, rosters (+ divisions), players.
 * Pass the page's leagueTeamManagersData promise if you have it.
 */
export async function loadLeagueBasics({ leagueTeamManagersData } = {}) {
    const [nflState, managers, leagueData, rostersData, playersInfo] = await waitForAll(
        getNflState(),
        leagueTeamManagersData ?? getLeagueTeamManagers(),
        getLeagueData(),
        getLeagueRosters(),
        loadPlayers(null)
    );
    return {
        nflState,
        managers,
        leagueData,
        rostersData,
        rosters: rostersData?.rosters ?? {},
        divisions: rosterDivisions(rostersData?.rosters),
        playersInfo,
        players: playersInfo?.players ?? {},
        onTeamClick: teamClickHandler(managers),
    };
}

/** { [rosterID]: division number (null if the league has no divisions) }, from Sleeper roster settings. */
export function rosterDivisions(rosters = {}) {
    return Object.fromEntries(Object.entries(rosters ?? {}).map(([id, r]) => [id, r?.settings?.division ?? null]));
}

/** { [rosterID]: { name, avatar } } for the current season. */
export function buildTeams(managers, rosterIDs) {
    const teams = {};
    for (const rosterID of rosterIDs) {
        const id = String(rosterID);
        const team = getTeamFromTeamManagers(managers, id);
        teams[id] = { name: team?.name ?? `Team ${id}`, avatar: team?.avatar };
    }
    return teams;
}

/** Click handler for team chips: opens that team's manager page. */
export const teamClickHandler = (managers) => (rosterID) => {
    if (managers) gotoManager({ leagueTeamManagers: managers, rosterID: parseInt(rosterID) });
};

// one load per page: the homepage recap and insights share the same standingsData promise
const contexts = new WeakMap();

/**
 * Basics plus standings and the team list (`teams`). `standings` is null before the season starts.
 * Sections given the same standingsData promise share one result.
 */
export function loadLeagueContext({ standingsData, leagueTeamManagersData } = {}) {
    const cacheable = standingsData !== null && typeof standingsData === 'object';
    if (cacheable && contexts.has(standingsData)) return contexts.get(standingsData);

    const context = (async () => {
        const [standings, basics] = await waitForAll(standingsData, loadLeagueBasics({ leagueTeamManagersData }));
        const rosterIDs = standings?.standingsInfo
            ? Object.values(standings.standingsInfo).map((s) => s.rosterID)
            : Object.keys(basics.rosters);
        return { ...basics, standings, teams: buildTeams(basics.managers, rosterIDs) };
    })();

    if (cacheable) contexts.set(standingsData, context);
    return context;
}
