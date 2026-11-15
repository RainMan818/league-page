<!--
  /constitution: the league rules. Text lives in ./content.js (edit rules there); this file is the layout:
  key facts strip, "New this season" links, a sticky contents column that follows your place (phones get a
  collapsible Contents box), and one numbered card per section. Every rule number is a link (#taxi-2) to share.
-->
<script>
  import { onMount } from "svelte";
  import { SECTIONS, GLANCE, UPDATED } from "./content.js";

  const pad = (n) => String(n).padStart(2, "0");
  const subId = (s, j) => `${s.id}-${j + 1}`;

  // rules tagged isNew, linked from the top of the page
  const fresh = SECTIONS.flatMap((s, i) =>
    s.subsections.map((sub, j) => ({ ...sub, id: subId(s, j), num: `${i + 1}.${j + 1}` })).filter((sub) => sub.isNew)
  );

  let active = $state(SECTIONS[0].id);
  let tocOpen = $state(false);

  onMount(() => {
    if (typeof IntersectionObserver === "undefined") return;
    // a section counts as "current" while it crosses a band near the top of the screen
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) active = e.target.id;
      },
      { rootMargin: "-15% 0px -75% 0px" }
    );
    for (const s of SECTIONS) {
      const el = document.getElementById(s.id);
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  });
</script>

<svelte:head>
  <title>Constitution · The Dynasty League IDP SF</title>
</svelte:head>

