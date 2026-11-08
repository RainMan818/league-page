<!-- Lays out the homepage insight sections from already-computed data (see index.svelte). -->
<script>
  import PlayoffProjection from "./PlayoffProjection.svelte";
  import TeamBreakdown from "./TeamBreakdown.svelte";

  let { view, onTeamClick = null } = $props();
</script>

<div class="insights">
  {#if view.projection}
    <section class="section">
      <h6>{view.year} Playoff Projection</h6>
      <PlayoffProjection
        projection={view.projection}
        teams={view.teams}
        playoffWeeks={view.playoffWeeks}
        fromWeek={view.fromWeek}
        regularSeasonLength={view.regularSeasonLength}
        divisions={view.divisions}
        {onTeamClick}
      />
    </section>
  {:else if view.postseason}
    <section class="section">
      <h6>{view.year} Playoffs</h6>
      <p class="note">The regular season is over. See <a href="/matchups">Matchups</a> for the live playoff bracket.</p>
    </section>
  {/if}

  {#if view.standings && Object.keys(view.standings).length}
    <section class="section">
      <h6>Team Breakdown</h6>
      <TeamBreakdown
        standings={view.standings}
        projection={view.projection}
        luck={view.luck}
        efficiency={view.efficiency}
        teams={view.teams}
        divisions={view.divisions}
        {onTeamClick}
      />
    </section>
  {/if}
</div>
