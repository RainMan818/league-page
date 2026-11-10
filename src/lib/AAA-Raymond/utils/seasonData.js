// Loads what the end-of-season awards need and decides when they (and the weekly recap) show.
// Award math is in seasonAwards.js. Browser-only (called from onMount).
//
// Requests, kept small because Sleeper is a shared free API:
//  - current season: regular-season matchups come from the shared download (weeklyMatchups.js); only the winners
//    and losers brackets, the started playoff weeks and the regular-season transaction weeks are fetched, once per
//    page load.
//  - past seasons: fetched only when picked in the Trophy Room, then saved in localStorage for good
//    (a completed season never changes).
import { leagueID as currentLeagueID } from '$lib/utils/leagueInfo';
import { getLeagueData, getLeagueRosters, getNflState, loadPlayers, waitForAll } from '$lib/utils/helper';
import { getWeeklyMatchupEntries } from './weeklyMatchups.js';
import { seasonAwards, roundWeeks, playoffRecapEntries, playoffRoundName } from './seasonAwards.js';

// bump when the award math changes, so browsers drop results saved by the old version
const CACHE_VERSION = 7;
// current-season results are reused for a few hours, then rebuilt (scores can get stat corrections)
const CURRENT_SEASON_TTL_MS = 3 * 60 * 60 * 1000;

// one request per URL per page load, shared by the recap, the awards and the Trophy Room
const requests = new Map();
function sleeper(path) {
    if (!requests.has(path)) {
        const p = fetch(`https://api.sleeper.app/v1/${path}`)
            .then((res) => {
                if (!res.ok) throw new Error(`Sleeper ${path}: ${res.status}`);
                return res.json();
            })
            .catch((err) => {
                requests.delete(path);
                throw err;
            });
        requests.set(path, p);
    }
    return requests.get(path);
}

const regularSeasonLength = (leagueData) => (Number(leagueData.settings?.playoff_week_start) || 15) - 1;

/**
 * What the homepage shows, from league settings and the NFL state:
 *  regularDone: every regular-season week is scored -> regular-season awards
 *  showRecap:   the weekly recap stays through NFL week 18, i.e. about a week after a week-17 championship
 */
export function seasonPhase(leagueData, nflState) {
    const R = regularSeasonLength(leagueData);
    const status = leagueData?.status;
    const regularDone =
        status === 'post_season' || status === 'complete' || (Number(leagueData?.settings?.last_scored_leg) || 0) >= R;
    const sameSeason = String(nflState?.season) === String(leagueData?.season);
    const recapWeeksLeft = sameSeason && nflState?.season_type === 'regular' && Number(nflState?.display_week) <= 18;
    return { regularDone, showRecap: !regularDone || recapWeeksLeft };
}

/** Every season of the league, newest first: [{ leagueID, season, status }]. */
export async function leagueSeasons() {
    const seasons = [];
    let id = currentLeagueID;
    while (id && id != 0) {
        const data = await getLeagueData(id);
        seasons.push({ leagueID: String(id), season: Number(data.season), status: data.status, leagueData: data });
        id = data.previous_league_id;
    }
    return seasons;
}

/** Playoff weeks that have been scored (all of them for a finished season). */
function scoredPlayoffWeeks(leagueData, winnersBracket) {
    const R = regularSeasonLength(leagueData);
    const totalRounds = Math.max(0, ...winnersBracket.map((m) => m.r));
    const type = leagueData.settings?.playoff_round_type ?? 0;
    const lastScored = leagueData.status === 'complete' ? 99 : Number(leagueData.settings?.last_scored_leg) || 0;
    const weeks = new Set();
    for (let r = 1; r <= totalRounds; r++) {
        for (const w of roundWeeks(r, totalRounds, R + 1, type)) if (w <= Math.min(18, lastScored)) weeks.add(w);
    }
    return [...weeks].sort((a, b) => a - b);
}

/** Matchup entries for regular-season weeks (shared download for the current league) and scored playoff weeks. */
async function seasonWeeks(id, leagueData, winnersBracket) {
    const R = regularSeasonLength(leagueData);
    const weeks = {};
    if (id === String(currentLeagueID)) {
        Object.assign(weeks, (await getWeeklyMatchupEntries()).weeks);
    } else {
        const regular = await waitForAll(...Array.from({ length: R }, (_, i) => sleeper(`league/${id}/matchups/${i + 1}`)));
        regular.forEach((entries, i) => (weeks[i + 1] = entries));
    }
    const playoffWeeks = scoredPlayoffWeeks(leagueData, winnersBracket);
    const playoff = await waitForAll(...playoffWeeks.map((w) => sleeper(`league/${id}/matchups/${w}`)));
    playoffWeeks.forEach((w, i) => (weeks[w] = playoff[i]));
    return weeks;
}

const cacheKey = (id) => `rr-seasonAwards-v${CACHE_VERSION}-${id}`;

function readCache(id, leagueData) {
    try {
        const saved = JSON.parse(localStorage.getItem(cacheKey(id)));
        if (!saved?.awards) return null;
        if (saved.final) return saved.awards;
        const fresh = Date.now() - saved.savedAt < CURRENT_SEASON_TTL_MS;
        return fresh && saved.lastScored === leagueData.settings?.last_scored_leg ? saved.awards : null;
    } catch {
        return null;
    }
}