{#snippet toc(mobile)}
  <ol class="rr-tocList">
    {#each SECTIONS as s, i}
      <li>
        <a class="rr-tocLink" class:rr-on={active === s.id} href="#{s.id}" onclick={() => mobile && (tocOpen = false)}>
          <span class="rr-tocNum">{pad(i + 1)}</span>{s.title}
        </a>
      </li>
    {/each}
  </ol>
{/snippet}

<div class="rr-con">
  <h1 class="rr-pageTitle">League Constitution</h1>
  <p class="rr-conSub">The Dynasty League IDP SF · {UPDATED}</p>

  <div class="rr-glance">
    {#each GLANCE as g}
      <div class="rr-tile">
        <div class="rr-tileValue">{g.value}</div>
        <div class="rr-tileLabel">{g.label}</div>
        <div class="rr-tileSub">{g.sub}</div>
      </div>
    {/each}
  </div>

  {#if fresh.length}
    <div class="rr-fresh">
      <span class="rr-freshLabel">New this season</span>
      {#each fresh as f}
        <a class="rr-freshLink" href="#{f.id}">{f.num} {f.title}</a>
      {/each}
    </div>
  {/if}

  <details class="rr-tocMobile" bind:open={tocOpen}>
    <summary>Contents</summary>
    {@render toc(true)}
  </details>

  <div class="rr-conBody">
    <aside class="rr-toc" aria-label="Contents">
      <div class="rr-tocTitle">Contents</div>
      {@render toc(false)}
    </aside>

    <div class="rr-sections">
      {#each SECTIONS as s, i}
        <section class="rr-sec" id={s.id}>
          <h2 class="rr-secTitle"><span class="rr-secNum">{pad(i + 1)}</span>{s.title}</h2>

          {#each s.subsections as sub, j}
            <div class="rr-sub" id={subId(s, j)}>
              <h3 class="rr-subTitle">
                <a class="rr-subNum" href="#{subId(s, j)}" title="Link to this rule">{i + 1}.{j + 1}</a>
                {sub.title}
                {#if sub.isNew}<span class="rr-new">New</span>{/if}
              </h3>

              {#each sub.blocks as b}
                {#if b.p}
                  <p>{@html b.p}</p>
                {:else if b.list}
                  <ul>
                    {#each b.list as item}<li>{@html item}</li>{/each}
                  </ul>
                {:else if b.steps}
                  <ol class="rr-steps">
                    {#each b.steps as item}<li>{@html item}</li>{/each}
                  </ol>
                {:else if b.table}
                  <div class="rr-ruleTableWrap">
                    <table class="rr-ruleTable">
                      <thead>
                        <tr>{#each b.table.cols as c}<th>{c}</th>{/each}</tr>
                      </thead>
                      <tbody>
                        {#each b.table.rows as row}
                          <tr>{#each row as cell}<td>{@html cell}</td>{/each}</tr>
                        {/each}
                      </tbody>
                      {#if b.table.foot}
                        <tfoot>
                          <tr>{#each b.table.foot as cell}<td>{@html cell}</td>{/each}</tr>
                        </tfoot>
                      {/if}
                    </table>
                  </div>
                {:else if b.note}
                  <p class="rr-note">{@html b.note}</p>
                {:else if b.example}
                  <p class="rr-example"><span class="rr-exampleLabel">Example</span>{@html b.example}</p>
                {/if}
              {/each}
            </div>
          {/each}
        </section>
      {/each}
    </div>
  </div>
</div>

<style>
  .rr-con {
    position: relative;
    z-index: 1;
    max-width: 1140px;
    margin: 0 auto;
    padding: 0 16px 5em;
    text-align: left;
  }

  /* same heading as the other redesigned pages */
  h1.rr-pageTitle {
    margin: 1.33em 0 0.2em;
    text-align: center;
    font-size: 2.125rem;
    font-weight: 500;
    line-height: 1.2;
    color: var(--or-heading, var(--g111));
    text-shadow: var(--or-heading-glow, none);
  }

  .rr-conSub {
    margin: 0 0 24px;
    text-align: center;
    font-size: 0.85em;
    color: var(--or-muted, var(--g999));
  }

  /* ---------- key facts ---------- */
  .rr-glance {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 12px;
    margin: 0 0 16px;
  }

  .rr-tile {
    padding: 14px 12px 12px;
    border: 1px solid var(--or-table-border, var(--ccc));
    border-radius: 12px;
    background: var(--fff);
    box-shadow: 0 6px 24px var(--or-table-shadow, transparent);
    text-align: center;
  }

  .rr-tileValue {
    font: 700 1.6rem/1.1 "Orbitron", "Arial Black", sans-serif;
    color: var(--or-pink, var(--blueOne));
    text-shadow: 0 0 12px var(--or-glow-pink, transparent);
  }

  .rr-tileLabel {
    margin-top: 6px;
    font-size: 0.78em;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--or-cyan, #0b8a9a);
  }

  .rr-tileSub {
    margin-top: 2px;
    font-size: 0.8em;
    color: var(--or-muted, var(--g999));
  }

  /* ---------- new this season ---------- */
  .rr-fresh {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin: 0 0 28px;
  }

  .rr-freshLabel {
    font: 500 0.75rem "Orbitron", sans-serif;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--or-orange, #ff9e3d);
  }

  .rr-con a.rr-freshLink,
  .rr-con a.rr-freshLink:visited {
    padding: 5px 12px;
    border-radius: 999px;
    border: 1px solid var(--or-orange, #ff9e3d);
    color: var(--or-text, var(--g333));
    font-size: 0.82em;
    text-decoration: none;
  }

  .rr-con a.rr-freshLink:hover {
    background: color-mix(in srgb, var(--or-orange, #ff9e3d) 14%, transparent);
  }

  /* ---------- layout ---------- */
  .rr-conBody {
    display: grid;
    grid-template-columns: 230px minmax(0, 1fr);
    gap: 28px;
    align-items: start;
  }

  .rr-toc {
    position: sticky;
    top: 16px;
    padding: 14px 10px;
    border: 1px solid var(--or-table-border, var(--ccc));
    border-radius: 12px;
    background: var(--fff);
  }

  .rr-tocTitle {
    margin: 0 8px 8px;
    font: 500 0.75rem "Orbitron", sans-serif;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--or-cyan, #0b8a9a);
  }

  .rr-tocList {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .rr-con a.rr-tocLink,
  .rr-con a.rr-tocLink:visited {
    display: flex;
    gap: 10px;
    align-items: baseline;
    padding: 6px 8px;
    border-radius: 6px;
    border-left: 3px solid transparent;
    color: var(--or-text, var(--g333));
    font-size: 0.9em;
    text-decoration: none;
  }

  .rr-con a.rr-tocLink:hover {
    background: var(--or-row-hover, var(--eee));
  }

  .rr-con a.rr-tocLink.rr-on {
    border-left-color: var(--or-pink, var(--blueOne));
    background: var(--or-row-hover, var(--eee));
    color: var(--or-heading, var(--g111));
  }

  .rr-tocNum {
    font: 500 0.75rem "Orbitron", sans-serif;
    color: var(--or-muted, var(--g999));
  }

  .rr-con a.rr-tocLink.rr-on .rr-tocNum {
    color: var(--or-pink, var(--blueOne));
  }

  .rr-tocMobile {
    display: none;
  }

  /* ---------- sections ---------- */
  .rr-sections {
    display: flex;
    flex-direction: column;
    gap: 22px;
  }

  .rr-sec {
    scroll-margin-top: 16px;
    padding: 22px 26px 8px;
    border: 1px solid var(--or-table-border, var(--ccc));
    border-radius: 14px;
    background: var(--fff);
    box-shadow: 0 6px 24px var(--or-table-shadow, transparent);
  }

  h2.rr-secTitle {
    display: flex;
    align-items: baseline;
    gap: 14px;
    margin: 0 0 6px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--or-table-border, var(--ccc));
    font-size: 1.45rem;
    line-height: 1.2;
  }

  .rr-secNum {
    font-size: 1.1rem;
    color: var(--or-pink, var(--blueOne));
    text-shadow: 0 0 10px var(--or-glow-pink, transparent);
  }

  .rr-sub {
    scroll-margin-top: 16px;
    padding: 14px 0 6px;
  }

  .rr-sub + .rr-sub {
    border-top: 1px dashed color-mix(in srgb, var(--or-table-border, #ccc) 70%, transparent);
  }

  h3.rr-subTitle {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
    margin: 0 0 8px;
    font-size: 1.02rem;
    line-height: 1.3;
    text-shadow: none;
  }

  .rr-con a.rr-subNum,
  .rr-con a.rr-subNum:visited {
    min-width: 2.4em;
    color: var(--or-cyan, #0b8a9a);
    font-size: 0.9em;
    text-decoration: none;
  }

  .rr-con a.rr-subNum:hover {
    text-decoration: underline;
  }

  .rr-new {
    padding: 2px 8px;
    border-radius: 999px;
    background: var(--or-orange, #ff9e3d);
    color: #1a0630;
    font: 700 0.62rem "Orbitron", sans-serif;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .rr-sub p,
  .rr-sub li {
    color: var(--or-text, var(--g333));
    line-height: 1.6;
  }

  .rr-sub p {
    margin: 0 0 10px;
  }

  .rr-sub ul,
  .rr-sub ol {
    margin: 0 0 10px;
    padding-left: 1.4em;
  }

  .rr-sub li {
    margin: 0 0 6px;
  }

  .rr-sub li::marker {
    color: var(--or-pink, var(--blueOne));
  }

  ol.rr-steps li::marker {
    font-family: "Orbitron", sans-serif;
    font-size: 0.85em;
  }

  .rr-sub :global(b) {
    color: var(--or-heading, var(--g111));
    font-weight: 600;
  }

  .rr-note,
  .rr-example {
    padding: 10px 14px;
    border-radius: 8px;
    border-left: 3px solid var(--or-cyan, #0b8a9a);
    background: color-mix(in srgb, var(--or-cyan, #0b8a9a) 8%, transparent);
    font-size: 0.93em;
  }

  .rr-example {
    border-left-color: var(--or-purple, #7b1fa2);
    background: color-mix(in srgb, var(--or-purple, #7b1fa2) 9%, transparent);
  }

  .rr-exampleLabel {
    display: block;
    margin-bottom: 2px;
    font: 500 0.7rem "Orbitron", sans-serif;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--or-purple, #7b1fa2);
  }

  /* ---------- tables ---------- */
  .rr-ruleTableWrap {
    overflow-x: auto;
    margin: 0 0 12px;
    border: 1px solid var(--or-table-border, var(--ccc));
    border-radius: 10px;
  }

  table.rr-ruleTable {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9em;
  }

  table.rr-ruleTable th,
  table.rr-ruleTable td {
    padding: 8px 12px;
    text-align: left;
    vertical-align: top;
    color: var(--or-text, var(--g333));
  }

  table.rr-ruleTable th {
    color: var(--or-cyan, #0b8a9a);
    font-weight: 600;
    letter-spacing: 0.02em;
    border-bottom: 1px solid var(--or-table-border, var(--ccc));
  }

  table.rr-ruleTable tbody tr:nth-child(odd) {
    background: var(--f8f8f8);
  }

  table.rr-ruleTable td:first-child {
    white-space: nowrap;
    font-weight: 500;
  }

  table.rr-ruleTable tfoot td {
    border-top: 1px solid var(--or-table-border, var(--ccc));
    font-weight: 700;
    color: var(--or-heading, var(--g111));
  }

  /* ---------- smaller screens ---------- */
  @media (max-width: 1000px) {
    .rr-glance {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .rr-conBody {
      grid-template-columns: minmax(0, 1fr);
    }

    .rr-toc {
      display: none;
    }

    .rr-tocMobile {
      display: block;
      margin: 0 0 20px;
      border: 1px solid var(--or-table-border, var(--ccc));
      border-radius: 12px;
      background: var(--fff);
    }

    .rr-tocMobile summary {
      padding: 12px 16px;
      cursor: pointer;
      font: 500 0.8rem "Orbitron", sans-serif;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--or-cyan, #0b8a9a);
    }

    .rr-tocMobile .rr-tocList {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      padding: 0 8px 10px;
    }
  }

  @media (max-width: 600px) {
    h1.rr-pageTitle {
      font-size: 1.5rem;
    }

    .rr-glance {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
    }

    .rr-glance .rr-tile:last-child {
      grid-column: 1 / -1;
    }

    .rr-tileValue {
      font-size: 1.3rem;
    }

    .rr-sec {
      padding: 18px 16px 6px;
    }

    h2.rr-secTitle {
      font-size: 1.2rem;
    }

    .rr-tocMobile .rr-tocList {
      grid-template-columns: minmax(0, 1fr);
    }

    table.rr-ruleTable td:first-child {
      white-space: normal;
    }
  }
</style>
