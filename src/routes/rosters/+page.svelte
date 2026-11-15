<script>
	// AAA-Raymond: the Rosters page is our redesign (team strip, lineup, position breakdown, depth chart, picks;
	// "All teams" shows Roster analysis). The template's Rosters cards are no longer used here.
	import RayRosters from '$lib/AAA-Raymond/components/RayRosters/index.svelte';

	export let data;
</script>

<style>
	.holder {
		position: relative;
		z-index: 1;
	}
</style>

<div class="holder">
	<RayRosters standingsData={data.standingsData} />
</div>