/** This season's results saved by an older version of the award math, if any (a fallback when Sleeper fails). */
function readOldCache(id) {
    try {
        for (const key of Object.keys(localStorage)) {
            if (!/^rr-seasonAwards-v\d+-/.test(key) || !key.endsWith(`-${id}`) || key === cacheKey(id)) continue;
            const saved = JSON.parse(localStorage.getItem(key));
            if (saved?.awards) return saved.awards;
        }
    } catch {
        // ignore
    }
    return null;
}

function writeCache(id, leagueData, awards) {
    try {
        // drop this season's results from older versions of the award math, now that the new ones are saved below
        for (const key of Object.keys(localStorage)) {
            if (/^rr-seasonAwards-v\d+-/.test(key) && key.endsWith(`-${id}`) && key !== cacheKey(id)) localStorage.removeItem(key);
        }
        localStorage.setItem(cacheKey(id), JSON.stringify({
            awards,
            savedAt: Date.now(),
            lastScored: leagueData.settings?.last_scored_leg,
            // a completed season with its championship decided never changes
            final: leagueData.status === 'complete' && awards.post != null,
        }));
    } catch {
        // storage full or blocked: just skip caching
    }
}

const inFlight = new Map();

/**
 * Both award groups for one season (default: the current league).
 * Returns { season, regular, post } (see seasonAwards.js); post is null until the championship is decided.
 */
export function loadSeasonAwards(id = currentLeagueID) {
    id = String(id);
    if (!inFlight.has(id)) {
        const job = buildSeasonAwards(id).catch((err) => {
            inFlight.delete(id);
            throw err;
        });
        inFlight.set(id, job);
    }
    return inFlight.get(id);
}

async function buildSeasonAwards(id) {
    const leagueData = await getLeagueData(id);
    const cached = readCache(id, leagueData);
    if (cached) return cached;
    try {
        return await computeSeasonAwards(id, leagueData);
    } catch (err) {
        // Sleeper sometimes answers "not found" for a league's rosters or brackets for a while; show the last saved
        // results (even from an older version of the award math) rather than an error
        const old = readOldCache(id);
        if (old) {
            console.warn(`Season awards for ${id}: using saved results (${err?.message ?? err})`);
            return old;
        }
        throw err;
    }
}

async function computeSeasonAwards(id, leagueData) {
    const R = regularSeasonLength(leagueData);
    const [nflState, rostersData, playersInfo, winnersBracket, losersBracket, transactionWeeks] = await waitForAll(
        getNflState(),
        getLeagueRosters(id),
        loadPlayers(null),
        sleeper(`league/${id}/winners_bracket`),
        sleeper(`league/${id}/losers_bracket`),
        waitForAll(...Array.from({ length: R }, (_, i) => sleeper(`league/${id}/transactions/${i + 1}`))),
    );
    const weeks = await seasonWeeks(id, leagueData, winnersBracket ?? []);

    const rosters = Object.values(rostersData.rosters).map((r) => ({
        rosterID: String(r.roster_id),
        wins: r.settings?.wins ?? 0,
        losses: r.settings?.losses ?? 0,
        ties: r.settings?.ties ?? 0,
        fpts: (r.settings?.fpts ?? 0) + (r.settings?.fpts_decimal ?? 0) / 100,
        division: r.settings?.division,
    }));

    const awards = seasonAwards({
        season: Number(leagueData.season),
        currentSeason: Number(nflState.season),
        rosterPositions: leagueData.roster_positions,
        regularSeasonLength: R,
        playoffWeekStart: R + 1,
        playoffRoundType: leagueData.settings?.playoff_round_type ?? 0,
        playoffTeams: Number(leagueData.settings?.playoff_teams) || null,
        weeks,
        rosters,
        winnersBracket: winnersBracket ?? [],
        losersBracket: losersBracket ?? [],
        transactions: transactionWeeks.flat(),
        players: playersInfo?.players ?? {},
    });
    writeCache(id, leagueData, awards);
    return awards;
}

/**
 * Scored playoff weeks of the current season, shaped for weeklyRecap(): { [week]: { entries, roundName } }.
 * Only the winners-bracket games are included. Empty before the playoffs.
 */
export async function loadPlayoffRecapWeeks() {
    const id = String(currentLeagueID);
    const leagueData = await getLeagueData(id);
    if (!seasonPhase(leagueData, await getNflState()).regularDone) return {};
    const winnersBracket = (await sleeper(`league/${id}/winners_bracket`)) ?? [];
    const playoffWeekStart = regularSeasonLength(leagueData) + 1;
    const playoffRoundType = leagueData.settings?.playoff_round_type ?? 0;
    const weeks = scoredPlayoffWeeks(leagueData, winnersBracket);
    const data = await waitForAll(...weeks.map((w) => sleeper(`league/${id}/matchups/${w}`)));
    const out = {};
    weeks.forEach((week, i) => {
        const entries = playoffRecapEntries({ week, entries: data[i] ?? [], winnersBracket, playoffWeekStart, playoffRoundType });
        if (entries.length) out[week] = { entries, roundName: playoffRoundName({ week, winnersBracket, playoffWeekStart, playoffRoundType }) };
    });
    return out;
}
