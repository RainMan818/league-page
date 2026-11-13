import { getLeagueData } from './leagueData';
import { leagueID } from '$lib/utils/leagueInfo';
import { getNflState } from './nflState';
import { waitForAll } from './multiPromise';
import { get } from 'svelte/store';
import {transactionsStore} from '$lib/stores';
import { browser } from '$app/environment';
import { getLeagueTeamManagers } from './leagueTeamManagers';
// AAA-Raymond: top up the saved transactions with the latest two weeks instead of downloading every season again
import { transactionsMeta, canTopUp, latestLegs, mergeTransactions, newestFirst } from '$lib/AAA-Raymond/utils/transactionsCache.js';
// AAA-Raymond: one request per Sleeper URL per page load (shared with every other loader)
import { sleeperFetch } from '$lib/AAA-Raymond/utils/sleeperFetch.js';

// AAA-Raymond: one refresh at a time; pages that ask while it runs share it
let pendingRefresh = null;

export const getLeagueTransactions = async (preview, refresh = false) => {
	const transactionsStoreVal = get(transactionsStore);

	if(transactionsStoreVal.totals) {
		return {
			transactions: checkPreview(preview, transactionsStoreVal.transactions),
			totals: transactionsStoreVal.totals,
			stale: false
		};
	}

	// AAA-Raymond: transactions are only downloaded in the browser. The server has no localStorage, so every server
	// render downloaded every week of every season (about 80 Sleeper requests); the browser loads them right after.
	if(!browser) {
		return { transactions: checkPreview(preview, []), totals: { allTime: {}, seasons: {} }, stale: true };
	}

	// if this isn't a refresh data call, check if there are already transactions stored in localStorage
	if(!refresh && browser) {
		const localTransactions = readSavedTransactions();
		// check if transactions have been saved to localStorage before
		if(localTransactions) {
			localTransactions.transactions = checkPreview(preview, localTransactions.transactions);
			localTransactions.stale = true;
			return localTransactions;
		}
	}

	// AAA-Raymond: share a refresh that's already running
	if(!pendingRefresh) {
		pendingRefresh = refreshTransactions().finally(() => { pendingRefresh = null; });
	}
	const { transactions, totals } = await pendingRefresh;

	return {
		transactions: checkPreview(preview, transactions),
		totals,
		stale: false
	};
}

// AAA-Raymond: the saved copy, or null (private mode, bad JSON)
const readSavedTransactions = () => {
	try {
		return JSON.parse(localStorage.getItem("transactions"));
	} catch (err) {
		return null;
	}
}

// AAA-Raymond: a saved copy from this league is topped up with the latest two weeks (2 requests); otherwise (first
// visit, new season, older saved shape) everything is downloaded as before.
const refreshTransactions = async () => {
	// gather supporting info simultaneously
	const nflState = await getNflState().catch((err) => { console.error(err); });
	const saved = readSavedTransactions();

	let transactions;
	let totals;
	if(canTopUp(saved, { leagueID })) {
		const legs = latestLegs(nflState);
		const currentLeague = await getLeagueData(leagueID).catch((err) => { console.error(err); });
		const transactionsData = await fetchLegs(leagueID, legs);
		const fresh = await digestTransactions({ transactionsData, currentSeason: currentLeague?.season });
		transactions = mergeTransactions(saved.transactions, fresh.transactions, { leagueID, legs });
		totals = await computeTotals(transactions);
	} else {
		let week = 18;
		if(nflState.season_type == 'regular') {
			week = nflState.week;
		}

		const {transactionsData, currentSeason} = await combThroughTransactions(week, leagueID).catch((err) => { console.error(err); });

		({ transactions, totals } = await digestTransactions({transactionsData, currentSeason}));
	}

	const transactionPackage = {
		transactions,
		totals,
		meta: transactionsMeta({ leagueID }),
	};

	try {
		// update localStorage
		localStorage.setItem("transactions", JSON.stringify(transactionPackage));
	} catch (err) {
		console.error(err);
	}

	// update the store
	transactionsStore.update(() => transactionPackage);

	return transactionPackage;
}

