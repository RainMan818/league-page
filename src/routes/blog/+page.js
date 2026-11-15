
import { error } from '@sveltejs/kit';
import { enableBlog, getBlogPosts, getLeagueTeamManagers } from '$lib/utils/helper';

export function load({ url, fetch }) {
    // AAA-Raymond: with the blog off this is a plain 404 (the site's error page), not a crash in the page component
    if(!enableBlog) error(404, 'Not Found');

    const queryPage = url?.searchParams?.get('page') || 1;
    const filterKey = url?.searchParams?.get('filter') || '';
    const postsData = getBlogPosts(fetch);
    const leagueTeamManagersData = getLeagueTeamManagers();

    return {
        queryPage,
        postsData,
        filterKey,
        leagueTeamManagersData,
    };
}