
<script>
	import LinearProgress from '@smui/linear-progress';
	// AAA-Raymond: outrun "versus strip" matchups with full lineups, bench and league median
	import MatchupWeeks from '../AAA-Raymond/components/RayMatchups/MatchupWeeks.svelte';
	// AAA-Raymond: outrun playoff bracket (tree, season picker, projected seeds before the playoffs, lineups)
	import PlayoffBracket from '../AAA-Raymond/components/RayMatchups/PlayoffBracket.svelte';
    import Button, { Group, Label } from '@smui/button';
    import { goto } from '$app/navigation';
    import { onMount } from 'svelte';
    import { loadPlayers } from '$lib/utils/helper';

	export let queryWeek, leagueTeamManagersData, matchupsData, bracketsData, playersData;

    let players, matchupWeeks, year, week, regularSeasonLength, leagueTeamManagers;

    let loading = true;

    onMount(async () => {
        // AAA-Raymond: the bracket loads its own data (PlayoffBracket), only when Playoffs is picked
        const matchupsInfo = await matchupsData;
        leagueTeamManagers = await leagueTeamManagersData;
        matchupWeeks = matchupsInfo.matchupWeeks;
        year = matchupsInfo.year;
        week = matchupsInfo.week;
        regularSeasonLength = matchupsInfo.regularSeasonLength;
        const playersInfo = await playersData;
        players = playersInfo.players;
        loading = false;

        if(playersInfo.stale) {
            const newPlayersInfo = await loadPlayers(null, true);
            players = newPlayersInfo.players;
        }
    });

    // AAA-Raymond: back from the playoffs to the regular-season week you were on (else the current week), not week 1
    let lastRegularWeek = null;
    const changeSelection = (s) => {
        if(s == 'regular') {
            const back = lastRegularWeek || Math.min(Math.max(Number(week) || 1, 1), regularSeasonLength || 1);
            queryWeek = back;
            goto(`/matchups?week=${back}`, {noscroll: true});
        } else if(selection == 'regular') {
            const shown = Number(new URL(window.location.href).searchParams.get('week'));
            if(shown > 0 && shown <= regularSeasonLength) lastRegularWeek = shown;
            queryWeek = 99;
            goto(`/matchups?week=99`, {noscroll: true});
        }
        selection = s;
    }

    let selection = 'regular';
</script>

<style>
    .message {
        display: block;
        width: 85%;
        max-width: 500px;
        margin: 80px auto;
    }

    .buttonHolder {
        display: flex;
        flex-direction: column;
        align-items: center;
        margin: 3em 0;
    }
</style>



{#if loading}
    <!-- promise is pending -->
    <div class="message">
        <p>Loading league matchups...</p>
        <LinearProgress indeterminate />
    </div>
{:else}
    {#if matchupWeeks.length}
        <div class="buttonHolder">
            <Group variant="outlined">
                <!-- Regular Season -->
                <Button class="selectionButtons" onclick={() => changeSelection('regular')} variant="{selection == 'regular' ? "raised" : "outlined"}">
                    <Label>Regular Season</Label>
                </Button>
                <!-- Championship Bracket -->
                <Button class="selectionButtons" onclick={() => changeSelection('champions')} variant="{selection == 'champions' || selection == 'losers' ? "raised" : "outlined"}">
                    <Label>Playoffs</Label>
                </Button>
            </Group>
            {#if selection == 'champions' || selection == 'losers'}
                <Group variant="outlined">
                    <!-- Championship Bracket -->
                    <Button class="selectionButtons" onclick={() => changeSelection('champions')} variant="{selection == 'champions' ? "raised" : "outlined"}">
                        <Label>Championship</Label>
                    </Button>
                    <!-- Losers Bracket -->
                    <Button class="selectionButtons" onclick={() => changeSelection('losers')} variant="{selection == 'losers' ? "raised" : "outlined"}">
                        <Label>Toilet Bowl</Label>
                    </Button>
                </Group>
            {/if}
        </div>
        {#if selection == 'regular'}
            <MatchupWeeks {players} {queryWeek} {matchupWeeks} {regularSeasonLength} {year} {week} bind:selection={selection} {leagueTeamManagers} />
        {/if}
    {:else}
        <div class="message">
            <p>No upcoming matchups...</p>
        </div>
    {/if}
    <!-- {promise has processed -->
    <!-- AAA-Raymond: shown before the playoffs too (today's seeds), not only once Sleeper has scores -->
    {#if selection == 'champions' || selection == 'losers'}
        <PlayoffBracket {queryWeek} {leagueTeamManagers} {players} bind:selection={selection} />
    {/if}
{/if}