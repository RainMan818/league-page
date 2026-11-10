// Rough points value of a traded draft pick, used by Trade of the Year (seasonAwards.js) so picks don't count as 0.
//
// A pick is worth about one season of what players taken in that round have produced as starters in this league.
// Measured Nov 2026 from the 2023-2026 rookie drafts (6 rounds x 12 picks each) against the 2023-2025 regular
// seasons, counting busts as 0 (average starter points per player-season):
//   1st 119.6 (1.01-1.04: 144, 1.05-1.08: 126, 1.09-1.12: 89) · 2nd 48.7 · 3rd 24.4 · 4th 32.4 · 5th 11.9 · 6th 15.8
// Values set by Raymond (Nov 9) from those numbers: 1st 120, then 50 for a 2nd, 10 less per round, and 15 for a 6th.
// Future picks' slots aren't known yet, so the value is by round only.
// Bump CACHE_VERSION in seasonData.js after changing these numbers.
export const PICK_VALUES = { 1: 120, 2: 50, 3: 40, 4: 30, 5: 20, 6: 15 };

/** Points value of a pick in `round` (rounds past the table are worth the last value). */
export function pickValue(round, values = PICK_VALUES) {
    const r = Number(round);
    if (values[r] != null) return values[r];
    const known = Object.keys(values).map(Number).filter((k) => k < r);
    return known.length ? values[Math.max(...known)] : 0;
}
