<!--
  "Movers" section of the weekly recap (RecapPanel): which teams moved up or down in the standings that
  week and by how many places (league seeding rule). `moves` comes from movesForWeek() in utils/leagueTrends.js;
  nothing shows for week 1 or playoff weeks (moves is null).
-->
<script>
  import { ordinal } from "../Shared/format.js";

  let { moves, teams = {}, onTeamClick = null } = $props();

  const name = (id) => teams[id]?.name ?? `Team ${id}`;
</script>

{#snippet column(list, up)}
  <div class="rr-col">
    <span class="rr-colHead" class:rr-up={up}>{up ? "▲ Risers" : "▼ Fallers"}</span>
    {#each list as m (m.rosterID)}
      <div class="rr-move">
        <span class="rr-chip" class:rr-up={up} aria-label="{up ? 'Up' : 'Down'} {Math.abs(m.change)}">{up ? "▲" : "▼"}{Math.abs(m.change)}</span>
        <span class="rr-who">
          {#if onTeamClick}
            <button type="button" class="rr-name" onclick={() => onTeamClick(m.rosterID)}>{name(m.rosterID)}</button>
          {:else}
            <b class="rr-name">{name(m.rosterID)}</b>
          {/if}
          <span class="rr-path">{ordinal(m.from)} → {ordinal(m.to)}</span>
        </span>
      </div>
    {:else}
      <span class="rr-none">No one</span>
    {/each}
  </div>
{/snippet}

{#if moves}
  <div class="rr-label">Movers <span class="rr-weeks">· Week {moves.week - 1} → Week {moves.week}</span></div>
  <section class="rr-movers">
    {#if moves.risers.length || moves.fallers.length}
      <div class="rr-cols">
        {@render column(moves.risers, true)}
        {@render column(moves.fallers, false)}
      </div>
    {:else}
      <p class="rr-none">No changes in the standings this week.</p>
    {/if}
  </section>
{/if}

<style>
  /* label matches the recap's section labels (WeeklyRecap .rr-groupLabel) */
  .rr-label {
    margin: 26px 0 12px;
    font-size: 0.78em;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--or-cyan, #0b8a9a);
    text-align: left;
  }

  .rr-weeks {
    letter-spacing: 0.04em;
    text-transform: none;
    color: var(--or-muted);
  }

  .rr-movers {
    padding: 14px 16px;
    border: 1px solid var(--or-table-border, var(--ccc));
    border-radius: 10px;
    background: var(--fff);
    box-shadow: 0 4px 16px var(--or-table-shadow, transparent);
    text-align: left;
  }

  .rr-cols {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
  }

  .rr-col {
    display: flex;
    flex-direction: column;
    gap: 7px;
    min-width: 0;
  }

  .rr-colHead {
    font: 700 0.64em "Roboto", sans-serif;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--or-pink);
  }

  .rr-colHead.rr-up {
    color: var(--or-cyan);
  }

  .rr-move {
    display: grid;
    grid-template-columns: 36px minmax(0, 1fr);
    gap: 8px;
    align-items: center;
  }

  .rr-chip {
    display: grid;
    place-items: center;
    height: 26px;
    border-radius: 6px;
    font: 700 0.75em "Orbitron", sans-serif;
    color: var(--or-pink);
    background: color-mix(in srgb, var(--or-pink) 16%, transparent);
  }

  .rr-chip.rr-up {
    color: var(--or-cyan);
    background: color-mix(in srgb, var(--or-cyan) 16%, transparent);
  }

  .rr-who {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .rr-name {
    padding: 0;
    border: 0;
    background: none;
    font: 700 0.85em "Roboto", sans-serif;
    color: var(--or-text);
    text-align: left;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    cursor: pointer;
  }

  button.rr-name:hover {
    color: var(--or-pink);
  }

  .rr-path {
    font-size: 0.72em;
    color: var(--or-muted);
  }

  .rr-none {
    margin: 0;
    font-size: 0.78em;
    color: var(--or-muted);
  }
</style>
