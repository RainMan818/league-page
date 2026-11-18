<!--
  Settings page (src/routes/settings, under Clubhouse / More; Nov 17). Switch the site to your own Sleeper league
  (experimental): type a league ID or paste a Sleeper league link, look it up (one Sleeper request), then switch. The
  ID is saved in this browser (utils/leagueOverride.js) and the site reloads on that league; Reset goes back to the
  deployed league (leagueInfo.js deployedLeagueID).
-->
<script>
  import { page } from "$app/state";
  import { leagueID, deployedLeagueID, deployedLeagueName, leagueOverridden } from "$lib/utils/leagueInfo";
  import { parseLeagueID, saveLeagueOverride, clearLeagueOverride, leagueSummary } from "../../utils/leagueOverride.js";

  const siteName = $derived(page.data.site?.name ?? "this league");

  let input = $state("");
  let status = $state("idle"); // idle | looking | found | error
  let message = $state("");
  let found = $state(null);

  async function lookUp(e) {
    e.preventDefault();
    found = null;
    const id = parseLeagueID(input);
    if (!id) {
      status = "error";
      message = "That doesn't look like a Sleeper league ID (a long number like 1314319869289717760) or a Sleeper league link.";
      return;
    }
    if (id === leagueID) {
      status = "error";
      message = `That's the league you're viewing (${siteName}).`;
      return;
    }
    if (id === deployedLeagueID) {
      status = "found";
      found = { id, name: deployedLeagueName, deployed: true };
      return;
    }
    status = "looking";
    try {
      const res = await fetch(`https://api.sleeper.app/v1/league/${id}`);
      const league = leagueSummary(res.ok ? await res.json() : null);
      if (!league) {
        status = "error";
        message = "Sleeper doesn't have a league with that ID. Check the number, or copy the link from the league in the Sleeper app.";
      } else if (league.sport && league.sport !== "nfl") {
        status = "error";
        message = `That's a ${league.sport.toUpperCase()} league; this site only works with NFL leagues.`;
      } else {
        found = league;
        status = "found";
      }
    } catch {
      status = "error";
      message = "Couldn't reach Sleeper. Check your connection and try again.";
    }
  }

  function switchTo(league) {
    if (league.deployed) return reset();
    if (!saveLeagueOverride(localStorage, league.id)) {
      status = "error";
      message = "Your browser didn't let the site save the league (private browsing?), so it can't switch.";
      return;
    }
    // the league is read when the site starts, so load it fresh
    window.location.assign("/");
  }

  function reset() {
    clearLeagueOverride(localStorage);
    window.location.assign("/");
  }
</script>

