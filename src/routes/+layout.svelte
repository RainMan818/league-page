<!-- __layout.svelte -->
<script>
	import { Nav, Footer } from "$lib/components"
	import "$lib/AAA-Raymond/theme/outrun.css"; // custom outrun theme (night + sunset day)
    import { dev } from '$app/environment';
    import { injectAnalytics } from '@vercel/analytics/sveltekit';
 
    injectAnalytics({ mode: dev ? 'development' : 'production' });
</script>

<main>
    <Nav /> <!-- adds the nav (small and large) -->
  
    <slot />

    <Footer /> <!-- adds the footer -->
</main>