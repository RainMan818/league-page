// Per-week position averages for the /standings page, driven by the league's lineup (Sleeper roster_positions)
// instead of hard-coded starter indexes. Plain functions, no site imports
// (tests/positionAverages.test.js checks the result matches the old hard-coded version).
//
// Two views:
//  - "roster": points by lineup slot (QB + Superflex together, FLEX slots as WRT, the IDP flex as IDP)
//  - "player": points by the starter's own slot position (flex slots are left out, as before)
// Both also total Team, Off (offensive slots) and Def (defensive slots).
import { groupOf } from './positions.js';

const SLOT_BUCKETS = {
    QB: { roster: 'QB+Flex', player: 'QB', side: 'Off' },
    RB: { roster: 'RB', player: 'RB', side: 'Off' },
    WR: { roster: 'WR', player: 'WR', side: 'Off' },
    TE: { roster: 'TE', player: 'TE', side: 'Off' },
    K: { roster: 'K', player: 'K', side: 'Off' },
    FLEX: { roster: 'WRT', side: 'Off' },
    WRRB_FLEX: { roster: 'WRT', side: 'Off' },
    REC_FLEX: { roster: 'WRT', side: 'Off' },
    SUPER_FLEX: { roster: 'QB+Flex', side: 'Off' },
    IDP_FLEX: { roster: 'IDP', side: 'Def' },
    DL: { roster: 'DL', player: 'DL', side: 'Def' },
    LB: { roster: 'LB', player: 'LB', side: 'Def' },
    DB: { roster: 'DB', player: 'DB', side: 'Def' },
    DEF: { roster: 'DEF', player: 'DEF', side: 'Def' },
};

/**
 * The averages columns this lineup has (Nov 16, leagues without IDP): positions it never starts are dropped, the
 * offense / defense split only shows when it starts defenders (otherwise offense = total), and the QB column says
 * "QB+SF" only with a superflex. columns: [{ name, field }]; view: 'roster' (by slot) or 'player' (by position).
 */
export function lineupColumns(columns = [], rosterPositions = [], view = 'roster') {
    const buckets = slotBuckets(rosterPositions);
    const defense = buckets.some((b) => b.side === 'Def');
    const have = new Set(['Team', ...(defense ? ['Off', 'Def'] : [])]);
    for (const b of buckets) if (b[view]) have.add(b[view]);
    const superflex = starterSlots(rosterPositions).includes('SUPER_FLEX');
    return columns.filter((c) => have.has(c.field)).map((c) => (c.field === 'QB+Flex' && !superflex ? { ...c, name: 'QB' } : c));
}

/** Starting slots in lineup order (everything before the first bench spot). */
export function starterSlots(rosterPositions = []) {
    const firstBench = rosterPositions.indexOf('BN');
    return firstBench < 0 ? [...rosterPositions] : rosterPositions.slice(0, firstBench);
}

/** Where each starting slot's points count, e.g. 'DE' slots count as DL. */
export const slotBuckets = (rosterPositions) =>
    starterSlots(rosterPositions).map((slot) => SLOT_BUCKETS[slot] ?? SLOT_BUCKETS[groupOf(slot)] ?? {});

/**
 * { [rosterID]: { [bucket]: points per week } }
 *  matchupsData: completed weeks, each an array of Sleeper entries ({ roster_id, starters_points })
 *  weeks: number of weeks to average over
 *  kind: "roster" | "player"
 */
export function positionAverages(matchupsData, weeks, rosterPositions, kind) {
    const slots = slotBuckets(rosterPositions);
    const totals = {};
    const add = (id, bucket, value) => {
        totals[id] ??= {};
        totals[id][bucket] = (totals[id][bucket] ?? 0) + value;
    };
    for (const weekEntries of matchupsData ?? []) {
        for (const entry of weekEntries ?? []) {
            const id = entry.roster_id;
            (entry.starters_points ?? []).forEach((score, i) => {
                const value = score || 0;
                const slot = slots[i] ?? {};
                const bucket = kind === 'roster' ? slot.roster : slot.player;
                if (bucket) add(id, bucket, value);
                add(id, 'Team', value);
                if (slot.side) add(id, slot.side, value);
            });
        }
    }
    for (const id in totals) {
        for (const bucket in totals[id]) totals[id][bucket] /= weeks;
    }
    return totals;
}
