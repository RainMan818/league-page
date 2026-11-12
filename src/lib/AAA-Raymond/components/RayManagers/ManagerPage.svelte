<!--
  /manager?manager=N (option A "profile dashboard"): banner (photo, team, facts, bio, previous/next), five stat
  tiles, then a trophy case + league records and the profile (philosophy, desire to trade, favorite player, rival)
  on the left, and the starting lineup + recent moves on the right. Same props as the template's Manager.svelte
  (swapped in via components.js). Numbers from utils/managerProfile.js; nothing here fetches new Sleeper data
  beyond the cached helpers the page already used (players, standings).
-->
<script>
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { loadPlayers, getLeagueTransactions, getLeagueStandings } from "$lib/utils/helper";
  import TransactionsPage from "$lib/Transactions/TransactionsPage.svelte";
  import TransactionFeed from "../RayTransactions/TransactionFeed.svelte";
  import PosChip from "../Shared/PosChip.svelte";
  import { ordinal } from "../Shared/format.js";
  import { loadLeagueContext } from "../../utils/leagueContext.js";
  import { careerStats, managerTrophies, titleYears, managerRecords, rosterLineup, isPlaceholderText } from "../../utils/managerProfile.js";
  import { managerBasics, currentStandings, favoriteTeam, recordText, pctText } from "./managerInfo.js";

  let { manager, managers, rostersData, leagueTeamManagers, rosterPositions, transactionsData, awards, records } = $props();

  // the page switches managers itself (like the template), so it doesn't wait on the route to reload
  let idx = $state(Number(manager));
  $effect.pre(() => {
    idx = Number(manager);
  });

  let playersInfo = $state.raw(null);
  let transactions = $state.raw(transactionsData?.transactions ?? []);
  let standing = $state.raw(null);
  let showBench = $state(false);
  let showAllMoves = $state(false);

  onMount(async () => {
    if (transactionsData?.stale) {
      getLeagueTransactions(false, true)
        .then((t) => (transactions = t.transactions))
        .catch((e) => console.error(e));
    }
    loadLeagueContext({ standingsData: getLeagueStandings(), leagueTeamManagersData: leagueTeamManagers })
      .then((ctx) => (standing = currentStandings(ctx)))
      .catch((e) => console.error(e));
    const p = await loadPlayers(null);
    playersInfo = p;
    if (p.stale) playersInfo = await loadPlayers(null, true);
  });

  const m = $derived(managers[idx]);
  const b = $derived(managerBasics(m, idx, leagueTeamManagers));
  const career = $derived(careerStats(records, b.managerID));
  const trophies = $derived(managerTrophies(awards, b.owns, m.tookOver));
  const titles = $derived(titleYears(trophies));
  const bookRecords = $derived(managerRecords(records, b.managerID, b.owns, m.tookOver));
  const anyFormer = $derived(trophies.some((t) => t.former) || bookRecords.some((r) => r.former));
  const now = $derived(b.until ? null : standing?.[String(b.rosterID)]);
  const fav = $derived(favoriteTeam(m.favoriteTeam));
  const players = $derived(playersInfo?.players ?? {});
  const roster = $derived(b.year == leagueTeamManagers.currentSeason ? rostersData?.rosters?.[b.rosterID] : null);
  const lineup = $derived(roster ? rosterLineup(roster, rosterPositions, players) : null);
  const teamMoves = $derived(transactions.filter((t) => t.rosters.includes(parseInt(b.rosterID))));
  const bio = $derived(isPlaceholderText(m.bio) ? "" : m.bio);
  const philosophy = $derived(isPlaceholderText(m.philosophy) ? "" : m.philosophy);
  const favPlayer = $derived(m.favoritePlayer ? players[m.favoritePlayer] : null);
  const rival = $derived(m.rival && m.rival.name && m.rival.name !== "TBD" ? m.rival : null);

  const tiles = $derived([
    {
      k: "All-time",
      v: career ? recordText(career.wins, career.losses, career.ties) : "–",
      sub: career?.pct != null ? `${pctText(career.pct)} win % · ${ordinal(career.pctRank)}` : "",
    },
    {
      k: "Playoffs",
      v: career && career.playoffWins + career.playoffLosses + career.playoffTies ? recordText(career.playoffWins, career.playoffLosses, career.playoffTies) : "—",
      sub: career ? `${career.appearances} appearance${career.appearances === 1 ? "" : "s"}` : "",
    },
    { k: "Titles", v: String(titles.length), sub: titles.length ? titles.join(", ") : "None yet", gold: titles.length > 0 },
    {
      k: "Points for",
      v: career ? Math.round(career.pf).toLocaleString("en-US") : "–",
      sub: career ? `${ordinal(career.pfRank)} all-time` : "",
    },
    {
      k: leagueTeamManagers.currentSeason ? String(leagueTeamManagers.currentSeason) : "This season",
      v: now ? recordText(now.wins, now.losses, now.ties) : "—",
      sub: now ? `${ordinal(now.place)} in the standings` : b.until ? "Not in the league" : "",
      cyan: !!now,
    },
  ]);

  const changeManager = (n, noScroll = true) => {
    if (n < 0 || n >= managers.length) return;
    idx = n;
    showBench = false;
    showAllMoves = false;
    goto(`/manager?manager=${n}`, { noScroll });
  };

  const initials = (name) =>
    String(name ?? "")
      .replace(/[^A-Za-z ]/g, "")
      .split(" ")
      .filter(Boolean)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  const hideImg = (e) => (e.currentTarget.style.display = "none");
  const trophyIcon = (kind) => (kind === "champion" || kind === "regular" || kind === "division" ? "gold" : kind === "toilet" ? "dim" : "silver");
