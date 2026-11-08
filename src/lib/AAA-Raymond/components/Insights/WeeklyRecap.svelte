<!--
  Weekly report for the last completed week: best/worst team, players and benchwarmers of the week by position,
  and league awards. `recap` comes from weeklyRecap() in utils/leagueInsights.js.
-->
<script>
  import TeamChip from "./TeamChip.svelte";
  import { pts } from "./format.js";

  let { recap, teams, onTeamClick = null } = $props();

  const clickFor = (id) => (onTeamClick ? () => onTeamClick(id) : null);
  const name = (id) => teams[id]?.name ?? "Unknown team";

  const awards = $derived.by(() => {
    const a = recap.awards;
    return [
      { label: "Best manager", icon: "emoji_events", tone: "good", team: a.bestManager?.rosterID, value: a.bestManager?.points, subLabel: "max points", sub: a.bestManager?.max },
      { label: "Worst manager", icon: "thumb_down", tone: "bad", team: a.worstManager?.rosterID, value: a.worstManager?.points, subLabel: "max points", sub: a.worstManager?.max },
      { label: "Highest score in a loss", icon: "sentiment_dissatisfied", tone: "bad", team: a.highestInLoss?.rosterID, value: a.highestInLoss?.points, subLabel: a.highestInLoss ? `vs ${name(a.highestInLoss.oppRosterID)}` : "", sub: a.highestInLoss?.oppPoints },
      { label: "Lowest score in a win", icon: "workspace_premium", tone: "good", team: a.lowestInWin?.rosterID, value: a.lowestInWin?.points, subLabel: a.lowestInWin ? `vs ${name(a.lowestInWin.oppRosterID)}` : "", sub: a.lowestInWin?.oppPoints },
      { label: "Biggest blowout", icon: "local_fire_department", tone: "hot", team: a.blowout?.winner, value: a.blowout?.winnerPts, subLabel: a.blowout ? `vs ${name(a.blowout.loser)}` : "", sub: a.blowout?.loserPts },
      { label: "Narrowest win", icon: "compress", tone: "hot", team: a.narrowWin?.winner, value: a.narrowWin?.winnerPts, subLabel: a.narrowWin ? `vs ${name(a.narrowWin.loser)}` : "", sub: a.narrowWin?.loserPts },
      { label: "Overachiever", icon: "trending_up", tone: "good", team: a.overachiever?.rosterID, value: a.overachiever?.points, subLabel: "starter projection", sub: a.overachiever?.projected },
      { label: "Underachiever", icon: "trending_down", tone: "bad", team: a.underachiever?.rosterID, value: a.underachiever?.points, subLabel: "starter projection", sub: a.underachiever?.projected },
    ].filter((x) => x.team);
  });
</script>