// AAA-Raymond: raw transactions for some weeks of one league, tagged with the league they came from
const fetchLegs = async (singleLeagueID, legs) => {
	const responses = await waitForAll(
		...legs.map((leg) => sleeperFetch(`https://api.sleeper.app/v1/league/${singleLeagueID}/transactions/${leg}`, {compress: true}))
	).catch((err) => { console.error(err); return []; });
	const out = [];
	for(const res of responses) {
		if(!res?.ok) {
			console.error(res);
			continue;
		}
		const data = await res.json().catch(() => []);
		for(const t of data ?? []) out.push({ ...t, leagueID: singleLeagueID });
	}
	return out;
}

const checkPreview = (preview, passedTransactions) => {
	if(preview) {
		// If this is being used for a preview component, only grab 2 trades and waivers
		const previewToReturn = 3;

		const trades = [];
		const waivers = [];
		
		let i = 0;
		while((trades.length < previewToReturn || waivers.length < previewToReturn) && i < passedTransactions.length) {
			if(passedTransactions[i].type == "waiver" && waivers.length < previewToReturn) {
				waivers.push(passedTransactions[i]);
			} else if(passedTransactions[i].type == "trade" && trades.length < previewToReturn) {

				trades.push(passedTransactions[i]);
			}
			i++;
		}

		return {trades, waivers};
	}
	return passedTransactions;
}

const combThroughTransactions = async (week, currentLeagueID) => {
	week = week > 0 ? week : 1;
	
	const leagueIDs = [];
	let currentSeason = null;

	while(currentLeagueID && currentLeagueID != 0) {
		// gather supporting info simultaneously
		const leagueData = await getLeagueData(currentLeagueID).catch((err) => { console.error(err); });

		leagueIDs.push(currentLeagueID);

		if(!currentSeason) {
			currentSeason = leagueData.season;
		}

		currentLeagueID = leagueData.previous_league_id;
	}

	const transactionPromises = [];

	// AAA-Raymond: remember which league each response came from (saved with each transaction for top-ups)
	const promiseLeagues = [];
	for(const singleLeagueID of leagueIDs) {
		while(week > 0) {
			transactionPromises.push(sleeperFetch(`https://api.sleeper.app/v1/league/${singleLeagueID}/transactions/${week}`, {compress: true}));
			promiseLeagues.push(singleLeagueID);
			week--;
		}
		week = 18;
	}

	const transactionRess = await waitForAll(...transactionPromises).catch((err) => { console.error(err); });

	const transactionDataPromises = [];
	const dataLeagues = [];
	
	transactionRess.forEach((transactionRes, i) => {
			if (transactionRes == null || !transactionRes.ok) {
                console.error(transactionRes);
                return;
			}
			transactionDataPromises.push(transactionRes.json());
			dataLeagues.push(promiseLeagues[i]);
	});

	const transactionsDataJson = await waitForAll(...transactionDataPromises).catch((err) => { console.error(err); });

	let transactionsData = [];

	transactionsDataJson.forEach((transactionDataJson, i) => {
		transactionsData = transactionsData.concat((transactionDataJson ?? []).map((t) => ({ ...t, leagueID: dataLeagues[i] })));
	});

	return {transactionsData, currentSeason};
}

const digestTransactions = async ({transactionsData, currentSeason}) => {
	const transactions = [];

    const leagueTeamManagers = await getLeagueTeamManagers();

	// trades can be out of order because they are aded to sleeper when the offer is sent
	// this sort puts everything in the correct order
	// AAA-Raymond: same order as topped-up lists (ties broken by transaction ID)
	const transactionOrder = transactionsData.sort((a,b) => newestFirst({ ts: a.status_updated, id: a.transaction_id }, { ts: b.status_updated, id: b.transaction_id }));
	
	for(const transaction of transactionOrder) {
		let {digestedTransaction, success} = digestTransaction({transaction, currentSeason});
		if(!success) continue;
		transactions.push(digestedTransaction);
	}
	return {transactions, totals: await computeTotals(transactions, leagueTeamManagers)};
}

