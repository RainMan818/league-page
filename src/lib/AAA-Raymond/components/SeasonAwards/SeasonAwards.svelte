<!--
  One season's awards: post-season (podium, team and player awards) and regular season (team awards, player
  awards, All-League Team), with a toggle when both are ready. Used on the homepage (HomeAwards) and in the
  Trophy Room (TrophyRoomAwards). `awards` comes from seasonAwards() in utils/seasonAwards.js.
-->
<script>
  import TeamChip from "../Shared/TeamChip.svelte";
  import Toggle from "../Shared/Toggle.svelte";
  import { pts, signed, record } from "../Shared/format.js";
  import { posColor } from "../../utils/positions.js";

  let { awards, teamFor, onTeamClick = null, title = null } = $props();

  const hasPost = $derived(!!awards?.post);
  const hasRegular = $derived(!!awards?.regular);
  let group = $state(null);
  // post-season first once the championship is decided
  const shown = $derived(group ?? (hasPost ? "post" : "regular"));

  const clickFor = (id) => (onTeamClick && id ? () => onTeamClick(id) : null);
  const name = (id) => teamFor(id)?.name ?? "Unknown team";
  const ordinal = (n) => {
    const teen = n % 100 >= 11 && n % 100 <= 13;
    return `${n}${teen ? "th" : { 1: "st", 2: "nd", 3: "rd" }[n % 10] ?? "th"}`;
  };
  const wins = (n) => `${n} playoff win${n === 1 ? "" : "s"}`;
  const pickText = (pk) => `${pk.season} ${ordinal(pk.round)}`;
  const cinderellaText = (c) =>
    c.result === "champion" ? "Won it all" : c.result === "final" ? `Reached the final (${wins(c.wins)})` : wins(c.wins);

  // ---- regular season
  const regularTeam = $derived.by(() => {
    const r = awards?.regular;
    if (!r) return [];
    return [
      { title: "Points King", icon: "workspace_premium", tone: "hot", why: "Most points scored",
        team: r.pointsKing?.rosterID, stat: pts(r.pointsKing?.points), sub: r.pointsKing && `${pts(r.pointsKing.perGame)} per game` },
      { title: "Coach of the Year", icon: "psychology", tone: "good", why: "Best lineup efficiency (points ÷ max points)",
        team: r.coach?.rosterID, stat: r.coach && `${(r.coach.efficiency * 100).toFixed(1)}%`, sub: r.coach && `${pts(r.coach.points)} of ${pts(r.coach.max)} possible` },
      { title: "Luckiest", icon: "casino", tone: "good", why: "Most head-to-head wins above all-play expected wins",
        team: r.luckiest?.rosterID, stat: r.luckiest && `${signed(r.luckiest.luck)} W`,
        sub: r.luckiest && `${record(r.luckiest.wins, r.luckiest.losses, r.luckiest.ties)} vs ${r.luckiest.expectedWins.toFixed(1)} expected wins` },
      { title: "Unluckiest", icon: "thunderstorm", tone: "bad", why: "Fewest head-to-head wins vs all-play expected wins",
        team: r.unluckiest?.rosterID, stat: r.unluckiest && `${signed(r.unluckiest.luck)} W`,
        sub: r.unluckiest && `${record(r.unluckiest.wins, r.unluckiest.losses, r.unluckiest.ties)} vs ${r.unluckiest.expectedWins.toFixed(1)} expected wins` },
      { title: "Median Master", icon: "equalizer", tone: "good", why: "Best record against the weekly league median",
        team: r.medianMaster?.rosterID, stat: r.medianMaster && record(r.medianMaster.wins, r.medianMaster.losses, r.medianMaster.ties),
        sub: r.medianMaster && `${signed(r.medianMaster.margin)} pts vs the median` },
      { title: "Boom Week", icon: "rocket_launch", tone: "hot", why: "Highest single-week score",
        team: r.boomWeek?.rosterID, stat: pts(r.boomWeek?.points), sub: r.boomWeek && `Week ${r.boomWeek.week}` },
      { title: "Bust Week", icon: "trending_down", tone: "bad", why: "Lowest single-week score",
        team: r.bustWeek?.rosterID, stat: pts(r.bustWeek?.points), sub: r.bustWeek && `Week ${r.bustWeek.week}` },
      { title: "Nail-Biter", icon: "compress", tone: "hot", why: "Closest game of the year",
        team: r.nailBiter?.winner, stat: r.nailBiter && `+${r.nailBiter.margin.toFixed(2)}`,
        sub: r.nailBiter && `Beat ${name(r.nailBiter.loser)} ${pts(r.nailBiter.winnerPts)}–${pts(r.nailBiter.loserPts)}, week ${r.nailBiter.week}` },
      { title: "Waiver Wizard", icon: "auto_fix_high", tone: "good", why: "Most starter points from waiver and free-agent pickups",
        team: r.waiverWizard?.rosterID, stat: pts(r.waiverWizard?.points),
        sub: r.waiverWizard?.top && `Best pickup: ${r.waiverWizard.top.name} (${pts(r.waiverWizard.top.points)})` },
    ];
  });

  const regularPlayers = $derived.by(() => {
    const r = awards?.regular;
    if (!r) return [];
    const p = (x) => x;
    return [
      { title: "MVP", icon: "star", tone: "hot", why: "Most points in a starting lineup", player: p(r.mvp), stat: pts(r.mvp?.points), sub: r.mvp && `${r.mvp.games} starts` },
      { title: "Defensive Player of the Year", icon: "shield", tone: "good", why: "Top IDP in a starting lineup", player: p(r.dpoy), stat: pts(r.dpoy?.points), sub: r.dpoy && `${r.dpoy.games} starts` },
      { title: "Offensive Rookie of the Year", icon: "fiber_new", tone: "good", why: "Top rookie QB, RB, WR or TE", player: p(r.oroy), stat: pts(r.oroy?.points), sub: r.oroy && `${r.oroy.games} starts` },
      { title: "Defensive Rookie of the Year", icon: "new_releases", tone: "good", why: "Top rookie DL, LB or DB", player: p(r.droy), stat: pts(r.droy?.points), sub: r.droy && `${r.droy.games} starts` },
      { title: "Best Single Game", icon: "bolt", tone: "hot", why: "Highest one-week score by a starter", player: p(r.bestGame), stat: pts(r.bestGame?.points), sub: r.bestGame && `Week ${r.bestGame.week}` },
      { title: "Offensive Pickup of the Year", icon: "person_add", tone: "good", why: "Most starter points after a waiver or free-agent add (QB, RB, WR, TE)", player: p(r.offPickup), stat: pts(r.offPickup?.points), sub: r.offPickup && "starter points after the add" },
      { title: "Defensive Pickup of the Year", icon: "group_add", tone: "good", why: "Most starter points after a waiver or free-agent add (DL, LB, DB)", player: p(r.defPickup), stat: pts(r.defPickup?.points), sub: r.defPickup && "starter points after the add" },
      { title: "Bench Legend", icon: "event_seat", tone: "bad", why: "Most points scored while on the bench", player: p(r.benchLegend), stat: pts(r.benchLegend?.points), sub: r.benchLegend && `${r.benchLegend.games} weeks on the bench` },
    ];
  });

  // ---- post-season
  const postTeam = $derived.by(() => {
    const p = awards?.post;
    if (!p) return [];
    return [
      { title: "Most Efficient Manager", icon: "psychology", tone: "good", why: "Best lineup efficiency in playoff games (points ÷ max points)",
        team: p.mostEfficient?.rosterID, stat: p.mostEfficient && `${(p.mostEfficient.efficiency * 100).toFixed(1)}%`,
        sub: p.mostEfficient && `${pts(p.mostEfficient.points)} of ${pts(p.mostEfficient.max)} possible over ${p.mostEfficient.games} game${p.mostEfficient.games === 1 ? "" : "s"}` },
      { title: "Toilet Bowl", icon: "wc", tone: "bad", why: "Lost every game of the consolation bracket to finish last",
        team: p.toiletBowl?.rosterID, stat: p.toiletBowl?.record && record(p.toiletBowl.record.wins, p.toiletBowl.record.losses, p.toiletBowl.record.ties),
        sub: p.toiletBowl && `Lost the final ${pts(p.toiletBowl.points)}–${pts(p.toiletBowl.opponentPts)} to ${name(p.toiletBowl.opponent)}, week ${p.toiletBowl.week}`,
        empty: "The Toilet Bowl isn't decided yet" },
      { title: "Cinderella", icon: "auto_awesome", tone: "good", why: "Lowest seed (no bye) to go the furthest",
        team: p.cinderella?.rosterID, stat: p.cinderella && `${ordinal(p.cinderella.seed)} seed`, sub: p.cinderella && cinderellaText(p.cinderella) },
      { title: "Biggest Upset", icon: "whatshot", tone: "hot", why: "Playoff win with the biggest seed gap",
        team: p.biggestUpset?.winner, stat: p.biggestUpset && `#${p.biggestUpset.winnerSeed} over #${p.biggestUpset.loserSeed}`,
        sub: p.biggestUpset && `Beat ${name(p.biggestUpset.loser)} ${pts(p.biggestUpset.winnerPts)}–${pts(p.biggestUpset.loserPts)}, week ${p.biggestUpset.week}`,
        empty: "No lower seed won a playoff game" },
      { title: "Playoff Scoring Leader", icon: "speed", tone: "hot", why: "Most points per playoff game",
        team: p.scoringLeader?.rosterID, stat: pts(p.scoringLeader?.perGame), sub: p.scoringLeader && `per game over ${p.scoringLeader.games} game${p.scoringLeader.games === 1 ? "" : "s"}` },
    ];
  });

  const postPlayers = $derived.by(() => {
    const p = awards?.post;
    if (!p) return [];
    return [
      { title: "Offensive Playoff MVP", icon: "sports_football", tone: "hot", why: "Most starter points in playoff games (QB, RB, WR, TE)", player: p.offMvp, stat: pts(p.offMvp?.points), sub: p.offMvp && `${p.offMvp.games} playoff starts` },
      { title: "Defensive Playoff MVP", icon: "security", tone: "good", why: "Most starter points in playoff games (DL, LB, DB)", player: p.defMvp, stat: pts(p.defMvp?.points), sub: p.defMvp && `${p.defMvp.games} playoff starts` },
      { title: "Championship Hero", icon: "military_tech", tone: "hot", why: "The champion's top scorer in the final", player: p.champHero, stat: pts(p.champHero?.points), sub: "in the final" },
    ];
  });
