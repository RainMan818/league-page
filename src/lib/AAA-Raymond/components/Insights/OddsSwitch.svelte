<!--
  The secret playoff-odds switch (no markup). On every page, in the browser: ?odds=on / ?odds=off is remembered in
  localStorage and removed from the address; otherwise the saved choice applies. Logic in utils/oddsSwitch.js.
  Mounted once in src/routes/+layout.svelte.
-->
<script>
  import { page } from "$app/state";
  import { replaceState } from "$app/navigation";
  import { SHOW_PLAYOFF_ODDS } from "./config.js";
  import { playoffOdds } from "./playoffOdds.svelte.js";
  import { ODDS_PARAM, ODDS_KEY, resolveOdds, withoutOddsParam } from "../../utils/oddsSwitch.js";

  const readSaved = () => {
    try {
      return localStorage.getItem(ODDS_KEY);
    } catch {
      return null; // blocked storage (private mode): the parameter still works for this page load
    }
  };

  $effect(() => {
    const param = page.url.searchParams.get(ODDS_PARAM);
    const { show, save } = resolveOdds({ param, saved: readSaved(), fallback: SHOW_PLAYOFF_ODDS });
    playoffOdds.show = show;
    if (param == null) return;
    if (save) {
      try {
        localStorage.setItem(ODDS_KEY, save);
      } catch {
        // storage blocked: on for this page load only
      }
    }
    const clean = withoutOddsParam(page.url.href);
    try {
      replaceState(clean, page.state);
    } catch {
      history.replaceState(history.state, "", clean);
    }
  });
</script>
