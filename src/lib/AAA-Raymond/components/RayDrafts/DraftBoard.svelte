<!--
  Draft board (Drafts option A): dark cells, top edge in the player's position color.
  Replaces the template's Draft.svelte in src/lib/Drafts/index.svelte (one import line); same draftData input
  ({ draftOrder, draft, accuracy, reversalRound, draftType }).
  Upcoming draft: pick number + a cyan "→ owner" tag on picks that changed hands.
  Previous drafts: pick number, position tag, player, NFL team, and "by <team>" when the pick was traded.
-->
<script>
  import { gotoManager } from "$lib/utils/helper";
  import { getAvatarFromTeamManagers, getTeamNameFromTeamManagers } from "$lib/utils/helperFunctions/universalFunctions";
  import { posColor } from "../../utils/positions.js";

  let { draftData, leagueTeamManagers, previous = false, year, players } = $props();

  const draftOrder = $derived((draftData.draftOrder ?? []).filter(Boolean));
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
    if (!previous) {
      // upcoming: a non-empty cell is the roster that now owns the pick
      return { pick, owner: cell ? teamName(cell) : null };
    }
    if (!cell) return { pick, empty: true };
    const p = players?.[cell.player];
    const isDef = p?.pos === "DEF";
    return {
      pick,
      name: p ? `${p.fn ?? ""} ${p.ln ?? ""}`.trim() : String(cell.player),
      pos: p?.pos ?? "",
      color: posColor(p?.pos),
      nfl: isDef ? "" : (p?.t ?? ""),
      by: cell.newOwner ? teamName(cell.newOwner, year) : null,
    };
  };

  const board = $derived(rounds.map((r, i) => r.map((cell, col) => cellInfo(cell, i + 1, col, r.length))));
</script>

{#if !previous && accuracy && accuracy !== 1}
  <div class="rr-accuracy">
    <span>Draft order accuracy: {Math.round(accuracy * 100)}% <em>(improves as the regular season goes on)</em></span>
    <span class="rr-accBar"><span style="width: {accuracy * 100}%"></span></span>
  </div>
{/if}

<div class="rr-boardWrap">
  <div class="rr-board" style="--cols: {draftOrder.length}">
    {#each draftOrder as rosterID (rosterID)}
      {@const name = teamName(rosterID, year)}
      {@const current = teamName(rosterID)}
      <button type="button" class="rr-teamHead" onclick={() => gotoManager({ year, leagueTeamManagers, rosterID })}>
        <img src={getAvatarFromTeamManagers(leagueTeamManagers, rosterID, year)} alt="" />
        <span class="rr-teamName">{name}</span>
        {#if name !== current}<span class="rr-curName">({current})</span>{/if}
      </button>
    {/each}

    {#each board as round}
      {#each round as c}
        {#if !previous}
          <div class="rr-cell" class:rr-traded={c.owner}>
            <span class="rr-pick">{c.pick}</span>
            {#if c.owner}<span class="rr-owner">→ {c.owner}</span>{/if}
          </div>
        {:else if c.empty}
          <div class="rr-cell rr-past"><span class="rr-pick">{c.pick}</span></div>
        {:else}
          <div class="rr-cell rr-past" style="--pos: {c.color}">
            <span class="rr-cellTop">
              <span class="rr-pick">{c.pick}</span>
              <span class="rr-pos">{c.pos}</span>
            </span>
            <span class="rr-player">{c.name}</span>
            {#if c.nfl}<span class="rr-nfl">{c.nfl}</span>{/if}
            {#if c.by}<span class="rr-by">by {c.by}</span>{/if}
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
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 5px;
    padding: 6px 2px 8px;
    border: 0;
    background: transparent;
    color: var(--or-cyan, var(--blueOne));
    font: 700 0.75em "Roboto", sans-serif;
    text-align: center;
    line-height: 1.2;
    cursor: pointer;
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

  .rr-teamHead:hover .rr-teamName {
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

  .rr-pos {
    font: 700 0.68em "Roboto", sans-serif;
    letter-spacing: 0.06em;
    color: var(--pos);
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
    font-size: 0.66em;
    line-height: 1.2;
    color: var(--or-cyan, #0b8a9a);
    overflow-wrap: anywhere;
  }
</style>