</script>

{#snippet teamAward(a)}
  <div class="rr-card rr-award rr-{a.tone}" class:rr-none={!a.team}>
    <div class="rr-head"><span class="material-icons rr-icon">{a.icon}</span>{a.title}</div>
    <div class="rr-why">{a.why}</div>
    {#if a.team}
      <div class="rr-row">
        <span class="rr-who"><TeamChip team={teamFor(a.team)} onclick={clickFor(a.team)} size={32} /></span>
        <span class="rr-stat">{a.stat}</span>
      </div>
      {#if a.sub}<div class="rr-sub">{a.sub}</div>{/if}
    {:else}
      <div class="rr-sub">{a.empty ?? "Not awarded this season"}</div>
    {/if}
  </div>
{/snippet}

{#snippet playerAward(a)}
  <div class="rr-card rr-award rr-{a.tone}" class:rr-none={!a.player}>
    <div class="rr-head"><span class="material-icons rr-icon">{a.icon}</span>{a.title}</div>
    <div class="rr-why">{a.why}</div>
    {#if a.player}
      <div class="rr-row">
        <span class="rr-who rr-player">
          {#if a.player.pos}<span class="rr-pos" style="--pos: {posColor(a.player.pos)}">{a.player.pos}</span>{/if}
          <span class="rr-pname" title={a.player.name}>{a.player.name}</span>
        </span>
        <span class="rr-stat">{a.stat}</span>
      </div>
      <div class="rr-row rr-sub">
        <span class="rr-owner"><TeamChip team={teamFor(a.player.rosterID)} onclick={clickFor(a.player.rosterID)} size={20} /></span>
        {#if a.sub}<span>{a.sub}</span>{/if}
      </div>
    {:else}
      <div class="rr-sub">Not awarded this season</div>
    {/if}
  </div>
{/snippet}

<section class="rr-seasonAwards">
  <div class="rr-top">
    <h6>{title ?? `${awards.season} Season Awards`}</h6>
    {#if hasPost && hasRegular}
      <Toggle
        options={[{ value: "post", label: "Post-season" }, { value: "regular", label: "Regular season" }]}
        bind:value={() => shown, (v) => (group = v)}
        label="Award group"
      />
    {/if}
  </div>

  {#if shown === "post" && awards.post}
    {@const p = awards.post}
    {@const b = p.benchBlunder}
    <div class="rr-podium">
      {#each [{ t: p.runnerUp, label: "Runner-up", place: 2 }, { t: p.champion, label: "Champion", place: 1 }, { t: p.third, label: "Third place", place: 3 }] as s (s.place)}
        {#if s.t}
          <div class="rr-card rr-step rr-place{s.place}">
            <span class="material-icons rr-trophy">{s.place === 1 ? "emoji_events" : "military_tech"}</span>
            <div class="rr-stepLabel">{s.label}</div>
            <TeamChip team={teamFor(s.t.rosterID)} onclick={clickFor(s.t.rosterID)} size={s.place === 1 ? 56 : 40} />
            {#if s.t.seed}<div class="rr-sub">{ordinal(s.t.seed)} seed</div>{/if}
            {#if s.place === 1 && p.champion.opponentPts != null}
              <div class="rr-sub">Won the final {pts(p.champion.points)}–{pts(p.champion.opponentPts)}</div>
            {/if}
          </div>
        {/if}
      {/each}
    </div>

    <div class="rr-groupLabel">Team awards</div>
    <div class="rr-grid">
      {#each postTeam as a (a.title)}{@render teamAward(a)}{/each}
    </div>

    <div class="rr-groupLabel">Player awards</div>
    <div class="rr-grid">
      {#each postPlayers as a (a.title)}{@render playerAward(a)}{/each}
      <div class="rr-card rr-award rr-bad" class:rr-none={!b}>
        <div class="rr-head"><span class="material-icons rr-icon">airline_seat_recline_extra</span>Playoff Bench Blunder</div>
        <div class="rr-why">A benched player whose points would have flipped a playoff loss</div>
        {#if b}
          <div class="rr-row">
            <span class="rr-who rr-player">
              {#if b.bench.pos}<span class="rr-pos" style="--pos: {posColor(b.bench.pos)}">{b.bench.pos}</span>{/if}
              <span class="rr-pname" title={b.bench.name}>{b.bench.name}</span>
            </span>
            <span class="rr-stat">{pts(b.bench.points)}</span>
          </div>
          <div class="rr-row rr-sub">
            <span class="rr-owner"><TeamChip team={teamFor(b.rosterID)} onclick={clickFor(b.rosterID)} size={20} /></span>
            <span>lost by {pts(b.margin)}</span>
          </div>
          <div class="rr-sub">
            Sat on the bench while {b.starter ? `${b.starter.name} started and scored ${pts(b.starter.points)}` : "a lineup spot was empty"}
            in {b.game} vs {name(b.opponent)}
          </div>
        {:else}
          <div class="rr-sub">No playoff loss would have flipped with one bench swap.</div>
        {/if}
      </div>
    </div>
  {:else if awards.regular}
    {@const r = awards.regular}
    {@const t = r.tradeOfYear}
    <div class="rr-groupLabel">Team awards</div>
    <div class="rr-grid">
      {#each regularTeam as a (a.title)}{@render teamAward(a)}{/each}
      <div class="rr-card rr-award rr-good rr-wide" class:rr-none={!t}>
        <div class="rr-head"><span class="material-icons rr-icon">handshake</span>Trade of the Year</div>
        <div class="rr-why">
          Points scored after the trade by the players a team got, minus points scored by the players it sent away
          (for any team, starting or bench). Draft picks
          count as about one season of what that round has produced in this league's rookie drafts.
        </div>
        {#if t}
          <div class="rr-row">
            <span class="rr-who"><TeamChip team={teamFor(t.rosterID)} onclick={clickFor(t.rosterID)} size={32} /></span>
            <span class="rr-stat">{signed(t.net)}</span>
          </div>
          <div class="rr-sub">Trade with {t.partners.map(name).join(" & ")}</div>
          <div class="rr-trade" style="--sides: {t.sides.length}">
            {#each t.sides as side, i (side.rosterID)}
              <div class="rr-side" class:rr-winner={i === 0}>
                <div class="rr-sideHead">
                  <TeamChip team={teamFor(side.rosterID)} onclick={clickFor(side.rosterID)} size={24} />
                  <span class="rr-sideNet">{signed(side.net)}</span>
                </div>
                <div class="rr-tradeLabel">Got</div>
                {#each side.received as pl (pl.playerID)}<div>{pl.name} <span class="rr-muted">{pl.pos} · {pts(pl.points)}</span></div>{/each}
                {#each side.picks as pk}<div>{pickText(pk)} <span class="rr-muted">pick · ~{pk.value}</span></div>{/each}
                {#if side.faab}<div>${side.faab} <span class="rr-muted">FAAB</span></div>{/if}
                {#if !side.received.length && !side.picks.length && !side.faab}<div class="rr-muted">Nothing</div>{/if}
              </div>
            {/each}
          </div>
          <div class="rr-sub">
            {t.week > 1 ? `Week ${t.week}` : "Offseason / week 1"} trade · player points are everything he scored after the trade, for any team
          </div>
        {:else}
          <div class="rr-sub">No trade paid off this season.</div>
        {/if}
      </div>
    </div>

    <div class="rr-groupLabel">Player awards</div>
    <div class="rr-grid">
      {#each regularPlayers as a (a.title)}{@render playerAward(a)}{/each}
    </div>

    {#if r.allLeague?.length}
      <div class="rr-groupLabel">All-League Team</div>
      <p class="rr-note">The top scorer at every lineup spot, counting points in a starting lineup.</p>
      <div class="rr-card rr-lineup">
        {#each r.allLeague as s, i (i)}
          <div class="rr-slotRow">
            <span class="rr-slot">{s.slot.replace("SUPER_FLEX", "SF").replace("IDP_FLEX", "IDP").replace("REC_FLEX", "REC").replace("WRRB_FLEX", "W/R")}</span>
            <span class="rr-pos" style="--pos: {posColor(s.pos)}">{s.pos}</span>
            <span class="rr-pname" title={s.name}>{s.name}</span>
            <span class="rr-owner"><TeamChip team={teamFor(s.rosterID)} onclick={clickFor(s.rosterID)} size={20} /></span>
            <span class="rr-slotPts">{pts(s.points)}</span>
          </div>
        {/each}
      </div>
    {/if}
  {/if}
</section>

<style>
  .rr-seasonAwards {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .rr-top {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    margin-bottom: 4px;
  }

  h6 {
    font-weight: 400;
    text-align: center;
    margin: 0;
  }

  .rr-card {
    min-width: 0;
    border: 1px solid var(--or-table-border, var(--ccc));
    border-radius: 10px;
    background: var(--fff);
    box-shadow: 0 4px 16px var(--or-table-shadow, transparent);
  }

  .rr-groupLabel {
    margin: 14px 0 0;
    font-size: 0.78em;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--or-cyan, #0b8a9a);
  }

  .rr-note {
    margin: -4px 0 0;
    font-size: 0.8em;
    color: var(--or-muted, var(--g999));
  }

  .rr-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr));
    gap: 10px;
  }

  .rr-award {
    display: flex;
    flex-direction: column;
    gap: 7px;
    padding: 12px 14px;
  }

  .rr-wide {
    grid-column: 1 / -1;
  }

  .rr-none {
    opacity: 0.7;
  }

  .rr-head {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.75em;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--or-heading, inherit);
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

  .rr-why {
    margin-top: -3px;
    font-size: 0.75em;
    color: var(--or-muted, var(--g999));
  }

  .rr-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    min-width: 0;
  }

  .rr-who {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    font-weight: 500;
  }

  .rr-stat {
    flex: none;
    font-family: "Orbitron", sans-serif;
    font-weight: 700;
    font-size: 1.2em;
    color: var(--or-heading, inherit);
  }

  .rr-sub {
    font-size: 0.8em;
    color: var(--or-muted, var(--g999));
  }

  .rr-muted {
    color: var(--or-muted, var(--g999));
    font-size: 0.9em;
  }

  .rr-pos {
    flex: none;
    padding: 1px 6px;
    border-radius: 4px;
    font-size: 0.7em;
    font-weight: 700;
    letter-spacing: 0.04em;
    color: var(--pos);
    border: 1px solid var(--pos);
    background: color-mix(in srgb, var(--pos) 14%, transparent);
  }

  .rr-pname {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 600;
  }

  .rr-owner {
    display: flex;
    min-width: 0;
    font-size: 0.95em;
  }

  /* podium: champion in the middle, raised */
  .rr-podium {
    display: grid;
    grid-template-columns: 1fr 1.25fr 1fr;
    align-items: end;
    gap: 10px;
  }

  .rr-step {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 14px 10px;
    text-align: center;
  }

  .rr-step :global(.rr-chip) {
    flex-direction: column;
    gap: 6px;
    text-align: center;
  }

  .rr-place1 {
    padding: 22px 10px 18px;
    border-color: var(--or-orange, #e8590c);
    box-shadow: 0 0 18px var(--or-glow-pink, transparent);
  }

  .rr-trophy {
    font-size: 30px;
    color: var(--or-muted, var(--g999));
  }

  .rr-place1 .rr-trophy {
    font-size: 40px;
    color: var(--or-orange, #e8590c);
  }

  .rr-stepLabel {
    font-size: 0.72em;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--or-cyan, #0b8a9a);
  }

  /* phones: champion on its own row, runner-up and third side by side below */
  @media (max-width: 600px) {
    .rr-podium {
      grid-template-columns: 1fr 1fr;
      align-items: stretch;
    }

    .rr-place1 {
      grid-column: 1 / -1;
      order: -1;
    }

    .rr-step :global(.rr-name) {
      white-space: normal;
    }
  }

  /* trade: one column per team in the deal, the winner's first and outlined */
  .rr-trade {
    display: grid;
    grid-template-columns: repeat(var(--sides, 2), minmax(0, 1fr));
    gap: 10px;
    font-size: 0.88em;
  }

  .rr-side {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
    padding: 10px 12px;
    border: 1px solid var(--or-table-border, var(--ccc));
    border-radius: 8px;
  }

  .rr-side.rr-winner {
    border-color: var(--or-cyan, #0b8a9a);
  }

  .rr-sideHead {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    min-width: 0;
    margin-bottom: 6px;
    font-weight: 500;
  }

  .rr-sideNet {
    flex: none;
    font-family: "Orbitron", sans-serif;
    font-weight: 700;
    font-size: 0.9em;
    color: var(--or-heading, inherit);
  }

  .rr-tradeLabel {
    margin-bottom: 2px;
    font-size: 0.78em;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--or-cyan, #0b8a9a);
  }

  @media (max-width: 600px) {
    .rr-trade {
      grid-template-columns: minmax(0, 1fr);
    }
  }

  /* All-League lineup */
  .rr-lineup {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 420px), 1fr));
    column-gap: 18px;
    padding: 6px 14px;
  }

  .rr-slotRow {
    display: grid;
    grid-template-columns: 34px 38px minmax(0, 1fr) minmax(0, 0.9fr) 52px;
    align-items: center;
    gap: 8px;
    padding: 6px 0;
    border-bottom: 1px solid var(--or-table-border, var(--eee));
    font-size: 0.9em;
  }

  .rr-slot {
    font-size: 0.75em;
    font-weight: 600;
    color: var(--or-muted, var(--g999));
  }

  .rr-slotRow .rr-pos {
    justify-self: start;
  }

  .rr-slotPts {
    text-align: right;
    font-family: "Orbitron", sans-serif;
    font-weight: 700;
    font-size: 0.85em;
  }
</style>
