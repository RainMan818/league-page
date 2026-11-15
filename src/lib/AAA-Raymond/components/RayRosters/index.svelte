<!--
  Rosters page (option B, revised): a team strip (seed order; "All teams" shows the Roster analysis table and charts),
  then one team: header, starting lineup (Sleeper's current lineup), position breakdown (points per week from the
  Standings position averages, average age and players, each with the league average and rank), depth chart and
  future draft picks. Rendered by src/routes/rosters/+page.svelte. The team is in the URL (?team=<rosterID>) and
  remembered in the browser.
  Depth chart "starting" = the best lineup from season-level projections: projected points per game over the rest of
  the regular season, byes skipped (utils/rosterBreakdown.js seasonProjection + predictLineup), so a bye week doesn't
  bench anyone. With no projections (offseason) it falls back to Sleeper's current lineup.
  Requests: everything is shared with the page's other loaders, plus the league's traded_picks (1).
-->
<script>
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { leagueID, managers as leagueManagers } from "$lib/utils/leagueInfo";
  import { loadPlayers } from "$lib/utils/helper";
  import { loadLeagueContext } from "../../utils/leagueContext.js";
  import { sleeperJson } from "../../utils/sleeperFetch.js";
  import { predictLineup } from "../../utils/predictOptimalScore.js";
  import { starterSlots } from "../../utils/positionAverages.js";
  import { playerPhoto } from "../../utils/positions.js";
  import {
    BREAKDOWN_ROWS,
    ROSTER_GROUPS,
    rosterAgeCounts,
    leagueRanks,
    rankShade,
    depthChart,
    projectionWeeks,
    seasonProjection,
    pickSeasons,
    ownedPicks,
  } from "../../utils/rosterBreakdown.js";
  import { currentStandings } from "../RayManagers/managerInfo.js";
  import { ordinal } from "../Shared/format.js";
  import Loading from "../Shared/Loading.svelte";
  import RosterAnalysisSection from "../RosterAnalysis/index.svelte";
  import "../Shared/common.css";

  let { standingsData } = $props();

  const ALL = "all";
  const STORE_KEY = "rr-rosters-team";

  let status = $state("loading"); // loading | ready | error
  let errorMessage = $state("");
  let data = $state.raw(null);
  let players = $state.raw({});
  let selected = $state(null);

  onMount(async () => {
    try {
      const [ctx, tradedPicks] = await Promise.all([
        loadLeagueContext({ standingsData }),
        sleeperJson(`league/${leagueID}/traded_picks`).catch((e) => {
          console.error(e);
          return [];
        }),
      ]);
      players = ctx.players;
      data = build(ctx, tradedPicks ?? []);
      selected = initialTeam(data.order);
      status = "ready";
      if (ctx.playersInfo?.stale) loadPlayers(null, true).then((p) => p?.players && (players = p.players)).catch((e) => console.error(e));
    } catch (err) {
      console.error(err);
      errorMessage = err?.message ?? String(err);
      status = "error";
    }
  });

  const readStored = () => {
    try {
      return localStorage.getItem(STORE_KEY);
    } catch {
      return null;
    }
  };
  const initialTeam = (order) => {
    const fromUrl = new URLSearchParams(window.location.search).get("team");
    const valid = (t) => t && (t === ALL || order.includes(t));
    return [fromUrl, readStored()].find(valid) ?? order[0] ?? ALL;
  };
  const choose = (team) => {
    selected = team;
    try {
      localStorage.setItem(STORE_KEY, team);
    } catch {
      /* private mode: just don't remember */
    }
    goto(`/rosters?team=${team}`, { replaceState: true, noScroll: true, keepFocus: true });
  };

  // ---- everything that doesn't depend on the selected team
  function build(ctx, tradedPicks) {
    const { rosters, leagueData, managers, standings, teams, nflState, onTeamClick } = ctx;
    const ids = Object.keys(rosters).map(String);
    const places = currentStandings(ctx);
    const order = ids.slice().sort((a, b) => (places[a]?.place ?? 99) - (places[b]?.place ?? 99) || Number(a) - Number(b));

    // position breakdown: points per week (standings), average age, players; each ranked across the league
    const ages = Object.fromEntries(ids.map((id) => [id, rosterAgeCounts(rosters[id]?.players ?? [], ctx.players)]));
    const ppw = standings?.positionalData ?? {};
    const slotPpw = standings?.rosterPositionAveragesData ?? {};
    const hasPoints = Object.keys(ppw).length > 0;
    const rank = (fn) => leagueRanks(Object.fromEntries(ids.map((id) => [id, fn(id)])));
    const breakdown = Object.fromEntries(
      BREAKDOWN_ROWS.map((k) => [
        k,
        {
          points: hasPoints ? rank((id) => ppw[id]?.[k] ?? 0) : null,
          age: rank((id) => ages[id][k].age),
          count: rank((id) => ages[id][k].count),
        },
      ])
    );
    const slotKeys = ["QB+Flex", "WRT", "IDP"].filter((k) => ids.some((id) => slotPpw[id]?.[k] != null));
    const slots = Object.fromEntries(slotKeys.map((k) => [k, rank((id) => slotPpw[id]?.[k] ?? 0)]));

    // season-level projections: per game over the rest of the regular season, byes skipped
    const regularSeasonLength = (Number(leagueData.settings?.playoff_week_start) || 15) - 1;
    const week = nflState?.season_type === "pre" ? 1 : Number(nflState?.display_week ?? nflState?.week) || 1;
    const weeks = nflState?.season_type === "off" ? [] : projectionWeeks(week, regularSeasonLength);

    // picks
    const seasons = pickSeasons(leagueData, tradedPicks);
    const picks = ownedPicks({ rosterIDs: ids, tradedPicks, seasons, rounds: Number(leagueData.settings?.draft_rounds) || 0 });

    return {
      ids, order, rosters, leagueData, managers, teams, places, ages, ppw, slotPpw, breakdown, slots, hasPoints,
      throughWeek: (standings?.week ?? 1) - 1, weeks, picks, onTeamClick,
      fpts: Object.fromEntries(ids.map((id) => [id, standings?.standingsInfo?.[id]?.fpts ?? null])),
    };
  }

  // ---- display helpers
  const SLOT_INFO = {
    FLEX: { label: "FLEX", groups: ["RB", "WR", "TE"] },
    WRRB_FLEX: { label: "W/R", groups: ["WR", "RB"] },
    REC_FLEX: { label: "W/T", groups: ["WR", "TE"] },
    SUPER_FLEX: { label: "SF", groups: ["QB", "RB", "WR", "TE"] },
    IDP_FLEX: { label: "IDP", groups: ["DL", "LB", "DB"] },
    "QB+Flex": { label: "QB+SF", groups: ["QB", "RB", "WR", "TE"] }, // same names as the Standings averages table
    WRT: { label: "Flex", groups: ["RB", "WR", "TE"] },
    IDP: { label: "IDP", groups: ["DL", "LB", "DB"] },
  };
  const GROUP_OF_SLOT = { DE: "DL", DT: "DL", CB: "DB", S: "DB" };
  // soft tint of the position color(s): one color reads as that position, a gradient as a flex slot
  const chipStyle = (slot) => {
    const info = SLOT_INFO[slot];
    if (info) {
      const stops = info.groups.map((g) => `color-mix(in srgb, var(--or-pos-${g}) 22%, transparent)`).join(", ");
      return `--chip-bg: linear-gradient(135deg, ${stops}); --chip-fg: var(--or-text, var(--g111)); --chip-border: color-mix(in srgb, var(--or-text, #888) 25%, transparent)`;
    }
    const c = `var(--or-pos-${GROUP_OF_SLOT[slot] ?? slot}, var(--or-muted))`;
    return `--chip-bg: color-mix(in srgb, ${c} 16%, transparent); --chip-fg: ${c}; --chip-border: color-mix(in srgb, ${c} 45%, transparent)`;
  };
  const slotLabel = (slot) => SLOT_INFO[slot]?.label ?? slot;

  const ROW_LABELS = { Team: "Team", Off: "Offense", Def: "Defense" };
  const INJURY = { Questionable: "Q", Doubtful: "D", Out: "OUT", IR: "IR", PUP: "PUP", Sus: "SUS", NA: "NA" };
  const fullName = (p) => `${p?.fn ?? ""} ${p?.ln ?? ""}`.trim();
  const shortName = (p) => (p?.pos === "DEF" ? fullName(p) : `${p?.fn?.[0] ?? ""}. ${p?.ln ?? ""}`);
  const managerName = (id) => leagueManagers.find((m) => m.managerID === id)?.name ?? data?.managers?.users?.[id]?.display_name ?? "";
  const one = (n) => (n == null ? "–" : Number(n).toFixed(1));
  const shade = (r, id) => {
    const t = rankShade(r?.rank?.[id], r?.maxRank ?? 0);
    const d = t - 0.5;
    const pct = Math.round(Math.min(0.55, Math.abs(d) * 1.1) * 100);
    return `background: color-mix(in srgb, var(${d >= 0 ? "--or-pink, #c2185b" : "--or-cyan, #0b8a9a"}) ${pct}%, transparent)`;
  };
  const rankText = (r, id) => (r?.rank?.[id] ? ordinal(r.rank[id]) : "–");

  // ---- the selected team
  const view = $derived.by(() => {
    if (!data || !selected || selected === ALL) return null;
    const id = selected;
    const roster = data.rosters[id];
    if (!roster) return null;
    const allIDs = (roster.players ?? []).filter((p) => p && p !== "0");
    const taxi = roster.taxi ?? [];
    const reserve = roster.reserve ?? [];
    const team = data.teams[id] ?? { name: `Team ${id}` };
    const mgrIDs = data.managers?.teamManagersMap?.[data.managers.currentSeason]?.[id]?.managers ?? [roster.owner_id].filter(Boolean);
    const place = data.places[id];
    const s = roster.settings ?? {};
    const fpts = data.fpts[id] ?? (s.fpts != null ? s.fpts + (s.fpts_decimal ?? 0) / 100 : null);

    // current Sleeper lineup
    const slots = starterSlots(data.leagueData.roster_positions);
    const firstDefense = slots.findIndex((sl) => ["IDP_FLEX", "DL", "LB", "DB", "DE", "DT", "CB", "S", "DEF"].includes(sl));
    const lineup = slots.map((slot, i) => {
      const pid = roster.starters?.[i];
      const p = pid && pid !== "0" ? players[pid] : null;
      return {
        slot,
        empty: !p,
        name: p ? fullName(p) : "Empty",
        meta: p ? [p.pos, p.t ?? "FA", p.age ? `${p.age} yrs` : null].filter(Boolean).join(" · ") : "No one is starting here",
        injury: p?.is ? INJURY[p.is] ?? p.is : "",
        out: p?.is && p.is !== "Questionable",
        photo: p ? playerPhoto(pid, p.pos) : "",
        divider: i === firstDefense && i > 0,
      };
    });

    // depth chart: starters = best lineup from season-level projections (active players only)
    const inactive = new Set([...taxi, ...reserve]);
    const projections = Object.fromEntries(allIDs.map((pid) => [pid, seasonProjection(players[pid], data.weeks)]));
    const candidates = allIDs
      .filter((pid) => !inactive.has(pid) && players[pid])
      .map((pid) => ({ id: pid, pos: players[pid].pos, positions: players[pid].positions, wi: { 0: { p: projections[pid] } } }));
    const best = predictLineup(candidates, 0, data.leagueData);
    const projected = best.score > 0;
    const starters = new Set(projected ? best.picks.filter((pk) => pk.p > 0).map((pk) => pk.id) : (roster.starters ?? []));
    const groups = depthChart({ playerIDs: allIDs, players, starters, taxi, reserve, projections });
    const depth = ROSTER_GROUPS.filter((g) => groups[g].length).map((g) => ({
      pos: g,
      players: groups[g].map((e) => ({ ...e, name: shortName(players[e.id]), title: `${fullName(players[e.id])}${projected ? ` · ${e.projection.toFixed(1)} projected per game` : ""}` })),
    }));

    // picks by season
    const picks = data.picks[id] ?? [];
    const pickSeasonsList = [...new Set(picks.map((p) => p.season))].map((season) => ({
      season,
      list: picks.filter((p) => p.season === season).map((p) => ({ round: ordinal(p.round), via: p.from ? data.teams[p.from]?.name ?? `Team ${p.from}` : null })),
    }));

    return {
      id, team, roster, lineup, depth, projected, picks: pickSeasonsList, pickCount: picks.length,
      managers: mgrIDs.map((m) => ({ id: m, name: managerName(m) })).filter((m) => m.name),
      record: place ? `${place.wins}-${place.losses}${place.ties ? `-${place.ties}` : ""}` : s.wins != null ? `${s.wins}-${s.losses}${s.ties ? `-${s.ties}` : ""}` : null,
      seed: place?.place ?? null,
      fpts,
      stats: [
        { v: String(allIDs.length), k: "players" },
        { v: `${taxi.length} / ${reserve.length}`, k: "taxi / IR" },
        { v: String(picks.length), k: "future picks" },
      ],
    };
  });

  const breakdownRows = $derived.by(() => {
    if (!view) return [];
    const id = view.id;
    return BREAKDOWN_ROWS.map((k) => {
      const b = data.breakdown[k];
      const a = data.ages[id][k];
      return {
        key: k,
        label: ROW_LABELS[k] ?? k,
        group: !!ROW_LABELS[k],
        side: k === "Off" || k === "Def",
        cells: [
          b.points ? { v: one(data.ppw[id]?.[k] ?? 0), avg: one(b.points.avg), rank: rankText(b.points, id), style: shade(b.points, id) } : { v: "–", avg: "–", rank: "–", style: "" },
          { v: one(a.age), avg: one(b.age.avg), rank: rankText(b.age, id), style: shade(b.age, id) },
          { v: String(a.count), avg: one(b.count.avg), rank: rankText(b.count, id), style: shade(b.count, id) },
        ],
      };
    });
  });
  const slotCells = $derived.by(() => {
    if (!view) return [];
    return Object.entries(data.slots).map(([k, r]) => ({ key: k, v: one(data.slotPpw[view.id]?.[k] ?? 0), avg: one(r.avg), rank: rankText(r, view.id), style: shade(r, view.id) }));
  });
  const teamCount = $derived(data?.ids.length ?? 0);
