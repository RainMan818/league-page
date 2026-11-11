<!--
  Draft board (Drafts option A): dark cells, top edge in the player's position color.
  Replaces the template's Draft.svelte in src/lib/Drafts/index.svelte (one import line); same draftData input
  ({ draftOrder, draft, accuracy, reversalRound, draftType }).
  Upcoming draft: pick number + a cyan "→ owner" tag on picks that changed hands.
  Previous drafts: pick number, position tag, player, NFL team, and "by <team>" when the pick was traded.
  Click a team's name (or a "by <team>" tag) to spotlight every pick that team made / owns on every board on the
  page (shared state in draftHighlight.svelte.js; DraftPicksPanel lists them). The small ↗ opens the manager page.
-->
<script>
  import { gotoManager } from "$lib/utils/helper";
  import { getAvatarFromTeamManagers, getTeamNameFromTeamManagers } from "$lib/utils/helperFunctions/universalFunctions";
  import { posColor } from "../../utils/positions.js";
  import PosChip from "../Shared/PosChip.svelte";
  import { draftHighlight, toggleTeam, registerBoard, unregisterBoard, SHEET_QUERY } from "./draftHighlight.svelte.js";

  let { draftData, leagueTeamManagers, previous = false, year, players } = $props();

  // roster IDs arrive as strings on some boards and numbers on others; use numbers throughout
  const draftOrder = $derived((draftData.draftOrder ?? []).filter(Boolean).map(Number));
  const rounds = $derived(draftData.draft ?? []);
  const reversalRound = $derived(draftData.reversalRound);
  const draftType = $derived(draftData.draftType);
  const accuracy = $derived(draftData.accuracy);

  const teamName = (rosterID, forYear) => getTeamNameFromTeamManagers(leagueTeamManagers, rosterID, forYear);

  // same pick numbering as the template's DraftRow.svelte
  const pickLabel = (row, col, rowLen, cell) => {
    if (draftType === "auction" && previous) return `$${cell?.amount ?? 0}`;
    if (draftType === "snake" && !reversalRound) return `${row}.${row % 2 === 0 ? rowLen - col : col + 1}`;
    if (draftType === "snake" && reversalRound) {
      const reversed = (row < reversalRound && row % 2 === 0) || (row >= reversalRound && row % 2 === 1);
      return `${row}.${reversed ? rowLen - col : col + 1}`;
    }
    return !reversalRound || row < reversalRound ? `${row}.${col + 1}` : `${row}.${rowLen - col}`;
  };

  const cellInfo = (cell, row, col, rowLen) => {
    const pick = pickLabel(row, col, rowLen, cell);
    const original = draftOrder[col];
    if (!previous) {
      // upcoming: a non-empty cell is the roster that now owns the pick
      return { pick, owner: cell ? teamName(cell) : null, drafter: cell ? Number(cell) : original, original, traded: !!cell };
    }
    if (!cell) return { pick, empty: true, drafter: original, original };
    const p = players?.[cell.player];
    const isDef = p?.pos === "DEF";
    return {
      pick,
      name: p ? `${p.fn ?? ""} ${p.ln ?? ""}`.trim() : String(cell.player),
      pos: p?.pos ?? "",
      color: posColor(p?.pos),
      nfl: isDef ? "" : (p?.t ?? ""),
      by: cell.newOwner ? teamName(cell.newOwner, year) : null,
      drafter: cell.newOwner ? Number(cell.newOwner) : original,
      original,
      traded: !!cell.newOwner,
    };
  };

  const board = $derived(rounds.map((r, i) => r.map((cell, col) => cellInfo(cell, i + 1, col, r.length))));

  // spotlight: the selected team's picks stand out, everything else dims
  const boardKey = $derived(`${previous ? "prev" : "next"}-${year}`);
  const sel = $derived(draftHighlight.rosterID);
  const flash = $derived(draftHighlight.flash?.boardKey === boardKey ? draftHighlight.flash.pick : null);
  const select = (rosterID) => toggleTeam(rosterID, { name: teamName(rosterID), avatar: getAvatarFromTeamManagers(leagueTeamManagers, rosterID) });

  // share this board's picks with DraftPicksPanel (pick order, i.e. round by round)
  $effect(() => {
    const k = boardKey;
    registerBoard(k, {
      year,
      upcoming: !previous,
      picks: board.flat().map((c) => ({
        rosterID: c.drafter,
        pick: c.pick,
        name: c.name ?? null,
        pos: c.pos ?? "",
        empty: !!c.empty,
        from: c.traded ? teamName(c.original, previous ? year : undefined) : null,
      })),
    });
    return () => unregisterBoard(k);
  });

  // the picks panel jumped to one of this board's picks: bring it into view (near the top when the bottom sheet
  // covers the lower half of the screen)
  let boardEl = $state(null);
  $effect(() => {
    if (flash == null || !boardEl) return;
    const el = boardEl.querySelector(`[data-pick="${flash}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: window.matchMedia(SHEET_QUERY).matches ? "start" : "center", inline: "center" });
  });
</script>

{#if !previous && accuracy && accuracy !== 1}
  <div class="rr-accuracy">
    <span>Draft order accuracy: {Math.round(accuracy * 100)}% <em>(improves as the regular season goes on)</em></span>
    <span class="rr-accBar"><span style="width: {accuracy * 100}%"></span></span>
  </div>
{/if}

<div class="rr-boardWrap">
  <div class="rr-board" style="--cols: {draftOrder.length}" bind:this={boardEl}>
    {#each draftOrder as rosterID (rosterID)}
      {@const name = teamName(rosterID, year)}
      {@const current = teamName(rosterID)}
      <div class="rr-teamHead" class:rr-sel={sel === rosterID} class:rr-dimHead={sel != null && sel !== rosterID}>
        <button type="button" class="rr-teamPick" aria-pressed={sel === rosterID} title="Highlight {current}'s picks" onclick={() => select(rosterID)}>
          <img src={getAvatarFromTeamManagers(leagueTeamManagers, rosterID, year)} alt="" />
          <span class="rr-teamName">{name}</span>
          {#if name !== current}<span class="rr-curName">({current})</span>{/if}
        </button>
        <button type="button" class="rr-mgr" title="{current}'s manager page" aria-label="{current}'s manager page" onclick={() => gotoManager({ year, leagueTeamManagers, rosterID })}>↗</button>
      </div>
    {/each}

    {#each board as round}
      {#each round as c}
        {@const mine = sel != null && c.drafter === sel}
        {@const dim = sel != null && !mine}
        {@const flashing = flash === c.pick}
        {#if !previous}
          <div class="rr-cell" class:rr-traded={c.owner} class:rr-mine={mine} class:rr-dim={dim} class:rr-flash={flashing} data-pick={c.pick}>
            <span class="rr-pick">{c.pick}</span>
            {#if c.owner}<span class="rr-owner">→ {c.owner}</span>{/if}
          </div>
        {:else if c.empty}
          <div class="rr-cell rr-past" class:rr-mine={mine} class:rr-dim={dim} class:rr-flash={flashing} data-pick={c.pick}><span class="rr-pick">{c.pick}</span></div>
        {:else}
          <div class="rr-cell rr-past" class:rr-mine={mine} class:rr-dim={dim} class:rr-flash={flashing} style="--pos: {c.color}" data-pick={c.pick}>
            <span class="rr-cellTop">
              <span class="rr-pick">{c.pick}</span>
              <PosChip pos={c.pos} />
            </span>
            <span class="rr-player">{c.name}</span>
            {#if c.nfl}<span class="rr-nfl">{c.nfl}</span>{/if}
            {#if c.by}<button type="button" class="rr-by" title="Highlight {teamName(c.drafter)}'s picks" onclick={() => select(c.drafter)}>by {c.by}</button>{/if}
          </div>
        {/if}
      {/each}
    {/each}
  </div>
</div>

<style>
  .rr-accuracy {
    display: flex;
    flex-direction: column;
    gap: 6px;
    width: 80%;
    max-width: 800px;
    margin: 1em auto 1.5em;
    font-size: 0.8em;
    color: var(--or-muted, var(--g999));
  }

  .rr-accBar {
    height: 4px;
    border-radius: 4px;
    background: var(--or-table-border, var(--ddd));
    overflow: hidden;
  }

  .rr-accBar span {
    display: block;
    height: 100%;
    background: var(--or-pink, var(--blueOne));
  }

  .rr-boardWrap {
    width: 95%;
    margin: 1.5em auto 3em;
    overflow-x: auto;
  }

  .rr-board {
    display: grid;
    grid-template-columns: repeat(var(--cols), minmax(0, 1fr));
    gap: 6px;
    min-width: 1150px;
    padding: 8px;
    box-sizing: border-box;
    border: 1px solid var(--or-table-border, var(--ccc));
    border-radius: 12px;
    background: var(--f8f8f8);
    box-shadow: 0 6px 24px var(--or-table-shadow, transparent);
  }

  .rr-teamHead {
    position: relative;
    display: flex;
    border-radius: 8px;
    transition: opacity 0.15s, background 0.15s;
  }

  .rr-teamPick {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 5px;
    padding: 6px 2px 8px;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: var(--or-cyan, var(--blueOne));
    font: 700 0.75em "Roboto", sans-serif;
    text-align: center;
    line-height: 1.2;
    cursor: pointer;
  }

  .rr-mgr {
    position: absolute;
    top: 2px;
    right: 2px;
    width: 20px;
    height: 20px;
    padding: 0;
    border: 0;
    border-radius: 5px;
    background: transparent;
    color: var(--or-muted, var(--g999));
    font-size: 12px;
    line-height: 20px;
    cursor: pointer;
    opacity: 0.55;
  }

  .rr-mgr:hover,
  .rr-mgr:focus-visible {
    opacity: 1;
    color: var(--or-pink, var(--blueOne));
    background: color-mix(in srgb, var(--or-pink, #ff2a6d) 12%, transparent);
  }

  .rr-teamHead.rr-sel {
    background: var(--or-pink, #ff2a6d);
    box-shadow: 0 0 14px color-mix(in srgb, var(--or-pink, #ff2a6d) 55%, transparent);
  }

  .rr-sel .rr-teamPick,
  .rr-sel .rr-teamName,
  .rr-sel .rr-curName,
  .rr-sel .rr-mgr {
    color: #fff;
  }

  .rr-sel .rr-teamPick:hover .rr-teamName {
    color: #fff;
  }

  .rr-dimHead {
    opacity: 0.5;
  }

  .rr-dimHead:hover {
    opacity: 1;
  }

  .rr-teamHead img {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    border: 1px solid var(--or-table-border, var(--ccc));
    object-fit: cover;
  }

  .rr-teamName {
    overflow-wrap: anywhere;
  }

  .rr-teamPick:hover .rr-teamName {
    color: var(--or-pink, var(--blueOne));
  }

  .rr-curName {
    font-weight: 400;
    font-style: italic;
    color: var(--or-muted, var(--g999));
  }

  .rr-cell {
    display: flex;
    flex-direction: column;
    gap: 5px;
    min-height: 62px;
    box-sizing: border-box;
    padding: 7px;
    border-radius: 8px;
    border: 1px solid var(--or-table-border, var(--ddd));
    background: var(--fff);
    min-width: 0;
    transition: opacity 0.15s, box-shadow 0.15s;
    scroll-margin: 90px 16px; /* picks panel "jump to pick" */
  }

  /* team spotlight */
  .rr-cell.rr-dim {
    opacity: 0.22;
  }

  .rr-cell.rr-mine {
    border-color: var(--or-pink, #ff2a6d);
    box-shadow:
      0 0 0 1px var(--or-pink, #ff2a6d),
      0 0 14px color-mix(in srgb, var(--or-pink, #ff2a6d) 45%, transparent);
  }

  .rr-cell.rr-flash {
    animation: rr-flash 1.2s ease-out;
  }

  @keyframes rr-flash {
    0%,
    40% {
      box-shadow:
        0 0 0 3px var(--or-pink, #ff2a6d),
        0 0 24px var(--or-pink, #ff2a6d);
    }
  }

  .rr-pick {
    font: 700 0.7em "Orbitron", sans-serif;
    color: var(--or-muted, var(--g999));
  }

  /* upcoming: pick that changed hands */
  .rr-traded {
    background: var(--draftSwapped, var(--fff));
    border-color: color-mix(in srgb, var(--or-cyan, #0b8a9a) 45%, transparent);
  }

  .rr-owner {
    align-self: flex-start;
    padding: 3px 7px;
    border-radius: 8px;
    border: 1px solid color-mix(in srgb, var(--or-cyan, #0b8a9a) 60%, transparent);
    background: color-mix(in srgb, var(--or-cyan, #0b8a9a) 14%, transparent);
    color: var(--or-pick-text, var(--g333));
    font-size: 0.72em;
    font-weight: 600;
    line-height: 1.2;
    overflow-wrap: anywhere;
  }

  /* previous drafts: top edge in the position color */
  .rr-past {
    min-height: 96px;
    gap: 3px;
    border-top: 3px solid var(--pos, var(--or-table-border));
    box-shadow: 0 -4px 12px -6px var(--pos, transparent);
  }

  .rr-cellTop {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 4px;
  }

  .rr-player {
    font-size: 0.82em;
    font-weight: 700;
    line-height: 1.2;
    color: var(--or-heading, var(--g111));
    overflow-wrap: anywhere;
  }

  .rr-nfl {
    font-size: 0.7em;
    color: var(--or-muted, var(--g999));
  }

  .rr-by {
    margin-top: auto;
    padding: 0;
    border: 0;
    background: none;
    font: inherit;
    font-size: 0.66em;
    line-height: 1.2;
    color: var(--or-cyan, #0b8a9a);
    text-align: left;
    overflow-wrap: anywhere;
    cursor: pointer;
  }

  .rr-by:hover {
    color: var(--or-pink, #ff2a6d);
    text-decoration: underline;
  }
</style>
