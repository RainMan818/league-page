<!--
  Resources page (option A): the dynasty links in four cards (links.js), then the latest news from the site's news
  endpoint (podcasts, dynasty sites, Reddit) with source filters. Rows open the story in a new tab. Rendered by
  src/routes/resources/+page.svelte; makes no Sleeper requests.
-->
<script>
  import { page } from "$app/state";
  import { dynasty as dynastyDefault } from "$lib/utils/leagueInfo";
  import { resourceGroups } from "./links.js";
  import { newsItems, sourceCounts } from "../../utils/newsFeed.js";
  import Loading from "../Shared/Loading.svelte";

  let { articlesData } = $props();

  const FIRST = 9;
  const MORE = 15;
  // dynasty or redraft links: from Sleeper's league type unless the league's profile says (src/routes/+layout.js)
  const dynasty = $derived(page.data.site?.dynasty ?? dynastyDefault);
  const groups = $derived(resourceGroups(dynasty));

  let status = $state("loading"); // loading | ready
  let items = $state.raw([]);
  let source = $state("all");
  let shown = $state(FIRST);

  $effect(() => {
    let cancelled = false;
    Promise.resolve(articlesData)
      .then((res) => {
        if (cancelled) return;
        items = newsItems(res?.articles ?? []);
        status = "ready";
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) status = "ready";
      });
    return () => (cancelled = true);
  });

  const chips = $derived(sourceCounts(items));
  const filtered = $derived(source === "all" ? items : items.filter((it) => it.source.key === source));
  const visible = $derived(filtered.slice(0, shown));
  const pick = (key) => {
    source = key;
    shown = FIRST;
  };
</script>

