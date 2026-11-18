// Numbers for the Managers list and each manager's page (RayManagers), from data the site already loads:
// records (getLeagueRecords, cached in localStorage), award podiums (getAwards) and the current rosters.
// Plain functions, no site imports (tested in tests/managerProfile.test.js).
//
// owns(rosterID, year) answers "did this manager run that roster that season?" (checkIfManagerReceivedAward).

const ordinal = (n) => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] ?? 'th'));
const fmtPts = (v) => Number(v ?? 0).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export const winPct = (r) => {
    const games = (r?.wins ?? 0) + (r?.losses ?? 0) + (r?.ties ?? 0);
    return games ? (r.wins + r.ties / 2) / games : null;
};

/**
 * All-time regular season and playoff numbers for one manager, with ranks among every manager in the records, or
 * only among `active` (the league's current manager IDs) when given, so a former manager doesn't make it "13th of 12".
 * Returns null when the manager has no record yet.
 */
export function careerStats(records, managerID, { active = null } = {}) {
    const regular = records?.regularSeasonData?.leagueManagerRecords ?? {};
    const playoffs = records?.playoffData?.leagueManagerRecords ?? {};
    const r = regular[managerID];
    if (!r) return null;
    const pool = active ? new Set([...active.map(String), String(managerID)]) : null;
    const all = Object.entries(regular).filter(([id]) => !pool || pool.has(String(id))).map(([, o]) => o);
    const rank = (value) => 1 + all.filter((o) => (value(o) ?? -1) > (value(r) ?? -1)).length;
    const p = playoffs[managerID];
    return {
        wins: r.wins ?? 0,
        losses: r.losses ?? 0,
        ties: r.ties ?? 0,
        pct: winPct(r),
        pctRank: rank(winPct),
        pf: r.fptsFor ?? 0,
        pfRank: rank((o) => o.fptsFor),
        playoffWins: p?.wins ?? 0,
        playoffLosses: p?.losses ?? 0,
        playoffTies: p?.ties ?? 0,
        appearances: p?.playoffAppearances ?? 0,
    };
}

const TROPHIES = {
    champion: { title: 'League Champion', order: 0 },
    regular: { title: 'Regular Season Champion', order: 1 },
    division: { order: 2 },
    second: { title: 'Runner-up', order: 3 },
    third: { title: 'Third Place', order: 4 },
    toilet: { title: 'Toilet Bowl', order: 5 },
};

/**
 * Season podium finishes for one manager, best first, then newest first.
 * awards: getAwards() podiums [{ year, champion, second, third, toilet, divisions: [{ name, rosterID, wins, points }] }]
 * tookOver: year the manager took over the team (leagueInfo.js), so older finishes are marked `former`.
 * divisions holds each division's winner (Sleeper's divisions here have no names: "Division Champion"). The regular
 * season champion is the division winner with the best record, points for breaking ties (the 1 seed). A league
 * without divisions has a single unnamed entry, which is the regular season champion.
 */
export function managerTrophies(awards = [], owns, tookOver = null) {
    const out = [];
    for (const podium of awards ?? []) {
        const year = Number(podium.year);
        const former = !!(tookOver && tookOver > year);
        for (const [key, value] of Object.entries(podium)) {
            if (key === 'year' || value == null) continue;
            if (key === 'divisions') {
                const divs = value.filter((d) => d?.rosterID != null);
                const noDivisions = divs.length === 1 && !divs[0].name;
                const best = divs.every((d) => d.wins != null)
                    ? [...divs].sort((x, y) => y.wins - x.wins || (y.points ?? 0) - (x.points ?? 0))[0]
                    : null;
                for (const d of divs) {
                    if (!owns(d.rosterID, year)) continue;
                    if (noDivisions || d === best) out.push({ year, kind: 'regular', title: TROPHIES.regular.title, former });
                    if (!noDivisions) out.push({ year, kind: 'division', title: d.name ? `${d.name} Division Champion` : 'Division Champion', former });
                }
            } else if (TROPHIES[key] && owns(value, year)) {
                out.push({ year, kind: key, title: TROPHIES[key].title, former });
            }
        }
    }
    return out.sort((a, b) => TROPHIES[a.kind].order - TROPHIES[b.kind].order || b.year - a.year);
}

