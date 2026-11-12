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
 * All-time regular season and playoff numbers for one manager, with ranks among every manager in the records.
 * Returns null when the manager has no record yet.
 */
export function careerStats(records, managerID) {
    const regular = records?.regularSeasonData?.leagueManagerRecords ?? {};
    const playoffs = records?.playoffData?.leagueManagerRecords ?? {};
    const r = regular[managerID];
    if (!r) return null;
    const all = Object.values(regular);
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
 * awards: getAwards() podiums [{ year, champion, second, third, toilet, divisions: [{ name, rosterID }] }]
 * tookOver: year the manager took over the team (leagueInfo.js), so older finishes are marked `former`.
 */
export function managerTrophies(awards = [], owns, tookOver = null) {
    const out = [];
    for (const podium of awards ?? []) {
        const year = Number(podium.year);
        const former = !!(tookOver && tookOver > year);
        for (const [key, value] of Object.entries(podium)) {
            if (key === 'year' || value == null) continue;
            if (key === 'divisions') {
                for (const d of value) {
                    if (d?.rosterID == null || !owns(d.rosterID, year)) continue;
                    const kind = d.name ? 'division' : 'regular';
                    out.push({ year, kind, title: d.name ? `${d.name} Division Champion` : TROPHIES.regular.title, former });
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
 */
export function managerRecords(records, managerID, owns, tookOver = null) {
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
        if (rec && owns(rec.rosterID, rec.year)) add('Season points', i + 1, `${rec.year} · ${fmtPts(rec.fpts)}`, rec.year);
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

/**
 * A roster split into lineup slots and bench for display.
 * roster: Sleeper roster { starters, players, reserve, taxi }; rosterPositions: league roster_positions;
 * players: the site's player map ({ fn, ln, pos, t }). Empty slots have name null.
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
        return { slot: SLOT_LABELS[slot] ?? slot, ...p };
    });
    const taken = new Set([...startersList, ...(roster?.reserve ?? []), ...(roster?.taxi ?? [])]);
    const bench = (roster?.players ?? []).filter((id) => !taken.has(id)).map(person);
    return {
        starters,
        bench,
        reserve: (roster?.reserve ?? []).map(person),
        taxi: (roster?.taxi ?? []).map(person),
    };
}

/** Template placeholder bios ("Lorem ipsum...", "TODO") aren't shown. */
export const isPlaceholderText = (text) => !text || /^\s*(lorem ipsum|todo|tbd)\b/i.test(String(text));
