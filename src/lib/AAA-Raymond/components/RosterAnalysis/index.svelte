<!-- Roster Analysis loader, shown at the top of the /rosters page (src/routes/rosters/+page.svelte). -->
<script>
    import { loadLeagueBasics } from '../../utils/leagueContext.js';
    import Loading from '../Shared/Loading.svelte';
    import RosterAnalysis from './RosterAnalysis.svelte';

    let { standingsData } = $props();

    const basics = loadLeagueBasics();
</script>

{#await basics}
    <Loading message="Gathering roster details..." />
{:then { nflState, rostersData, managers, leagueData, playersInfo }}
    {#if leagueData.status != 'pre_draft' && leagueData.status != 'complete'}
        <RosterAnalysis {standingsData} {nflState} {rostersData} leagueTeamManagers={managers} {leagueData} {playersInfo} />
    {/if}
{:catch error}
    <Loading message="Something went wrong: {error.message}" progress={false} />
{/await}
