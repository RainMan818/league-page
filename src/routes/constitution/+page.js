// AAA-Raymond: The Dynasty League's rules. For another league (houseRules off in leagueInfo.js) the page sends
// visitors home. prerender must stay a plain `true`: SvelteKit reads page options without running the file.
import { redirect } from '@sveltejs/kit';
import { houseRules } from '$lib/utils/leagueInfo';

export const prerender = true;

export function load() {
    if (!houseRules) redirect(307, '/');
}
