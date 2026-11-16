<!--
  Player card (option A with tabs; design canvas "PlayerCardA4" / "PlayerCardRB" / "PlayerCardIDP"). One card for the
  whole site, mounted in src/routes/+layout.svelte: any element with data-player-id opens it (clicks and Enter /
  Space are picked up on the page, so pages only add the attribute). A pop-up on wide screens, a bottom sheet on
  phones; Escape, ✕ or the backdrop closes it.
  Overview: season tiles, a scrollable strip of week cards (played weeks open their scoring breakdown, projected
  weeks are just shown), the breakdown. Stats: stat tiles and the game log. History: the player's league moves
  (drafts, trades, waivers) and career table. Game log and career use the same stat columns per position
  (utils/playerCard.js statGroups). Data: cardData.js.
-->
<script>
  import { tick } from "svelte";
  import { playerCard, openPlayerCard, closePlayerCard } from "./playerCard.svelte.js";
  import { loadCard, loadHistory, teamInfo } from "./cardData.js";
  import { posColor } from "../../utils/positions.js";
  import { scoreBreakdown, statGroups, opponentLabel } from "../../utils/playerCard.js";
  import { transactionSides, parseTransactionDate } from "../RayTransactions/transactionView.js";
  import { ordinal } from "../Shared/format.js";
  import Loading from "../Shared/Loading.svelte";

  const TABS = ["Overview", "Stats", "History"];
  const STATUS = { starting: "starting", bench: "on the bench", taxi: "on the taxi squad", ir: "on IR" };

  let card = $state.raw(null);
  let error = $state(null);
  let tab = $state("Overview");
  let selected = $state(null);
  let history = $state.raw(null);
  let historyError = $state(false);
  let dialog = $state(null);
  let strip = $state(null);
  let opener = null;

  // ---- open / load
  $effect(() => {
    const id = playerCard.id;
    if (!id) return;
    let cancelled = false;
    card = null;
    error = null;
    history = null;
    historyError = false;
    tab = "Overview";
    loadCard(id)
      .then((c) => {
        if (cancelled) return;
        card = c;
        selected = c.selected;
      })
      .catch((e) => {
        console.error(e);
        if (!cancelled) error = "This player's stats couldn't be loaded right now. Try again later.";
      });
    return () => (cancelled = true);
  });

  $effect(() => {
    if (tab !== "History" || !card || history || historyError) return;
    let cancelled = false;
    const forCard = card;
    loadHistory(forCard)
      .then((h) => {
        if (!cancelled && card === forCard) history = h;
      })
      .catch((e) => {
        console.error(e);
        if (!cancelled) historyError = true;
      });
    return () => (cancelled = true);
  });

  // ---- page hooks: data-player-id anywhere opens the card; body scroll lock + focus while open
  $effect(() => {
    const target = (e) => e.target?.closest?.("[data-player-id]");
    const onClick = (e) => {
      const el = target(e);
      if (!el || el.closest(".rr-pc")) return;
      e.preventDefault();
      e.stopPropagation();
      opener = el;
      openPlayerCard(el.dataset.playerId);
    };
    const onKey = (e) => {
      if (playerCard.id && e.key === "Escape") return closePlayerCard();
      if (e.key !== "Enter" && e.key !== " ") return;
      const el = target(e);
      if (!el || el.closest(".rr-pc") || el.matches("button, a")) return;
      e.preventDefault();
      opener = el;
      openPlayerCard(el.dataset.playerId);
    };
    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("keydown", onKey, true);
    };
  });

  $effect(() => {
    if (!playerCard.id) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    tick().then(() => dialog?.focus());
    return () => {
      document.body.style.overflow = prev;
      opener?.focus?.();
    };
  });

  // keep the selected week card in view
  $effect(() => {
    if (!strip || selected == null || tab !== "Overview") return;
    const el = strip.querySelector(`[data-week="${selected}"]`);
    el?.scrollIntoView({ block: "nearest", inline: "center", behavior: "instant" });
  });

  // ---- view helpers
  const fmt1 = (n) => (n == null ? "–" : Number(n).toFixed(1));
  const signed = (n) => `${n >= 0 ? "+" : "−"}${Math.abs(n).toFixed(1)}`;

  const player = $derived(card?.player);
  const color = $derived(card ? posColor(card.group ?? player?.pos) : "var(--or-cyan)");
  const groups = $derived(card ? statGroups(card.group) : []);
  const meta = $derived.by(() => {
    if (!player) return "";
    const exp = Number(player.experience);
    return [
      player.t,
      player.age ? `${player.age} yrs` : null,
      Number.isFinite(exp) ? (exp === 0 ? "rookie" : `${ordinal(exp + 1)} NFL season`) : null,
      (player.positions ?? []).length > 1 ? player.positions.join("/") : null,
    ]
      .filter(Boolean)
      .join(" · ");
  });

  const overviewTiles = $derived.by(() => {
    if (!card) return [];
    const { soFar, rank, best, upcoming, group, season } = card;
    const tiles = [
      { value: fmt1(soFar.points), label: "points", sub: `${soFar.games} game${soFar.games === 1 ? "" : "s"}` },
      { value: soFar.games ? fmt1(soFar.points / soFar.games) : "–", label: "per game", sub: String(season) },
    ];
    if (rank?.rank) tiles.push({ value: `${group}${rank.rank}`, label: "in the league", sub: `of ${rank.of} rostered ${group}s` });
    else if (best) tiles.push({ value: fmt1(best.points), label: "best game", sub: `week ${best.week} ${opponentLabel(best.opp, best.away)}` });
    if (upcoming) tiles.push({ value: fmt1(upcoming.avg), label: "projected / game", sub: upcoming.from === upcoming.to ? `week ${upcoming.from}` : `weeks ${upcoming.from}–${upcoming.to}` });
    return tiles;
  });

  const selectedCard = $derived(card?.cards.find((c) => c.week === selected) ?? null);
  const breakdown = $derived(selectedCard && card ? scoreBreakdown(card.weekly?.[selected]?.stats, card.scoring) : []);
  const perGameAvg = $derived(card?.soFar.games ? card.soFar.points / card.soFar.games : null);
  const hot = (pts) => perGameAvg != null && pts != null && pts >= Math.max(perGameAvg * 1.3, perGameAvg + 5);

  const statsLine = $derived.by(() => {
    if (!card) return "";
    const g = card.allGames;
    return [String(card.season), `${g} game${g === 1 ? "" : "s"}`, card.allSnaps != null ? `${card.allSnaps}% of snaps` : null].filter(Boolean).join(" · ");
  });

  // ---- history rows
  const team = (rosterID, season) => teamInfo(card?.managers, rosterID, season);
  const teamLine = (t) => (t.managers ? `${t.name} (${t.managers})` : t.name);
  const longDate = (t) => {
    const d = parseTransactionDate(t?.date)?.date;
    return d ? d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : String(t?.date ?? "");
  };
  const firstSeason = $derived(Math.min(...Object.keys(card?.managers?.teamManagersMap ?? {}).map(Number).filter(Number.isFinite)));
  const timeline = $derived.by(() => {
    if (!history || !card) return [];
    return history.timeline.map((e) => {
      if (e.kind === "draft") {
        const kind = e.season === firstSeason ? "startup draft" : "rookie draft";
        return { kind: e.kind, title: `${e.season} ${kind} · round ${e.round}, pick ${e.pick} (${ordinal(e.overall)} overall)`, sub: teamLine(team(e.rosterID, e.season)) };
      }
      if (e.kind === "trade") {
        const t = e.transaction;
        const sides = transactionSides(t, card.players, (id) => team(id, t.season).name).map((s) => {
          const who = team(s.rosterID, t.season);
          return { who: who.managers || who.name, got: s.items.length ? s.items.map((i) => (i.info && i.kind === "pick" ? `${i.name} (${i.info})` : i.name)).join(", ") : "nothing" };
        });
        const n = t.rosters?.length ?? 2;
        return { kind: e.kind, title: `${longDate(t)} · ${n > 2 ? `${n === 3 ? "three" : n}-team trade` : "trade"}`, sides };
      }
      const what = e.kind === "drop" ? "dropped" : e.bid ? `claimed off waivers ($${e.bid})` : "picked up";
      return { kind: e.kind, title: `${longDate(e.transaction)} · ${what}`, sub: teamLine(team(e.rosterID, e.season)) };
    });
  });
