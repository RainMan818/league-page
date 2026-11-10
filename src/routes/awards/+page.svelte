<script>
	// AAA-Raymond: the Trophy Room is the season awards (season picker); the template's podium list was removed
	import TrophyRoomAwards from '$lib/AAA-Raymond/components/SeasonAwards/TrophyRoomAwards.svelte';

    export let data;
    const {teamManagersData} = data;
</script>

<style>
    .awards {
        display: block;
        margin: 30px auto;
		width: 95%;
		max-width: 1000px;
		position: relative;
		z-index: 1;
		overflow-y: hidden;
    }
</style>

<div class="awards">
	<TrophyRoomAwards {teamManagersData} />
</div>
