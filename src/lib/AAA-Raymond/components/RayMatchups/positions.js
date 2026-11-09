// Position → color group for chips and draft cells. Colors live in theme/outrun.css as --or-pos-<group>.
const GROUPS = {
    QB: 'QB', RB: 'RB', WR: 'WR', TE: 'TE', K: 'K', DEF: 'DEF',
    DL: 'DL', DE: 'DL', DT: 'DL', NT: 'DL',
    LB: 'LB', OLB: 'LB', ILB: 'LB', MLB: 'LB',
    DB: 'DB', CB: 'DB', S: 'DB', SS: 'DB', FS: 'DB',
};

/** CSS color for a player position, e.g. posColor('CB') -> 'var(--or-pos-DB)'. */
export const posColor = (pos) => `var(--or-pos-${GROUPS[pos] ?? 'K'})`;

/** Sleeper headshot (or team logo for defenses), with Sleeper's default silhouette as a fallback. */
export const playerPhoto = (playerID, pos) =>
    pos === 'DEF'
        ? `background-image: url(https://sleepercdn.com/images/team_logos/nfl/${String(playerID).toLowerCase()}.png)`
        : `background-image: url(https://sleepercdn.com/content/nfl/players/thumb/${playerID}.jpg), url(https://sleepercdn.com/images/v2/icons/player_default.webp)`;
