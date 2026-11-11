<!--
  "<team>'s picks" panel for the Drafts page (option C): every pick the selected team owns in the upcoming draft
  and made in each previous draft, from the boards registered in draftHighlight.svelte.js. Clicking a row scrolls
  to that pick on its board. Opened by DraftsLayout.
-->
<script>
  import { draftHighlight, clearTeam, jumpToPick } from "./draftHighlight.svelte.js";
  import PosChip from "../Shared/PosChip.svelte";

  const team = $derived(draftHighlight.team);
  const owner = $derived.by(() => {
    const n = team?.name ?? "Team";
    return n.endsWith("s") ? `${n}'` : `${n}'s`;
  });

  // upcoming board first, then previous drafts newest first
  const sections = $derived(
    Object.entries(draftHighlight.boards)
      .map(([boardKey, b]) => ({
        boardKey,
        year: b.year,
        upcoming: b.upcoming,
        picks: b.picks.filter((p) => p.rosterID === draftHighlight.rosterID),
      }))
      .sort((a, b) => Number(b.upcoming) - Number(a.upcoming) || b.year - a.year)
  );
  const made = $derived(sections.filter((s) => !s.upcoming).reduce((n, s) => n + s.picks.filter((p) => !p.empty).length, 0));
  const owned = $derived(sections.filter((s) => s.upcoming).reduce((n, s) => n + s.picks.length, 0));
</script>

<aside class="rr-picksPanel" aria-label="{owner} draft picks">
  <header class="rr-head">
    {#if team?.avatar}<img src={team.avatar} alt="" />{/if}
    <div class="rr-headText">
      <b class="rr-title">{owner} picks</b>
      <span class="rr-sub">{made} drafted{owned ? ` · ${owned} upcoming` : ""}</span>
    </div>
    <button type="button" class="rr-clear" onclick={clearTeam} aria-label="Clear highlight">✕</button>
  </header>

  <div class="rr-body">
    {#each sections as s (s.boardKey)}
      <section class="rr-section">
        <div class="rr-secHead">
          <span>{s.year} {s.upcoming ? "Upcoming" : "Draft"}</span>
          <span class="rr-count">{s.picks.length}</span>
        </div>
        {#each s.picks as p (p.pick)}
          <button type="button" class="rr-row" onclick={() => jumpToPick(s.boardKey, p.pick)}>
            <span class="rr-pick">{p.pick}</span>
            {#if s.upcoming}
              <span class="rr-what">{p.from ? `from ${p.from}` : "Own pick"}</span>
            {:else if p.empty}
              <span class="rr-what rr-muted">No pick made</span>
            {:else}
              <span class="rr-what">
                <PosChip pos={p.pos} size="0.78em" />
                <span class="rr-name">{p.name}</span>
                {#if p.from}<span class="rr-from">· from {p.from}</span>{/if}
              </span>
            {/if}
          </button>
        {:else}
          <p class="rr-none">{s.upcoming ? "No picks this year" : "No picks"}</p>
        {/each}
      </section>
    {/each}
  </div>
</aside>

<style>
  .rr-picksPanel {
    position: sticky;
    top: 12px;
    align-self: start;
    display: flex;
    flex-direction: column;
    max-height: calc(100vh - 24px);
    margin-top: 1.5em;
    border: 1px solid var(--or-pink, #ff2a6d);
    border-radius: 12px;
    background: var(--fff);
    box-shadow: 0 0 18px color-mix(in srgb, var(--or-pink, #ff2a6d) 25%, transparent), 0 8px 24px var(--or-table-shadow, transparent);
    text-align: left;
    overflow: hidden;
  }

  .rr-head {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 12px 10px 14px;
    border-bottom: 1px solid var(--or-table-border, var(--ddd));
  }

  .rr-head img {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    border: 2px solid var(--or-pink, #ff2a6d);
    object-fit: cover;
  }

  .rr-headText {
    display: flex;
    flex-direction: column;
    min-width: 0;
    flex: 1;
  }

  .rr-title {
    font: 700 0.95em "Roboto", sans-serif;
    line-height: 1.25;
    color: var(--or-heading, var(--g111));
    overflow-wrap: anywhere;
  }

  .rr-sub {
    font-size: 0.74em;
    color: var(--or-muted, var(--g999));
  }

  .rr-clear {
    width: 30px;
    height: 30px;
    flex: none;
    border: 1px solid var(--or-table-border, var(--ddd));
    border-radius: 8px;
    background: transparent;
    color: var(--or-text, var(--g333));
    font-size: 14px;
    cursor: pointer;
  }

  .rr-clear:hover {
    border-color: var(--or-pink, #ff2a6d);
    color: var(--or-pink, #ff2a6d);
  }

  .rr-body {
    overflow-y: auto;
    padding: 4px 8px 12px;
  }

  .rr-section {
    margin-top: 10px;
  }

  .rr-secHead {
    display: flex;
    justify-content: space-between;
    padding: 0 6px 4px;
    font: 700 0.66em "Roboto", sans-serif;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--or-cyan, #0b8a9a);
  }

  .rr-count {
    color: var(--or-muted, var(--g999));
  }

  .rr-row {
    display: grid;
    grid-template-columns: 42px minmax(0, 1fr);
    align-items: center;
    gap: 6px;
    width: 100%;
    padding: 6px;
    border: 0;
    border-radius: 7px;
    background: transparent;
    color: var(--or-text, var(--g333));
    font: inherit;
    text-align: left;
    cursor: pointer;
  }

  .rr-row:hover,
  .rr-row:focus-visible {
    background: color-mix(in srgb, var(--or-pink, #ff2a6d) 10%, transparent);
  }

  .rr-pick {
    font: 700 0.7em "Orbitron", sans-serif;
    color: var(--or-muted, var(--g999));
  }

  .rr-what {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 2px 6px;
    min-width: 0;
    font-size: 0.82em;
  }

  .rr-name {
    font-weight: 700;
    color: var(--or-heading, var(--g111));
  }

  .rr-from {
    font-size: 0.86em;
    color: var(--or-cyan, #0b8a9a);
  }

  .rr-muted,
  .rr-none {
    color: var(--or-muted, var(--g999));
  }

  .rr-none {
    margin: 2px 6px;
    font-size: 0.78em;
  }

  /* bottom sheet below 1100px (SHEET_QUERY in draftHighlight.svelte.js) */
  @media (max-width: 1099.98px) {
    .rr-picksPanel {
      position: fixed;
      left: 8px;
      right: 8px;
      top: auto;
      bottom: 8px;
      z-index: 50;
      max-height: 45vh;
      margin: 0;
      border-radius: 14px;
    }
  }
</style>
