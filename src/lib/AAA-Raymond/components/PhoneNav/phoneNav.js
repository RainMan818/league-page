// Phone / tablet navigation (under 950px, option C, Nov 17): which pages go in the icon row and which in the More
// panel, and which one is the page you're on. Plain functions, no site imports (tests/phoneNav.test.js).

/** Shorter labels for the row (six buttons across a phone). */
export const SHORT = { 'Trades & Waivers': 'Moves' };

/**
 * tabs = src/lib/utils/tabs.js. Row: the top-level pages (Blog goes to the panel when it's on). More: the nested
 * menu's pages (the desktop "Clubhouse" dropdown), then the Blog. Returns { row, more, moreLabel }.
 */
export function rowAndMore(tabs = [], { enableBlog = false } = {}) {
    const blog = tabs.find((t) => !t.nest && t.label === 'Blog');
    const row = tabs.filter((t) => !t.nest && t !== blog).map((t) => ({ ...t, short: SHORT[t.label] ?? t.label }));
    const nested = tabs.filter((t) => t.nest);
    const more = [...nested.flatMap((t) => t.children ?? []), ...(enableBlog && blog ? [blog] : [])];
    return { row, more, moreLabel: nested[0]?.label ?? 'More' };
}

/** Is `dest` the page at `path`? Home only on "/", a page also for its sub-pages; /manager counts as Managers. */
export function isCurrent(dest, path) {
    if (!dest || isExternal(dest)) return false;
    if (dest === '/') return path === '/';
    if (dest === '/managers' && path === '/manager') return true;
    return path === dest || path.startsWith(`${dest}/`);
}

export const isExternal = (dest) => /^https?:\/\//.test(dest ?? '');