// AAA-Raymond: trade / waiver counts per manager (all-time) and per roster (each season), from digested transactions
// (split out of digestTransactions so topped-up lists can be counted again)
const computeTotals = async (transactions, leagueTeamManagers = null) => {
	leagueTeamManagers = leagueTeamManagers ?? await getLeagueTeamManagers();
	const totals = {
		allTime: {},
		seasons: {}
	};
	for(const digestedTransaction of transactions) {
		let season = digestedTransaction.season;
        if(!leagueTeamManagers.teamManagersMap[season]) {
            // the league may not have converted over yet
            season--;
            // there is an edge case when a league is created in the calendar
            // year before the first fantasy season (issue #206)
            if(!leagueTeamManagers.teamManagersMap[season]) {
                season += 2;
            }
        }

		for(const roster of digestedTransaction.rosters) {
			const type = digestedTransaction.type;
            for(const manager of leagueTeamManagers.teamManagersMap[season]?.[roster]?.managers ?? []) {
			    // add to league long totals for each manager involved with the transaction
                if(!totals.allTime[manager]) {
                    totals.allTime[manager] = {
                        trade: 0,
                        waiver: 0
                    };
                }
                totals.allTime[manager][type]++;
            }

            // add to season long totals for each manager
            if(!totals.seasons[season]) {
                totals.seasons[season] = {};
            }
            if(!totals.seasons[season][roster]) {
                totals.seasons[season][roster] = {
                    trade: 0,
                    waiver: 0,
                    rosterID: roster,
                };
            }
            totals.seasons[season][roster][type]++;
		}
	}
	return totals;
}

const digestDate = (tStamp) => {
	const a = new Date(tStamp);
	const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
	const year = a.getFullYear();
	const month = months[a.getMonth()];
	const date = a.getDate();
	const hour = a.getHours();
	const min = a.getMinutes();
	return month + ' ' + date + ' ' + year + ', ' + (hour % 12 == 0 ? 12 : hour % 12) + ':' + min + (hour / 12 >= 1 ? "PM" : "AM");
}

const digestTransaction = ({transaction, currentSeason}) => {
	// don't include failed waiver claims
	if(transaction.status == 'failed') return {success: false};
	const handled = [];
	const transactionRosters = transaction.roster_ids;
	const bid = transaction.settings?.waiver_bid;
	const date = digestDate(transaction.status_updated)
	const season = parseInt(date.split(',')[0].split(' ')[2]);


	let digestedTransaction = {
		id: transaction.transaction_id,
		date,
        season,
		// AAA-Raymond: where and when it happened, for topping up the saved list
		league: transaction.leagueID ?? null,
		leg: transaction.leg ?? null,
		ts: transaction.status_updated ?? null,
		type: "waiver",
		rosters: transactionRosters,
		moves : []
	}
	
	if(transaction.type == "trade") {
		digestedTransaction.type = "trade";
	}
	
	if(season != currentSeason) {
		digestedTransaction.previousOwners = true;
	}

	const adds = transaction.adds;
	const drops = transaction.drops;
	const draftPicks = transaction.draft_picks;

	for(let player in adds) {
		if(!player) {
			continue;
		}
		handled.push(player);
		digestedTransaction.moves.push(handleAdds(transactionRosters, adds, drops, player, bid));
	}

	for(let player in drops) {
		if(handled.indexOf(player) > -1) {
			continue;
		}

		let move = new Array(transactionRosters.length).fill(null);
		if(!player) {
			continue;
		}
		move[transactionRosters.indexOf(drops[player])] = {
			type: "Dropped",
			player
		}

		digestedTransaction.moves.push(move);
	}

	for(let pick of draftPicks) {

		let move = new Array(transactionRosters.length).fill(null);

		move[transactionRosters.indexOf(pick.owner_id)] = {
			type: "trade",
			pick: {
				season: pick.season,
				round: pick.round,
				original_owner: null,
			},
		}

		if(pick.roster_id != pick.previous_owner_id) {
			move[transactionRosters.indexOf(pick.owner_id)].pick.original_owner = pick.roster_id;
		}

		move[transactionRosters.indexOf(pick.previous_owner_id)] = "origin";

		digestedTransaction.moves.push(move);
	}

	for(let wBudget of transaction.waiver_budget) {

		let move = new Array(transactionRosters.length).fill(null);

		move[transactionRosters.indexOf(wBudget.receiver)] = {
			type: "trade",
			budget: {
				amount: wBudget.amount,
			},
		}

		move[transactionRosters.indexOf(wBudget.sender)] = "origin";

		digestedTransaction.moves.push(move);
	}

	return {digestedTransaction, season, success: true};
}

const handleAdds = (rosters, adds, drops, player, bid) => {
	let move = new Array(rosters.length).fill(null);
	if(drops && drops[player]) {
		move[rosters.indexOf(adds[player])] = {
			type: "trade",
			player
		}

		move[rosters.indexOf(drops[player])] = "origin";
		return move;
	}

	move[rosters.indexOf(adds[player])] = {
		type: "Added",
		player,
		bid
	}

	return move;
}