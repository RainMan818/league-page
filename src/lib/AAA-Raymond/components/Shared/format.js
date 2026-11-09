// Shared number formatting (insights, standings, recap).

/** Probability (0-1) as a short percent. Monte Carlo odds are never shown as a guarantee unless every run agreed. */
export function pct(p) {
    if (p == null) return '–';
    if (p === 0) return '–';
    if (p < 0.005) return '<1%';
    if (p > 0.995 && p < 1) return '>99%';
    return `${Math.round(p * 100)}%`;
}

export const pts = (n) => (n == null ? '–' : Number(n).toFixed(1));

export const signed = (n, digits = 1) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toFixed(digits)}`;

export const record = (w, l, t = 0) => (t ? `${w}-${l}-${t}` : `${w}-${l}`);

/** Projected (fractional) record, e.g. 9.4-4.6 */
export const projRecord = (w, l) => `${w.toFixed(1)}-${l.toFixed(1)}`;