</script>

<div class="rr-rosters">
  <h1 class="rr-pageTitle">Rosters</h1>

  {#if status === "loading"}
    <Loading message="Gathering rosters..." />
  {:else if status === "error"}
    <Loading message="Couldn't load the rosters: {errorMessage}" progress={false} />
  {:else}
    <div class="rr-strip" role="tablist" aria-label="Team">
      <button type="button" role="tab" class="rr-stripBtn rr-allBtn" class:rr-on={selected === ALL} aria-selected={selected === ALL} onclick={() => choose(ALL)}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"></rect><path d="M3 10h18M9 4v16"></path></svg>
        <span>All teams</span>
      </button>
      {#each data.order as id (id)}
        {@const t = data.teams[id]}
        <button type="button" role="tab" class="rr-stripBtn" class:rr-on={selected === id} aria-selected={selected === id} title={t?.name} onclick={() => choose(id)}>
          {#if t?.avatar}<img src={t.avatar} alt="" />{:else}<span class="rr-avEmpty" aria-hidden="true"></span>{/if}
          <span>{(t?.name ?? `Team ${id}`).replace(/^Team /, "")}</span>
        </button>
      {/each}
    </div>

    {#if selected === ALL}
      <section class="rr-card rr-all">
        <RosterAnalysisSection {standingsData} />
      </section>
    {:else if view}
      <section class="rr-hero">
        {#if view.team.avatar}<img class="rr-heroAv" src={view.team.avatar} alt="" />{/if}
        <div class="rr-heroText">
          <h2 class="rr-teamName">{view.team.name}</h2>
          <span class="rr-heroLine">
            {#each view.managers as m, i (m.id)}{i ? " & " : ""}<button type="button" class="rr-link" onclick={() => data.onTeamClick(view.id)}>{m.name}</button>{/each}
            {#if view.record}<span> · {view.record}</span>{/if}
            {#if view.seed}<span> · {ordinal(view.seed)} seed</span>{/if}
            {#if view.fpts != null}<span> · {Number(view.fpts).toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} points for</span>{/if}
          </span>
        </div>
        <div class="rr-heroStats">
          {#each view.stats as s (s.k)}
            <div class="rr-stat"><b>{s.v}</b><span>{s.k}</span></div>
          {/each}
        </div>
      </section>

      <div class="rr-grid">
        <section class="rr-card rr-lineup">
          <div class="rr-cardHead"><h2>Starting lineup</h2><span class="rr-muted">Sleeper lineup</span></div>
          <div class="rr-lineupRows">
            {#each view.lineup as r, i (i)}
              <div class="rr-lineRow" class:rr-empty={r.empty} class:rr-divider={r.divider}>
                <span class="rr-chip rr-slotChip" style={chipStyle(r.slot)}>{slotLabel(r.slot)}</span>
                {#if r.empty}<span class="rr-photo rr-noPhoto" aria-hidden="true"></span>{:else}<span class="rr-photo" style={r.photo} aria-hidden="true"></span>{/if}
                <span class="rr-pText">
                  <span class="rr-pName">{r.name}</span>
                  <span class="rr-pMeta">{r.meta}</span>
                </span>
                {#if r.injury}<span class="rr-inj" class:rr-out={r.out}>{r.injury}</span>{/if}
              </div>
            {/each}
          </div>
        </section>

        <div class="rr-col">
          <section class="rr-card">
            <div class="rr-cardHead"><h2>Position breakdown</h2><span class="rr-muted">Rank among {teamCount} teams · league average in brackets</span></div>
            <div class="rr-bd">
              <div class="rr-bdRow rr-bdHead"><span></span><span>Points / week</span><span>Average age</span><span>Players</span></div>
              {#each breakdownRows as row (row.key)}
                <div class="rr-bdRow" class:rr-bdSide={row.side}>
                  {#if row.group}<b class="rr-bdLabel">{row.label}</b>{:else}<span class="rr-chip" style={chipStyle(row.key)}>{row.label}</span>{/if}
                  {#each row.cells as c, ci (ci)}
                    <span class="rr-cell">
                      <b class="rr-val" style={c.style}>{c.v}</b>
                      <span class="rr-avg">({c.avg})</span>
                      <span class="rr-rank">{c.rank}</span>
                    </span>
                  {/each}
                </div>
              {/each}
            </div>
            {#if slotCells.length}
              <div class="rr-slots">
                <span class="rr-slotsHead">Points / week by lineup slot <span class="rr-muted">(the flex groups; the rest match the positions above)</span></span>
                <div class="rr-slotGrid">
                  {#each slotCells as c (c.key)}
                    <div class="rr-slotCell">
                      <span class="rr-chip rr-wide" style={chipStyle(c.key)}>{slotLabel(c.key)}</span>
                      <b class="rr-val" style={c.style}>{c.v}</b>
                      <span class="rr-avg">({c.avg})</span>
                      <span class="rr-rank">{c.rank}</span>
                    </div>
                  {/each}
                </div>
              </div>
            {/if}
            <p class="rr-note">
              Shading like the Standings tables: pink = highest in the league, cyan = lowest.
              {#if data.hasPoints}Points per week through week {data.throughWeek} (Standings' position averages).{:else}Points per week start once a week has been played.{/if}
              Age and players count the whole roster, taxi and IR included.
            </p>
          </section>

          <section class="rr-card">
            <div class="rr-cardHead">
              <h2>Depth chart</h2>
              <span class="rr-legend"><span class="rr-dc rr-dcStart rr-dcLegend">Starting</span><span>T taxi</span><span>IR injured reserve</span></span>
            </div>
            <p class="rr-note rr-noteTop">
              {#if view.projected}Starting = the best lineup by projected points per game over the rest of the regular season (bye weeks don't count against anyone).{:else}No projections right now, so starting = the current Sleeper lineup.{/if}
            </p>
            {#each view.depth as g (g.pos)}
              <div class="rr-dcRow">
                <span class="rr-chip" style={chipStyle(g.pos)}>{g.pos}</span>
                <div class="rr-dcList">
                  {#each g.players as p (p.id)}
                    <span class="rr-dc" class:rr-dcStart={p.tag === "start"} class:rr-dcTaxi={p.tag === "T"} class:rr-dcIR={p.tag === "IR"} style={p.tag === "start" ? `--pos: var(--or-pos-${g.pos})` : ""} title={p.title}>
                      {#if p.tag === "T" || p.tag === "IR"}<b>{p.tag}</b>{/if}{p.name}
                    </span>
                  {/each}
                </div>
              </div>
            {/each}
          </section>

          <section class="rr-card">
            <div class="rr-cardHead"><h2>Draft picks</h2><span class="rr-muted">{view.pickCount} pick{view.pickCount === 1 ? "" : "s"}</span></div>
            {#if view.picks.length}
              {#each view.picks as y (y.season)}
                <div class="rr-pickRow">
                  <b class="rr-season">{y.season}</b>
                  <div class="rr-dcList">
                    {#each y.list as p, i (i)}
                      <span class="rr-pick">{p.round}{#if p.via}<span class="rr-via"> · via {p.via}</span>{/if}</span>
                    {/each}
                  </div>
                </div>
              {/each}
            {:else}
              <p class="rr-muted">No future picks.</p>
            {/if}
          </section>
        </div>
      </div>
    {/if}
  {/if}
</div>

<style>
  .rr-rosters {
    max-width: 1140px;
    margin: 0 auto 6em;
    padding: 0 12px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  h1.rr-pageTitle {
    margin: 1.33em 0 0;
    text-align: center;
    font-size: 2.125rem;
    font-weight: 500;
    line-height: 1.2;
    color: var(--or-heading, var(--g111));
  }

  .rr-muted {
    color: var(--or-muted, var(--g999));
    font-size: 0.82em;
  }

  /* ---- team strip */
  .rr-strip {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(64px, 1fr));
    gap: 6px;
  }

  .rr-stripBtn {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    min-width: 0;
    padding: 8px 4px;
    border-radius: 12px;
    border: 1px solid var(--or-table-border, var(--ccc));
    background: var(--fff);
    color: var(--or-text, var(--g111));
    font: inherit;
    font-size: 0.68rem;
    line-height: 1.2;
    cursor: pointer;
  }

  .rr-stripBtn span {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .rr-stripBtn img,
  .rr-avEmpty {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    object-fit: cover;
    box-sizing: border-box;
  }

  .rr-avEmpty {
    border: 1px dashed var(--or-table-border, var(--ccc));
  }

  .rr-allBtn svg {
    color: var(--or-cyan, #0b8a9a);
    height: 34px;
  }

  .rr-stripBtn:hover {
    border-color: color-mix(in srgb, var(--or-cyan, #0b8a9a) 60%, transparent);
  }

  .rr-stripBtn.rr-on {
    border-color: var(--or-cyan, #0b8a9a);
    background: color-mix(in srgb, var(--or-cyan, #0b8a9a) 10%, var(--fff));
    box-shadow: 0 0 14px color-mix(in srgb, var(--or-cyan, #0b8a9a) 25%, transparent);
  }

  /* ---- header */
  .rr-hero {
    display: flex;
    align-items: center;
    gap: 18px;
    padding: 18px 22px;
    border-radius: 16px;
    border: 1px solid var(--or-table-border, var(--ccc));
    background: radial-gradient(circle at 0% 50%, color-mix(in srgb, var(--or-pink, #c2185b) 16%, transparent), transparent 50%), var(--fff);
  }

  .rr-heroAv {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    object-fit: cover;
    flex: none;
    border: 1px solid var(--or-table-border, var(--ccc));
  }

  .rr-heroText {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
    min-width: 0;
  }

  h2.rr-teamName {
    margin: 0;
    font: 800 1.35rem "Orbitron", sans-serif;
    color: var(--or-heading, var(--g111));
    text-align: left;
    overflow-wrap: anywhere;
  }

  .rr-heroLine {
    font-size: 0.85em;
    color: var(--or-muted, var(--g999));
  }

  .rr-link {
    padding: 0;
    border: 0;
    background: none;
    color: var(--or-text, var(--g111));
    font: inherit;
    cursor: pointer;
  }

  .rr-link:hover {
    color: var(--or-pink, var(--blueOne));
  }

  .rr-heroStats {
    display: flex;
    gap: 10px;
  }

  .rr-stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 8px 14px;
    border-radius: 12px;
    border: 1px solid var(--or-table-border, var(--ccc));
  }

  .rr-stat b {
    font: 800 1.1rem "Orbitron", sans-serif;
    color: var(--or-heading, var(--g111));
    white-space: nowrap;
  }

  .rr-stat span {
    font-size: 0.7rem;
    color: var(--or-muted, var(--g999));
    white-space: nowrap;
  }

  /* ---- layout */
  .rr-grid {
    display: grid;
    grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.3fr);
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
    border-radius: 16px;
    border: 1px solid var(--or-table-border, var(--ccc));
    background: var(--fff);
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 0;
  }

  .rr-all {
    padding: 14px 6px;
  }

  .rr-cardHead {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 10px;
    flex-wrap: wrap;
  }

  .rr-cardHead h2 {
    margin: 0;
    font: 700 1rem "Orbitron", sans-serif;
    color: var(--or-heading, var(--g111));
  }

  .rr-note {
    margin: 4px 0 0;
    font-size: 0.74rem;
    color: var(--or-muted, var(--g999));
  }

  .rr-noteTop {
    margin: -2px 0 2px;
  }

  /* position / slot chips: a soft tint of the position color (gradients for flex slots) */
  .rr-chip {
    display: inline-grid;
    place-items: center;
    min-width: 40px;
    height: 22px;
    padding: 0 5px;
    box-sizing: border-box;
    border-radius: 6px;
    font: 700 0.66rem "Roboto", sans-serif;
    letter-spacing: 0.03em;
    color: var(--chip-fg);
    background: var(--chip-bg);
    border: 1px solid var(--chip-border);
    white-space: nowrap;
    justify-self: start;
  }

  .rr-chip.rr-wide {
    min-width: 58px;
  }

  /* ---- lineup */
  .rr-lineup {
    padding: 14px 0 6px;
  }

  .rr-lineup .rr-cardHead {
    padding: 0 16px;
  }

  .rr-lineRow {
    display: grid;
    grid-template-columns: 48px 30px minmax(0, 1fr) auto;
    align-items: center;
    gap: 10px;
    padding: 5px 16px;
    border-top: 1px solid color-mix(in srgb, var(--or-table-border, #ccc) 40%, transparent);
  }

  .rr-lineRow .rr-slotChip {
    width: 48px;
    min-width: 0;
  }

  .rr-lineRow.rr-divider {
    border-top: 2px solid color-mix(in srgb, var(--or-cyan, #0b8a9a) 40%, transparent);
  }

  .rr-lineRow.rr-empty {
    background: color-mix(in srgb, #ff6b6b 8%, transparent);
  }

  .rr-photo {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background-size: cover;
    background-position: center;
    background-color: var(--f8f8f8);
  }

  .rr-noPhoto {
    border: 1px dashed color-mix(in srgb, #ff6b6b 60%, transparent);
    box-sizing: border-box;
    background: none;
  }

  .rr-pText {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .rr-pName {
    font-size: 0.85rem;
    color: var(--or-text, var(--g111));
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .rr-empty .rr-pName {
    color: #ff6b6b;
    font-style: italic;
  }

  .rr-pMeta {
    font-size: 0.7rem;
    color: var(--or-muted, var(--g999));
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .rr-inj {
    font: 700 0.62rem "Roboto", sans-serif;
    padding: 1px 5px;
    border-radius: 4px;
    color: #e0a800;
    border: 1px solid #e0a800;
  }

  .rr-inj.rr-out {
    color: #ff6b6b;
    border-color: #ff6b6b;
  }

  /* ---- position breakdown */
  .rr-bdRow {
    display: grid;
    grid-template-columns: 72px repeat(3, minmax(0, 1fr));
    gap: 10px;
    align-items: center;
    padding: 4px 0;
  }

  .rr-bdHead {
    padding: 2px 0 6px;
    border-bottom: 1px solid var(--or-table-border, var(--ccc));
    font-size: 0.66rem;
    letter-spacing: 0.1em;
    font-weight: 700;
    text-transform: uppercase;
    color: var(--or-cyan, #0b8a9a);
  }

  .rr-bdSide {
    border-top: 1px solid var(--or-table-border, var(--ccc));
    margin-top: 4px;
    padding-top: 8px;
  }

  .rr-bdLabel {
    font: 700 0.74rem "Orbitron", sans-serif;
    color: var(--or-heading, var(--g111));
  }

  .rr-cell {
    display: flex;
    align-items: baseline;
    gap: 6px;
    min-width: 0;
  }

  .rr-val {
    font: 700 0.78rem "Orbitron", sans-serif;
    padding: 2px 7px;
    border-radius: 6px;
    color: var(--or-text, var(--g111));
    white-space: nowrap;
  }

  .rr-avg {
    font-size: 0.7rem;
    color: var(--or-muted, var(--g999));
    white-space: nowrap;
  }

  .rr-rank {
    font-size: 0.7rem;
    color: var(--or-text, var(--g111));
    margin-left: auto;
    white-space: nowrap;
  }

  /* rank right after the league average, so each column reads as one group */
  .rr-cell .rr-rank {
    margin-left: 0;
  }

  .rr-slots {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-top: 6px;
    padding-top: 10px;
    border-top: 1px solid var(--or-table-border, var(--ccc));
  }

  .rr-slotsHead {
    font-size: 0.66rem;
    letter-spacing: 0.1em;
    font-weight: 700;
    text-transform: uppercase;
    color: var(--or-cyan, #0b8a9a);
  }

  .rr-slotsHead .rr-muted {
    font-weight: 400;
    letter-spacing: 0;
    text-transform: none;
    font-size: 1em;
  }

  .rr-slotGrid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
    gap: 8px;
  }

  .rr-slotCell {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    border-radius: 10px;
    border: 1px solid var(--or-table-border, var(--ccc));
  }

  /* ---- depth chart */
  .rr-legend {
    display: flex;
    gap: 10px;
    align-items: center;
    font-size: 0.7rem;
    color: var(--or-muted, var(--g999));
  }

  .rr-dcRow,
  .rr-pickRow {
    display: grid;
    grid-template-columns: 44px minmax(0, 1fr);
    gap: 10px;
    align-items: start;
    padding: 6px 0;
    border-top: 1px solid color-mix(in srgb, var(--or-table-border, #ccc) 40%, transparent);
  }

  .rr-dcRow .rr-chip {
    margin-top: 2px;
  }

  .rr-dcList {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .rr-dc {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 10px;
    border-radius: 999px;
    font-size: 0.75rem;
    border: 1px solid var(--or-table-border, var(--ccc));
    color: var(--or-muted, var(--g999));
    white-space: nowrap;
  }

  .rr-dc b {
    font-size: 0.85em;
  }

  .rr-dc.rr-dcStart {
    --pos: var(--or-text, #888);
    border-color: color-mix(in srgb, var(--pos) 55%, transparent);
    background: color-mix(in srgb, var(--pos) 14%, transparent);
    color: var(--or-text, var(--g111));
    font-weight: 600;
  }

  .rr-dc.rr-dcLegend {
    padding: 1px 8px;
    font-size: 1em;
  }

  .rr-dc.rr-dcTaxi {
    border-style: dashed;
    border-color: color-mix(in srgb, var(--or-cyan, #0b8a9a) 60%, transparent);
  }

  .rr-dc.rr-dcIR {
    border-style: dashed;
    border-color: color-mix(in srgb, #ff6b6b 60%, transparent);
  }

  /* ---- picks */
  .rr-season {
    font: 700 0.8rem "Orbitron", sans-serif;
    color: var(--or-cyan, #0b8a9a);
    padding-top: 4px;
  }

  .rr-pick {
    padding: 4px 10px;
    border-radius: 8px;
    font-size: 0.75rem;
    border: 1px solid var(--or-table-border, var(--ccc));
    color: var(--or-text, var(--g111));
  }

  .rr-via {
    color: var(--or-muted, var(--g999));
  }

  /* ---- phones */
  @media (max-width: 899.98px) {
    .rr-grid {
      grid-template-columns: minmax(0, 1fr);
    }
  }

  @media (max-width: 759.98px) {
    .rr-strip {
      display: flex;
      overflow-x: auto;
      padding-bottom: 4px;
    }

    .rr-stripBtn {
      flex: none;
      width: 68px;
    }

    .rr-hero {
      flex-wrap: wrap;
      padding: 14px;
      gap: 12px;
    }

    .rr-heroStats {
      width: 100%;
    }

    .rr-stat {
      flex: 1;
      padding: 6px 4px;
    }

    .rr-bdRow {
      grid-template-columns: 52px repeat(3, minmax(0, 1fr));
      gap: 6px;
    }

    /* value on top, league average and rank under it */
    .rr-cell {
      flex-wrap: wrap;
      gap: 2px 4px;
    }

    .rr-cell .rr-val {
      flex-basis: 100%;
      text-align: center;
      box-sizing: border-box;
    }

    .rr-legend {
      flex-wrap: wrap;
    }
  }
</style>
