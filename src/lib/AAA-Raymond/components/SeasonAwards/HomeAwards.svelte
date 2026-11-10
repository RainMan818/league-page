<!--
  The current season's awards on the homepage (see RayHome/index.svelte, which decides when this shows).
  Regular-season awards appear once every regular-season week is scored; post-season awards join them once the
  championship is decided. `postReady` tells RayHome when the championship is done.
-->
<script>
  import { onMount } from "svelte";
  import { loadLeagueContext } from "../../utils/leagueContext.js";
  import { loadSeasonAwards } from "../../utils/seasonData.js";
  import Loading from "../Shared/Loading.svelte";
  import SeasonAwards from "./SeasonAwards.svelte";

  let { standingsData, leagueTeamManagersData, postReady = $bindable(false) } = $props();

  let status = $state("loading"); // loading | ready | error
  let errorMessage = $state("");
  let awards = $state.raw(null);
  let teams = $state.raw({});
  let onTeamClick = $state.raw(null);

  onMount(async () => {
    try {
      const [ctx, result] = await Promise.all([loadLeagueContext({ standingsData, leagueTeamManagersData }), loadSeasonAwards()]);
      teams = ctx.teams;
      onTeamClick = ctx.onTeamClick;
      awards = result;
      postReady = !!result?.post;
      status = result?.regular ? "ready" : "error";
      if (!result?.regular) errorMessage = "no regular-season results yet";
    } catch (err) {
      console.error(err);
      errorMessage = err?.message ?? String(err);
      status = "error";
    }
  });
</script>

{#if status === "loading"}
  <Loading message="Handing out the season awards..." />
{:else if status === "error"}
  <Loading message="Couldn't build the season awards: {errorMessage}" progress={false} />
{:else}
  <SeasonAwards {awards} teamFor={(id) => teams[id]} {onTeamClick} />
{/if}
