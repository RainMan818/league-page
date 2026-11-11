// Shared "highlight a team's picks" state for the Drafts page: every DraftBoard reads it (to spotlight the picks)
// and registers its picks here; DraftPicksPanel lists the selected team's picks for every draft.
// Teams are matched by roster ID (a number), which stays the same for a franchise across seasons (names can change).

/** Below this width the picks panel is a bottom sheet instead of a right-hand column (the CSS in DraftsLayout and
 *  DraftPicksPanel uses the same 1100px breakpoint). */
export const SHEET_QUERY = '(max-width: 1099.98px)';

export const draftHighlight = $state({
    rosterID: null, // selected team, or null
    team: null, // { name, avatar } of the selected team (current name)
    boards: {}, // { [boardKey]: { year, upcoming, picks: [{ rosterID, pick, name, pos, empty, from }] } }
    flash: null, // { boardKey, pick }: the pick the panel just jumped to (its board scrolls to it and flashes it)
});

/** Select a team (or clear it if it's already selected). */
export function toggleTeam(rosterID, team) {
    rosterID = Number(rosterID);
    if (draftHighlight.rosterID === rosterID) {
        clearTeam();
        return;
    }
    draftHighlight.rosterID = rosterID;
    draftHighlight.team = team;
}

export function clearTeam() {
    draftHighlight.rosterID = null;
    draftHighlight.team = null;
    draftHighlight.flash = null;
}

/** Each board registers its picks (keyed so the upcoming and previous boards of a year don't collide). */
export function registerBoard(boardKey, info) {
    draftHighlight.boards[boardKey] = info;
}

export function unregisterBoard(boardKey) {
    delete draftHighlight.boards[boardKey];
}

let flashTimer;
/** Scroll to a pick on its board and flash it. */
export function jumpToPick(boardKey, pick) {
    clearTimeout(flashTimer);
    draftHighlight.flash = null;
    // set it a moment later (after a repaint) so jumping to the same pick twice replays the flash
    flashTimer = setTimeout(() => {
        draftHighlight.flash = { boardKey, pick };
        flashTimer = setTimeout(() => (draftHighlight.flash = null), 1300);
    }, 50);
}