/** Titles (league championships) only, oldest first: [2023, ...]. */
export const titleYears = (trophies) => trophies.filter((t) => t.kind === 'champion').map((t) => t.year).sort((a, b) => a - b);

/**
 * The manager's places in the league record books (same lists the old awards case read):
 * top 3 all-time wins, points and lineup IQ; top 10 single weeks and seasons; each season's top 3 weeks.
 * Returns [{ label, rank, rankText, value, year?, former }], best rank first.
 * inProgressYear: the season still being played, whose season entry is marked "(so far)" (like the Records page).
 */
export function managerRecords(records, managerID, owns, tookOver = null, { inProgressYear = null } = {}) {
    const regular = records?.regularSeasonData;
    if (!regular) return [];
    const out = [];
    const former = (year) => !!(tookOver && year && tookOver > year);
    const add = (label, rank, value, year = null) => out.push({ label, rank, rankText: ordinal(rank), value, year, former: former(year) });

    const managerRecs = Object.entries(regular.leagueManagerRecords ?? {}).map(([id, r]) => ({ ...r, id }));
    const top3 = (sortKey, label, value) => {
        const sorted = [...managerRecs].sort((a, b) => sortKey(b) - sortKey(a));
        const i = sorted.slice(0, 3).findIndex((r) => r.id === managerID);
        if (i > -1) add(label, i + 1, value(sorted[i]));
    };
    top3((r) => r.wins, 'All-time wins', (r) => `${r.wins} wins`);
    top3((r) => r.fptsFor, 'All-time points for', (r) => fmtPts(r.fptsFor));
    top3((r) => (r.potentialPoints ? r.fptsFor / r.potentialPoints : 0), 'All-time lineup IQ', (r) => `${((r.fptsFor * 100) / r.potentialPoints).toFixed(1)}%`);

    (regular.mostSeasonLongPoints ?? []).forEach((rec, i) => {
        // the list is ranked by points per week (as on the Records page), so that's the number shown
        const soFar = Number(rec?.year) === Number(inProgressYear) ? ' (so far)' : '';
        const ppw = Number(rec?.fptsPerGame) || 0;
        if (rec && owns(rec.rosterID, rec.year)) add('Season (points per week)', i + 1, `${rec.year}${soFar} · ${fmtPts(ppw)}/wk`, rec.year);
    });
    (regular.leagueWeekHighs ?? []).forEach((rec, i) => {
        if (rec && owns(rec.rosterID, rec.year)) add('Single week (all-time)', i + 1, `${rec.year} W${rec.week} · ${fmtPts(rec.fpts)}`, rec.year);
    });
    for (const season of regular.seasonWeekRecords ?? []) {
        (season.seasonPointsHighs ?? []).slice(0, 3).forEach((rec, i) => {
            if (rec && owns(rec.rosterID, season.year)) add(`Single week, ${season.year}`, i + 1, `W${rec.week} · ${fmtPts(rec.fpts)}`, season.year);
        });
    }
    return out.sort((a, b) => a.rank - b.rank);
}

const SLOT_LABELS = { SUPER_FLEX: 'SF', IDP_FLEX: 'IDP', REC_FLEX: 'W/T', WRRB_FLEX: 'W/R', BN: 'BN' };
// lineup slots that hold defenders (IDP slots plus a team defense); every other slot counts as offense
const DEFENSE_SLOTS = new Set(['IDP_FLEX', 'DL', 'DE', 'DT', 'NT', 'LB', 'OLB', 'ILB', 'MLB', 'DB', 'CB', 'S', 'SS', 'FS', 'DEF']);

/**
 * A roster split into lineup slots and bench for display.
 * roster: Sleeper roster { starters, players, reserve, taxi }; rosterPositions: league roster_positions;
 * players: the site's player map ({ fn, ln, pos, t }). Empty slots have name null.
 * `offense` / `defense` are the starters split by slot type, each in Sleeper's slot order.
 */
