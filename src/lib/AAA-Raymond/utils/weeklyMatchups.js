// Every regular-season week's matchups, downloaded once and shared.
// Built on the template's getLeagueMatchups(), which fetches weeks 1..(playoff start - 1) once and caches them
// in matchupsStore. Standings (completed weeks), the playoff projection (remaining schedule) and the Matchups page
// all read from that one copy instead of each requesting the weeks from Sleeper again.
import { getLeagueMatchups } from '../../utils/helperFunctions/leagueMatchups';
import { entriesByWeek } from './matchupEntries.js';

/** { weeks: { [week]: [Sleeper-style entries] }, regularSeasonLength } */
export async function getWeeklyMatchupEntries() {
    const data = await getLeagueMatchups();
    return {
        weeks: entriesByWeek(data?.matchupWeeks ?? []),
        regularSeasonLength: data?.regularSeasonLength,
    };
}