<div class="rr-resources">
  <h1 class="rr-pageTitle">Resources</h1>
  <p class="rr-sub">{dynasty ? "Dynasty tools, and the latest from the dynasty sites" : "Fantasy tools, and the latest fantasy football news"}</p>

  <div class="rr-groups">
    {#each groups as g (g.title)}
      <section class="rr-card rr-group" style="--accent: {g.color}">
        <span class="rr-bar" aria-hidden="true"></span>
        <h2>{g.title}</h2>
        {#each g.links as l (l.url)}
          <a class="rr-link" href={l.url} target="_blank" rel="noopener noreferrer">
            <span class="rr-linkName">
              {l.name}
              <span class="rr-arrow" aria-hidden="true">↗</span>
              {#if l.premium}<span class="rr-pay" title="Some or all of it is behind a paywall">Paywall</span>{/if}
            </span>
            <span class="rr-note">{l.note}</span>
          </a>
        {/each}
      </section>
    {/each}
  </div>

  <section class="rr-card rr-news">
    <div class="rr-newsHead">
      <h2>Latest news</h2>
      {#if items.length}
        <div class="rr-chips" role="group" aria-label="Filter by source">
          <button type="button" class="rr-chip" class:rr-on={source === "all"} aria-pressed={source === "all"} onclick={() => pick("all")}>All <b>{items.length}</b></button>
          {#each chips as c (c.key)}
            <button type="button" class="rr-chip" class:rr-on={source === c.key} aria-pressed={source === c.key} onclick={() => pick(c.key)}>{c.label} <b>{c.n}</b></button>
          {/each}
        </div>
      {/if}
    </div>

    {#if status === "loading"}
      <Loading message="Getting the latest news..." />
    {:else if !items.length}
      <p class="rr-empty">The news feeds couldn't be reached right now. Try again later.</p>
    {:else}
      <div class="rr-feed">
        {#each visible as a (a.id)}
          <a class="rr-row" href={a.link} target="_blank" rel="noopener noreferrer">
            <span class="rr-badge" style="--src: {a.source.color}" aria-hidden="true">{a.source.ab}</span>
            <span class="rr-text">
              <span class="rr-title">{a.title}</span>
              {#if a.excerpt}<span class="rr-excerpt">{a.excerpt}</span>{/if}
            </span>
            <span class="rr-meta">
              <span><span class="rr-src" style="--src: {a.source.color}">{a.source.label}</span> · {a.ago}</span>
              <span class="rr-kind" class:rr-pod={a.kind === "Podcast"}>{a.kind}</span>
            </span>
          </a>
        {/each}
      </div>
      {#if filtered.length > shown}
        <button type="button" class="rr-more" onclick={() => (shown += MORE)}>Show {Math.min(MORE, filtered.length - shown)} more ▾</button>
      {/if}
    {/if}
  </section>
</div>

<style>
  .rr-resources {
    position: relative;
    z-index: 1;
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

  .rr-sub {
    margin: -10px 0 0;
    text-align: center;
    font-size: 0.85rem;
    color: var(--or-muted, var(--g999));
  }

  .rr-card {
    border-radius: 16px;
    border: 1px solid var(--or-table-border, var(--ccc));
    background: var(--fff);
    min-width: 0;
  }

  /* ---- link cards */
  .rr-groups {
    display: grid;
    grid-template-columns: 1.25fr 1.1fr 0.85fr 0.95fr;
    gap: 14px;
    align-items: start;
  }

  .rr-group {
    padding: 14px 16px 6px;
    display: flex;
    flex-direction: column;
  }

  .rr-bar {
    width: 26px;
    height: 3px;
    border-radius: 2px;
    background: var(--accent);
  }

  .rr-group h2 {
    margin: 8px 0 6px;
    font: 700 0.82rem "Orbitron", sans-serif;
    color: var(--or-heading, var(--g111));
    text-align: left;
  }

  .rr-link {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 8px 0;
    border-top: 1px solid color-mix(in srgb, var(--or-table-border, #ccc) 45%, transparent);
    text-decoration: none;
  }

  .rr-linkName {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    font-size: 0.86rem;
    color: var(--or-text, var(--g111));
  }

  .rr-arrow {
    color: var(--or-cyan, #0b8a9a);
    font-size: 0.8rem;
  }

  .rr-link:hover .rr-linkName {
    color: var(--accent);
  }

  .rr-pay {
    padding: 0 6px;
    border-radius: 4px;
    font: 700 0.58rem "Roboto", sans-serif;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    line-height: 1.6;
    color: #d9a400;
    border: 1px solid color-mix(in srgb, #d9a400 60%, transparent);
  }

  .rr-note {
    font-size: 0.7rem;
    color: var(--or-muted, var(--g999));
  }

  /* ---- news */
  .rr-news {
    padding: 16px 20px 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .rr-newsHead {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px 14px;
    flex-wrap: wrap;
    padding-bottom: 6px;
  }

  .rr-newsHead h2 {
    margin: 0;
    font: 700 1rem "Orbitron", sans-serif;
    color: var(--or-heading, var(--g111));
  }

  .rr-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .rr-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px 12px;
    border-radius: 999px;
    border: 1px solid var(--or-table-border, var(--ccc));
    background: none;
    font: 500 0.75rem "Roboto", sans-serif;
    color: var(--or-text, var(--g111));
    cursor: pointer;
  }

  .rr-chip b {
    opacity: 0.75;
  }

  .rr-chip:hover {
    border-color: var(--or-cyan, #0b8a9a);
  }

  .rr-chip.rr-on {
    background: var(--or-cyan, #0b8a9a);
    border-color: var(--or-cyan, #0b8a9a);
    color: var(--fff);
  }

  .rr-row {
    display: grid;
    grid-template-columns: 34px minmax(0, 1fr) auto;
    gap: 14px;
    align-items: start;
    padding: 10px 0;
    border-top: 1px solid color-mix(in srgb, var(--or-table-border, #ccc) 45%, transparent);
    text-decoration: none;
  }

  .rr-badge {
    display: inline-grid;
    place-items: center;
    width: 34px;
    height: 34px;
    border-radius: 9px;
    font: 800 0.66rem "Orbitron", sans-serif;
    color: var(--src);
    background: color-mix(in srgb, var(--src) 14%, transparent);
    border: 1px solid color-mix(in srgb, var(--src) 50%, transparent);
  }

  .rr-text {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
  }

  .rr-title {
    font-size: 0.92rem;
    font-weight: 500;
    color: var(--or-text, var(--g111));
  }

  .rr-row:hover .rr-title {
    color: var(--or-pink, var(--blueOne));
  }

  .rr-excerpt {
    font-size: 0.78rem;
    color: var(--or-muted, var(--g999));
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .rr-meta {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 5px;
    font-size: 0.72rem;
    color: var(--or-muted, var(--g999));
    white-space: nowrap;
  }

  .rr-src {
    color: var(--src);
    font-weight: 600;
  }

  .rr-kind {
    padding: 0 6px;
    border-radius: 4px;
    font: 700 0.58rem "Roboto", sans-serif;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    line-height: 1.7;
    color: var(--or-cyan, #0b8a9a);
    border: 1px solid color-mix(in srgb, var(--or-cyan, #0b8a9a) 50%, transparent);
  }

  .rr-kind.rr-pod {
    color: var(--or-purple, #8e3fd1);
    border-color: color-mix(in srgb, var(--or-purple, #8e3fd1) 60%, transparent);
  }

  .rr-more {
    align-self: center;
    margin-top: 4px;
    padding: 6px 14px;
    border: 0;
    background: none;
    font: 500 0.8rem "Roboto", sans-serif;
    color: var(--or-cyan, #0b8a9a);
    cursor: pointer;
  }

  .rr-more:hover {
    color: var(--or-pink, var(--blueOne));
  }

  .rr-empty {
    margin: 8px 0;
    color: var(--or-muted, var(--g999));
    font-size: 0.85rem;
  }

  @media (max-width: 959.98px) {
    .rr-groups {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 599.98px) {
    .rr-groups {
      grid-template-columns: minmax(0, 1fr);
    }

    .rr-news {
      padding: 14px 14px 10px;
    }

    /* source, time and kind move under the title */
    .rr-row {
      grid-template-columns: 34px minmax(0, 1fr);
      gap: 4px 12px;
    }

    .rr-meta {
      grid-column: 2;
      flex-direction: row;
      align-items: center;
      gap: 8px;
    }

    .rr-excerpt {
      white-space: normal;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      line-clamp: 2;
      -webkit-box-orient: vertical;
    }
  }
</style>
