// AAA-Raymond (Nov 17): the league's name, header logo words and homepage line for every page (data.site): the
// profile in leagueInfo.js, with anything it leaves out taken from the league on Sleeper (siteTitle.js). A league
// with a full profile needs no request; otherwise it's the league request the pages make anyway (cached).
import { leagueProfile } from '$lib/utils/leagueInfo';
import { getLeagueData } from '$lib/utils/helperFunctions/leagueData';
import { siteTitle, profileIsComplete } from '$lib/AAA-Raymond/utils/siteTitle.js';

export async function load() {
    if (profileIsComplete(leagueProfile)) return { site: siteTitle(leagueProfile) };
    const league = await getLeagueData().catch(() => null);
    return { site: siteTitle(leagueProfile, league) };
}
