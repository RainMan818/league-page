import { getLeagueData } from './leagueData';
import { leagueID, houseRules } from '$lib/utils/leagueInfo';
import { isDynasty } from '$lib/AAA-Raymond/utils/siteTitle.js';
import { waitForAll } from './multiPromise';
import { get } from 'svelte/store';
import {upcomingDraft, previousDrafts} from '$lib/stores';
import { getLeagueRosters } from './leagueRosters';
// AAA-Raymond: one request per Sleeper URL per page load (shared with every other loader)
import { sleeperFetch } from '$lib/AAA-Raymond/utils/sleeperFetch.js';
// AAA-Raymond: past (finished) seasons' drafts are saved in the browser (savedSeasons.js)
import { seasonJson, isFinishedLeague } from '$lib/AAA-Raymond/utils/savedSeasons.js';
// AAA-Raymond: the upcoming draft follows the league's draft-order rule (same as the Standings page's Pick column)
import { leagueDraftOrder, teamsFromRosters, bracketIsSet, TOILET_BOWL_PICK, toiletBowlWinner } from '$lib/AAA-Raymond/utils/draftOrder.js';

export const getUpcomingDraft = async () => {
	if(get(upcomingDraft).draft) {
		return get(upcomingDraft);
	}
    const [rosterRes, leagueData] = await waitForAll(
		getLeagueRosters(),
		getLeagueData()
	).catch((err) => { console.error(err); });

	const draftID = leagueData.draft_id;
	const regularSeasonLength = leagueData.settings.playoff_week_start - 1;

	let year = parseInt(leagueData.season);

	const [officialDraftRes, picksRes] = await waitForAll(
		sleeperFetch(`https://api.sleeper.app/v1/draft/${draftID}`, {compress: true}),
		sleeperFetch(`https://api.sleeper.app/v1/league/${leagueID}/traded_picks`, {compress: true}),
	).catch((err) => { console.error(err); });

	const [officialDraft, picks] = await waitForAll(
		officialDraftRes.json(),
		picksRes.json(),
	).catch((err) => { console.error(err); });

	let draft;
	let draftOrder;
	let accuracy;

    const rosters = rosterRes.rosters;

	// AAA-Raymond (Nov 17): a redraft or keeper league's next draft order isn't earned from the standings, so there's
	// nothing to project once this season's draft is done (the Drafts page says so instead of showing a board)
	if(officialDraft.status == "complete" && !isDynasty(leagueData)) {
		return { year: year + 1, draft: null, draftOrder: [], notProjected: true };
	}

	if(officialDraft.status == "complete") {
		year = year + 1;
		// AAA-Raymond: pass league settings and the winners bracket for the league's draft-order rule
		const bracket = bracketIsSet(leagueData)
			? await sleeperFetch(`https://api.sleeper.app/v1/league/${leagueID}/winners_bracket`, {compress: true}).then((r) => r.json()).catch(() => [])
			: [];
		const buildRes = buildFromScratch(rosters, officialDraft.slot_to_roster_id, officialDraft.settings.rounds, picks.filter(pick => parseInt(pick.season) == year), regularSeasonLength, leagueData, bracket);
		draft = buildRes.draft;
		draftOrder = buildRes.draftOrder;
		accuracy = buildRes.accuracy;
	} else {
		const buildRes = buildConfirmed(officialDraft.slot_to_roster_id, officialDraft.settings.rounds, picks.filter(pick => parseInt(pick.season) == year));
		draft = buildRes.draft;
		draftOrder = buildRes.draftOrder;
	}

	// AAA-Raymond: the Toilet Bowl winner's extra pick (3.13). It comes from this season's Toilet Bowl while the next
	// draft is still a projection, or from last season's once Sleeper has set up the new draft.
	let extraPicks = [];
	// (AAA-Raymond: a Dynasty League house rule; other leagues have no extra pick)
	if(houseRules && year >= TOILET_BOWL_PICK.firstDraft) {
		const bowlLeague = officialDraft.status == "complete" ? (bracketIsSet(leagueData) ? leagueID : null) : leagueData.previous_league_id;
		const losers = bowlLeague
			? await sleeperFetch(`https://api.sleeper.app/v1/league/${bowlLeague}/losers_bracket`, {compress: true}).then((r) => r.json()).catch(() => [])
			: [];
		extraPicks = [{ round: TOILET_BOWL_PICK.round, pick: (draftOrder?.length ?? 12) + 1, label: TOILET_BOWL_PICK.label, rosterID: toiletBowlWinner(losers) }];
	}

	const draftData = {
		year,
		draft,
		draftOrder,
		accuracy,
		draftType: officialDraft.type,
		reversalRound: officialDraft.settings.reversal_round,
		extraPicks, // AAA-Raymond
	}
	
	upcomingDraft.update(() => draftData);

	return draftData;
}

