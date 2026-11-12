<!--
  /records (option A "record book"): Regular season / Playoffs switch and an All-time / per-season picker, four
  headline records, the record lists (top 5, expandable to 10) and one sortable team rankings table.
  All-time numbers are per TEAM (Sleeper roster): every season a roster played adds up, whoever managed it, and the
  table notes earlier managers ("calarseneau 2022–23"); a single season shows that season's team and manager.
  Numbers from utils/recordBook.js. Same props as the template's Records (swapped in via components.js).
-->
<script>
  import { onMount } from "svelte";
  import { getLeagueRecords, getLeagueTransactions, getLeagueData, gotoManager } from "$lib/utils/helper";
  import SortableTable from "../Shared/SortableTable.svelte";
  import Toggle from "../Shared/Toggle.svelte";
  import RecordList from "./RecordList.svelte";
  import { teamRows, recordLists, recordYears } from "../../utils/recordBook.js";
  import "../Shared/common.css";

  let { leagueData, totals, stale, leagueTeamManagers } = $props();

  // leagueData here is the records object ({ regularSeasonData, playoffData }), as the template names it
  let records = $state.raw(leagueData);
  let txTotals = $state.raw(totals);
  let inProgressYear = $state(null);
  let key = $state("regularSeasonData");
  let year = $state(null); // null = all-time

  onMount(() => {
    // the template refreshes cached records / transactions once per visit (same requests as before)
    if (stale) getLeagueTransactions(false, true).then((t) => (txTotals = t.totals)).catch((e) => console.error(e));
    if (leagueData?.stale) getLeagueRecords(true).then((r) => (records = r)).catch((e) => console.error(e));
    getLeagueData()
      .then((ld) => {
        const regularOver = ld.status === "complete" || (ld.settings?.last_scored_leg ?? 0) >= (ld.settings?.playoff_week_start ?? 15) - 1;
        inProgressYear = regularOver ? null : Number(ld.season);
      })
      .catch((e) => console.error(e));
  });

  const playoffs = $derived(key === "playoffData");
  const data = $derived(records?.[key]);
  const years = $derived(recordYears(data));
  // a season picked under one switch may not exist under the other (no playoffs yet this year)
  const viewYear = $derived(year != null && years.includes(year) ? year : null);

  // ---- names: the team (and manager) as it was that season; all-time rows use the current team
  const cur = $derived(leagueTeamManagers.currentSeason);
  const users = $derived(leagueTeamManagers.users ?? {});
  const tm = (rid, y) => leagueTeamManagers.teamManagersMap?.[y]?.[rid];
  const teamFor = (rid, y = cur) => {
    const t = tm(rid, y)?.team ?? tm(rid, cur)?.team;
    return { name: t?.name ?? `Team ${rid}`, avatar: t?.avatar ?? null };
  };
  const managerIDs = (rid, y = cur) => tm(rid, y)?.managers ?? [];
  const managerNames = (rid, y = cur) =>
    managerIDs(rid, y)
      .map((id) => users[id]?.display_name)
      .filter(Boolean)
      .join(" & ");
  const yy = (y) => `'${String(y).slice(2)}`;
  // earlier managers of a team over the given seasons: "calarseneau '22–'23"
  const pastManagers = (rid, ys) => {
    const now = managerIDs(rid).join("|");
    const runs = [];
    for (const y of ys) {
      const ids = managerIDs(rid, y).join("|");
      if (!ids || ids === now) continue;
      const last = runs[runs.length - 1];
      if (last && last.ids === ids && last.to === y - 1) last.to = y;
      else runs.push({ ids, from: y, to: y, name: managerNames(rid, y) });
    }
    return runs.map((r) => `${r.name} ${r.from === r.to ? yy(r.from) : `${yy(r.from)}–${yy(r.to)}`}`).join(", ");
  };
  const open = (rid, y = cur) => () => gotoManager({ year: y, leagueTeamManagers, rosterID: parseInt(rid) });

  const fmt = (v, d = 2) => Number(v ?? 0).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
  const when = (y, w) => (viewYear != null ? `Week ${w}` : `${y} · Week ${w}`);

  // ---- lists and headline cards
  const lists = $derived(recordLists(data, { year: viewYear, inProgressYear }));
  const weekItems = (list) =>
    list.map((e) => ({
      key: `${e.rosterID}-${e.year}-${e.week}`,
      avatar: teamFor(e.rosterID, e.year).avatar,
      title: teamFor(e.rosterID, e.year).name,
      sub: `${managerNames(e.rosterID, e.year)} · ${when(e.year, e.week)}`,
      value: fmt(e.fpts),
      onclick: open(e.rosterID, e.year),
    }));
  const gameItems = (list) =>
    list.map((g) => ({
      key: `${g.year}-${g.week}-${g.winner.rosterID}`,
      avatar: teamFor(g.winner.rosterID, g.year).avatar,
      title: `${teamFor(g.winner.rosterID, g.year).name} ${fmt(g.winner.fpts)}`,
      sub: `beat ${teamFor(g.loser.rosterID, g.year).name} ${fmt(g.loser.fpts)} · ${when(g.year, g.week)}`,
      value: fmt(g.margin),
      onclick: open(g.winner.rosterID, g.year),
    }));
  const seasonItems = (list) =>
    list.map((s) => ({
      key: `${s.rosterID}-${s.year}`,
      avatar: teamFor(s.rosterID, s.year).avatar,
      title: teamFor(s.rosterID, s.year).name,
      sub: `${managerNames(s.rosterID, s.year)} · ${s.year}${s.soFar ? " (so far)" : ""} · ${fmt(s.fpts, 1)} pts`,
      value: `${fmt(s.ppw, 1)}/wk`,
      onclick: open(s.rosterID, s.year),
    }));

  const cards = $derived.by(() => {
    const out = [
      { title: playoffs ? "Highest scoring playoff games" : "Highest scoring weeks", items: weekItems(lists.weekHighs) },
      { title: playoffs ? "Lowest scoring playoff games" : "Lowest scoring weeks", items: weekItems(lists.weekLows) },
    ];
    if (viewYear == null && !playoffs) {
      out.push({ title: "Best seasons (points per week)", items: seasonItems(lists.bestSeasons) });
      out.push({ title: "Worst seasons (points per week)", items: seasonItems(lists.worstSeasons), empty: "No finished seasons yet" });
    }
    out.push({ title: "Biggest blowouts", items: gameItems(lists.blowouts) });
    out.push({ title: "Closest wins", items: gameItems(lists.closeWins) });
    return out;
  });

  const hero = $derived.by(() => {
    const out = [];
    const w = lists.weekHighs[0];
    if (w) out.push({ k: playoffs ? "Best playoff game" : "Best week", v: fmt(w.fpts), rid: w.rosterID, y: w.year, sub: when(w.year, w.week) });
    const s = viewYear == null && !playoffs ? lists.bestSeasons[0] : null;
    if (s) out.push({ k: "Best season", v: `${fmt(s.ppw, 1)}/wk`, rid: s.rosterID, y: s.year, sub: `${s.year}${s.soFar ? " (so far)" : ""} · ${fmt(s.fpts, 1)} pts` });
    const b = lists.blowouts[0];
    if (b) out.push({ k: "Biggest blowout", v: `+${fmt(b.margin)}`, rid: b.winner.rosterID, y: b.year, sub: `${fmt(b.winner.fpts)}–${fmt(b.loser.fpts)} · ${when(b.year, b.week)}` });
    const c = lists.closeWins[0];
    if (c) out.push({ k: "Closest win", v: fmt(c.margin), rid: c.winner.rosterID, y: c.year, sub: `${fmt(c.winner.fpts)}–${fmt(c.loser.fpts)} · ${when(c.year, c.week)}` });
    return out.map((h) => ({ ...h, team: teamFor(h.rid, h.y), manager: managerNames(h.rid, h.y) }));
  });

  // ---- team rankings
  const rows = $derived(
    teamRows(data, { year: viewYear, txSeasons: playoffs ? {} : txTotals?.seasons }).map((r) => {
      const y = viewYear ?? cur;
      return {
        ...r,
        team: teamFor(r.rosterID, y),
        manager: managerNames(r.rosterID, y),
        past: viewYear == null ? pastManagers(r.rosterID, r.years) : "",
      };
    })
  );
  const hasIQ = $derived(rows.some((r) => r.iq != null));
  const columns = $derived(
    [
      { key: "team", label: "Team", thClass: "left", sticky: true },
      { key: "record", label: "Record", get: (r) => r.pct ?? -1 },
      { key: "pct", label: "Win %", get: (r) => r.pct ?? -1, best: true },
      { key: "pf", label: "Points for", get: (r) => r.pf, best: true },
      { key: "pa", label: "Points against", get: (r) => r.pa },
      { key: "ppw", label: playoffs ? "Pts / game" : "Pts / week", title: playoffs ? "Points per playoff game" : "Points per week", get: (r) => r.ppw, best: true },
      { key: "iq", label: "Lineup IQ", title: "Points scored ÷ best possible lineup", get: (r) => r.iq ?? -1, best: true, show: hasIQ },
      { key: "trips", label: "Trips", title: "Playoff appearances", get: (r) => r.playoffTrips, best: true, show: playoffs && viewYear == null },
      { key: "trades", label: "Trades", get: (r) => r.trades, best: true, show: !playoffs },
      { key: "waivers", label: "Waiver adds", get: (r) => r.waivers, best: true, show: !playoffs },
    ].filter((c) => c.show !== false)
  );
  // the league best in each column is highlighted
  const best = $derived(Object.fromEntries(columns.filter((c) => c.best).map((c) => [c.key, Math.max(...rows.map(c.get))])));
  const isBest = (c, r) => c.best && rows.length > 1 && c.get(r) === best[c.key] && c.get(r) > 0;
  const recordText = (r) => `${r.wins}–${r.losses}${r.ties ? `–${r.ties}` : ""}`;
  const pctText = (p) => (p == null ? "–" : p.toFixed(3).replace(/^0/, ""));
  const tiebreak = (a, b) => b.pf - a.pf;

  const scopeLabel = $derived(`${viewYear ?? "All-time"} · ${playoffs ? "playoffs" : "regular season"}`);
  const hideImg = (e) => (e.currentTarget.style.visibility = "hidden");
