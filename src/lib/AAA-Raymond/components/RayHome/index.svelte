<!--
  All custom homepage content, used in src/routes/+page.svelte (standingsData comes from src/routes/+page.js).
  One section at a time, picked with a switch under the league title (on phones: a pill toggle in the same style as
  the Matchups / Trades & Waivers buttons, Shared/Toggle.svelte's look; it replaced a fixed bottom bar on Nov 17):
   - Recap: weekly recap (ending with standings movers for that week) and season awards
   - Power Rankings: rest-of-season Power Rankings
   - Standings: playoff projection and Team Breakdown
   - Payouts: in-season prizes paid so far, the top score each week and the season-long races (RayPayouts)
  The last pick is remembered in this browser; /?view=recap|rankings|standings|payouts opens a section directly.
  A section is only built the first time it's opened, then kept (so switching back is instant).
  Roster Analysis lives at the top of the /rosters page.

  When things show (seasonPhase in utils/seasonData.js):
   - regular season: weekly recap only
   - playoffs (regular season fully scored): weekly recap (now with playoff weeks), then regular-season awards
   - championship decided: awards first (post-season + regular season), recap below until NFL week 18 ends
   - after that: awards only
-->
<script>
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import { replaceState } from "$app/navigation";
  import RecapPanel from "../Insights/RecapPanel.svelte";
  import PowerRankings from "../RayPowerRankings/index.svelte";
  import Insights from "../Insights/index.svelte";
  import HomeAwards from "../SeasonAwards/HomeAwards.svelte";
  import Payouts from "../RayPayouts/index.svelte";
  import { loadLeagueBasics } from "../../utils/leagueContext.js";
  import { seasonPhase } from "../../utils/seasonData.js";
  import { houseRules } from "$lib/utils/leagueInfo";

  let { standingsData, leagueTeamManagersData } = $props();

  // until league settings load, show the recap (its own loader shows progress)
  let phase = $state({ regularDone: false, showRecap: true });
  let postReady = $state(false);

  const VIEWS = [
    { id: "recap", label: "Recap", icon: "article" },
    { id: "rankings", label: "Power Rankings", short: "Rankings", icon: "bar_chart" },
    { id: "standings", label: "Standings", icon: "emoji_events" },
    // the Payouts tab is The Dynasty League's prize money (house rules in leagueInfo.js); other leagues don't get it
    ...(houseRules ? [{ id: "payouts", label: "Payouts", icon: "payments" }] : []),
  ];
  const STORAGE_KEY = "rr-home-view";
  const isView = (v) => VIEWS.some((x) => x.id === v);

  let view = $state("recap");
  // sections built so far (each is built on first open, then kept)
  let opened = $state({ recap: true });

  // show a section, building it the first time
  const show = (id) => {
    view = id;
    opened = { ...opened, [id]: true };
  };

  // tab click: show it, remember it in this browser and put it in the URL (/?view=...)
  const choose = (id) => {
    show(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* private mode etc.: the choice just isn't remembered */
    }
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("view", id);
      replaceState(url, {});
    } catch {
      /* not critical */
    }
  };

  // the starting section: ?view= first, then the last one picked in this browser
  const startView = () => {
    const fromUrl = $page.url.searchParams.get("view");
    if (isView(fromUrl)) return fromUrl;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return isView(saved) ? saved : null;
    } catch {
      return null;
    }
  };

  onMount(() => {
    const start = startView();
    if (start && start !== view) show(start);

    // when things show depends on the season phase (league settings + NFL state, already cached)
    loadLeagueBasics({ leagueTeamManagersData })
      .then(({ leagueData, nflState }) => (phase = seasonPhase(leagueData, nflState)))
      .catch((err) => console.error(err));
  });
</script>

