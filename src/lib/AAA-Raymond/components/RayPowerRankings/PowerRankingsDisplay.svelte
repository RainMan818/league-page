<script>
	import BarChart from '$lib/BarChart.svelte';
    import { generateGraph, getTeamFromTeamManagers, round, loadPlayers } from '$lib/utils/helper';
    import { predictScores } from "$lib/AAA-Raymond/utils/predictOptimalScore";
    export let nflState, rostersData, leagueTeamManagers, playersInfo, leagueData;

    const rosters = rostersData.rosters;

    let validGraph = false;

    let graphs = [];

    let seasonOver = false;

    const buildRankings = () => {
        const rosterPowers = [];
        let week = nflState.week;
        if(week == 0) {
            week = 1;
        }
        let max = 0;

        for(const rosterID in rosters) {
            const roster = rosters[rosterID];
            // make sure the roster has players on it
            if(!roster.players) continue;
            // if at least one team has players, create the graph
            validGraph = true;

            const rosterPlayers = [];

            for(const rosterPlayer of roster.players) {
                if(!players[rosterPlayer]) continue;
                rosterPlayers.push({
                    name: players[rosterPlayer].ln,
                    pos: players[rosterPlayer].pos,
                    positions: players[rosterPlayer].positions,
                    wi: players[rosterPlayer].wi
                })
            }

            const rosterPower = {
                rosterID,
                manager: getTeamFromTeamManagers(leagueTeamManagers, rosterID),
                powerScore: 0,
                rawPowerScore: 0,
            }
            const seasonEnd = 18;
            if(week >= seasonEnd) {
                seasonOver = true;
            }
            for(let i = week; i < seasonEnd; i++) {
                rosterPower.powerScore += predictScores(rosterPlayers, i, leagueData);
                rosterPower.rawPowerScore += predictScores(rosterPlayers, i, leagueData);
            }
            if(rosterPower.powerScore > max) {
                max = rosterPower.powerScore;
            }
            rosterPowers.push(rosterPower);
        }

        for(const rosterPower of rosterPowers) {
            rosterPower.powerScore = round(rosterPower.powerScore/max * 100);
            rosterPower.rawPowerScore = round(rosterPower.rawPowerScore);
        }

        const powerGraph = {
            stats: rosterPowers,
            x: "Manager",
            y: "Power Ranking",
            stat: "",
            header: "Rest of Season Power Rankings",
            field: "powerScore",
            short: "Power Rankings"
        };

        graphs = [
            generateGraph(powerGraph, leagueData.season),
            generateGraph({...powerGraph, field: "rawPowerScore", short: "Raw Projections"}, leagueData.season),
        ]
    }

    let players = playersInfo.players;

    buildRankings();

    const refreshPlayers = async () => {
        const newPlayersInfo = await loadPlayers(null, true);
        players = newPlayersInfo.players;
        buildRankings();
    }

    if(playersInfo.stale) {
        refreshPlayers();
    }

    let curGraph = 0;

</script>

<style>
    .enclosure {
        display: block;
        position: relative;
        width: 100%;
    }
</style>

{#if validGraph && !seasonOver}
    <div class="enclosure">
        <BarChart {graphs} bind:curGraph={curGraph} {leagueTeamManagers} />
    </div>
{/if}