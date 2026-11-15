import { get } from 'svelte/store';
import {news} from '$lib/stores';

// AAA-Raymond: every feed (podcasts, articles and now Reddit) is fetched by the site's server endpoint. Reddit blocks
// requests made from the browser (CORS), and one failed feed used to break the whole Resources news section
// ("(intermediate value) is not iterable"); a feed that fails now just adds nothing.
const SERVER_API = '/api/fetch_serverside_news';

export const getNews = async (servFetch, bypass = false) => {
	if(get(news)[0] && !bypass) {
		return {articles: get(news), fresh: false};
	}
    const smartFetch = servFetch ?? fetch;
	const serverData = await smartFetch(SERVER_API, {compress: true})
		.then((res) => (res.ok ? res.json() : []))
		.catch((err) => { console.error(err); return []; });

	const articles = (Array.isArray(serverData) ? serverData : []).sort((a, b) => (a.ts < b.ts) ? 1 : -1);
	if(articles.length) news.update(() => articles);

	return {articles, fresh: true};
}

// AAA-Raymond: exported for the server endpoint, which now fetches Reddit
export const processReddit = (rawArticles) => {
	const bannedAuthors = [
		"AutoModerator",
		"FFBot",
		"Brookskbrothers",
		"FTAKJ"
	]
	const bannedIcons = [
		"",
		"self",
		"thumbnail",
		"default",
	]
	let finalArticles = [];
	const children = rawArticles?.children ?? [];
	for(const rawArticle of children) {
		const data = rawArticle.data;
		if(bannedAuthors.includes(data.author)) {
			continue;
		}
		const ts = data.created_utc * 1000;
		const d = new Date(ts);
		const icon = !bannedIcons.includes(data.thumbnail) ? data.thumbnail : `newsIcons/${data.subreddit}.png`;
		const date = stringDate(d);
		let article = `<a href="${data.url}" class="body-link">${data.url}</a>`;
		if(data.selftext_html) {
			article = decodeHTML(data.selftext_html);
		}
		if(data.secure_media_embed?.content) {
			decodeHTML(data.secure_media_embed.content)
		 }
		finalArticles.push({
			title: data.title,
			article,
			link: `https://www.reddit.com${data.permalink}`,
			author: `${data.subreddit_name_prefixed} - u/${data.author}`,
			ts,
			date,
			icon,
		});
	}
	return finalArticles;
}

var htmlEntities = {
    nbsp: ' ',
    cent: '¢',
    pound: '£',
    yen: '¥',
    euro: '€',
    copy: '©',
    reg: '®',
    lt: '<',
    gt: '>',
    quot: '"',
    amp: '&',
    apos: '\''
};

function decodeHTML(str) {
    return str.replace(/\&([^;]+);/g, function (entity, entityCode) {
        let match;

        if (entityCode in htmlEntities) {
            return htmlEntities[entityCode];
            /*eslint no-cond-assign: 0*/
        } else if (match = entityCode.match(/^#x([\da-fA-F]+)$/)) {
            return String.fromCharCode(parseInt(match[1], 16));
            /*eslint no-cond-assign: 0*/
        } else if (match = entityCode.match(/^#(\d+)$/)) {
            return String.fromCharCode(~~match[1]);
        } else {
            return entity;
        }
    });
}

export const stringDate = (d) => {
	return `${d.getMonth()+1}/${d.getDate()}/${d.getFullYear()} ${d.getHours() % 12}:${(d.getMinutes() < 10 ? '0' : '') + d.getMinutes()}${d.getHours() / 12 >= 1 ? "PM" : "AM"}`;
}