export function rosterLineup(roster, rosterPositions = [], players = {}) {
    const person = (id) => {
        const p = players[id];
        return { id, name: p ? `${p.fn ?? ''} ${p.ln ?? ''}`.trim() : null, pos: p?.pos ?? '', nfl: p?.t ?? '' };
    };
    const slots = rosterPositions.filter((s) => s !== 'BN');
    const startersList = roster?.starters ?? [];
    const starters = slots.map((slot, i) => {
        const id = startersList[i];
        const p = id && id !== '0' ? person(id) : { id: null, name: null, pos: '', nfl: '' };
        return { slot: SLOT_LABELS[slot] ?? slot, defense: DEFENSE_SLOTS.has(slot), ...p };
    });
    const taken = new Set([...startersList, ...(roster?.reserve ?? []), ...(roster?.taxi ?? [])]);
    const bench = (roster?.players ?? []).filter((id) => !taken.has(id)).map(person);
    return {
        starters,
        offense: starters.filter((s) => !s.defense),
        defense: starters.filter((s) => s.defense),
        bench,
        reserve: (roster?.reserve ?? []).map(person),
        taxi: (roster?.taxi ?? []).map(person),
    };
}

// head-to-head record (no weekly median game; seasons before the median game have no h2h fields and don't need them)
const h2h = (y) => ({ wins: Number(y.h2hWins ?? y.wins) || 0, losses: Number(y.h2hLosses ?? y.losses) || 0, ties: Number(y.h2hTies ?? y.ties) || 0 });
const SEASON_STATS = { wins: (y) => h2h(y).wins, pf: (y) => Number(y.fpts) || 0, maxPF: (y) => Number(y.potentialPoints) || 0 };
const games = (r) => r.wins + r.losses + r.ties;
/** A season with the weekly median game: Sleeper's record has more games than the head-to-head one (any league). */
export const hadMedianGame = (y) =>
    y?.h2hWins != null && games({ wins: Number(y.wins) || 0, losses: Number(y.losses) || 0, ties: Number(y.ties) || 0 }) > games(h2h(y));

/**
 * Regular-season numbers for each finished season this manager ran a team, oldest first, for the season charts.
 * Each stat comes with the team's league rank that season (1 = best; ties share a rank) and the league average.
 * records: getLeagueRecords(); leagueRosterRecords[rosterID].years = [{ year, wins, losses, ties, fpts, potentialPoints }]
 * isComplete(year): whether that season is over (the in-progress season is left out).
 * Wins, losses and ties are head-to-head only: the weekly league-median game is left out (median: that season had it).
 * Returns [{ year, rosterID, wins, losses, ties, median, pf, maxPF, teams, rank: { wins, pf, maxPF }, avg: { wins, pf, maxPF } }]
 */
export function seasonHistory(records, owns, isComplete = () => true) {
    const byYear = {};
    for (const [rosterID, rec] of Object.entries(records?.regularSeasonData?.leagueRosterRecords ?? {})) {
        for (const y of rec?.years ?? []) {
            const year = Number(y.year);
            if (!isComplete(year)) continue;
            (byYear[year] ??= []).push({ rosterID: String(rosterID), y });
        }
    }
    const out = [];
    for (const [yearKey, teams] of Object.entries(byYear)) {
        const year = Number(yearKey);
        const mine = teams.find((t) => owns(t.rosterID, year));
        if (!mine) continue;
        const value = (y, stat) => SEASON_STATS[stat](y);
        const rank = {}, avg = {};
        for (const stat of Object.keys(SEASON_STATS)) {
            const v = value(mine.y, stat);
            rank[stat] = 1 + teams.filter((t) => value(t.y, stat) > v).length;
            avg[stat] = teams.reduce((a, t) => a + value(t.y, stat), 0) / teams.length;
        }
        out.push({
            year,
            rosterID: mine.rosterID,
            ...h2h(mine.y),
            median: hadMedianGame(mine.y),
            pf: value(mine.y, 'pf'),
            maxPF: value(mine.y, 'maxPF'),
            teams: teams.length,
            rank,
            avg,
        });
    }
    return out.sort((a, b) => a.year - b.year);
}

/** Template placeholder bios ("Lorem ipsum...", "TODO") aren't shown. */
export const isPlaceholderText = (text) => !text || /^\s*(lorem ipsum|todo|tbd)\b/i.test(String(text));
