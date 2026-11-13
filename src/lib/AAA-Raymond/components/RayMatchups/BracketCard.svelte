<!--
  One playoff bracket game (or a first-round bye) for PlayoffBracket: two team rows with seed, avatar, name and score.
  Clicking a game selects it (its lineups open under the bracket). In the Toilet Bowl the team that moves on is the
  one with the LOWER score, shown in orange (`moveOn`).
-->
<script>
  import { sourceLabel } from "../../utils/playoffBracket.js";

  let { game = null, bye = null, games = {}, teamFor, selected = false, onclick = null, moveOn = false } = $props();

  const fmt = (n) => (n == null ? "" : n.toFixed(2));
  const rows = $derived.by(() => {
    if (!game) return [];
    const live = game.status === "live";
    const [a, b] = game.sides.map((s) => s.points ?? -1);
    return game.sides.map((s, i) => ({
      ...s,
      team: s.rosterID ? teamFor(s.rosterID) : null,
      label: s.rosterID ? null : sourceLabel(s, games),
      leading: live && (i === 0 ? a > b : b > a),
    }));
  });
  const ariaLabel = $derived(
    game ? `${game.label}: ${rows.map((r) => `${r.team?.name ?? r.label}${r.points != null ? ` ${fmt(r.points)}` : ""}`).join(" vs ")}` : ""
  );
</script>

{#snippet avatar(team)}
  {#if team?.avatar}<img class="rr-av" src={team.avatar} alt="" />{:else}<span class="rr-av rr-avEmpty" aria-hidden="true"></span>{/if}
{/snippet}

{#if bye}
  {@const team = teamFor(bye.rosterID)}
  <div class="rr-card rr-byeCard">
    <span class="rr-row">
      <span class="rr-seed">{bye.seed ? `#${bye.seed}` : ""}</span>
      {@render avatar(team)}
      <span class="rr-name">{team?.name ?? "TBD"}</span>
      <span></span>
    </span>
    <span class="rr-row rr-byeText"><span></span><span></span><span>First-round bye</span><span></span></span>
  </div>
{:else if game}
  <button type="button" class="rr-card" class:rr-selected={selected} aria-pressed={selected} aria-label={ariaLabel} {onclick}>
    {#if game.status === "live"}<span class="rr-live">Live</span>{/if}
    {#each rows as r, i (i)}
      <span class="rr-row" class:rr-won={r.won === true && !moveOn} class:rr-moves={r.won === true && moveOn} class:rr-lost={r.won === false} class:rr-lead={r.leading}>
        <span class="rr-seed">{r.seed ? `#${r.seed}` : ""}</span>
        {@render avatar(r.team)}
        <span class="rr-name" class:rr-tbd={!r.rosterID}>{r.team?.name ?? r.label}</span>
        <b class="rr-pts">{fmt(r.points)}</b>
      </span>
    {/each}
  </button>
{/if}

<style>
  .rr-card {
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 4px;
    width: 100%;
    height: 92px;
    box-sizing: border-box;
    padding: 8px 10px;
    border: 1px solid var(--or-table-border, var(--ccc));
    border-radius: 12px;
    background: var(--fff);
    color: inherit;
    font: inherit;
    text-align: left;
    box-shadow: 0 4px 18px var(--or-table-shadow, transparent);
  }

  button.rr-card {
    cursor: pointer;
    transition: border-color 0.2s, box-shadow 0.2s;
  }

  button.rr-card:hover,
  button.rr-card:focus-visible {
    border-color: var(--or-pink, var(--blueOne));
  }

  .rr-card.rr-selected {
    border-color: var(--or-cyan, #0b8a9a);
    box-shadow: 0 0 18px color-mix(in srgb, var(--or-cyan, #0b8a9a) 40%, transparent);
  }

  .rr-row {
    display: grid;
    grid-template-columns: 26px 26px minmax(0, 1fr) auto;
    align-items: center;
    gap: 8px;
    height: 34px;
  }

  .rr-seed {
    font: 700 0.68em "Orbitron", sans-serif;
    color: var(--or-cyan, #0b8a9a);
  }

  .rr-av {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    object-fit: cover;
  }

  .rr-avEmpty {
    display: block;
    border: 1px dashed var(--or-table-border, var(--ccc));
    box-sizing: border-box;
  }

  .rr-name {
    font-size: 0.85em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .rr-tbd,
  .rr-byeText {
    font-style: italic;
    color: var(--or-muted, var(--g999));
  }

  .rr-byeText {
    font-size: 0.8em;
  }

  .rr-pts {
    font: 700 0.82em "Orbitron", sans-serif;
  }

  .rr-won .rr-name,
  .rr-moves .rr-name,
  .rr-lead .rr-name {
    font-weight: 700;
    color: var(--or-heading, var(--g111));
  }

  .rr-won .rr-pts {
    color: var(--or-pink, var(--blueOne));
    text-shadow: 0 0 10px var(--or-glow-pink, transparent);
  }

  .rr-moves .rr-pts {
    color: var(--or-orange, #e8590c);
  }

  .rr-lost .rr-name,
  .rr-lost .rr-pts {
    color: var(--or-muted, var(--g999));
    font-weight: 500;
  }

  .rr-live {
    position: absolute;
    top: -9px;
    right: 10px;
    padding: 1px 8px;
    border-radius: 999px;
    background: var(--or-pink, var(--blueOne));
    color: #fff;
    font: 700 0.62em "Orbitron", sans-serif;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    box-shadow: 0 0 10px var(--or-glow-pink, transparent);
  }
</style>
