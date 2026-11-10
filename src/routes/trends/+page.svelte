<script>
	// AAA-Raymond: week-by-week trend charts
	import { RayTrends } from '$lib/components';

	export let data;
	const { standingsData, leagueTeamManagersData } = data;
</script>

<div class="holder">
	<RayTrends {standingsData} {leagueTeamManagersData} />
</div>

<style>
	.holder {
		position: relative;
		z-index: 1;
	}
</style>
