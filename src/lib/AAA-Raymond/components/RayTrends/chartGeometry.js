// Geometry for the trend line charts: scales, polyline points and non-overlapping end labels.
// Plain functions, no site imports (tested in tests/leagueTrends.test.js).

/** x/y scale functions for a chart box. */
export function scales({ w, h, pad, n, min, max, invert = false }) {
    const plotW = w - pad.l - pad.r;
    const X = (i) => pad.l + (n > 1 ? (i * plotW) / (n - 1) : plotW / 2);
    const Y = (v) => {
        const t = (v - min) / ((max - min) || 1);
        return pad.t + (invert ? t : 1 - t) * (h - pad.t - pad.b);
    };
    return { X, Y };
}

export const points = (vals, X, Y) => vals.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ');

/**
 * End-label positions: each label starts level with its line's last point, then labels are pushed apart
 * (at least `gap` px) and pulled back up if they run past `floor`. Returns ys in the same order as `ys`.
 */
export function spreadLabels(ys, { gap = 13, floor = Infinity, ceil = -Infinity } = {}) {
    const order = ys.map((y, i) => ({ y, i })).sort((a, b) => a.y - b.y);
    let last = -Infinity;
    for (const o of order) { o.ly = Math.max(o.y, last + gap, ceil); last = o.ly; }
    let cap = floor;
    for (let k = order.length - 1; k >= 0; k--) { order[k].ly = Math.min(order[k].ly, cap); cap = order[k].ly - gap; }
    const out = [];
    for (const o of order) out[o.i] = o.ly;
    return out;
}

/** "Nice" axis bounds and ticks covering [lo, hi] with about `count` steps. */
export function niceTicks(lo, hi, count = 4) {
    if (!(hi > lo)) { hi = lo + 1; }
    const raw = (hi - lo) / count;
    const mag = 10 ** Math.floor(Math.log10(raw));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag;
    const min = Math.floor(lo / step) * step;
    const max = Math.ceil(hi / step) * step;
    const ticks = [];
    for (let v = min; v <= max + step / 1e6; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
    return { min, max, ticks };
}

/** Index of the week nearest to an x position. */
export function nearestIndex(x, X, n) {
    let best = 0;
    for (let i = 1; i < n; i++) if (Math.abs(X(i) - x) < Math.abs(X(best) - x)) best = i;
    return best;
}