{#snippet teamCard(label, icon, tone, t)}
  <div class="rr-card rr-teamCard rr-{tone}">
    <div class="rr-head"><span class="material-icons rr-icon">{icon}</span>{label}</div>
    <div class="rr-teamRow">
      <TeamChip team={teams[t.rosterID]} onclick={clickFor(t.rosterID)} size={36} />
    </div>
    <div class="rr-scoreRow">
      <span class="rr-big">{pts(t.points)}</span>
      {#if t.projected > 0}<span class="rr-muted">proj {pts(t.projected)}</span>{/if}
    </div>
  </div>
{/snippet}

{#snippet playerCard(p)}
  <div class="rr-card rr-player" style="--pos: var(--{p.pos}, var(--or-pink, #c2185b))">
    <div class="rr-pos">{p.pos}</div>
    <div class="rr-pname" title={p.name}>{p.name}</div>
    <div class="rr-owner" title={name(p.rosterID)}>→ {name(p.rosterID)}</div>
    <div class="rr-pts">{pts(p.points)}</div>
    <div class="rr-opp">{p.opponent ? `vs ${p.opponent}` : " "}</div>
  </div>
{/snippet}

<div class="rr-recap">
  <div class="rr-duo">
    {#if recap.bestTeam}{@render teamCard("Best team", "emoji_events", "good", recap.bestTeam)}{/if}
    {#if recap.worstTeam}{@render teamCard("Worst team", "sentiment_very_dissatisfied", "bad", recap.worstTeam)}{/if}
  </div>

  {#if recap.playersOfWeek.length}
    <div class="rr-groupLabel">Players of the week</div>
    <div class="rr-players">
      {#each recap.playersOfWeek as p (p.pos)}{@render playerCard(p)}{/each}
    </div>
  {/if}

  {#if recap.benchwarmers.length}
    <div class="rr-groupLabel">Benchwarmers of the week</div>
    <div class="rr-players">
      {#each recap.benchwarmers as p (p.pos)}{@render playerCard(p)}{/each}
    </div>
  {/if}

  {#if awards.length}
    <div class="rr-groupLabel">League awards</div>
    <div class="rr-awards">
      {#each awards as aw (aw.label)}
        <div class="rr-card rr-award rr-{aw.tone}">
          <div class="rr-head"><span class="material-icons rr-icon">{aw.icon}</span>{aw.label}</div>
          <div class="rr-awardRow">
            <span class="rr-awardTeam"><TeamChip team={teams[aw.team]} onclick={clickFor(aw.team)} /></span>
            <span class="rr-big rr-small">{pts(aw.value)}</span>
          </div>
          <div class="rr-awardRow rr-sub">
            <span class="rr-subLabel">{aw.subLabel}</span>
            <span>{pts(aw.sub)}</span>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .rr-recap {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .rr-card {
    min-width: 0;
    border: 1px solid var(--or-table-border, var(--ccc));
    border-radius: 10px;
    background: var(--fff);
    box-shadow: 0 4px 16px var(--or-table-shadow, transparent);
  }

  .rr-head {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.72em;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--or-muted, var(--g999));
  }

  .rr-icon {
    font-size: 20px;
  }

  .rr-good .rr-icon {
    color: var(--or-cyan, #0b8a9a);
  }

  .rr-bad .rr-icon {
    color: var(--or-pink, #c2185b);
  }

  .rr-hot .rr-icon {
    color: var(--or-orange, #e8590c);
  }

  .rr-big {
    font-family: "Orbitron", sans-serif;
    font-weight: 700;
    font-size: 1.7em;
    line-height: 1.1;
    color: var(--or-heading, inherit);
  }

  .rr-big.rr-small {
    font-size: 1.25em;
    flex: none;
  }

  .rr-muted {
    color: var(--or-muted, var(--g999));
    font-size: 0.9em;
  }

  /* best / worst team */
  .rr-duo {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr));
    gap: 12px;
  }

  .rr-teamCard {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 14px 16px;
  }

  .rr-teamCard.rr-good {
    border-color: var(--or-cyan, #0b8a9a);
  }

  .rr-teamCard.rr-bad {
    border-color: var(--or-pink, #c2185b);
  }

  .rr-teamRow {
    display: flex;
    font-size: 1.05em;
    font-weight: 500;
  }

  .rr-scoreRow {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 10px;
  }

  /* players / benchwarmers */
  .rr-groupLabel {
    margin: 14px 0 0;
    font-size: 0.78em;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--or-cyan, #0b8a9a);
  }

  .rr-players {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(112px, 1fr));
    gap: 10px;
  }

  /* phones: each player group becomes one swipeable row instead of a tall grid */
  @media (max-width: 600px) {
    .rr-players {
      grid-template-columns: none;
      grid-auto-flow: column;
      grid-auto-columns: 118px;
      overflow-x: auto;
      scroll-snap-type: x mandatory;
      padding-bottom: 6px;
    }

    .rr-player {
      scroll-snap-align: start;
    }
  }

  .rr-player {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    padding: 12px 8px 10px;
    text-align: center;
    border-top: 3px solid var(--pos);
    background: linear-gradient(180deg, color-mix(in srgb, var(--pos) 22%, var(--fff)), var(--fff) 75%);
  }

  .rr-pos {
    font-weight: 700;
    font-size: 0.8em;
    letter-spacing: 0.06em;
    color: var(--pos);
  }

  .rr-pname,
  .rr-owner {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .rr-pname {
    font-weight: 600;
    font-size: 0.9em;
  }

  .rr-owner,
  .rr-opp {
    font-size: 0.75em;
    color: var(--or-muted, var(--g999));
  }

  .rr-pts {
    margin-top: 6px;
    font-family: "Orbitron", sans-serif;
    font-weight: 700;
    font-size: 1.25em;
    color: var(--or-heading, inherit);
  }

  /* awards */
  .rr-awards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 340px), 1fr));
    gap: 10px;
  }

  .rr-award {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px 14px;
  }

  .rr-awardRow {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .rr-awardTeam {
    display: flex;
    min-width: 0;
    font-weight: 500;
  }

  .rr-sub {
    font-size: 0.8em;
    color: var(--or-muted, var(--g999));
  }

  .rr-subLabel {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
