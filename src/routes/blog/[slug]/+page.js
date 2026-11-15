
import { error } from '@sveltejs/kit';
import { enableBlog, getBlogPosts, getLeagueTeamManagers } from '$lib/utils/helper';

export function load({ fetch, params }) {
    // AAA-Raymond: with the blog off this is a plain 404 (the site's error page), not a crash in the page component
    if(!enableBlog) error(404, 'Not Found');
    
    const postID = params.slug;
    const postsData = getBlogPosts(fetch);
    const leagueTeamManagersData = getLeagueTeamManagers();

    return {
        postsData,
        postID,
        leagueTeamManagersData,
    };
}