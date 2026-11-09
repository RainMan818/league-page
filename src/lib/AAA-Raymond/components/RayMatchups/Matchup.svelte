<!--
  One regular-season matchup as a "versus strip" (Matchups option B). Click to open both lineups:
  every starter is listed; the bench stays collapsed until "Show bench".
  An "M" badge marks a team that beat the league median that week.
-->
<script>
  import { getTeamFromTeamManagers } from "$lib/utils/helperFunctions/universalFunctions";
  import { posColor, playerPhoto } from "../../utils/positions.js";

  let { matchup, players, week, year, leagueTeamManagers, median = null, open = false, onToggle } = $props();

  let showBench = $state(false);

  const fmt = (n) => (Math.round((n ?? 0) * 100) / 100).toFixed(2);

  const playerInfo = (id, points) => {
    if (!id || id === "0") return { empty: true, name: "Empty", points: 0, projection: 0 };
    const p = players?.[id];
    if (!p) return { id, name: String(id), points: points ?? 0, projection: 0 };
    const isDef = p.pos === "DEF";
    const wi = p.wi?.[week];
    return {
      id,
      name: isDef ? `${p.fn ?? ""} ${p.ln ?? ""}`.trim() : `${p.fn?.[0] ?? ""}. ${p.ln ?? ""}`,
      pos: p.pos,
      color: posColor(p.pos),
      meta: [isDef ? null : p.t, wi?.o ? `vs ${wi.o}` : null].filter(Boolean).join(" "),
      photo: playerPhoto(id, p.pos),
      projection: wi ? parseFloat(wi.p) || 0 : 0,
      points: points ?? 0,
    };
  };

  const side = (entry) => {
    if (!entry) return { bye: true, team: { name: "Bye" }, starters: [], bench: [], total: 0, proj: 0 };
    const team = getTeamFromTeamManagers(leagueTeamManagers, entry.roster_id, year) ?? { name: `Team ${entry.roster_id}` };
    const starterIDs = entry.starters ?? [];
    const starters = starterIDs.map((id, i) => playerInfo(id, entry.points?.[i]));
    const onField = new Set(starterIDs);
    const bench = (entry.players ?? []).filter((id) => !onField.has(id)).map((id) => playerInfo(id, entry.playersPoints?.[id]));
    const total = starters.reduce((sum, p) => sum + (p.points || 0), 0);
    const proj = starters.reduce((sum, p) => sum + (p.projection || 0), 0);
    return { team, starters, bench, total, proj, beatMedian: median != null && total > median };
  };

  const home = $derived(side(matchup[0]));
  const away = $derived(side(matchup[1]));
  const lead = $derived(home.total > away.total ? "home" : away.total > home.total ? "away" : null);

  const EMPTY = { blank: true, points: 0, projection: 0 };
  const pair = (a, b) => Array.from({ length: Math.max(a.length, b.length) }, (_, i) => [a[i] ?? EMPTY, b[i] ?? EMPTY]);
  const starterRows = $derived(pair(home.starters, away.starters));
  const benchRows = $derived(pair(home.bench, away.bench));
</script>

