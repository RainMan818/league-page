// Site glue for the Managers list and manager pages: who ran which roster when (team managers), the current
// standings places, and display bits like the favorite team's name. Numbers come from utils/managerProfile.js.
import {
    getDatesActive,
    getRosterIDFromManagerID,
    getTeamFromTeamManagers,
} from '$lib/utils/helperFunctions/universalFunctions';
import { seedTeams } from '../../utils/playoffs.js';

/** owns(rosterID, year): did this manager run that roster that season? */
export const ownsFor = (leagueTeamManagers, managerID) => (rosterID, year) =>
    !!leagueTeamManagers?.teamManagersMap?.[year]?.[rosterID]?.managers?.includes(managerID);

/** One manager from leagueInfo.js joined with Sleeper: current (or last) team, years active, commissioner. */
export function managerBasics(manager, index, leagueTeamManagers) {
    const managerID = manager.managerID;
    const dates = managerID ? getDatesActive(leagueTeamManagers, managerID) : null;
    const found = managerID ? getRosterIDFromManagerID(leagueTeamManagers, managerID) : null;
    const rosterID = found?.rosterID ?? manager.roster ?? null;
    const year = found?.year ?? null;
    const team = rosterID != null ? getTeamFromTeamManagers(leagueTeamManagers, rosterID, year) : null;
    const coManaged = (leagueTeamManagers?.teamManagersMap?.[year]?.[rosterID]?.managers?.length ?? 0) > 1;
    return {
        index,
        manager,
        managerID,
        rosterID,
        year,
        team,
        teamName: team?.name ?? '',
        photo: manager.photo || team?.avatar || '',
        since: dates?.start ? Number(dates.start) : null,
        until: dates?.end ? Number(dates.end) : null, // set only for managers who left the league
        commissioner: !!(managerID && leagueTeamManagers?.users?.[managerID]?.is_owner),
        coManaged,
        owns: ownsFor(leagueTeamManagers, managerID),
    };
}

/** "'22" or "'22–'24" */
export const yearsText = (b) => (!b.since ? '' : b.until ? `'${String(b.since).slice(2)}–'${String(b.until).slice(2)}` : `Since '${String(b.since).slice(2)}`);

/**
 * Current season record and standings place (league seeding rule) by roster ID, from the shared league context.
 * Returns {} before the season starts.
 */
export function currentStandings(ctx) {
    const info = ctx?.standings?.standingsInfo;
    if (!info) return {};
    const rows = Object.values(info).map((s) => ({ ...s, division: ctx.divisions?.[s.rosterID] ?? null }));
    const { order } = seedTeams(rows, { playoffTeams: ctx.leagueData?.settings?.playoff_teams || 6 });
    return Object.fromEntries(order.map((t, i) => [String(t.rosterID), { wins: t.wins, losses: t.losses, ties: t.ties, place: i + 1 }]));
}

const NFL_TEAMS = {
    ari: 'Cardinals', atl: 'Falcons', bal: 'Ravens', buf: 'Bills', car: 'Panthers', chi: 'Bears', cin: 'Bengals',
    cle: 'Browns', dal: 'Cowboys', den: 'Broncos', det: 'Lions', gb: 'Packers', hou: 'Texans', ind: 'Colts',
    jax: 'Jaguars', kc: 'Chiefs', lac: 'Chargers', lar: 'Rams', lv: 'Raiders', mia: 'Dolphins', min: 'Vikings',
    ne: 'Patriots', no: 'Saints', nyg: 'Giants', nyj: 'Jets', phi: 'Eagles', pit: 'Steelers', sea: 'Seahawks',
    sf: '49ers', tb: 'Buccaneers', ten: 'Titans', was: 'Commanders',
};

/** Favorite NFL team (leagueInfo.js `favoriteTeam`, lowercase abbreviation) for display. */
export const favoriteTeam = (abbr) =>
    abbr
        ? { abbr: abbr.toUpperCase(), name: NFL_TEAMS[abbr] ?? abbr.toUpperCase(), logo: `https://sleepercdn.com/images/team_logos/nfl/${abbr}.png` }
        : null;

export const recordText = (w, l, t = 0) => `${w}–${l}${t ? `–${t}` : ''}`;
export const pctText = (p) => (p == null ? '–' : p.toFixed(3).replace(/^0/, ''));
