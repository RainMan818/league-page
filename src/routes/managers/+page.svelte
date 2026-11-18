<script>
	import LinearProgress from '@smui/linear-progress';
    import {AllManagers} from '$lib/components';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	// AAA-Raymond: Sleeper's teams when leagueInfo.js has no managers for this league
	import { managersFor } from '$lib/AAA-Raymond/utils/siteManagers.js';

	export let data;
	const {managers, leagueTeamManagersData} = data;

</script>

<style>
	.main {
		position: relative;
		z-index: 1;
	}
    .loading {
        display: block;
        width: 85%;
        max-width: 500px;
        margin: 80px auto;
    }
</style>

<div class="main">
    {#await leagueTeamManagersData}
        <!-- promise is pending -->
        <div class="loading">
            <p>Retrieving managers...</p>
            <LinearProgress indeterminate />
        </div>
    {:then leagueTeamManagers}
        <AllManagers managers={managersFor(managers, leagueTeamManagers)} {leagueTeamManagers}/>
    {:catch error}
        <!-- promise was rejected -->
        <p>Something went wrong: {error.message}</p>
    {/await}
</div>