<!--
  /managers (option A "trading cards"): one card per manager from leagueInfo.js with their team, years in the
  league, favorite NFL team, all-time record, titles and this season's record. Sort by league order, titles,
  all-time win % or this season. Stats fill in once the records, awards and standings load (all cached helpers
  the manager pages and homepage already use). Swapped in for the template's AllManagers via components.js.
-->
<script>
  import { onMount } from "svelte";
  import { getLeagueRecords, getAwards, getLeagueStandings } from "$lib/utils/helper";
  import { loadLeagueContext } from "../../utils/leagueContext.js";
  import { careerStats, managerTrophies, titleYears } from "../../utils/managerProfile.js";
  import { managerBasics, currentStandings, favoriteTeam, yearsText, recordText } from "./managerInfo.js";

  let { managers, leagueTeamManagers } = $props();

  let records = $state.raw(null);
  let awards = $state.raw([]);
  let standing = $state.raw({});
  let sortKey = $state("league");

  onMount(() => {
    // each piece shows as soon as it arrives; none of them is required for the cards
    getLeagueRecords()
      .then((r) => (records = r))
      .catch((e) => console.error(e));
    getAwards()
      .then((a) => (awards = a ?? []))
      .catch((e) => console.error(e));
    loadLeagueContext({ standingsData: getLeagueStandings(), leagueTeamManagersData: leagueTeamManagers })
      .then((ctx) => (standing = currentStandings(ctx)))
      .catch((e) => console.error(e));
  });

  const cards = $derived(
    managers.map((m, i) => {
      const b = managerBasics(m, i, leagueTeamManagers);
      const career = careerStats(records, b.managerID);
      const titles = titleYears(managerTrophies(awards, b.owns, m.tookOver));
      const now = b.until ? null : standing[String(b.rosterID)];
      return {
        ...b,
        career,
        titles,
        now,
        fav: favoriteTeam(m.favoriteTeam),
        years: yearsText(b),
        nowPct: now ? (now.wins + now.ties / 2) / Math.max(1, now.wins + now.losses + now.ties) : -1,
      };
    })
  );

  const SORTS = [
    { key: "league", label: "League order" },
    { key: "titles", label: "Titles" },
    { key: "pct", label: "All-time win %" },
    { key: "now", label: "This season" },
  ];
  const sorted = $derived.by(() => {
    const pct = (c) => c.career?.pct ?? -1;
    const by = {
      league: (a, b) => a.index - b.index,
      titles: (a, b) => b.titles.length - a.titles.length || pct(b) - pct(a),
      pct: (a, b) => pct(b) - pct(a),
      now: (a, b) => (a.now?.place ?? 99) - (b.now?.place ?? 99),
    }[sortKey];
    return [...cards].sort(by);
  });

  const initials = (name) =>
    name
      .replace(/[^A-Za-z ]/g, "")
      .split(" ")
      .filter(Boolean)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  const hidePhoto = (e) => (e.currentTarget.style.display = "none");
</script>

