<script>
	import NavSmall from './NavSmall.svelte';
	import NavLarge from './NavLarge.svelte';
    import { page } from '$app/state';
	import IconButton from '@smui/icon-button';
	import { Icon } from '@smui/common';
	import OutrunLogo from '$lib/AAA-Raymond/components/OutrunLogo/index.svelte';
	import { leagueName } from '$lib/utils/leagueInfo';

	// toggle between outrun night (default) and sunset day; the choice is saved in localStorage
	// and applied before first paint by the inline script in src/app.html
	const savedTheme = () => { try { return localStorage.getItem('theme'); } catch (e) { return null; } };
	let darkTheme = $state(typeof window === "undefined" || savedTheme() !== 'day');
	function switchTheme(currentTheme) {
		currentTheme = !currentTheme; // true = sunset day, false = night
		let themeLink = document.head.querySelector("#theme");
		if (!themeLink) {
			themeLink = document.createElement("link");
			themeLink.rel = "stylesheet";
			themeLink.id = "theme";
		}
		themeLink.href = `/smui${currentTheme ? "" : "-dark"}.css`;
		document.head
		.querySelector('link[href="/smui-dark.css"]')
		.insertAdjacentElement("afterend", themeLink);
		document.documentElement.dataset.theme = currentTheme ? 'day' : 'night';
		try { localStorage.setItem('theme', currentTheme ? 'day' : 'night'); } catch (e) {}
	}
</script>

<svelte:head>
	<title>{!page.url.pathname[1] ? 'Home' : page.url.pathname[1].toUpperCase() + page.url.pathname.slice(2)} | {leagueName}</title>
</svelte:head>

<style>
	a {
		display: table;
    	margin: 0 auto;
	}
	nav {
		background-color: var(--fff);
		position: relative;
		z-index: 2;
		border-bottom: 1px solid #00316b;
		box-shadow: 0 0 8px 0 #00316b;
	}

    .large {
		display: block;
    }

	.small {
		display: none;
	}

	.container {
		position: absolute;
		top: 0.25em;
		right: 0.25em;
	}

	:global(.lightDark) {
		color: var(--g555)
	}

	@media (max-width: 950px) { /* width of the large navBar */
		.large {
			display: none;
		}

		.small {
			display: block;
		}
	}
</style>

<nav>
	<a href="/" aria-label="{leagueName} home"><OutrunLogo /></a>

	<div class="container">
		<IconButton
			toggle
			bind:pressed={darkTheme}
			onclick={() => switchTheme(darkTheme)}
			class="lightDark"
		>
			<Icon class="material-icons" on>dark_mode</Icon>
			<Icon class="material-icons">light_mode</Icon>
		</IconButton>
	</div>

	<div class="large">
		<NavLarge />
	</div>

	<div class="small">
		<NavSmall />
	</div>

</nav>