{#snippet player(p, side)}
  {#if p.blank}
    <span class="rr-player rr-{side}"></span>
  {:else if p.empty}
    <span class="rr-player rr-{side} rr-emptySlot">Empty</span>
  {:else}
    <span class="rr-player rr-{side}">
      <span class="rr-photo" style={p.photo} aria-hidden="true"></span>
      <span class="rr-pText">
        <span class="rr-pName">{p.name}</span>
        <span class="rr-pMeta"><b style="color: {p.color}">{p.pos}</b>{p.meta ? ` · ${p.meta}` : ""}</span>
      </span>
    </span>
  {/if}
{/snippet}

{#snippet line(l, r, bench)}
  <div class="rr-line" class:rr-benchLine={bench}>
    {@render player(l, "left")}
    <span class="rr-pts" class:rr-win={!l.blank && l.points > r.points}>{l.blank ? "" : fmt(l.points)}<small>{l.blank || l.empty ? "" : fmt(l.projection)}</small></span>
    <span class="rr-pts" class:rr-win={!r.blank && r.points > l.points}>{r.blank ? "" : fmt(r.points)}<small>{r.blank || r.empty ? "" : fmt(r.projection)}</small></span>
    {@render player(r, "right")}
  </div>
{/snippet}

{#snippet teamSide(t, isLead, side)}
  <span class="rr-team rr-{side}">
    {#if t.team.avatar}<img class="rr-avatar" src={t.team.avatar} alt="" />{/if}
    <span class="rr-teamName" class:rr-lead={isLead}>{t.team.name}</span>
    {#if t.beatMedian}<span class="rr-mBadge" title="Beat league median" aria-label="Beat league median">M</span>{/if}
  </span>
{/snippet}

<div class="rr-matchup" class:rr-open={open}>
  <button
    type="button"
    class="rr-strip"
    class:rr-leftLead={lead === "home"}
    class:rr-rightLead={lead === "away"}
    aria-expanded={open}
    onclick={onToggle}
  >
    {@render teamSide(home, lead === "home", "left")}
    <span class="rr-scores">
      <span class="rr-score rr-scoreL">
        <span class="rr-total" class:rr-lead={lead === "home"}>{fmt(home.total)}</span>
        <span class="rr-proj">proj {home.proj.toFixed(1)}</span>
      </span>
      <span class="rr-vs">VS</span>
      <span class="rr-score rr-scoreR">
        <span class="rr-total" class:rr-lead={lead === "away"}>{fmt(away.total)}</span>
        <span class="rr-proj">proj {away.proj.toFixed(1)}</span>
      </span>
    </span>
    {@render teamSide(away, lead === "away", "right")}
  </button>

  {#if open}
    <div class="rr-lineup">
      {#each starterRows as [l, r]}
        {@render line(l, r, false)}
      {/each}
      {#if benchRows.length}
        <button type="button" class="rr-benchToggle" aria-expanded={showBench} onclick={() => (showBench = !showBench)}>
          {showBench ? "Hide bench" : "Show bench"}
          <span class="material-icons" aria-hidden="true">{showBench ? "expand_less" : "expand_more"}</span>
        </button>
        {#if showBench}
          {#each benchRows as [l, r]}
            {@render line(l, r, true)}
          {/each}
        {/if}
      {/if}
      <button type="button" class="rr-close" onclick={onToggle}>Close matchup</button>
    </div>
  {/if}
</div>

<style>
  .rr-matchup {
    display: flex;
    flex-direction: column;
  }

  /* ---------- strip ---------- */
  .rr-strip {
    display: flex;
    align-items: center;
    gap: 14px;
    width: 100%;
    padding: 12px 16px;
    border: 1px solid var(--or-table-border, var(--ccc));
    border-radius: 12px;
    background: var(--fff);
    box-shadow: 0 4px 16px var(--or-table-shadow, transparent);
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
    transition: border-color 0.2s, box-shadow 0.2s;
  }

  .rr-strip:hover {
    border-color: var(--or-pink, var(--blueOne));
  }

  .rr-strip.rr-leftLead {
    background: linear-gradient(90deg, color-mix(in srgb, var(--or-pink, #c2185b) 18%, transparent), transparent 45%), var(--fff);
  }

  .rr-strip.rr-rightLead {
    background: linear-gradient(270deg, color-mix(in srgb, var(--or-pink, #c2185b) 18%, transparent), transparent 45%), var(--fff);
  }

  .rr-open .rr-strip {
    border-color: var(--or-pink, var(--blueOne));
    border-radius: 12px 12px 0 0;
    box-shadow: 0 0 16px var(--or-glow-pink, transparent);
  }

  .rr-team {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .rr-team.rr-right {
    flex-direction: row-reverse;
    text-align: right;
  }

  .rr-avatar {
    flex: none;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: 1px solid var(--or-table-border, var(--ccc));
    object-fit: cover;
  }

  .rr-teamName {
    min-width: 0;
    font-size: 0.95em;
    font-weight: 500;
    color: var(--or-muted, var(--g555));
    line-height: 1.2;
    overflow-wrap: anywhere;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .rr-teamName.rr-lead {
    font-weight: 700;
    color: var(--or-heading, var(--g111));
  }

  .rr-mBadge {
    flex: none;
    width: 20px;
    height: 20px;
    border-radius: 6px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font: 700 11px "Orbitron", sans-serif;
    color: var(--or-cyan, #0b8a9a);
    border: 1px solid var(--or-cyan, #0b8a9a);
    box-shadow: 0 0 8px color-mix(in srgb, var(--or-cyan, #0b8a9a) 40%, transparent);
    cursor: help;
  }

  .rr-scores {
    flex: none;
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .rr-score {
    display: flex;
    flex-direction: column;
    min-width: 76px;
  }

  .rr-scoreL {
    align-items: flex-end;
  }

  .rr-scoreR {
    align-items: flex-start;
  }

  .rr-total {
    font: 800 1.3em "Orbitron", sans-serif;
    color: var(--or-muted, var(--g999));
  }

  .rr-total.rr-lead {
    color: var(--or-tab-active, var(--or-pink));
    text-shadow: 0 0 12px var(--or-glow-pink, transparent);
  }

  .rr-proj {
    font-size: 0.7em;
    color: var(--or-muted, var(--g999));
  }

  .rr-vs {
    font: 700 0.7em "Orbitron", sans-serif;
    letter-spacing: 0.1em;
    color: var(--aaa);
  }

  /* ---------- lineup ---------- */
  .rr-lineup {
    border: 1px solid var(--or-pink, var(--blueOne));
    border-top: 0;
    border-radius: 0 0 12px 12px;
    background: var(--f8f8f8);
    overflow: hidden;
  }

  .rr-line {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 72px 72px minmax(0, 1fr);
    align-items: center;
    gap: 8px;
    padding: 6px 14px;
    border-bottom: 1px solid var(--or-table-border, var(--ddd));
  }

  .rr-benchLine {
    background: color-mix(in srgb, var(--fff) 60%, transparent);
    opacity: 0.85;
  }

  .rr-player {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .rr-player.rr-right {
    flex-direction: row-reverse;
    text-align: right;
  }

  .rr-photo {
    flex: none;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background-color: var(--eee);
    background-position: center;
    background-repeat: no-repeat;
    background-size: cover;
    border: 1px solid var(--or-table-border, var(--ccc));
  }

  .rr-pText {
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  .rr-pName {
    font-size: 0.9em;
    color: var(--or-text, var(--g111));
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .rr-pMeta {
    font-size: 0.7em;
    color: var(--or-muted, var(--g999));
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .rr-emptySlot {
    font-style: italic;
    color: var(--or-muted, var(--g999));
    font-size: 0.85em;
  }

  .rr-pts {
    display: flex;
    flex-direction: column;
    align-items: center;
    font: 500 0.95em "Orbitron", sans-serif;
    color: var(--or-muted, var(--g999));
  }

  .rr-pts small {
    font: 400 0.7em "Roboto", sans-serif;
    color: var(--or-muted, var(--g999));
    opacity: 0.8;
  }

  .rr-pts.rr-win {
    font-weight: 700;
    color: var(--or-heading, var(--g111));
  }

  .rr-benchToggle,
  .rr-close {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    width: 100%;
    min-height: 44px;
    border: 0;
    background: transparent;
    color: var(--or-cyan, var(--blueOne));
    font: 600 0.8em "Roboto", sans-serif;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    cursor: pointer;
  }

  .rr-benchToggle {
    border-bottom: 1px solid var(--or-table-border, var(--ddd));
  }

  .rr-close {
    color: var(--or-muted, var(--g999));
  }

  .rr-benchToggle:hover,
  .rr-close:hover {
    background: var(--or-row-hover, var(--eee));
  }

  /* phones: the strip becomes two stacked team rows (team left, score right) */
  @media (max-width: 640px) {
    .rr-strip {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      grid-template-areas:
        "lt ls"
        "rt rs";
      gap: 8px 12px;
      padding: 10px 12px;
    }

    .rr-strip.rr-leftLead,
    .rr-strip.rr-rightLead {
      background: var(--fff);
    }

    .rr-scores {
      display: contents;
    }

    .rr-team.rr-left {
      grid-area: lt;
    }

    .rr-team.rr-right {
      grid-area: rt;
      flex-direction: row;
      text-align: left;
    }

    .rr-scoreL {
      grid-area: ls;
    }

    .rr-scoreR {
      grid-area: rs;
    }

    .rr-score {
      min-width: 0;
      flex-direction: row;
      align-items: baseline;
      justify-content: flex-end;
      gap: 6px;
    }

    .rr-avatar {
      width: 28px;
      height: 28px;
    }

    .rr-teamName {
      font-size: 0.85em;
    }

    .rr-total {
      font-size: 1.05em;
    }

    .rr-vs {
      display: none;
    }

    .rr-line {
      grid-template-columns: minmax(0, 1fr) 50px 50px minmax(0, 1fr);
      gap: 4px;
      padding: 6px 8px;
    }

    .rr-photo {
      width: 30px;
      height: 30px;
    }

    .rr-player {
      gap: 6px;
    }

    .rr-pName {
      font-size: 0.78em;
    }

    .rr-pts {
      font-size: 0.8em;
    }
  }
</style>