</script>

{#snippet navButtons(noScroll)}
  <div class="rr-navBtns">
    <button type="button" class="rr-navBtn" disabled={idx === 0} onclick={() => changeManager(idx - 1, noScroll)}>
      ← {idx > 0 ? managers[idx - 1].name : "Previous"}
    </button>
    <button type="button" class="rr-navBtn" disabled={idx === managers.length - 1} onclick={() => changeManager(idx + 1, noScroll)}>
      {idx < managers.length - 1 ? managers[idx + 1].name : "Next"} →
    </button>
  </div>
{/snippet}

{#snippet player(p, slot = null)}
  <div class="rr-player">
    {#if slot != null}<span class="rr-slot">{slot}</span>{/if}
    {#if p.name}
      <PosChip pos={p.pos} size="0.66em" />
      <b class="rr-pName">{p.name}</b>
      <span class="rr-nfl">{p.nfl}</span>
    {:else}
      <span class="rr-empty">Empty</span>
    {/if}
  </div>
{/snippet}

<div class="rr-managerPage">
  <section class="rr-hero">
    <span class="rr-avatar">
      <span class="rr-initials" aria-hidden="true">{initials(m.name)}</span>
      {#if b.photo}<img src={b.photo} alt="" onerror={hideImg} />{/if}
    </span>
    <div class="rr-heroText">
      <h1 class="rr-mName">{m.name}</h1>
      <p class="rr-mTeam">
        {b.until ? "Former manager of" : b.coManaged ? "Co-manager of" : "Manager of"} <i>{b.teamName}</i>
      </p>
      <div class="rr-chips">
        {#if b.commissioner}<span class="rr-chip rr-commish">Commissioner</span>{/if}
        {#if m.location}<span class="rr-chip">{m.location}</span>{/if}
        {#if b.since}
          <span class="rr-chip">{b.until ? `In the league ${b.since}–${b.until}` : `In the league since '${String(b.since).slice(2)}`}</span>
        {:else if m.fantasyStart}
          <span class="rr-chip">Playing since '{String(m.fantasyStart).slice(2)}</span>
        {/if}
        {#if fav}<span class="rr-chip"><img src={fav.logo} alt="" onerror={hideImg} />{fav.name} fan</span>{/if}
        {#if m.preferredContact}<span class="rr-chip">Reach on {m.preferredContact}</span>{/if}
      </div>
      {#if bio}<p class="rr-bio">{@html bio}</p>{/if}
    </div>
    <!-- a div, not <nav>: the template styles every <nav> as the site header -->
    <div class="rr-heroNav" role="navigation" aria-label="Other managers">
      {@render navButtons(true)}
      <a class="rr-allLink" href="/managers">All managers</a>
    </div>
  </section>

  <div class="rr-tiles">
    {#each tiles as t}
      <div class="rr-tile">
        <span class="rr-k">{t.k}</span>
        <b class="rr-v" class:rr-gold={t.gold} class:rr-cyan={t.cyan}>{t.v}</b>
        {#if t.sub}<span class="rr-sub">{t.sub}</span>{/if}
      </div>
    {/each}
  </div>

  <div class="rr-cols">
    <div class="rr-col">
      <section class="rr-card">
        <h2 class="rr-h">Trophy case</h2>
        {#each trophies as t}
          <div class="rr-trophy rr-{trophyIcon(t.kind)}">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
              <path d="M8 4h8v5a4 4 0 0 1-8 0V4z" /><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 20h8M9 17h6" />
            </svg>
            <span class="rr-tText">
              <b>{t.title}{t.former ? "*" : ""}</b>
              <span class="rr-tYear">{t.year}</span>
            </span>
          </div>
        {:else}
          <p class="rr-muted">No trophies yet.</p>
        {/each}

        {#if bookRecords.length}
          <span class="rr-k rr-recHead">League records</span>
          {#each bookRecords as r}
            <div class="rr-rec">
              <span class="rr-rank">{r.rankText}</span>
              <span>{r.label}{r.former ? "*" : ""}</span>
              <span class="rr-recVal">{r.value}</span>
            </div>
          {/each}
        {/if}
        {#if anyFormer}<p class="rr-note">*Earned under a previous manager</p>{/if}
      </section>

      <section class="rr-card">
        <h2 class="rr-h">Profile</h2>
        {#if philosophy}<blockquote class="rr-quote">“{@html philosophy}”</blockquote>{/if}
        {#if m.tradingScale}
          <div class="rr-meter">
            <span class="rr-meterHead"><span class="rr-muted">Desire to trade</span><b>{m.tradingScale} / 10</b></span>
            <span class="rr-bar"><span class="rr-fill" style="width: {Math.min(10, m.tradingScale) * 10}%"></span></span>
          </div>
        {/if}
        <div class="rr-facts">
          {#if m.favoritePlayer}
            <span class="rr-fact">
              <span class="rr-k">Favorite player</span>
              <span class="rr-favPlayer">
                <img src="https://sleepercdn.com/content/nfl/players/thumb/{m.favoritePlayer}.jpg" alt="" onerror={hideImg} />
                <b>{favPlayer ? `${favPlayer.fn} ${favPlayer.ln}` : "…"}</b>
                {#if favPlayer?.pos}<PosChip pos={favPlayer.pos} size="0.66em" />{/if}
              </span>
            </span>
          {/if}
          <span class="rr-fact">
            <span class="rr-k">Rival</span>
            {#if rival && rival.link != null}
              <button type="button" class="rr-linkBtn" onclick={() => changeManager(Number(rival.link), false)}>{rival.name}</button>
            {:else if rival}
              <b>{rival.name}</b>
            {:else}
              <span class="rr-muted">Not picked yet</span>
            {/if}
          </span>
          {#if m.valuePosition}<span class="rr-fact"><span class="rr-k">Favorite asset</span><b>{m.valuePosition}</b></span>{/if}
          {#if m.rookieOrVets}<span class="rr-fact"><span class="rr-k">Rookies or vets</span><b>{m.rookieOrVets}</b></span>{/if}
          {#if m.mode}<span class="rr-fact"><span class="rr-k">Win now or rebuild</span><b>{m.mode}</b></span>{/if}
        </div>
      </section>
    </div>

    <div class="rr-col">
      {#if !b.until}
        <section class="rr-card">
          <div class="rr-cardHead">
            <h2 class="rr-h">Starting lineup</h2>
            {#if lineup && lineup.bench.length}
              <button type="button" class="rr-linkBtn" aria-expanded={showBench} onclick={() => (showBench = !showBench)}>
                {showBench ? "Hide bench" : `Bench (${lineup.bench.length})`}
              </button>
            {/if}
          </div>
          {#if !playersInfo}
            <p class="rr-muted">Loading players…</p>
          {:else if lineup}
            <div class="rr-lineup">
              {#each lineup.starters as p, i (i)}
                {@render player(p, p.slot)}
              {/each}
            </div>
            {#if showBench}
              <span class="rr-k rr-recHead">Bench</span>
              <div class="rr-lineup">
                {#each lineup.bench as p (p.id)}
                  {@render player(p, "BN")}
                {/each}
              </div>
            {/if}
            {#if lineup.reserve.length || lineup.taxi.length}
              <span class="rr-k rr-recHead">IR &amp; taxi</span>
              <div class="rr-lineup">
                {#each lineup.reserve as p (p.id)}
                  {@render player(p, "IR")}
                {/each}
                {#each lineup.taxi as p (p.id)}
                  {@render player(p, "TX")}
                {/each}
              </div>
            {/if}
          {/if}
        </section>
      {/if}

      <section class="rr-card">
        <div class="rr-cardHead">
          <h2 class="rr-h">Recent moves</h2>
          {#if teamMoves.length > 5}
            <button type="button" class="rr-linkBtn" aria-expanded={showAllMoves} onclick={() => (showAllMoves = !showAllMoves)}>
              {showAllMoves ? "Show fewer" : `All ${teamMoves.length} moves`}
            </button>
          {/if}
        </div>
        {#if !playersInfo}
          <p class="rr-muted">Loading moves…</p>
        {:else if !teamMoves.length}
          <p class="rr-muted">No trades or waiver moves yet.</p>
        {:else if showAllMoves}
          <TransactionsPage {playersInfo} transactions={teamMoves} {leagueTeamManagers} show="both" query="" page={0} perPage={10} />
        {:else}
          <TransactionFeed transactions={teamMoves.slice(0, 5)} {players} {leagueTeamManagers} compact />
        {/if}
      </section>
    </div>
  </div>

  <div class="rr-bottomNav" role="navigation" aria-label="Other managers">
    {@render navButtons(false)}
    <a class="rr-allLink" href="/managers">All managers</a>
  </div>
</div>

<style>
  .rr-managerPage {
    max-width: 1140px;
    margin: 0 auto;
    padding: 2em 16px 4em;
    text-align: left;
    display: flex;
    flex-direction: column;
    gap: 16px;
    color: var(--or-text, var(--g333));
  }

  .rr-hero {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    gap: 26px;
    align-items: center;
    padding: 26px 28px;
    border-radius: 18px;
    border: 1px solid var(--or-table-border, var(--ccc));
    background: radial-gradient(circle at 10% 30%, color-mix(in srgb, var(--or-pink, #ff2a6d) 20%, transparent), transparent 55%), var(--fff);
    box-shadow: 0 6px 24px var(--or-table-shadow, transparent);
  }

  .rr-avatar {
    position: relative;
    width: 104px;
    height: 104px;
    border-radius: 50%;
    overflow: hidden;
    display: grid;
    place-items: center;
    background: linear-gradient(135deg, var(--or-pink, #ff2a6d), var(--or-purple, #b537f2));
    box-shadow: 0 0 0 3px var(--fff), 0 0 0 5px var(--or-pink, #ff2a6d), 0 0 26px var(--or-glow-pink, transparent);
  }

  .rr-avatar img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .rr-initials {
    font: 700 32px "Orbitron", sans-serif;
    color: #fff;
  }

  .rr-heroText {
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 0;
  }

  h1.rr-mName {
    margin: 0;
    font: 800 2.2rem "Orbitron", sans-serif;
    line-height: 1.1;
    color: var(--or-heading, var(--g111));
    text-shadow: var(--or-heading-glow, none);
    background: none;
    -webkit-background-clip: border-box;
    background-clip: border-box;
    filter: none;
  }

  .rr-mTeam {
    margin: 0;
    color: var(--or-muted, var(--g999));
  }

  .rr-mTeam i {
    color: var(--or-cyan, #0b8a9a);
  }

  .rr-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .rr-chip {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 10px;
    border-radius: 999px;
    border: 1px solid var(--or-table-border, var(--ccc));
    font-size: 0.78em;
  }

  .rr-chip img {
    width: 16px;
    height: 16px;
  }

  .rr-commish {
    border-color: transparent;
    background: color-mix(in srgb, var(--or-orange, #ff9e3d) 18%, transparent);
    color: var(--or-orange, #ff9e3d);
    font-weight: 700;
  }

  .rr-bio {
    margin: 2px 0 0;
    font-size: 0.92em;
    line-height: 1.5;
  }

  .rr-heroNav,
  .rr-bottomNav {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 8px;
  }

  .rr-bottomNav {
    align-items: center;
    margin-top: 10px;
  }

  .rr-navBtns {
    display: flex;
    gap: 8px;
  }

  .rr-navBtn {
    min-height: 40px;
    padding: 8px 12px;
    border-radius: 10px;
    border: 1px solid var(--or-table-border, var(--ccc));
    background: transparent;
    color: var(--or-text, var(--g333));
    font: 500 0.85em "Roboto", sans-serif;
    cursor: pointer;
    white-space: nowrap;
  }

  .rr-navBtn:hover:not(:disabled) {
    border-color: var(--or-pink, var(--blueOne));
    color: var(--or-pink, var(--blueOne));
  }

  .rr-navBtn:disabled {
    opacity: 0.4;
    cursor: default;
  }

  .rr-allLink {
    font-size: 0.8em;
    color: var(--or-cyan, #0b8a9a);
  }

  .rr-tiles {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 12px;
  }

  .rr-tile {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 14px 16px;
    border-radius: 12px;
    border: 1px solid var(--or-table-border, var(--ccc));
    background: var(--fff);
  }

  .rr-k {
    font-size: 0.66em;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--or-muted, var(--g999));
  }

  .rr-v {
    font: 700 1.35em "Orbitron", sans-serif;
  }

  .rr-v.rr-gold {
    color: var(--or-orange, #ff9e3d);
  }

  .rr-v.rr-cyan {
    color: var(--or-cyan, #0b8a9a);
  }

  .rr-sub {
    font-size: 0.76em;
    color: var(--or-muted, var(--g999));
  }

  .rr-cols {
    display: grid;
    grid-template-columns: minmax(0, 420px) minmax(0, 1fr);
    gap: 16px;
    align-items: start;
  }

  .rr-col {
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-width: 0;
  }

  .rr-card {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 18px;
    border-radius: 14px;
    border: 1px solid var(--or-table-border, var(--ccc));
    background: var(--fff);
    box-shadow: 0 6px 24px var(--or-table-shadow, transparent);
    min-width: 0;
  }

  .rr-cardHead {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 10px;
  }

  h2.rr-h {
    margin: 0;
    font: 700 1rem "Orbitron", sans-serif;
    color: var(--or-heading, var(--g111));
    text-align: left;
  }

  .rr-trophy {
    display: flex;
    gap: 12px;
    align-items: center;
    padding: 10px 12px;
    border-radius: 10px;
  }

  .rr-trophy.rr-gold {
    color: var(--or-orange, #ff9e3d);
    background: linear-gradient(90deg, color-mix(in srgb, var(--or-orange, #ff9e3d) 18%, transparent), transparent);
  }

  .rr-trophy.rr-silver {
    color: var(--or-cyan, #0b8a9a);
    background: linear-gradient(90deg, color-mix(in srgb, var(--or-cyan, #05d9e8) 12%, transparent), transparent);
  }

  .rr-trophy.rr-dim {
    color: var(--or-muted, var(--g999));
  }

  .rr-tText {
    display: flex;
    flex-direction: column;
  }

  .rr-tText b {
    color: var(--or-text, var(--g333));
    font-size: 0.92em;
  }

  .rr-tYear {
    font-size: 0.78em;
  }

  .rr-recHead {
    margin-top: 4px;
  }

  .rr-rec {
    display: grid;
    grid-template-columns: 42px minmax(0, 1fr) auto;
    gap: 8px;
    align-items: center;
    font-size: 0.85em;
  }

  .rr-rank {
    font: 700 0.8em "Orbitron", sans-serif;
    color: var(--or-cyan, #0b8a9a);
  }

  .rr-recVal {
    font-size: 0.9em;
    color: var(--or-muted, var(--g999));
    white-space: nowrap;
  }

  .rr-note,
  .rr-muted {
    margin: 0;
    font-size: 0.82em;
    color: var(--or-muted, var(--g999));
  }

  .rr-quote {
    margin: 0;
    padding: 10px 14px;
    border-radius: 10px;
    background: color-mix(in srgb, var(--or-purple, #b537f2) 12%, transparent);
    font-style: italic;
    font-size: 0.92em;
    overflow-wrap: anywhere;
  }

  .rr-meter {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .rr-meterHead {
    display: flex;
    justify-content: space-between;
    font-size: 0.85em;
  }

  .rr-bar {
    height: 8px;
    border-radius: 999px;
    background: var(--or-table-border, var(--ddd));
    overflow: hidden;
  }

  .rr-fill {
    display: block;
    height: 100%;
    background: linear-gradient(90deg, var(--or-purple, #7b1fa2), var(--or-pink, #c2185b));
  }

  .rr-facts {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    font-size: 0.88em;
  }

  .rr-fact {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }

  .rr-favPlayer {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .rr-favPlayer img {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    object-fit: cover;
    background: var(--or-table-border, var(--ddd));
  }

  .rr-linkBtn {
    padding: 0;
    border: 0;
    background: none;
    color: var(--or-cyan, #0b8a9a);
    font: inherit;
    font-size: 0.85em;
    cursor: pointer;
    text-align: left;
  }

  .rr-linkBtn:hover {
    text-decoration: underline;
  }

  .rr-lineup {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0 18px;
  }

  .rr-player {
    display: grid;
    grid-template-columns: 38px auto minmax(0, 1fr) auto;
    gap: 6px;
    align-items: center;
    padding: 6px 0;
    border-bottom: 1px solid color-mix(in srgb, var(--or-table-border, #ccc) 60%, transparent);
    font-size: 0.85em;
  }

  .rr-slot {
    font-size: 0.78em;
    letter-spacing: 0.04em;
    color: var(--or-muted, var(--g999));
  }

  .rr-pName {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .rr-nfl {
    font-size: 0.8em;
    color: var(--or-muted, var(--g999));
  }

  .rr-empty {
    grid-column: 2 / -1;
    color: var(--or-muted, var(--g999));
    font-style: italic;
  }

  @media (max-width: 900px) {
    .rr-hero {
      grid-template-columns: auto minmax(0, 1fr);
    }

    .rr-heroNav {
      grid-column: 1 / -1;
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
    }

    .rr-tiles {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .rr-cols {
      grid-template-columns: minmax(0, 1fr);
    }
  }

  @media (max-width: 560px) {
    .rr-hero {
      grid-template-columns: minmax(0, 1fr);
      justify-items: center;
      text-align: center;
      padding: 22px 16px;
    }

    .rr-chips {
      justify-content: center;
    }

    .rr-heroNav {
      flex-direction: column;
      align-items: center;
      width: 100%;
    }

    .rr-navBtns {
      width: 100%;
    }

    .rr-navBtn {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    h1.rr-mName {
      font-size: 1.7rem;
    }

    .rr-lineup {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
