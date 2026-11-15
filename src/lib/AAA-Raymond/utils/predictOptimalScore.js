import { idpGroup } from './positions.js';

/**
 * Best projected lineup for `week`: { score, picks: [{ slot, id }] } (one pick per starting slot that could be
 * filled, in lineup order). predictScores is its score, so the max PF math everywhere stays the same.
 */
export const predictLineup = (players, week, leagueData) => {
    const starterPositions = getStarterPositions(leagueData);
    const picks = [];
    const take = (list, slot) => {
        const picked = list.shift();
        if (picked) picks.push({ slot, id: picked.id, p: parseFloat(picked.wi?.[week]?.p ?? 0) || 0 });
    };

    // sort roster by highest projected points for that week
    const projectedPlayers = [...players].sort((a, b) => (b.wi && b.wi[week] ? b.wi[week].p : 0) - (a.wi && a.wi[week] ? a.wi[week].p : 0));

    // now that the players are sorted, grab the QBs
    const qbs = projectedPlayers.filter(p => p.pos == 'QB');
    // and the WRs
    const wrs = projectedPlayers.filter(p => p.pos == 'WR');
    // and the RBs
    const rbs = projectedPlayers.filter(p => p.pos == 'RB');
    // and the TEs
    const tes = projectedPlayers.filter(p => p.pos == 'TE');
    // and the DEFs
    const defs = projectedPlayers.filter(p => p.pos == 'DEF');
    // and the Ks
    const ks = projectedPlayers.filter(p => p.pos == 'K');
    // and the IDPs (Sleeper lists some defenders by specific position, e.g. DE, CB, S)
    const dls = projectedPlayers.filter(p => idpGroup(p) == 'DL');
    const lbs = projectedPlayers.filter(p => idpGroup(p) == 'LB');
    const dbs = projectedPlayers.filter(p => idpGroup(p) == 'DB');

    let powerScore = 0;
    // next, use the roster configuration to grab the highest scorer at each position
    for (const starterPosition of starterPositions) {
        const qb = parseFloat(qbs[0]?.wi && qbs[0]?.wi[week] ? qbs[0].wi[week].p : 0);
        const rb = parseFloat(rbs[0]?.wi && rbs[0]?.wi[week] ? rbs[0].wi[week].p : 0);
        const wr = parseFloat(wrs[0]?.wi && wrs[0]?.wi[week] ? wrs[0].wi[week].p : 0);
        const te = parseFloat(tes[0]?.wi && tes[0]?.wi[week] ? tes[0].wi[week].p : 0);
        const dl = parseFloat(dls[0]?.wi && dls[0]?.wi[week] ? dls[0].wi[week].p : 0);
        const lb = parseFloat(lbs[0]?.wi && lbs[0]?.wi[week] ? lbs[0].wi[week].p : 0);
        const db = parseFloat(dbs[0]?.wi && dbs[0]?.wi[week] ? dbs[0].wi[week].p : 0);
        const k = parseFloat(ks[0]?.wi && ks[0]?.wi[week] ? ks[0].wi[week].p : 0);
        const def = parseFloat(defs[0]?.wi && defs[0]?.wi[week] ? defs[0].wi[week].p : 0);
        switch (starterPosition) {
            case 'QB':
                take(qbs, starterPosition);
                powerScore += qb;
                break;
            case 'RB':
                take(rbs, starterPosition);
                powerScore += rb;
                break;
            case 'WR':
                take(wrs, starterPosition);
                powerScore += wr;
                break;
            case 'TE':
                take(tes, starterPosition);
                powerScore += te;
                break;
            case 'DEF':
                take(defs, starterPosition);
                powerScore += def;
                break;
            case 'K':
                take(ks, starterPosition);
                powerScore += k;
                break;
            case 'DL':
                take(dls, starterPosition);
                powerScore += dl;
                break;
            case 'LB':
                take(lbs, starterPosition);
                powerScore += lb;
                break;
            case 'DB':
                take(dbs, starterPosition);
                powerScore += db;
                break;
            // Start of flex players
            case 'FLEX':
                if (rb >= wr && rb >= te) {
                    take(rbs, starterPosition);
                    powerScore += rb;
                } else if (wr >= rb && wr >= te) {
                    take(wrs, starterPosition);
                    powerScore += wr;
                } else {
                    take(tes, starterPosition);
                    powerScore += te;
                }
                break;
            case 'WRRB_FLEX':
                if (rb >= wr) {
                    take(rbs, starterPosition);
                    powerScore += rb;
                } else {
                    take(wrs, starterPosition);
                    powerScore += wr;
                }
                break;
            case 'SUPER_FLEX':
                if (qb >= wr && qb >= te && qb >= rb) {
                    take(qbs, starterPosition);
                    powerScore += qb;
                } else if (rb >= wr && rb >= te && rb >= qb) {
                    take(rbs, starterPosition);
                    powerScore += rb;
                } else if (wr >= rb && wr >= te && wr >= qb) {
                    take(wrs, starterPosition);
                    powerScore += wr;
                } else {
                    take(tes, starterPosition);
                    powerScore += te;
                }
                break;
            case 'REC_FLEX':
                if (wr >= te) {
                    take(wrs, starterPosition);
                    powerScore += wr;
                } else {
                    take(tes, starterPosition);
                    powerScore += te;
                }
                break;
            // Sleeper calls the IDP flex slot 'IDP_FLEX'
            case 'IDP_FLEX':
            case 'IDP':
                if (dl >= lb && dl >= db) {
                    take(dls, starterPosition);
                    powerScore += dl;
                } else if (lb >= dl && lb >= db) {
                    take(lbs, starterPosition);
                    powerScore += lb;
                } else {
                    take(dbs, starterPosition);
                    powerScore += db;
                }
                break;
            default:
                break;
        }
    }
    return { score: powerScore, picks };
}

export const predictScores = (players, week, leagueData) => predictLineup(players, week, leagueData).score;

export const getStarterPositions = (leagueData) => {
    const rosterPositions = leagueData.roster_positions;
    const firstBench = rosterPositions.indexOf('BN');

    return rosterPositions.slice(0, firstBench);
}