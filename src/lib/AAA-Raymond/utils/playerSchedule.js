// Opponents for the site's player data (src/routes/api/fetch_players_info/+server.js). Sleeper's weekly projection
// for a player listed out that week can come without an opponent (Myles Garrett, 2026 weeks 8-9: the recap showed
// no "vs"), so it's filled in from that week's schedule, read off every other projection. Bye weeks stay null.
// Plain functions, no site imports (tested in tests/playerSchedule.test.js).

/** team -> opponent for one week, from that week's projection entries ({ team, opponent }). */
export function weekSchedule(entries = []) {
    const schedule = {};
    for (const e of entries ?? []) {
        if (e?.team && e?.opponent) schedule[e.team] = e.opponent;
    }
    return schedule;
}

/** A projection entry's opponent: its own, else its team's that week, else the player's current team's. */
export const opponentFor = (entry, schedule = {}, currentTeam = null) =>
    entry?.opponent ?? schedule[entry?.team] ?? (currentTeam ? schedule[currentTeam] : undefined) ?? null;
