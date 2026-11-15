// Text clean-up for the Resources news feeds (used by src/routes/api/fetch_serverside_news/+server.js).
// Plain functions, no site imports (tested in tests/feedText.test.js).

const NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

/** Feed titles arrive with HTML entities ("&#124;", "&amp;", "&#x2019;"); the page shows titles as plain text. */
export const decodeEntities = (text) =>
    String(text ?? '').replace(/&(#x[\da-f]+|#\d+|\w+);/gi, (m, code) => {
        if (code[0] === '#') return String.fromCodePoint(code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10));
        return NAMED[code.toLowerCase()] ?? m;
    });
