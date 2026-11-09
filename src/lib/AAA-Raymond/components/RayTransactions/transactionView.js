// Turns the template's digested transactions (src/lib/utils/helperFunctions/leagueTransactions.js) into
// rows for the grouped-by-day feed. Plain functions, no site imports.
//
// transaction: { id, date: "Nov 4 2026, 2:6AM", season, type: "waiver" | "trade", rosters: [rosterID],
//                moves: [[cell per roster]] }
// cell: null | "origin" | { type: "Added" | "Dropped" | "trade", player?, bid?, pick?, budget? }

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Parse the template's date string ("Nov 4 2026, 2:6AM"; minutes aren't zero-padded). */
export function parseTransactionDate(str) {
    const m = /^(\w{3}) (\d{1,2}) (\d{4}), (\d{1,2}):(\d{1,2})(AM|PM)$/.exec(String(str ?? '').trim());
    if (!m) return null;
    const [, mon, day, year, h, min, ampm] = m;
    const month = MONTHS.indexOf(mon);
    if (month < 0) return null;
    let hour = Number(h) % 12;
    if (ampm === 'PM') hour += 12;
    const date = new Date(Number(year), month, Number(day), hour, Number(min));
    return {
        date,
        dayKey: `${year}-${month}-${day}`,
        dayLabel: `${WEEKDAYS[date.getDay()]}, ${mon} ${day}`,
        year: Number(year),
        time: `${Number(h)}:${String(min).padStart(2, '0')} ${ampm}`,
    };
}

const ordinal = (n) => {
    const v = n % 100;
    if (v >= 11 && v <= 13) return `${n}th`;
    return `${n}${{ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] ?? 'th'}`;
};

/**
 * One line per team in the transaction: what it received and what it dropped.
 * teamName(rosterID) supplies display names (for a traded pick's original owner).
 */
export function transactionSides(transaction, players = {}, teamName = (id) => `Team ${id}`) {
    const sides = transaction.rosters.map((rosterID) => ({ rosterID, items: [], bid: null }));
    for (const move of transaction.moves ?? []) {
        move.forEach((cell, i) => {
            if (!cell || cell === 'origin' || !sides[i]) return;
            const side = sides[i];
            if (cell.player) {
                const p = players[cell.player];
                const isDef = p?.pos === 'DEF';
                side.items.push({
                    kind: cell.type === 'Dropped' ? 'drop' : transaction.type === 'waiver' ? 'add' : 'player',
                    name: p ? `${p.fn ?? ''} ${p.ln ?? ''}`.trim() : String(cell.player),
                    info: p ? [p.pos, isDef ? null : p.t].filter(Boolean).join(' · ') : '',
                });
                if (cell.type === 'Added' && cell.bid) side.bid = cell.bid;
            } else if (cell.pick) {
                const { season, round, original_owner } = cell.pick;
                side.items.push({
                    kind: 'pick',
                    name: `${season} ${ordinal(round)} round pick`,
                    info: original_owner ? `via ${teamName(original_owner)}` : '',
                });
            } else if (cell.budget) {
                side.items.push({ kind: 'budget', name: `$${cell.budget.amount} FAAB`, info: '' });
            }
        });
    }
    // a team that only gave things up still gets a line in a trade, so both partners show
    return sides.filter((s) => s.items.length || transaction.type === 'trade');
}

/** Consecutive transactions on the same day share a group (input is newest first). */
export function groupByDay(transactions) {
    const groups = [];
    for (const t of transactions) {
        const when = parseTransactionDate(t.date);
        const key = when?.dayKey ?? t.date;
        const last = groups[groups.length - 1];
        const entry = { transaction: t, when };
        if (last && last.key === key) last.items.push(entry);
        else groups.push({ key, label: when?.dayLabel ?? t.date, year: when?.year, items: [entry] });
    }
    return groups;
}

/** Newest first, for lists that mix waivers and trades (the homepage). */
export const sortNewestFirst = (transactions) =>
    [...transactions].sort((a, b) => (parseTransactionDate(b.date)?.date ?? 0) - (parseTransactionDate(a.date)?.date ?? 0));
