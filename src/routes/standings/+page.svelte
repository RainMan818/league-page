<script>
	import { Standings } from '$lib/components'

	export let data;
	const {standingsData, leagueRecords, leagueTransactions, leagueTeamManagersData} = data;
</script>

<style>
	.holder {
		position: relative;
		z-index: 1;
		text-align: center;
	}
</style>

<div class="holder">
	<Standings {standingsData} {leagueTeamManagersData} {leagueRecords} {leagueTransactions} />
</div>
