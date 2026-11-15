import {XMLParser, XMLValidator} from 'fast-xml-parser';
import { dynasty } from '$lib/utils/helper';
import { json } from '@sveltejs/kit';
// AAA-Raymond: Reddit is fetched here (it blocks browser requests), and a feed that fails adds nothing instead of
// breaking the response
import { processReddit } from '$lib/utils/helperFunctions/news';
import { decodeEntities } from '$lib/AAA-Raymond/utils/feedText.js';

const REDDIT_DYNASTY = 'https://www.reddit.com/r/DynastyFF/new.json';
const REDDIT_FANTASY = 'https://www.reddit.com/r/fantasyfootball/new.json';

const FF_BALLERS= 'https://thefantasyfootballers.libsyn.com/fantasyfootball';
const DYNASTY_LEAGUE= 'https://dynastyleaguefootball.com/feed/';
const DYNASTY_NERDS= 'https://www.dynastynerds.com/feed/';

export async function GET() {
	const articles = [
        getXMLArticles(FF_BALLERS, processFF),
	];
	if(dynasty) {
		articles.push(getXMLArticles(DYNASTY_LEAGUE, processDynastyLeague));
		articles.push(getXMLArticles(DYNASTY_NERDS, processDynastyNerds));
	}
	articles.push(getRedditArticles(dynasty ? REDDIT_DYNASTY : REDDIT_FANTASY));
    const responses = await Promise.all(articles.map((p) => p.catch((err) => { console.error(err); return []; })));

	let finalArticles = [];

	for(const response of responses) {
		if(Array.isArray(response)) finalArticles = [...finalArticles, ...response];
	}

    return json(finalArticles);
}

const getXMLArticles = async(url, callback) => {
    // AAA-Raymond: an unreachable or malformed feed adds nothing
    try {
        const res = await fetch(url, {compress: true});
        if(!res.ok) return [];
        const text = await res.text();
        if(XMLValidator.validate(text) !== true) return [];
        const items = new XMLParser().parse(text)?.rss?.channel?.item;
        return items ? callback(Array.isArray(items) ? items : [items]) : [];
    } catch (err) {
        console.error(err);
        return [];
    }
}

const getRedditArticles = async (url) => {
    try {
        const res = await fetch(url, { headers: { 'User-Agent': 'league-page/1.0 (fantasy league site)' } });
        if(!res.ok) return [];
        const data = await res.json();
        return data?.data ? processReddit(data.data) : [];
    } catch (err) {
        console.error(err);
        return [];
    }
}

const processFF = (articles) => {
	let finalArticles = [];
	for(const article of articles.slice(0, 5)) {
		const ts = Date.parse(article.pubDate);
		const d = new Date(ts);
		const date = stringDate(d);
		const icon = 'newsIcons/ffballers.jpeg';
		finalArticles.push({
			title: decodeEntities(article.title),
			article: article.description,
			link: article.link,
			author: `Fantasy Footballers`,
			ts,
			date,
			icon,
		});
	}
	return finalArticles;
}

const processFTN = (rawArticles) => {
	let finalArticles = [];
	const items = rawArticles.items;
	for(const article of items) {
		// only grab important info
		if(article.priority > 3) continue;
		const ts = Date.parse(article.datetime);
		const d = new Date(ts);
		const date = stringDate(d);
		const icon = 'newsIcons/ftn.png';
		finalArticles.push({
			title: article.short_text,
			article: article.text,
			link: `https://www.ftnfantasy.com/nfl${article.link}`,
			author: `FTN Fantasy`,
			ts,
			date,
			icon,
		});
	}
	return finalArticles;
}

const processDynastyLeague = (articles) => {
	let finalArticles = [];
	for(const article of articles) {
		const ts = Date.parse(article.pubDate);
		const d = new Date(ts);
		const date = stringDate(d);
		const icon = 'newsIcons/dynastyLeague.png';
		finalArticles.push({
			title: decodeEntities(article.title),
			article: article.description,
			link: article.link,
			author: `Dynasty League Football`,
			ts,
			date,
			icon,
		});
	}
	return finalArticles;
}

const processDynastyNerds = (articles) => {
	let finalArticles = [];
	for(const article of articles) {
		const ts = Date.parse(article.pubDate);
		const d = new Date(ts);
		const date = stringDate(d);
		const icon = 'newsIcons/dynastyNerds.jpeg';
		finalArticles.push({
			title: decodeEntities(article.title),
			article: article.description,
			link: article.link,
			author: `Dynasty Nerds`,
			ts,
			date,
			icon,
		});
	}
	return finalArticles;
}

const stringDate = (d) => {
	return `${d.getMonth()+1}/${d.getDate()}/${d.getFullYear()} ${d.getHours()}:${(d.getMinutes() < 10 ? '0' : '') + d.getMinutes()}`;
}