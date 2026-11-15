// Resources page news feed: turns the site's news endpoint (src/routes/api/fetch_serverside_news, via getNews) into
// display rows: plain-text title and excerpt, source with a short badge, Article / Podcast / Post, how long ago.
// Plain functions (tested in tests/newsFeed.test.js).
import { decodeEntities } from './feedText.js';

// sources in filter order; Reddit authors arrive as "r/DynastyFF - u/name"
export const SOURCES = [
    { key: 'Dynasty Nerds', label: 'Dynasty Nerds', ab: 'DN', color: 'var(--or-pos-WR, #58a7ff)' },
    { key: 'Dynasty League Football', label: 'DLF', ab: 'DLF', color: 'var(--or-pos-TE, #ffae58)' },
    { key: 'Fantasy Footballers', label: 'Footballers', ab: 'FF', color: 'var(--or-pos-QB, #ff2a6d)' },
    { key: 'FTN Fantasy', label: 'FTN', ab: 'FTN', color: 'var(--or-pos-RB, #00ceb8)' },
];
const REDDIT = { ab: 'R', color: 'var(--or-pos-DL, #ff795a)' };

/** Source info for an article's author. */
export function sourceOf(author = '') {
    const known = SOURCES.find((s) => s.key === author);
    if (known) return known;
    const sub = String(author).match(/^(r\/\w+)/);
    if (sub) return { key: sub[1], label: sub[1], ...REDDIT };
    return { key: author || 'News', label: author || 'News', ab: (author || 'N').slice(0, 2).toUpperCase(), color: 'var(--or-cyan, #05d9e8)' };
}

/** HTML (or entity-encoded text) to one plain line; drops WordPress's "The post … appeared first on …" footer. */
export function plainText(html = '', max = 240) {
    let text = decodeEntities(String(html ?? '').replace(/<[^>]*>/g, ' '))
        .replace(/\s+/g, ' ')
        .trim();
    text = text.replace(/\s*The post\b.*\bappeared first on\b.*$/i, '').trim();
    if (text.length > max) text = text.slice(0, max).replace(/\s+\S*$/, '') + '…';
    return text;
}

/** "just now", "25m ago", "5h ago", "3d ago", then the date ("Oct 30"). */
export function timeAgo(ts, now = Date.now()) {
    const mins = Math.floor((now - ts) / 60000);
    if (!Number.isFinite(mins)) return '';
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    if (mins < 24 * 60) return `${Math.floor(mins / 60)}h ago`;
    if (mins < 7 * 24 * 60) return `${Math.floor(mins / (24 * 60))}d ago`;
    return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const kindOf = (a, source) => {
    if (source.ab === 'R') return 'Post';
    if (a.author === 'Fantasy Footballers' || /\/podcast\//i.test(a.link ?? '')) return 'Podcast';
    return 'Article';
};

/**
 * Display rows, newest first, one per story (link + title): { id, title, excerpt, link, ts, ago, kind, source: { key, label, ab, color } }.
 * Links are entity-decoded (feeds send "&#038;" for "&").
 */
export function newsItems(articles = [], now = Date.now()) {
    const seen = new Set();
    const out = [];
    for (const a of articles ?? []) {
        const link = decodeEntities(a?.link ?? '');
        const title = plainText(a?.title ?? '', 200);
        // the same story twice; the Footballers send every episode with their home page as the link, so the title counts
        const key = `${link}|${title}`;
        if (!title || seen.has(key)) continue;
        seen.add(key);
        const source = sourceOf(a.author);
        const ts = Number(a.ts) || 0;
        let excerpt = plainText(a.article ?? '');
        if (/^https?:\/\/\S+$/.test(excerpt)) excerpt = ''; // link-only Reddit posts
        out.push({ id: key, title, excerpt, link, ts, ago: timeAgo(ts, now), kind: kindOf(a, source), source });
    }
    return out.sort((a, b) => b.ts - a.ts);
}

/** Filter chips: [{ key, label, n }] for the sources present, in SOURCES order (Reddit and others after). */
export function sourceCounts(items = []) {
    const counts = new Map();
    for (const it of items) {
        const c = counts.get(it.source.key) ?? { key: it.source.key, label: it.source.label, n: 0 };
        c.n += 1;
        counts.set(it.source.key, c);
    }
    const order = (k) => {
        const i = SOURCES.findIndex((s) => s.key === k);
        return i === -1 ? SOURCES.length : i;
    };
    return [...counts.values()].sort((a, b) => order(a.key) - order(b.key) || a.label.localeCompare(b.label));
}
