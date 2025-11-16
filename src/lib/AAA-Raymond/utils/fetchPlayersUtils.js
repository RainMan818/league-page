/** Helper used in "src\routes\api\fetch_players_info\+server.js" */
export function computePlayersHelper(projPlayer) {
    return {
        id: projPlayer.player_id,
        positions: projPlayer.fantasy_positions,
        experience: projPlayer.years_exp,
        number: projPlayer.number,
        age: projPlayer.age
    };
}