<div class="rr-managersPage">
  <h1 class="rr-pageTitle">Managers</h1>

  <div class="rr-sorts" role="group" aria-label="Sort managers">
    <span class="rr-sortLabel">Sort</span>
    {#each SORTS as s}
      <button type="button" class="rr-sort" class:rr-on={sortKey === s.key} aria-pressed={sortKey === s.key} onclick={() => (sortKey = s.key)}>{s.label}</button>
    {/each}
  </div>

  <div class="rr-grid">
    {#each sorted as c (c.index)}
      <a class="rr-card" href="/manager?manager={c.index}">
        <div class="rr-who">
          <span class="rr-avatar">
            <span class="rr-initials" aria-hidden="true">{initials(c.manager.name)}</span>
            {#if c.photo}<img src={c.photo} alt="" onerror={hidePhoto} />{/if}
          </span>
          <span class="rr-names">
            <b class="rr-name">{c.manager.name}</b>
            <i class="rr-team">{c.teamName}</i>
          </span>
        </div>
        <div class="rr-chips">
          {#if c.years}<span class="rr-chip">{c.years}</span>{/if}
          {#if c.fav}<span class="rr-chip"><img src={c.fav.logo} alt="" />{c.fav.abbr} fan</span>{/if}
          {#if c.commissioner}<span class="rr-chip rr-commish">Commish</span>{/if}
          {#if c.until}<span class="rr-chip rr-former">Former</span>{/if}
        </div>
        <div class="rr-stats">
          <span class="rr-stat">
            <span class="rr-k">All-time</span>
            <b>{c.career ? recordText(c.career.wins, c.career.losses, c.career.ties) : "–"}</b>
          </span>
          <span class="rr-stat">
            <span class="rr-k">Titles</span>
            <b class:rr-gold={c.titles.length} title={c.titles.join(", ")}>{c.titles.length ? `×${c.titles.length}` : "—"}</b>
          </span>
          <span class="rr-stat">
            <span class="rr-k">This season</span>
            <b>{c.now ? recordText(c.now.wins, c.now.losses, c.now.ties) : "—"}</b>
          </span>
        </div>
      </a>
    {/each}
  </div>
</div>

<style>
  .rr-managersPage {
    max-width: 1140px;
    margin: 0 auto;
    padding: 0 16px 5em;
    text-align: left;
  }

  /* same heading as the other redesigned pages */
  h1.rr-pageTitle {
    margin: 1.33em 0 0.5em;
    text-align: center;
    font-size: 2.125rem;
    font-weight: 500;
    line-height: 1.2;
    color: var(--or-heading, var(--g111));
    text-shadow: var(--or-heading-glow, none);
  }

  .rr-sorts {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: center;
    gap: 8px;
    margin: 0 0 22px;
  }

  .rr-sortLabel {
    font-size: 0.82em;
    color: var(--or-muted, var(--g999));
    margin-right: 2px;
  }

  .rr-sort {
    padding: 7px 14px;
    border-radius: 999px;
    border: 1px solid var(--or-table-border, var(--ccc));
    background: transparent;
    color: var(--or-text, var(--g333));
    font: 500 0.82em "Roboto", sans-serif;
    cursor: pointer;
  }

  .rr-sort:hover {
    border-color: var(--or-pink, var(--blueOne));
  }

  .rr-sort.rr-on {
    border-color: var(--or-pink, var(--blueOne));
    background: var(--or-pink, var(--blueOne));
    color: #fff;
    font-weight: 700;
  }

  .rr-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 14px;
  }

  .rr-card {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
    border-radius: 14px;
    border: 1px solid var(--or-table-border, var(--ccc));
    background: var(--fff);
    box-shadow: 0 6px 24px var(--or-table-shadow, transparent);
    color: var(--or-text, var(--g333));
    text-decoration: none;
    transition: border-color 0.15s, transform 0.15s;
  }

  .rr-card:hover,
  .rr-card:focus-visible {
    border-color: var(--or-pink, var(--blueOne));
    transform: translateY(-2px);
  }

  .rr-who {
    display: flex;
    gap: 12px;
    align-items: center;
    min-width: 0;
  }

  .rr-avatar {
    position: relative;
    flex: none;
    width: 52px;
    height: 52px;
    border-radius: 50%;
    overflow: hidden;
    display: grid;
    place-items: center;
    background: linear-gradient(135deg, var(--or-pink, #ff2a6d), var(--or-purple, #b537f2));
    box-shadow: 0 0 0 2px var(--fff), 0 0 0 4px var(--or-glow-pink, transparent);
  }

  .rr-avatar img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .rr-initials {
    font: 700 17px "Orbitron", sans-serif;
    color: #fff;
  }

  .rr-names {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .rr-name {
    font-size: 1em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .rr-team {
    font-size: 0.8em;
    color: var(--or-cyan, #0b8a9a);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .rr-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .rr-chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    border-radius: 999px;
    border: 1px solid var(--or-table-border, var(--ccc));
    font-size: 0.72em;
    color: var(--or-muted, var(--g999));
  }

  .rr-chip img {
    width: 14px;
    height: 14px;
  }

  .rr-commish {
    border-color: transparent;
    background: color-mix(in srgb, var(--or-orange, #ff9e3d) 18%, transparent);
    color: var(--or-orange, #ff9e3d);
    font-weight: 700;
  }

  .rr-former {
    border-style: dashed;
  }

  .rr-stats {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 6px;
    padding-top: 10px;
    border-top: 1px solid var(--or-table-border, var(--ddd));
  }

  .rr-stat {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .rr-k {
    font-size: 0.64em;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--or-muted, var(--g999));
  }

  .rr-stat b {
    font: 700 0.82em "Orbitron", sans-serif;
  }

  .rr-stat b.rr-gold {
    color: var(--or-orange, #ff9e3d);
  }

  @media (max-width: 800px) {
    h1.rr-pageTitle {
      font-size: 1.5rem;
    }
  }
</style>