<div class="rr-settings">
  <h1 class="rr-pageTitle">Settings</h1>

  <section class="rr-card">
    <h2>League</h2>
    <div class="rr-current">
      <span class="material-icons" aria-hidden="true">{leagueOverridden ? "swap_calls" : "sports_football"}</span>
      <div>
        <div>Showing <b>{siteName}</b></div>
        <div class="rr-muted">
          {leagueOverridden ? "Your league, saved in this browser" : "The site's league"} · ID {leagueID}
        </div>
      </div>
    </div>

    <div class="rr-warning" role="note">
      <span class="material-icons" aria-hidden="true">science</span>
      <p>
        <b>Experimental.</b> You can point this site at your own Sleeper league. It's built for {deployedLeagueName},
        so not every feature will work properly for other leagues. Your choice is saved in this browser only (nobody
        else sees it), and you can reset any time.
      </p>
    </div>

    <form class="rr-form" onsubmit={lookUp}>
      <label for="rr-leagueInput">Sleeper league ID or league link</label>
      <div class="rr-row">
        <input
          id="rr-leagueInput"
          type="text"
          inputmode="text"
          autocomplete="off"
          spellcheck="false"
          placeholder="League ID or link"
          bind:value={input}
        />
        <button type="submit" class="rr-btn" disabled={status === "looking" || !input.trim()}>
          {status === "looking" ? "Looking…" : "Look up"}
        </button>
      </div>
    </form>

    {#if status === "error"}
      <p class="rr-error" role="alert">{message}</p>
    {/if}

    {#if status === "found" && found}
      <div class="rr-found">
        {#if found.avatar}<img src={found.avatar} alt="" />{:else}<span class="material-icons rr-avatar" aria-hidden="true">sports_football</span>{/if}
        <div class="rr-foundText">
          <b>{found.name}</b>
          <span class="rr-muted">
            {found.deployed ? "The site's league" : [found.season, found.teams ? `${found.teams} teams` : null].filter(Boolean).join(" · ")}
          </span>
        </div>
        <button type="button" class="rr-btn rr-primary" onclick={() => switchTo(found)}>
          {found.deployed ? "Go back to it" : "Switch to this league"}
        </button>
      </div>
    {/if}

    {#if leagueOverridden}
      <div class="rr-reset">
        <span class="rr-muted">Done trying your league?</span>
        <button type="button" class="rr-btn" onclick={reset}>Reset to {deployedLeagueName}</button>
      </div>
    {/if}
  </section>
</div>

<style>
  .rr-settings {
    position: relative;
    z-index: 1;
    max-width: 640px;
    margin: 0 auto 6em;
    padding: 0 12px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  h1.rr-pageTitle {
    margin: 1.33em 0 0;
    text-align: center;
    font-size: 2.125rem;
    font-weight: 500;
    line-height: 1.2;
    color: var(--or-heading, var(--g111));
  }

  .rr-card {
    border-radius: 16px;
    border: 1px solid var(--or-table-border, var(--ccc));
    background: var(--fff);
    padding: 16px 18px 18px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  h2 {
    margin: 0;
    font: 700 0.9rem "Orbitron", sans-serif;
    color: var(--or-heading, var(--g111));
  }

  .rr-muted {
    color: var(--or-muted, var(--g999));
    font-size: 0.82rem;
  }

  .rr-current {
    display: flex;
    align-items: center;
    gap: 12px;
    color: var(--or-text);
  }

  .rr-current b {
    color: var(--or-heading);
  }

  .rr-current .material-icons {
    font-size: 28px;
    color: var(--or-cyan);
  }

  .rr-warning {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    padding: 12px 14px;
    border-radius: 12px;
    border: 1px solid var(--or-orange);
    background: color-mix(in srgb, var(--or-orange) 10%, transparent);
    color: var(--or-text);
    font-size: 0.86rem;
    line-height: 1.45;
  }

  .rr-warning p {
    margin: 0;
  }

  .rr-warning b {
    color: var(--or-orange);
  }

  .rr-warning .material-icons {
    color: var(--or-orange);
    font-size: 22px;
  }

  .rr-form {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  label {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--or-text);
  }

  .rr-row {
    display: flex;
    gap: 8px;
  }

  input {
    flex: 1;
    min-width: 0;
    height: 40px;
    padding: 0 12px;
    border-radius: 10px;
    border: 1px solid var(--or-toggle-border);
    background: var(--or-toggle-bg);
    color: var(--or-text);
    font: 500 0.95rem "Roboto", sans-serif;
  }

  input:focus {
    outline: 2px solid var(--or-cyan);
    outline-offset: 1px;
  }

  .rr-hint {
    margin: 2px 0 0;
  }

  .rr-btn {
    flex: none;
    height: 40px;
    padding: 0 16px;
    border-radius: 10px;
    border: 1px solid var(--or-toggle-border);
    background: var(--or-toggle-bg);
    color: var(--or-text);
    font: 600 0.78rem "Roboto", sans-serif;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    cursor: pointer;
  }

  .rr-btn:disabled {
    opacity: 0.5;
    cursor: default;
  }

  .rr-btn.rr-primary {
    border-color: var(--or-pink);
    background: var(--or-pink);
    color: #fff;
    box-shadow: 0 0 10px var(--or-glow-pink);
  }

  .rr-error {
    margin: 0;
    padding: 10px 12px;
    border-radius: 10px;
    border: 1px solid var(--or-pink);
    color: var(--or-text);
    font-size: 0.86rem;
  }

  .rr-found {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
    padding: 12px;
    border-radius: 12px;
    border: 1px solid var(--or-cyan);
  }

  .rr-found img,
  .rr-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    flex: none;
  }

  .rr-avatar {
    display: grid;
    place-items: center;
    color: var(--or-cyan);
    background: var(--or-toggle-bg);
  }

  .rr-foundText {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
    min-width: 140px;
    color: var(--or-heading);
  }

  .rr-reset {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 10px;
    padding-top: 12px;
    border-top: 1px solid var(--or-table-border);
  }
</style>