{#snippet recap()}
  {#if phase.showRecap}
    <div class="rr-recapCol">
      <RecapPanel {standingsData} {leagueTeamManagersData} />
    </div>
  {/if}
{/snippet}

{#snippet switcher(cls)}
  <div class={cls} role="tablist" aria-label="Homepage section">
    {#each VIEWS as v (v.id)}
      <button type="button" role="tab" aria-selected={view === v.id} aria-controls="rr-panel-{v.id}" class:rr-on={view === v.id} onclick={() => choose(v.id)}>
        <span class="material-icons" aria-hidden="true">{v.icon}</span>
        <span class="rr-tabLabel">{v.label}</span>
      </button>
    {/each}
  </div>
{/snippet}

{@render switcher("rr-homeTabs")}

<!-- phones: the site's segmented-toggle look (Matchups' Regular Season / Playoffs, Trades / Waivers / Both) -->
<div class="rr-homeToggle" role="tablist" aria-label="Homepage section">
  {#each VIEWS as v (v.id)}
    <button type="button" role="tab" aria-selected={view === v.id} aria-controls="rr-panel-{v.id}" class:rr-on={view === v.id} onclick={() => choose(v.id)}>
      {v.short ?? v.label}
    </button>
  {/each}
</div>

<div id="rr-panel-recap" role="tabpanel" aria-label="Recap" class="rr-panel rr-recapRankings" hidden={view !== "recap"}>
  {#if phase.regularDone}
    {#if !postReady}{@render recap()}{/if}
    <div class="rr-awardsCol">
      <HomeAwards {standingsData} {leagueTeamManagersData} bind:postReady />
    </div>
    {#if postReady}{@render recap()}{/if}
  {:else}
    {@render recap()}
  {/if}
</div>

{#if opened.rankings}
  <div id="rr-panel-rankings" role="tabpanel" aria-label="Power Rankings" class="rr-panel rr-recapRankings" hidden={view !== "rankings"}>
    <div class="rr-rankingsCol">
      <PowerRankings {leagueTeamManagersData} />
    </div>
  </div>
{/if}

{#if opened.standings}
  <div id="rr-panel-standings" role="tabpanel" aria-label="Standings" class="rr-panel" hidden={view !== "standings"}>
    <Insights {standingsData} {leagueTeamManagersData} />
  </div>
{/if}

{#if houseRules && opened.payouts}
  <div id="rr-panel-payouts" role="tabpanel" aria-label="Payouts" class="rr-panel" hidden={view !== "payouts"}>
    <Payouts {standingsData} {leagueTeamManagersData} />
  </div>
{/if}


<style>
  /* ---- section switch: tabs under the title; a fixed bottom bar on phones ---- */
  .rr-homeTabs {
    display: flex;
    gap: 4px;
    max-width: 760px;
    margin: 0 auto 28px;
    padding: 4px;
    border: 1px solid var(--or-toggle-border, var(--or-table-border));
    border-radius: 12px;
    background: var(--or-toggle-bg, var(--fff));
  }

  .rr-homeTabs button {
    flex: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 44px;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: var(--or-toggle-text, var(--or-muted));
    font: 700 0.78rem "Orbitron", sans-serif;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    cursor: pointer;
  }

  .rr-homeTabs button .material-icons {
    font-size: 18px;
  }

  .rr-homeTabs button:hover:not(.rr-on) {
    color: var(--or-text);
  }

  .rr-homeTabs button.rr-on {
    color: #fff;
    background: var(--or-pink);
    box-shadow: 0 0 14px var(--or-glow-pink, transparent);
  }

  /* phones: same look as Shared/Toggle.svelte and the Matchups / Trades & Waivers buttons (theme/outrun.css) */
  .rr-homeToggle {
    display: none;
  }

  @media (max-width: 760px) {
    .rr-homeTabs {
      display: none;
    }

    .rr-homeToggle {
      display: flex;
      gap: 3px;
      width: fit-content;
      max-width: calc(100% - 24px);
      margin: 16px auto 24px;
      padding: 3px;
      box-sizing: border-box;
      border: 1px solid var(--or-toggle-border, var(--ccc));
      border-radius: 8px;
      background: var(--or-toggle-bg, var(--fff));
    }

    .rr-homeToggle button {
      flex: 0 1 auto;
      min-height: 34px;
      padding: 0 13px;
      border: 0;
      border-radius: 6px;
      background: transparent;
      color: var(--or-toggle-text, var(--g555));
      font: 600 0.75em "Roboto", sans-serif;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      white-space: nowrap;
      cursor: pointer;
    }

    .rr-homeToggle button.rr-on {
      background: var(--or-pink, var(--blueOne));
      color: #fff;
      box-shadow: 0 0 10px var(--or-glow-pink, transparent);
    }
  }

  /* narrow phones: four buttons still fit on one line */
  @media (max-width: 380px) {
    .rr-homeToggle button {
      padding: 0 9px;
      letter-spacing: 0.05em;
    }
  }

  .rr-panel[hidden] {
    display: none;
  }

  /* recap / awards, or Power Rankings */
  .rr-recapRankings {
    display: flex;
    flex-direction: column;
    gap: 48px;
    max-width: 1100px;
    margin: 0 auto;
    /* bottom space so the sidebar (stacked below on phones) doesn't butt up against the section;
       the Standings section gets the same from Insights' own bottom padding */
    padding: 0 16px 4em;
    box-sizing: border-box;
  }

  .rr-recapCol,
  .rr-awardsCol,
  .rr-rankingsCol {
    min-width: 0;
  }

  .rr-recapCol:empty,
  .rr-rankingsCol:empty {
    display: none;
  }
</style>
