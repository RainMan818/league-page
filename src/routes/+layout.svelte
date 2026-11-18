<!-- __layout.svelte -->
<script>
	import { Nav, Footer } from "$lib/components"
	import "$lib/AAA-Raymond/theme/outrun.css"; // custom outrun theme (night + sunset day)
    import { dev } from '$app/environment';
    import { injectAnalytics } from '@vercel/analytics/sveltekit';
    // AAA-Raymond: the player card (opens from any element with data-player-id)
    import PlayerCard from "$lib/AAA-Raymond/components/PlayerCard/index.svelte";
    // AAA-Raymond: the secret playoff-odds switch (?odds=on / ?odds=off)
    import OddsSwitch from "$lib/AAA-Raymond/components/Insights/OddsSwitch.svelte";
    // AAA-Raymond: the "you're viewing another league" line (Settings page switch). For a visitor on their own league
    // the server's page is the deployed league's, so the browser builds the whole page itself instead of reusing it
    // (reused raw HTML like the header logo would keep the deployed league), then shows it (app.html hid it)
    import LeagueBanner from "$lib/AAA-Raymond/components/RaySettings/LeagueBanner.svelte";
    import { leagueOverridden } from "$lib/utils/leagueInfo";
    import { onMount } from "svelte";
    let ready = !leagueOverridden;
    onMount(() => {
        ready = true;
        document.documentElement.classList.remove("rr-otherLeague");
    });
 
    injectAnalytics({ mode: dev ? 'development' : 'production' });
</script>

{#if ready}
<main>
    <Nav /> <!-- adds the nav (small and large) -->
    <LeagueBanner /> <!-- AAA-Raymond -->
  
    <slot />

    <Footer /> <!-- adds the footer -->

    <PlayerCard /> <!-- AAA-Raymond -->
    <OddsSwitch /> <!-- AAA-Raymond -->
</main>
{/if}