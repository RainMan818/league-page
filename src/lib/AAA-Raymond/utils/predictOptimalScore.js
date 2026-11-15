import { groupOf } from './positions.js';

// Which position groups each starting slot takes (Sleeper slot names).
const SLOT_GROUPS = {
    QB: ['QB'], RB: ['RB'], WR: ['WR'], TE: ['TE'], K: ['K'], DEF: ['DEF'], DL: ['DL'], LB: ['LB'], DB: ['DB'],
    FLEX: ['RB', 'WR', 'TE'], WRRB_FLEX: ['RB', 'WR'], REC_FLEX: ['WR', 'TE'], SUPER_FLEX: ['QB', 'RB', 'WR', 'TE'],
    IDP_FLEX: ['DL', 'LB', 'DB'], IDP: ['DL', 'LB', 'DB'],
};

// A player's groups: his listed position plus every other fantasy position Sleeper lets him play (e.g. a DE who is
// also LB-eligible), so he can fill any slot Sleeper would let him fill.
const groupsOf = (p) => new Set([p?.pos, ...(p?.positions ?? [])].filter(Boolean).map(groupOf));
const pointsOf = (p, week) => parseFloat(p?.wi?.[week]?.p ?? 0) || 0;

/**
 * Best lineup for `week` from each player's points (`wi[week].p`: projected, or actual for max PF):
 * { score, picks: [{ slot, id, p }] }, one pick per starting slot that could be filled, in lineup order.
 * predictScores is its score, so the max PF math everywhere stays the same.
 *
 * Optimal, not greedy by slot: players are taken best first, and each one goes in if the lineup can make room for
 * him, moving players already placed to other slots they're eligible for (matching with augmenting paths). That
 * gives the highest possible total. The old version filled slots in lineup order (flex spots before DL/LB/DB) and
 * only by listed position, which came in up to ~3% under Sleeper's max PF.
 */
export const predictLineup = (players, week, leagueData) => {
    const slots = getStarterPositions(leagueData);
    const eligible = slots.map((s) => SLOT_GROUPS[s] ?? [s]);
    // try narrow slots first (QB before SUPER_FLEX), so players rarely need moving
    const tryOrder = slots.map((_, i) => i).sort((a, b) => eligible[a].length - eligible[b].length || a - b);
    const pool = (players ?? [])
        .map((p) => ({ p, pts: pointsOf(p, week), groups: groupsOf(p), own: groupOf(p?.pos) }))
        .sort((a, b) => b.pts - a.pts);
    const inSlot = new Array(slots.length).fill(-1); // pool index in each slot
    const fits = (k, s) => eligible[s].some((g) => pool[k].groups.has(g));
    const place = (k, seen) => {
        for (const s of tryOrder) {
            if (seen[s] || !fits(k, s)) continue;
            seen[s] = true;
            if (inSlot[s] === -1 || place(inSlot[s], seen)) {
                inSlot[s] = k;
                return true;
            }
        }
        return false;
    };
    for (let k = 0; k < pool.length; k++) {
        // a free slot first, one for his listed position if there is one (keeps better players in the narrower
        // slots and players at their own position), else make room by moving others
        const open = tryOrder.filter((s) => inSlot[s] === -1 && fits(k, s));
        const free = open.find((s) => eligible[s].includes(pool[k].own)) ?? open[0];
        if (free !== undefined) inSlot[free] = k;
        else place(k, new Array(slots.length).fill(false));
    }

    const picks = [];
    let score = 0;
    slots.forEach((slot, s) => {
        if (inSlot[s] === -1) return;
        const { p, pts } = pool[inSlot[s]];
        picks.push({ slot, id: p.id, p: pts });
        score += pts;
    });
    return { score, picks };
};

export const predictScores = (players, week, leagueData) => predictLineup(players, week, leagueData).score;

export const getStarterPositions = (leagueData) => {
    const rosterPositions = leagueData.roster_positions;
    const firstBench = rosterPositions.indexOf('BN');

    return firstBench === -1 ? [...rosterPositions] : rosterPositions.slice(0, firstBench);
};
