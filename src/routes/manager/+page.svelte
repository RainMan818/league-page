<script>
	import LinearProgress from '@smui/linear-progress';
    import {Manager} from '$lib/components';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	// AAA-Raymond: Sleeper's teams when leagueInfo.js has no managers for this league
	import { managersFor } from '$lib/AAA-Raymond/utils/siteManagers.js';

	export let data;
	const {managers, manager, managersInfo} = data;

    onMount(() => {
        if(manager < 0) goto("/managers");
    })
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
        {#await managersInfo}
            <!-- promise is pending -->
            <div class="loading">
                <p>Retrieving managers...</p>
                <LinearProgress indeterminate />
            </div>
        {:then [rostersData, leagueTeamManagers, leagueData, transactionsData, awards, records]}
            {@const list = managersFor(managers, leagueTeamManagers)}
            {#if manager > -1 && manager < list.length}
                <Manager {awards} {records} {manager} managers={list} {rostersData} {leagueTeamManagers} rosterPositions={leagueData.roster_positions} {transactionsData} />
            {:else}
                <p>No manager number {manager}. <a href="/managers">All managers</a></p>
            {/if}
        {:catch error}
            <!-- promise was rejected -->
            <p>Something went wrong: {error.message}</p>
        {/await}
</div>