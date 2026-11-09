// Position grouping, colors and player photos: the one place for "DE counts as DL, CB counts as DB".
// Plain functions, no site imports (tested in tests/positions.test.js).

/** Every position Sleeper uses, mapped to its group. Unknown positions map to themselves. */
export const POSITION_GROUPS = {
    QB: 'QB', RB: 'RB', WR: 'WR', TE: 'TE', K: 'K', DEF: 'DEF',
    DL: 'DL', DE: 'DL', DT: 'DL', NT: 'DL',
    LB: 'LB', OLB: 'LB', ILB: 'LB', MLB: 'LB',
    DB: 'DB', CB: 'DB', S: 'DB', SS: 'DB', FS: 'DB',
};

export const IDP_GROUPS = ['DL', 'LB', 'DB'];

/** Group for one position string: groupOf('CB') -> 'DB'. */
export const groupOf = (pos) => POSITION_GROUPS[pos] ?? pos;

/**
 * A player's group among `allowed`: their listed position first, then their other fantasy positions
 * (Sleeper lists some players as e.g. pos 'LB' with positions ['LB', 'DL']). null if none fits.
 */
export function playerGroup(player, allowed) {
    if (!player) return null;
    const own = groupOf(player.pos);
    if (allowed.includes(own)) return own;
    return (player.positions ?? []).map(groupOf).find((g) => allowed.includes(g)) ?? null;
}

/** DL, LB or DB for a defender, undefined for anyone else. */
export const idpGroup = (player) => playerGroup(player, IDP_GROUPS) ?? undefined;

/** CSS color for a position, e.g. posColor('CB') -> 'var(--or-pos-DB)'. Colors live in theme/outrun.css. */
export const posColor = (pos) => `var(--or-pos-${POSITION_GROUPS[pos] ?? 'K'})`;

/** Sleeper headshot (team logo for defenses) as a background-image, with Sleeper's silhouette as a fallback. */
export const playerPhoto = (playerID, pos) =>
    pos === 'DEF'
        ? `background-image: url(https://sleepercdn.com/images/team_logos/nfl/${String(playerID).toLowerCase()}.png)`
        : `background-image: url(https://sleepercdn.com/content/nfl/players/thumb/${playerID}.jpg), url(https://sleepercdn.com/images/v2/icons/player_default.webp)`;
