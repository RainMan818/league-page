// Site glue for the player card: league data the pages already load, plus the player's stats (utils/playerStats.js).
// Overview / Stats cost one Sleeper request per player per page load (the season week by week); History adds the
// drafts and transactions (shared with the Drafts and Trades pages, mostly saved in the browser) and one request per
// past season the first time (saved for good). The math lives in utils/playerCard.js.
import { get } from 'svelte/store';
import { matchupsStore } from '$lib/stores';
import { getPreviousDrafts, getLeagueTransactions } from '$lib/utils/helper';
import { getTeamFromTeamManagers } from '$lib/utils/helperFunctions/universalFunctions';
import { loadLeagueBasics } from '../../utils/leagueContext.js';
import { weeklyStats, seasonTotals } from '../../utils/playerStats.js';
import {
    cardGroup, weekCards, defaultWeek, gameLog, seasonSoFar, statTiles, upcomingProjection, lastFantasyWeek,
    leaguePoints, positionRank, rosterSpot, draftHistory, transactionHistory, leagueHistory, careerSeasons, careerRows,
    played,
} from '../../utils/playerCard.js';

/** The team's name and its manager names for a season. */
export function teamInfo(managers, rosterID, season) {
    const team = getTeamFromTeamManagers(managers, rosterID, season) ?? { name: `Team ${rosterID}` };
    const ids = managers?.teamManagersMap?.[season]?.[rosterID]?.managers ?? [];
    const names = ids.map((u) => managers?.users?.[u]?.display_name).filter(Boolean);
    return { name: team.name, avatar: team.avatar, managers: names.join(' & ') };
}

/** NFL week in progress for this league's season, or null (offseason, or a finished season). */
function weekInProgress(nflState, leagueData) {
    if (String(nflState?.season) !== String(leagueData?.season)) return null;
    if (nflState?.season_type !== 'regular' && nflState?.season_type !== 'post') return null;
    return Number(nflState.week) || null;
}

/** Everything the Overview and Stats tabs show. */
export async function loadCard(playerID) {
    const basics = await loadLeagueBasics();
    const { nflState, leagueData, rosters, players, managers } = basics;
    const id = String(playerID);
    const player = players[id];
    if (!player) throw new Error(`Unknown player ${id}`);
    const group = cardGroup(player);
    const scoring = leagueData?.scoring_settings ?? {};
    const lastWeek = lastFantasyWeek(leagueData?.settings);

    let season = Number(leagueData?.season);
    let currentWeek = weekInProgress(nflState, leagueData);
    let projections = player.wi ?? {};
    let weekly = await weeklyStats(id, season, scoring);
    // before the season's first game: show last season instead of an empty card
    if (!Object.values(weekly).some(played) && currentWeek == null) {
        const last = await weeklyStats(id, season - 1, scoring).catch(() => null);
        if (last && Object.values(last).some(played)) {
            season -= 1;
            weekly = last;
            projections = {};
        }
    }

    const cards = weekCards({ weekly, projections, scoring, lastWeek, currentWeek });
    const scoredThrough = Number(leagueData?.settings?.last_scored_leg) || (currentWeek ? currentWeek - 1 : lastWeek);
    const throughWeek = season === Number(leagueData?.season) ? scoredThrough : 18;
    const soFar = seasonSoFar({ weekly, scoring, group, throughWeek });
    const all = seasonSoFar({ weekly, scoring, group });

    // rank among rostered players: only when the page already loaded the league's matchups (no extra requests)
    let rank = null;
    const m = get(matchupsStore);
    if (season === Number(leagueData?.season) && m?.matchupWeeks?.length && Number(m.year) === season) {
        const rostered = Object.values(rosters ?? {}).flatMap((r) => r?.players ?? []);
        const pts = leaguePoints(m.matchupWeeks, scoredThrough);
        rank = positionRank(id, group, rostered, pts, (p) => cardGroup(players[p]));
    }

    const spot = season === Number(leagueData?.season) ? rosterSpot(id, rosters) : null;
    const owner = spot ? { ...teamInfo(managers, spot.rosterID, leagueData.season), status: spot.status, rosterID: spot.rosterID } : null;
    const best = cards.filter((c) => c.status === 'played' && c.week <= throughWeek).sort((a, b) => b.points - a.points)[0] ?? null;

    return {
        id,
        player,
        group,
        season,
        currentWeek,
        scoring,
        weekly,
        cards,
        selected: defaultWeek(cards),
        log: gameLog({ weekly, cards, scoring, group }),
        soFar,
        tiles: statTiles(group, all.stats, all.games, all.snaps),
        allGames: all.games,
        allSnaps: all.snaps,
        rank,
        best,
        upcoming: currentWeek ? upcomingProjection(projections, currentWeek, lastWeek) : null,
        owner,
        managers,
        players,
        leagueSeason: Number(leagueData?.season),
    };
}

/** History tab: league timeline (drafts, trades, waivers) and career table. */
export async function loadHistory(card) {
    const { id, group, scoring, managers, leagueSeason, player } = card;
    const [drafts, txs] = await Promise.all([
        getPreviousDrafts().catch((e) => (console.error(e), [])),
        getLeagueTransactions(false).catch((e) => (console.error(e), { transactions: [] })),
    ]);
    const timeline = leagueHistory(draftHistory(id, drafts), transactionHistory(id, txs?.transactions ?? []));

    const leagueSeasons = Object.keys(managers?.teamManagersMap ?? {}).map(Number).filter(Number.isFinite);
    const seasons = careerSeasons(leagueSeasons.length ? leagueSeasons : [leagueSeason], leagueSeason, player.experience);
    const totals = {};
    await Promise.all(
        seasons.map(async (y) => {
            if (y === card.season) {
                totals[y] = seasonSoFar({ weekly: card.weekly, scoring, group }).stats;
                totals[y].gp = card.allGames;
            } else if (y < leagueSeason) {
                totals[y] = await seasonTotals(id, y, scoring).catch((e) => (console.error(e), null));
            }
        })
    );
    return { timeline, career: careerRows(totals, scoring, group) };
}