</script>

{#snippet statTable(rows, lead, isCareer)}
  <div class="rr-pcTableWrap">
    <table class="rr-pcTable">
      <thead>
        {#if groups.length}
          <tr class="rr-pcGroupRow">
            <th colspan="4"></th>
            {#each groups as g (g.key)}<th colspan={g.cols.length} class="rr-pcGroup">{g.label}</th>{/each}
          </tr>
        {/if}
        <tr>
          {#each lead as h, i (i)}<th class:rr-pcLeft={i < 2}>{h}</th>{/each}
          {#each groups as g (g.key)}
            {#each g.cols as c, ci (c.key)}<th class:rr-pcSep={ci === 0}>{c.label}</th>{/each}
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each rows as r (isCareer ? r.season : r.week)}
          {#if !isCareer && !r.cells}
            <tr>
              <td class="rr-pcLeft rr-pcMuted">{r.week}</td>
              <td colspan={3 + groups.reduce((n, g) => n + g.cols.length, 0)} class="rr-pcLeft rr-pcNote">
                {r.status === "bye" ? "Bye week" : `Didn't play${r.opp ? ` (${opponentLabel(r.opp, r.away)})` : ""}`}
              </td>
            </tr>
          {:else}
            <tr>
              {#if isCareer}
                <td class="rr-pcLeft">{r.season}</td>
                <td class="rr-pcLeft rr-pcSoft">{r.games}</td>
                <td><b>{fmt1(r.points)}</b></td>
                <td class="rr-pcSoft">{fmt1(r.perGame)}</td>
              {:else}
                <td class="rr-pcLeft rr-pcMuted">{r.week}</td>
                <td class="rr-pcLeft rr-pcNowrap">{opponentLabel(r.opp, r.away)}{#if r.status === "live"} <span class="rr-pcLive">LIVE</span>{/if}</td>
                <td class="rr-pcSoft">{r.snaps == null ? "–" : `${r.snaps}%`}</td>
                <td><b class="rr-pcPts" class:rr-pcHot={hot(r.points)}>{fmt1(r.points)}</b></td>
              {/if}
              {#each r.cells as g, gi (gi)}
                {#each g as c, ci (ci)}<td class:rr-pcSep={ci === 0} class:rr-pcZero={c.zero}>{c.text}</td>{/each}
              {/each}
            </tr>
          {/if}
        {/each}
      </tbody>
    </table>
  </div>
{/snippet}

{#if playerCard.id}
  <div class="rr-pcBackdrop" role="presentation" onclick={closePlayerCard}></div>
  <div class="rr-pc" style="--pc: {color}" role="dialog" aria-modal="true" aria-label={player ? `${player.fn} ${player.ln}` : "Player card"} tabindex="-1" bind:this={dialog}>
    <span class="rr-pcHandle" aria-hidden="true"></span>
    <button type="button" class="rr-pcClose" aria-label="Close" onclick={closePlayerCard}>✕</button>

    {#if error}
      <Loading message={error} progress={false} margin="60px auto" />
    {:else if !card}
      <Loading message="Loading the player card..." margin="60px auto" />
    {:else}
      <header class="rr-pcHead">
        <span class="rr-pcNum" aria-hidden="true">{player.number ?? card.group ?? player.pos}</span>
        <div class="rr-pcId">
          <h2 class="rr-pcName">{player.fn} {player.ln}</h2>
          <span class="rr-pcMeta"><span class="rr-pcPos">{card.group ?? player.pos}</span>{meta}</span>
        </div>
      </header>
      <p class="rr-pcOwner">
        {#if card.owner}
          <span class="rr-pcDot" class:rr-pcDotOn={card.owner.status === "starting"} aria-hidden="true"></span>
          On <b>{card.owner.name}</b>{#if card.owner.managers}&nbsp;({card.owner.managers}){/if} · {STATUS[card.owner.status]}
        {:else if card.season === card.leagueSeason}
          Free agent
        {:else}
          {card.season} season (the {card.leagueSeason} season hasn't started)
        {/if}
      </p>

      <div class="rr-pcTabs" role="tablist">
        {#each TABS as t (t)}
          <button type="button" role="tab" class="rr-pcTab" class:rr-pcOn={tab === t} aria-selected={tab === t} onclick={() => (tab = t)}>{t}</button>
        {/each}
      </div>

      <div class="rr-pcBody">
        {#if tab === "Overview"}
          <div class="rr-pcTiles">
            {#each overviewTiles as t (t.label)}
              <div class="rr-pcTile"><b>{t.value}</b><span>{t.label}</span><small>{t.sub}</small></div>
            {/each}
          </div>

          <section class="rr-pcSection">
            <h3>{card.season} week by week</h3>
            <div class="rr-pcStrip" bind:this={strip}>
              {#each card.cards as c (c.week)}
                {#if c.status === "played" || c.status === "live"}
                  <button type="button" class="rr-pcWeek rr-pcPlayed" class:rr-pcSel={c.week === selected} data-week={c.week} aria-pressed={c.week === selected} onclick={() => (selected = c.week)}>
                    <span class="rr-pcWk" class:rr-pcLiveWk={c.status === "live"}>{c.status === "live" ? `LIVE · WK ${c.week}` : `WK ${c.week}`}</span>
                    <b class="rr-pcOpp">{opponentLabel(c.opp, c.away)}</b>
                    <span class="rr-pcWkPts">{fmt1(c.points)}</span>
                    <span class="rr-pcWkSub">{#if c.proj != null}{#if c.status === "played"}{c.points >= c.proj ? "▲" : "▼"} {/if}proj {fmt1(c.proj)}{:else}&nbsp;{/if}</span>
                  </button>
                {:else if c.status === "projected"}
                  <div class="rr-pcWeek rr-pcProj" data-week={c.week}>
                    <span class="rr-pcWk" class:rr-pcLiveWk={c.week === card.currentWeek}>{c.week === card.currentWeek ? "THIS WEEK" : `WK ${c.week}`}</span>
                    <b class="rr-pcOpp">{c.opp ?? ""}</b>
                    <span class="rr-pcWkProj">{fmt1(c.proj)}</span>
                    <span class="rr-pcWkSub">projected</span>
                  </div>
                {:else}
                  <div class="rr-pcWeek rr-pcOff" data-week={c.week}>
                    <span class="rr-pcWk">WK {c.week}</span>
                    <b class="rr-pcOpp">{c.status === "bye" ? "BYE" : opponentLabel(c.opp, c.away)}</b>
                    <span class="rr-pcWkSub">{c.status === "bye" ? "—" : "didn't play"}</span>
                  </div>
                {/if}
              {/each}
            </div>

            {#if selectedCard}
              <div class="rr-pcBreak">
                <div class="rr-pcBreakHead">
                  <b>Week {selectedCard.week} {opponentLabel(selectedCard.opp, selectedCard.away)}{selectedCard.status === "live" ? " · live" : ""}</b>
                  {#if selectedCard.proj != null}
                    <span>Projected <b>{fmt1(selectedCard.proj)}</b> · scored <b class="rr-pcPink">{fmt1(selectedCard.points)}</b> ({signed(selectedCard.points - selectedCard.proj)})</span>
                  {/if}
                </div>
                {#if breakdown.length}
                  <table class="rr-pcBreakTable">
                    <thead><tr><th></th><th>STAT</th><th>SCORING</th><th>POINTS</th></tr></thead>
                    <tbody>
                      {#each breakdown as b (b.key)}
                        <tr><td>{b.label}</td><td>{b.value}</td><td class="rr-pcSoft">× {b.mult}</td><td><b>{fmt1(b.points)}</b></td></tr>
                      {/each}
                    </tbody>
                    <tfoot><tr><td>Total</td><td></td><td></td><td><b>{fmt1(selectedCard.points)}</b></td></tr></tfoot>
                  </table>
                {:else}
                  <p class="rr-pcNote">Nothing that scores yet.</p>
                {/if}
                {#if selectedCard.status === "live"}<p class="rr-pcNote">Live: Sleeper finalizes the week's stats after Monday's game, so this can still change.</p>{/if}
              </div>
            {:else}
              <p class="rr-pcNote">No games yet this season.</p>
            {/if}
          </section>
        {:else if tab === "Stats"}
          <span class="rr-pcKicker">{statsLine}</span>
          {#if card.tiles.length}
            <div class="rr-pcTiles rr-pcTiles6">
              {#each card.tiles as t (t.label)}
                <div class="rr-pcTile rr-pcTileSm"><b>{t.value}</b><span>{t.label}</span></div>
              {/each}
            </div>
          {/if}
          <span class="rr-pcKicker">Game log</span>
          {#if card.log.length}
            {@render statTable(card.log, ["WK", "OPP", "SNAPS", "PTS"], false)}
          {:else}
            <p class="rr-pcNote">No games yet this season.</p>
          {/if}
        {:else}
          <span class="rr-pcKicker">Transactions</span>
          {#if historyError}
            <p class="rr-pcNote">The league history couldn't be loaded right now.</p>
          {:else if !history}
            <Loading message="Loading the league history..." margin="24px auto" />
          {:else}
            {#if timeline.length}
              <ol class="rr-pcTimeline">
                {#each timeline as e, i (i)}
                  <li class="rr-pcEvent rr-pcEv-{e.kind}">
                    <span class="rr-pcEvDot" aria-hidden="true"></span>
                    <div>
                      <b>{e.title}</b>
                      {#if e.sides}
                        {#each e.sides as s, si (si)}<span class="rr-pcEvLine"><b>{s.who}</b> got {s.got}</span>{/each}
                      {:else}
                        <span class="rr-pcEvSub">{e.sub}</span>
                      {/if}
                    </div>
                  </li>
                {/each}
              </ol>
            {:else}
              <p class="rr-pcNote">No drafts, trades or pickups in this league yet.</p>
            {/if}
            <span class="rr-pcKicker">Career</span>
            {#if history.career.length}
              {@render statTable(history.career, ["SEASON", "G", "PTS", "PER G"], true)}
            {:else}
              <p class="rr-pcNote">No seasons to show yet.</p>
            {/if}
          {/if}
        {/if}
      </div>
    {/if}
  </div>
{/if}

<style>
  /* names that open the card (data-player-id) anywhere on the site */
  :global([data-player-id]) {
    cursor: pointer;
  }

  :global([data-player-id]:hover) {
    text-decoration: underline;
    text-decoration-color: var(--or-cyan, #05d9e8);
    text-underline-offset: 2px;
  }

  :global([data-player-id]:focus-visible) {
    outline: 2px solid var(--or-cyan, #05d9e8);
    outline-offset: 2px;
    border-radius: 3px;
  }

  .rr-pcBackdrop {
    position: fixed;
    inset: 0;
    z-index: 1000;
    background: rgba(5, 0, 15, 0.62);
    backdrop-filter: blur(2px);
  }

  .rr-pc {
    --pcMuted: var(--or-muted, #b7a6d9);
    --pcLine: color-mix(in srgb, var(--or-table-border, #ccc) 55%, transparent);
    --pcGray: color-mix(in srgb, var(--or-muted, #7d6ca3) 72%, transparent);
    position: fixed;
    z-index: 1001;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: min(760px, calc(100vw - 32px));
    max-height: min(880px, calc(100vh - 48px));
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 22px 24px 18px;
    border-radius: 20px;
    border: 1px solid color-mix(in srgb, var(--pc) 60%, transparent);
    background: radial-gradient(circle at 0% 0%, color-mix(in srgb, var(--pc) 14%, transparent), transparent 45%), var(--fff);
    box-shadow: 0 0 40px color-mix(in srgb, var(--pc) 18%, transparent), 0 20px 50px rgba(0, 0, 0, 0.45);
    color: var(--or-text, var(--g111));
    text-align: left;
    outline: none;
    overflow: hidden;
  }

  .rr-pcHandle {
    display: none;
  }

  .rr-pcClose {
    position: absolute;
    top: 14px;
    right: 16px;
    width: 34px;
    height: 34px;
    border: 0;
    border-radius: 50%;
    background: none;
    color: var(--pcMuted);
    font-size: 18px;
    cursor: pointer;
  }

  .rr-pcClose:hover {
    color: var(--or-pink, #ff2a6d);
    background: color-mix(in srgb, var(--or-pink, #ff2a6d) 10%, transparent);
  }

  .rr-pcHead {
    display: flex;
    align-items: center;
    gap: 14px;
    padding-right: 36px;
  }

  .rr-pcNum {
    flex: none;
    display: grid;
    place-items: center;
    width: 56px;
    height: 56px;
    border-radius: 14px;
    font: 800 24px "Orbitron", sans-serif;
    color: var(--pc);
    background: color-mix(in srgb, var(--pc) 14%, transparent);
    border: 1px solid color-mix(in srgb, var(--pc) 55%, transparent);
  }

  .rr-pcId {
    display: flex;
    flex-direction: column;
    gap: 5px;
    min-width: 0;
  }

  h2.rr-pcName {
    margin: 0;
    font: 800 1.35rem "Orbitron", sans-serif;
    color: var(--or-heading, var(--g111));
    text-shadow: 0 0 14px color-mix(in srgb, var(--pc) 40%, transparent);
    text-align: left;
  }

  .rr-pcMeta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    font-size: 0.78rem;
    color: var(--pcMuted);
  }

  .rr-pcPos {
    padding: 1px 7px;
    border-radius: 6px;
    font: 700 0.7rem "Roboto", sans-serif;
    color: var(--pc);
    background: color-mix(in srgb, var(--pc) 14%, transparent);
    border: 1px solid color-mix(in srgb, var(--pc) 50%, transparent);
  }

  .rr-pcOwner {
    margin: 0;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px;
    font-size: 0.8rem;
    color: var(--pcMuted);
  }

  .rr-pcOwner b {
    color: var(--or-text, var(--g111));
  }

  .rr-pcDot {
    width: 8px;
    height: 8px;
    margin-right: 4px;
    border-radius: 50%;
    background: var(--pcMuted);
  }

  .rr-pcDot.rr-pcDotOn {
    background: var(--or-cyan, #05d9e8);
  }

  .rr-pcTabs {
    display: flex;
    gap: 6px;
    padding-bottom: 10px;
    border-bottom: 1px solid var(--pcLine);
  }

  .rr-pcTab {
    padding: 6px 14px;
    border-radius: 999px;
    border: 1px solid var(--or-table-border, #ccc);
    background: none;
    font: 500 0.8rem "Roboto", sans-serif;
    color: var(--or-text, var(--g111));
    cursor: pointer;
  }

  .rr-pcTab.rr-pcOn {
    background: var(--or-cyan, #0b8a9a);
    border-color: var(--or-cyan, #0b8a9a);
    color: var(--fff);
    font-weight: 700;
  }

  .rr-pcBody {
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding-right: 2px;
  }

  .rr-pcTiles {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
    gap: 10px;
  }

  .rr-pcTiles6 {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
  }

  .rr-pcTile {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 10px 12px;
    border-radius: 12px;
    border: 1px solid var(--or-table-border, #ccc);
    min-width: 0;
  }

  .rr-pcTile b {
    font: 800 1.2rem "Orbitron", sans-serif;
    color: var(--or-heading, var(--g111));
  }

  .rr-pcTile span {
    font-size: 0.72rem;
    color: var(--or-text, var(--g111));
  }

  .rr-pcTile small {
    font-size: 0.65rem;
    color: var(--pcMuted);
  }

  .rr-pcTileSm {
    padding: 8px 10px;
  }

  .rr-pcTileSm b {
    font-size: 0.95rem;
  }

  .rr-pcSection {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 14px 16px;
    border-radius: 16px;
    border: 1px solid var(--or-table-border, #ccc);
    background: var(--f8f8f8);
  }

  .rr-pcSection h3 {
    margin: 0;
    font: 700 0.85rem "Orbitron", sans-serif;
    color: var(--or-heading, var(--g111));
    text-align: left;
  }

  .rr-pcStrip {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    padding: 3px 3px 8px;
    scrollbar-width: thin;
  }

  .rr-pcWeek {
    flex: none;
    width: 78px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    padding: 8px 4px;
    border-radius: 12px;
    font-family: "Roboto", sans-serif;
    color: var(--or-text, var(--g111));
  }

  .rr-pcPlayed {
    border: 1px solid color-mix(in srgb, var(--pc) 60%, transparent);
    background: color-mix(in srgb, var(--pc) 10%, transparent);
    cursor: pointer;
  }

  .rr-pcPlayed:hover {
    background: color-mix(in srgb, var(--pc) 18%, transparent);
  }

  .rr-pcPlayed.rr-pcSel {
    border: 2px solid var(--or-cyan, #05d9e8);
    padding: 7px 3px;
    box-shadow: 0 0 14px color-mix(in srgb, var(--or-cyan, #05d9e8) 35%, transparent);
  }

  .rr-pcProj {
    border: 1px dashed color-mix(in srgb, var(--pc) 50%, transparent);
    opacity: 0.85;
  }

  .rr-pcOff {
    border: 1px solid var(--pcLine);
    opacity: 0.6;
  }

  .rr-pcWk {
    font-size: 0.62rem;
    color: var(--pcMuted);
    white-space: nowrap;
  }

  .rr-pcWk.rr-pcLiveWk {
    color: var(--or-pink, #ff2a6d);
    font-weight: 700;
  }

  .rr-pcOpp {
    font-size: 0.75rem;
    white-space: nowrap;
  }

  .rr-pcWkPts {
    font: 800 0.9rem "Orbitron", sans-serif;
    color: var(--or-heading, var(--g111));
  }

  .rr-pcWkProj {
    font: 700 0.78rem "Orbitron", sans-serif;
    color: var(--pc);
  }

  .rr-pcWkSub {
    font-size: 0.6rem;
    color: var(--pcMuted);
    white-space: nowrap;
  }

  .rr-pcBreak {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px 14px;
    border-radius: 14px;
    border: 1px solid color-mix(in srgb, var(--or-cyan, #05d9e8) 45%, transparent);
    background: color-mix(in srgb, var(--or-cyan, #05d9e8) 5%, transparent);
  }

  .rr-pcBreakHead {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: baseline;
    gap: 6px 12px;
    font-size: 0.75rem;
    color: var(--pcMuted);
  }

  .rr-pcBreakHead > b {
    font: 700 0.8rem "Orbitron", sans-serif;
    color: var(--or-heading, var(--g111));
  }

  .rr-pcBreakHead span b {
    color: var(--or-text, var(--g111));
  }

  .rr-pcBreakHead span b.rr-pcPink,
  .rr-pcPink {
    color: var(--or-pink, #ff2a6d);
  }

  table.rr-pcBreakTable,
  table.rr-pcTable {
    width: 100%;
    border-collapse: collapse;
    font-variant-numeric: tabular-nums;
    background: none;
  }

  table.rr-pcBreakTable {
    font-size: 0.82rem;
  }

  .rr-pcBreakTable th {
    padding: 5px 6px;
    font: 700 0.62rem "Roboto", sans-serif;
    letter-spacing: 0.08em;
    color: var(--or-cyan, #0b8a9a);
    text-align: right;
  }

  .rr-pcBreakTable td {
    padding: 6px;
    text-align: right;
    border-top: 1px solid var(--pcLine);
  }

  .rr-pcBreakTable td:first-child,
  .rr-pcBreakTable th:first-child {
    text-align: left;
  }

  .rr-pcBreakTable tfoot td {
    font-weight: 700;
    border-top: 1px solid var(--or-table-border, #ccc);
  }

  .rr-pcKicker {
    font: 700 0.62rem "Orbitron", sans-serif;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--or-cyan, #0b8a9a);
  }

  .rr-pcTableWrap {
    overflow-x: auto;
  }

  table.rr-pcTable {
    font-size: 0.72rem;
  }

  .rr-pcTable th,
  .rr-pcTable td {
    padding: 5px 4px;
    text-align: right;
    white-space: nowrap;
  }

  .rr-pcTable th {
    font: 700 0.6rem "Roboto", sans-serif;
    letter-spacing: 0.04em;
    color: var(--or-cyan, #0b8a9a);
  }

  .rr-pcTable th.rr-pcGroup {
    text-align: center;
    font-size: 0.56rem;
    letter-spacing: 0.06em;
    color: var(--pcGray);
    border-bottom: 1px solid var(--pcGray);
  }

  .rr-pcTable tbody tr {
    border-top: 1px solid var(--pcLine);
  }

  .rr-pcTable .rr-pcLeft {
    text-align: left;
  }

  .rr-pcTable .rr-pcSep {
    border-left: 1px solid var(--pcLine);
  }

  .rr-pcMuted,
  .rr-pcZero {
    color: var(--pcGray);
  }

  .rr-pcSoft {
    color: var(--pcMuted);
  }

  .rr-pcNowrap {
    white-space: nowrap;
  }

  .rr-pcPts {
    padding: 2px 5px;
    border-radius: 6px;
    font: 700 0.7rem "Orbitron", sans-serif;
  }

  .rr-pcPts.rr-pcHot {
    background: color-mix(in srgb, var(--or-pink, #ff2a6d) 25%, transparent);
  }

  .rr-pcLive {
    padding: 0 4px;
    border-radius: 4px;
    font: 700 0.55rem "Roboto", sans-serif;
    color: var(--or-pink, #ff2a6d);
    border: 1px solid color-mix(in srgb, var(--or-pink, #ff2a6d) 60%, transparent);
  }

  .rr-pcNote {
    margin: 0;
    font-size: 0.75rem;
    font-style: italic;
    color: var(--pcMuted);
  }

  .rr-pcTable td.rr-pcNote {
    font-size: 0.72rem;
  }

  .rr-pcTimeline {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .rr-pcEvent {
    display: grid;
    grid-template-columns: 14px minmax(0, 1fr);
    gap: 10px;
    font-size: 0.82rem;
  }

  .rr-pcEvent > div {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .rr-pcEvDot {
    margin-top: 4px;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--or-cyan, #05d9e8);
  }

  .rr-pcEv-trade .rr-pcEvDot {
    background: var(--or-pink, #ff2a6d);
  }

  .rr-pcEv-drop .rr-pcEvDot {
    background: var(--pcMuted);
  }

  .rr-pcEvSub {
    font-size: 0.75rem;
    color: var(--pcMuted);
  }

  .rr-pcEvLine {
    font-size: 0.76rem;
    color: var(--pcMuted);
  }

  .rr-pcEvLine b {
    color: var(--or-text, var(--g111));
  }

  /* phones: a bottom sheet; header and tabs stay put, the rest scrolls */
  @media (max-width: 699.98px) {
    .rr-pc {
      top: auto;
      bottom: 0;
      left: 0;
      transform: none;
      width: 100%;
      max-height: 92vh;
      max-height: 92dvh;
      padding: 10px 16px 16px;
      border-radius: 24px 24px 0 0;
      border-width: 1px 0 0;
    }

    .rr-pcHandle {
      display: block;
      align-self: center;
      width: 44px;
      height: 5px;
      border-radius: 3px;
      background: color-mix(in srgb, var(--pcMuted) 50%, transparent);
    }

    .rr-pcClose {
      top: 18px;
      right: 10px;
    }

    .rr-pcNum {
      width: 46px;
      height: 46px;
      font-size: 20px;
    }

    h2.rr-pcName {
      font-size: 1.1rem;
    }

    .rr-pcTiles {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .rr-pcTiles6 {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .rr-pcSection {
      padding: 12px;
    }

    .rr-pcWeek {
      width: 66px;
    }

    .rr-pcTable th,
    .rr-pcTable td {
      padding: 4px 2.5px;
    }
  }
</style>
