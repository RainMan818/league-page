<!--
  About page (src/routes/about, last in Clubhouse / More; Nov 17, canvas option C "list"): one row per page, tap to
  open what it shows and an Open button. Main pages and Clubhouse sit side by side from 760px. The
  text lives in content.js and the list follows tabs.js; lines that only fit some leagues (Payouts, the median badge,
  draft picks) follow houseRules, the league's median game (from the league request the site already makes) and
  data.site.dynasty.
-->
<script>
  import { onMount } from "svelte";
  import { page } from "$app/state";
  import { tabs } from "$lib/utils/tabs";
  import { houseRules } from "$lib/utils/leagueInfo";
  import { getLeagueData } from "$lib/utils/helperFunctions/leagueData";
  import { aboutPages, PLAYER_TIP } from "./content.js";

  let median = $state(false);
  onMount(() => {
    getLeagueData()
      .then((d) => (median = d?.settings?.league_average_match == 1))
      .catch(() => {});
  });

  const groups = $derived.by(() => {
    const { main, club } = aboutPages(tabs, { houseRules, median, dynasty: !!page.data.site?.dynasty });
    return [
      { key: "main", label: "Main pages", pages: main },
      { key: "club", label: "Clubhouse", pages: club },
    ];
  });

  let open = $state({});
  const toggle = (dest) => (open = { ...open, [dest]: !open[dest] });
  const idFor = (dest) => "rr-about-" + (dest.replace(/\W+/g, "") || "home");
</script>

<div class="rr-about">
  <h1 class="rr-pageTitle">About</h1>
  <p class="rr-intro">
    What every page on this site shows. It reads {page.data.site?.name ?? "the league"}'s live Sleeper data, so there's
    nothing to sign in to.
  </p>
  <p class="rr-tip">
    <span class="material-icons" aria-hidden="true">touch_app</span>
    <span>{PLAYER_TIP}</span>
  </p>

  <div class="rr-groups">
    {#each groups as g (g.key)}
      <section class="rr-group" aria-labelledby="rr-about-{g.key}">
        <h2 id="rr-about-{g.key}">{g.label}</h2>
        <ul class="rr-list">
          {#each g.pages as p (p.dest)}
            {@const isOpen = !!open[p.dest]}
            <li class:open={isOpen}>
              <button type="button" class="rr-row" aria-expanded={isOpen} aria-controls={idFor(p.dest)} onclick={() => toggle(p.dest)}>
                <span class="material-icons rr-icon" aria-hidden="true">{p.icon}</span>
                <span class="rr-text">
                  <span class="rr-name">{p.label}</span>
                  <span class="rr-what">{p.what}</span>
                </span>
                <span class="material-icons rr-chev" aria-hidden="true">chevron_right</span>
              </button>
              {#if isOpen}
                <div class="rr-body" id={idFor(p.dest)}>
                  <ul class="rr-how">
                    {#each p.how as line}<li>{line}</li>{/each}
                  </ul>
                  <a class="rr-open" href={p.dest} data-sveltekit-preload-data="hover">Open {p.label}</a>
                </div>
              {/if}
            </li>
          {/each}
        </ul>
      </section>
    {/each}
  </div>
</div>

<style>
  .rr-about {
    position: relative;
    z-index: 1;
    max-width: 1060px;
    margin: 0 auto 6em;
    padding: 0 12px;
    box-sizing: border-box;
  }

  h1.rr-pageTitle {
    margin: 1.33em 0 0.4em;
    text-align: center;
    font-size: 2.125rem;
    font-weight: 500;
    line-height: 1.2;
    color: var(--or-heading, var(--g111));
  }

  .rr-intro {
    margin: 0 auto 14px;
    max-width: 640px;
    text-align: center;
    color: var(--or-text);
    font-size: 0.95rem;
    line-height: 1.5;
  }

  .rr-tip {
    display: flex;
    align-items: center;
    gap: 10px;
    width: fit-content;
    max-width: 100%;
    box-sizing: border-box;
    margin: 0 auto 22px;
    padding: 9px 14px;
    border-radius: 12px;
    border: 1px solid var(--or-toggle-border);
    background: var(--or-toggle-bg);
    color: var(--or-text);
    font-size: 0.86rem;
    line-height: 1.4;
  }

  .rr-tip .material-icons {
    flex: none;
    font-size: 20px;
    color: var(--or-cyan);
  }

  .rr-groups {
    display: grid;
    gap: 18px;
    align-items: start;
  }

  @media (min-width: 760px) {
    .rr-groups {
      grid-template-columns: 1fr 1fr;
    }
  }

  /* beats the theme's html:root :is(h1, ..., h6) heading look */
  .rr-group h2 {
    margin: 0 0 8px 2px;
    font: 700 0.7rem "Roboto", sans-serif;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--or-cyan);
    text-shadow: none;
  }

  .rr-list {
    list-style: none;
    margin: 0;
    padding: 0;
    border-radius: 14px;
    border: 1px solid var(--or-table-border, var(--ccc));
    background: var(--fff);
    overflow: hidden;
  }

  .rr-list > li + li {
    border-top: 1px solid var(--or-table-border, var(--ccc));
  }

  .rr-list > li.open {
    background: color-mix(in srgb, var(--or-pink) 7%, transparent);
  }

  .rr-row {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 11px 12px;
    border: 0;
    background: none;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }

  .rr-row:focus-visible {
    outline: 2px solid var(--or-cyan);
    outline-offset: -2px;
  }

  .rr-icon {
    flex: none;
    font-size: 22px;
    color: var(--or-cyan);
  }

  li.open .rr-icon {
    color: var(--or-pink);
  }

  .rr-text {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
    line-height: 1.25;
  }

  .rr-name {
    font-weight: 600;
    font-size: 0.95rem;
    color: var(--or-heading);
  }

  .rr-what {
    font-size: 0.8rem;
    color: var(--or-muted, var(--g999));
  }

  .rr-chev {
    flex: none;
    font-size: 22px;
    color: var(--or-muted, var(--g999));
    transition: transform 0.15s;
  }

  li.open .rr-chev {
    transform: rotate(90deg);
  }

  @media (prefers-reduced-motion: reduce) {
    .rr-chev {
      transition: none;
    }
  }

  .rr-body {
    padding: 0 14px 14px 46px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .rr-how {
    margin: 0;
    padding-left: 18px;
    color: var(--or-text);
    font-size: 0.86rem;
    line-height: 1.45;
  }

  .rr-how li + li {
    margin-top: 4px;
  }

  .rr-open {
    padding: 8px 14px;
    border-radius: 10px;
    background: var(--or-pink);
    color: #fff;
    font: 600 0.74rem "Roboto", sans-serif;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    text-decoration: none;
    box-shadow: 0 0 10px var(--or-glow-pink);
  }
</style>