</script>

<div class="rr-recordsPage">
  <h1 class="rr-pageTitle">Records</h1>

  <div class="rr-controls">
    <Toggle
      options={[
        { value: "regularSeasonData", label: "Regular season" },
        { value: "playoffData", label: "Playoffs" },
      ]}
      bind:value={key}
      label="Games"
    />
    <div class="rr-years" role="group" aria-label="Season">
      <button type="button" class="rr-year" class:rr-on={viewYear == null} aria-pressed={viewYear == null} onclick={() => (year = null)}>All-time</button>
      {#each years as y}
        <button type="button" class="rr-year" class:rr-on={viewYear === y} aria-pressed={viewYear === y} onclick={() => (year = y)}>{y}</button>
      {/each}
    </div>
  </div>

  {#if !data || !years.length}
    <p class="rr-empty">No {playoffs ? "playoff " : ""}records <i>yet</i>…</p>
  {:else}
    <div class="rr-hero">
      {#each hero as h (h.k)}
        <div class="rr-heroCard">
          <span class="rr-heroK">{h.k}</span>
          <b class="rr-heroV">{h.v}</b>
          <button type="button" class="rr-heroWho" onclick={open(h.rid, h.y)}>
            {#if h.team.avatar}<img src={h.team.avatar} alt="" onerror={hideImg} />{/if}
            <span class="rr-heroNames">
              <b>{h.team.name}</b>
              <span>{h.manager} · {h.sub}</span>
            </span>
          </button>
        </div>
      {/each}
    </div>

    <div class="rr-lists" class:rr-four={cards.length === 4}>
      {#each cards as c (c.title)}
        <RecordList title={c.title} items={c.items} empty={c.empty} />
      {/each}
    </div>

    <section class="rr-rankings">
      <div class="rr-rankHead">
        <h2>Team rankings</h2>
        <span class="rr-note">{scopeLabel} · {viewYear == null ? "all seasons of each team combined · " : ""}pink = league best</span>
      </div>
      <SortableTable {columns} {rows} rowKey={(r) => r.rosterID} defaultKey="pct" {tiebreak} tableClass="rr-recTable">
        {#snippet cell(r, c)}
          {#if c.key === "team"}
            <td class="left rr-sticky">
              <button type="button" class="rr-teamBtn" onclick={open(r.rosterID, viewYear ?? cur)}>
                {#if r.team.avatar}<img src={r.team.avatar} alt="" onerror={hideImg} />{/if}
                <span class="rr-teamNames">
                  <b class="rr-name">{r.team.name}</b>
                  <span class="rr-mgr">{r.manager}{#if r.past}<span class="rr-past"> · also {r.past}</span>{/if}</span>
                </span>
              </button>
            </td>
          {:else if c.key === "record"}
            <td class="rr-rec">{recordText(r)}</td>
          {:else if c.key === "pct"}
            <td class:rr-best={isBest(c, r)}>{pctText(r.pct)}</td>
          {:else if c.key === "pf"}
            <td class:rr-best={isBest(c, r)}>{fmt(r.pf)}</td>
          {:else if c.key === "pa"}
            <td class="muted">{fmt(r.pa)}</td>
          {:else if c.key === "ppw"}
            <td class:rr-best={isBest(c, r)}>{fmt(r.ppw)}</td>
          {:else if c.key === "iq"}
            <td class:rr-best={isBest(c, r)}>{r.iq == null ? "–" : `${(r.iq * 100).toFixed(1)}%`}</td>
          {:else if c.key === "trips"}
            <td class:rr-best={isBest(c, r)}>{r.playoffTrips}</td>
          {:else if c.key === "trades"}
            <td class:rr-best={isBest(c, r)}>{r.trades}</td>
          {:else if c.key === "waivers"}
            <td class:rr-best={isBest(c, r)}>{r.waivers}</td>
          {/if}
        {/snippet}
      </SortableTable>
    </section>
  {/if}
</div>

<style>
  .rr-recordsPage {
    max-width: 1140px;
    margin: 0 auto;
    padding: 0 16px 5em;
    text-align: left;
    display: flex;
    flex-direction: column;
    gap: 18px;
    color: var(--or-text, var(--g333));
  }

  h1.rr-pageTitle {
    margin: 1.33em 0 0;
    text-align: center;
    font-size: 2.125rem;
    font-weight: 500;
    line-height: 1.2;
    color: var(--or-heading, var(--g111));
    text-shadow: var(--or-heading-glow, none);
    background: none;
    -webkit-background-clip: border-box;
    background-clip: border-box;
    filter: none;
  }

  .rr-controls {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
  }

  .rr-years {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
  }

  .rr-year {
    padding: 7px 14px;
    border-radius: 999px;
    border: 1px solid var(--or-table-border, var(--ccc));
    background: transparent;
    color: var(--or-text, var(--g333));
    font: 500 0.82em "Roboto", sans-serif;
    cursor: pointer;
  }

  .rr-year:hover {
    border-color: var(--or-pink, var(--blueOne));
  }

  .rr-year.rr-on {
    border-color: var(--or-pink, var(--blueOne));
    background: var(--or-pink, var(--blueOne));
    color: #fff;
    font-weight: 700;
  }

  .rr-empty {
    text-align: center;
    color: var(--or-muted, var(--g999));
  }

  .rr-hero {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
    gap: 14px;
  }

  .rr-heroCard {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 18px;
    border-radius: 14px;
    border: 1px solid var(--or-table-border, var(--ccc));
    background: radial-gradient(circle at 85% 0%, color-mix(in srgb, var(--or-pink, #ff2a6d) 20%, transparent), transparent 60%), var(--fff);
    box-shadow: 0 6px 24px var(--or-table-shadow, transparent);
    min-width: 0;
  }

  .rr-heroK {
    font-size: 0.66em;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--or-orange, #e8590c);
  }

  .rr-heroV {
    font: 800 1.8rem "Orbitron", sans-serif;
    color: var(--or-heading, var(--g111));
    text-shadow: var(--or-heading-glow, none);
  }

  .rr-heroWho {
    display: flex;
    gap: 10px;
    align-items: center;
    padding: 0;
    border: 0;
    background: none;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
    min-width: 0;
  }

  .rr-heroWho img {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    flex: none;
  }

  .rr-heroNames {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .rr-heroNames b {
    font-size: 0.85em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .rr-heroWho:hover .rr-heroNames b {
    color: var(--or-pink, var(--blueOne));
  }

  .rr-heroNames span {
    font-size: 0.72em;
    color: var(--or-muted, var(--g999));
  }

  .rr-lists {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 14px;
    align-items: start;
  }

  .rr-lists.rr-four {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .rr-rankings {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .rr-rankHead {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: baseline;
    gap: 6px 14px;
  }

  .rr-rankHead h2 {
    margin: 0;
    font: 700 1.05rem "Orbitron", sans-serif;
    color: var(--or-heading, var(--g111));
    text-align: left;
  }

  .rr-note {
    font-size: 0.76em;
    color: var(--or-muted, var(--g999));
  }

  .rr-teamBtn {
    display: flex;
    gap: 8px;
    align-items: center;
    padding: 0;
    border: 0;
    background: none;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
    max-width: 100%;
  }

  .rr-teamBtn img {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    flex: none;
  }

  .rr-teamNames {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .rr-teamBtn:hover .rr-name {
    color: var(--or-pink, var(--blueOne));
  }

  .rr-mgr {
    font-size: 0.78em;
    color: var(--or-muted, var(--g999));
    white-space: normal;
  }

  .rr-past {
    font-style: italic;
  }

  td.left {
    min-width: 170px;
    max-width: 240px;
  }

  .rr-rec {
    font-family: "Orbitron", sans-serif;
    font-weight: 700;
  }

  .rr-best {
    color: var(--or-pink, var(--blueOne));
    font-weight: 700;
  }

  @media (max-width: 900px) {
    .rr-lists,
    .rr-lists.rr-four {
      grid-template-columns: minmax(0, 1fr);
    }
  }

  @media (max-width: 800px) {
    h1.rr-pageTitle {
      font-size: 1.5rem;
    }

    .rr-heroV {
      font-size: 1.4rem;
    }
  }

  /* headline cards two across on phones */
  @media (max-width: 560px) {
    .rr-hero {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }

    .rr-heroCard {
      padding: 12px;
      gap: 6px;
    }

    .rr-heroV {
      font-size: 1.1rem;
    }

    .rr-heroWho img {
      display: none;
    }
  }
</style>
