<!--
  Projected playoff bracket + playoff odds table.
  `projection` comes from simulateSeason() in utils/leagueInsights.js.
-->
<script>
  import TeamChip from "../Shared/TeamChip.svelte";
  import { pct } from "../Shared/format.js";
  import "../Shared/common.css";
  import { SHOW_PLAYOFF_ODDS } from "./config.js";

  let { projection, teams, playoffWeeks, fromWeek, regularSeasonLength, divisions = 0, onTeamClick = null } = $props();

  const oddsById = $derived(Object.fromEntries(projection.odds.map((o) => [o.rosterID, o])));
  const seeds = $derived(projection.projectedSeeds);
  const rounds = $derived(projection.rounds);
  const bubble = $derived(
    projection.odds.filter((o) => !seeds.includes(o.rosterID) && o.playoffs > 0).slice(0, 2)
  );
  const titleFavorites = $derived([...projection.odds].sort((a, b) => b.title - a.title).slice(0, 3));
  const weeksLeft = $derived(Math.max(0, regularSeasonLength - fromWeek + 1));

  // e.g. "Seeds 1–3: division winners. Seeds 4–5: best remaining records. Seed 6: most points for among the rest."
  const rulesText = $derived.by(() => {
    const n = seeds.length;
    const pf = projection.pointsWildcards ?? 0;
    const range = (a, b) => (a === b ? `Seed ${a}` : `Seeds ${a}–${b}`);
    const parts = [];
    let next = 1;
    if (divisions > 1) {
      parts.push(`${range(1, divisions)}: division winners`);
      next = divisions + 1;
    }
    if (n - pf >= next) parts.push(`${range(next, n - pf)}: best remaining records`);
    if (pf > 0) parts.push(`${range(n - pf + 1, n)}: most points for among the rest`);
    if (projection.byes) parts.push(`${range(1, projection.byes)} get${projection.byes === 1 ? "s" : ""} a bye`);
    return parts.join(". ") + ".";
  });

  const roundName = (r) => {
    const fromEnd = rounds.length - 1 - r;
    if (fromEnd === 0) return "Championship";
    if (fromEnd === 1) return "Semifinals";
    if (r === 0 && projection.byes > 0) return "Wild Card";
    return "Quarterfinals";
  };
  const winnerLabel = (s) => {
    const r = s.from?.round;
    if (r === 0) return `Winner ${s.seeds.join(" / ")}`;
    return `${roundName(r).replace(/s$/, "")} winner`;
  };
  const clickFor = (id) => (onTeamClick ? () => onTeamClick(id) : null);
</script>

{#snippet side(s)}
  {#if s.seed}
    {@const id = seeds[s.seed - 1]}
    {@const o = oddsById[id]}
    <div class="rr-slot" title={SHOW_PLAYOFF_ODDS ? `${pct(o?.playoffs)} to make the playoffs · ${pct(o?.title)} to win it all` : null}>
      <span class="rr-seed">{s.seed}</span>
      <span class="rr-team"><TeamChip team={teams[id]} onclick={clickFor(id)} size={24} /></span>
      {#if SHOW_PLAYOFF_ODDS}<span class="rr-slotPct">{pct(o?.playoffs)}</span>{/if}
    </div>
  {:else}
    <div class="rr-slot rr-tbd">
      <span class="rr-seed"></span>
      <span class="rr-team">{winnerLabel(s)}</span>
    </div>
  {/if}
{/snippet}

<section class="rr-playoffs">
  <p class="rr-pageSub">
    {#if weeksLeft === 0}
      Regular season complete: seeds are final.
    {/if}
  </p>

  <div class="rr-bracket">
    {#each rounds as games, r}
      <div class="rr-round">
        <div class="rr-roundLabel">{roundName(r)} · Wk {playoffWeeks[r]}</div>
        <div class="rr-games">
          {#each games as game}
            <div class="rr-game">
              {@render side(game.top)}
              {@render side(game.bottom)}
            </div>
          {/each}
        </div>
      </div>
    {/each}
    {#if SHOW_PLAYOFF_ODDS}
    <div class="rr-round">
      <div class="rr-roundLabel">Title odds</div>
      <div class="rr-games">
        <div class="rr-game rr-trophy">
          {#each titleFavorites as fav, i}
            <div class="rr-slot">
              <span class="rr-seed">{i === 0 ? "★" : ""}</span>
              <span class="rr-team"><TeamChip team={teams[fav.rosterID]} onclick={clickFor(fav.rosterID)} size={24} /></span>
              <span class="rr-slotPct rr-strong">{pct(fav.title)}</span>
            </div>
          {/each}
        </div>
      </div>
    </div>
    {/if}
  </div>
</section>

<style>
  .rr-bracket {
    display: flex;
    gap: 16px;
    margin: 0 0 1em;
  }

  .rr-round {
    flex: 1 1 0;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  .rr-roundLabel {
    text-align: center;
    font-size: 0.72em;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--or-cyan, #0b8a9a);
    margin-bottom: 8px;
    white-space: nowrap;
  }

  .rr-games {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: space-around;
    gap: 14px;
  }

  .rr-game {
    border: 1px solid var(--or-table-border, var(--ccc));
    border-radius: 10px;
    background: var(--fff);
    box-shadow: 0 4px 16px var(--or-table-shadow, transparent);
    overflow: hidden;
  }

  .rr-trophy {
    border-color: var(--or-pink, var(--blueOne));
    box-shadow: 0 0 14px var(--or-glow-pink, transparent);
  }

  .rr-slot {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 10px;
    min-height: 26px;
    font-size: 0.9em;
  }

  .rr-slot + .rr-slot {
    border-top: 1px solid var(--or-table-border, var(--ccc));
  }

  .rr-seed {
    flex: none;
    width: 16px;
    font-family: "Orbitron", sans-serif;
    font-weight: 700;
    font-size: 0.85em;
    color: var(--or-pink, var(--blueOne));
  }

  .rr-team {
    flex: 1;
    min-width: 0;
    display: flex;
  }

  /* let long team names wrap to two lines inside bracket boxes */
  .rr-slot .rr-team :global(.rr-name) {
    white-space: normal;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    line-height: 1.15;
  }

  .rr-tbd .rr-team {
    color: var(--or-muted, var(--g999));
    font-style: italic;
    font-size: 0.92em;
  }

  .rr-slotPct {
    flex: none;
    font-size: 0.78em;
    color: var(--or-muted, var(--g999));
  }

  .rr-strong {
    font-weight: 700;
    color: var(--or-pink, var(--blueOne));
  }

  .rr-bubble {
    text-align: center;
    font-size: 0.85em;
    color: var(--or-muted, var(--g999));
    margin: 0;
  }

  .rr-bubbleTeam {
    color: var(--g333);
  }


  @media (max-width: 760px) {
    .rr-bracket {
      flex-direction: column;
    }

    .rr-games {
      gap: 8px;
    }
  }
</style>