// Predict draft board
const buildFromScratch = (rosters, previousOrder, rounds, picks, regularSeasonLength, leagueData = null, bracket = []) => {
	const draftOrder = [];
    const rosterKeys = Object.keys(rosters);
    const testRoster = rosters[rosterKeys[0]].settings;
	const progression = testRoster.wins + testRoster.ties + testRoster.losses;

	// Build starting order. If the season has started and some games have been played,
	// use win record to predict draft order, otherwise (in preseason) use previous draft order
	if(progression == 0) {
		for (const key in previousOrder) {
			draftOrder.push(previousOrder[key]);
		}
	} else {
		// AAA-Raymond: league rule (Constitution 8.2) instead of reverse standings: non-playoff teams by lowest max PF,
		// then playoff finish (projected by seed until the bracket decides it)
		const { order } = leagueDraftOrder(teamsFromRosters(rosters), { playoffTeams: leagueData?.settings?.playoff_teams || 6, bracket });
		draftOrder.push(...order);
	}

	const row = new Array(rosterKeys.length);
	let draft = [];

	for(let i = 0; i < rounds; i++) {
		draft.push([...row]);
	}

	for(const pick of picks) {
		if(pick.owner_id === pick.roster_id || pick.round > rounds) continue;
		draft[pick.round - 1][draftOrder.indexOf(pick.roster_id.toString())] = pick.owner_id;
	}

	// AAA-Raymond: weeks scored, not games (the league-median game makes two games a week)
	const weeksPlayed = leagueData?.settings?.last_scored_leg ?? progression;
	let accuracy = (Math.min(weeksPlayed, regularSeasonLength) + 1) / (regularSeasonLength + 1);
	// make sure accuracy doesn't exceed 1
	accuracy = accuracy > 1 ? 1 : accuracy;

	return {draft, draftOrder, accuracy };
}

// Build pre-determined draft board
const buildConfirmed = (draftOrderObj, rounds, picks, players = null, type = null) => {
	const draftOrder = [];
	let leagueSize = 0;

	for (const key in draftOrderObj) {
		leagueSize++;
		draftOrder.push(draftOrderObj[key]);
	}

	const row = new Array(leagueSize).fill();
	let draft = [];

	for(let i = 0; i < rounds; i++) {
		draft.push([...row]);
	}

	if(players && type != 'auction') {
		// non-auction leagues
		draft = completedNonAuction({players, draft, picks, draftOrder, rounds});
	} else if(players) {
		// auction leagues
		draft = completedAuction({players, draft, draftOrder, draftOrderObj});
	} else {
		for(const pick of picks) {
			if(pick.owner_id == pick.roster_id || pick.round > rounds) continue;
			try {
				draft[pick.round - 1][draftOrder.indexOf(pick.roster_id)] = pick.owner_id;
			} catch (error) {
				console.error(`Possibly invaid roster ID?: ${pick.roster_id}`, error);
			}
		}
	}

	return {draft, draftOrder};
}

const completedNonAuction = ({players, draft, picks, draftOrder, rounds}) => {
	for(const playerData of players) {
		const player = playerData.player_id;
		draft[playerData.round - 1][playerData.draft_slot - 1] = {player};
	}
	for(const pick of picks) {
		if(pick.owner_id == pick.roster_id || pick.round > rounds) continue;
		try {
			draft[pick.round - 1][draftOrder.indexOf(pick.roster_id)].newOwner = pick.owner_id;
		} catch (error) {
			console.error(`Possibly invaid roster ID?: ${pick.roster_id}`, error);
		}
	}
	return draft;
}

const completedAuction = ({players, draft, draftOrder, draftOrderObj}) => {
	const rosters = {};
	for (const key in draftOrderObj) {
		// array to be used for players
		rosters[draftOrderObj[key]] = [];
	}
	for(const playerData of players) {
		const data = {player: playerData.player_id, amount: playerData.metadata.amount};
		rosters[playerData.roster_id].push(data);
	}
	for (const roster in rosters) {
		const col = draftOrder.indexOf(parseInt(roster));
		const sortedRoster = rosters[roster].sort((a,b) => b.amount - a.amount);
		for(let i = 0; i < sortedRoster.length; i++) {
			draft[i][col] = sortedRoster[i];
		}
	}
	return draft;
}

export const getPreviousDrafts = async () => {
	if(get(previousDrafts).length > 0) {
		return get(previousDrafts);
	}
	let curSeason = leagueID;

	const drafts = [];
	
	while(curSeason && curSeason != 0) {
		// AAA-Raymond: league info first (saved for past seasons), so a finished season's drafts can come from the saved copy
		const leagueData = await getLeagueData(curSeason);
		const finished = isFinishedLeague(leagueData, leagueID);
		const completedDrafts = await seasonJson(`league/${curSeason}/drafts`, finished);
        curSeason = leagueData.previous_league_id;

        for(const completedDraft of completedDrafts) {
            const draftID = completedDraft.draft_id;
            const year = parseInt(completedDraft.season);
        
            const [officialDraft, picks, players] = await waitForAll(
                seasonJson(`draft/${draftID}`, finished),
                seasonJson(`draft/${draftID}/traded_picks`, finished),
                // AAA-Raymond: only the pick fields the boards use (the full answer is ~80KB per draft)
                seasonJson(`draft/${draftID}/picks`, finished, (list) => list.map((p) => ({
                    player_id: p.player_id, round: p.round, draft_slot: p.draft_slot, roster_id: p.roster_id,
                    pick_no: p.pick_no, picked_by: p.picked_by, metadata: { amount: p.metadata?.amount },
                }))),
            ).catch((err) => { console.error(err); });

            if(officialDraft.status != "complete") continue;
        
            let draft;
            let draftOrder;

        
            const buildRes = buildConfirmed(officialDraft.slot_to_roster_id, officialDraft.settings.rounds, picks, players, officialDraft.type);
            draft = buildRes.draft;
            draftOrder = buildRes.draftOrder;

            const newDraft = {
                year,
                draft,
                draftOrder,
                draftType: officialDraft.type,
                reversalRound: officialDraft.settings.reversal_round,
            }
        
            drafts.push(newDraft);
        }
	
	}
	
	previousDrafts.update(() => drafts);

	return drafts;
}