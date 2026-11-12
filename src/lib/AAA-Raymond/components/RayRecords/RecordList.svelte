<!--
  One record list card on the Records page: top 5, with "Top 10" to show the rest.
  items: [{ key, avatar, title, sub, value, onclick? }] in rank order (built in RayRecords/index.svelte).
-->
<script>
  let { title, items = [], empty = "Nothing yet" } = $props();

  let open = $state(false);
  const shown = $derived(open ? items : items.slice(0, 5));
  const hideImg = (e) => (e.currentTarget.style.visibility = "hidden");
</script>

<section class="rr-list">
  <div class="rr-head">
    <h3>{title}</h3>
    {#if items.length > 5}
      <button type="button" class="rr-more" aria-expanded={open} onclick={() => (open = !open)}>{open ? "Top 5" : `Top ${items.length}`}</button>
    {/if}
  </div>
  {#each shown as it, i (it.key)}
    <div class="rr-row">
      <span class="rr-rank">{i + 1}</span>
      {#if it.avatar}<img src={it.avatar} alt="" onerror={hideImg} />{:else}<span class="rr-noAv"></span>{/if}
      <span class="rr-text">
        {#if it.onclick}
          <button type="button" class="rr-title" onclick={it.onclick}>{it.title}</button>
        {:else}
          <b class="rr-title">{it.title}</b>
        {/if}
        <span class="rr-sub">{it.sub}</span>
      </span>
      <b class="rr-value">{it.value}</b>
    </div>
  {:else}
    <p class="rr-empty">{empty}</p>
  {/each}
</section>

<style>
  .rr-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 16px;
    border-radius: 14px;
    border: 1px solid var(--or-table-border, var(--ccc));
    background: var(--fff);
    box-shadow: 0 6px 24px var(--or-table-shadow, transparent);
    min-width: 0;
    text-align: left;
  }

  .rr-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 6px;
  }

  h3 {
    margin: 0;
    font: 700 0.92rem "Orbitron", sans-serif;
    color: var(--or-heading, var(--g111));
  }

  .rr-more {
    padding: 0;
    border: 0;
    background: none;
    color: var(--or-cyan, #0b8a9a);
    font: inherit;
    font-size: 0.78em;
    cursor: pointer;
  }

  .rr-row {
    display: grid;
    grid-template-columns: 20px 28px minmax(0, 1fr) auto;
    gap: 8px;
    align-items: center;
    padding: 5px 0;
    border-bottom: 1px solid color-mix(in srgb, var(--or-table-border, #ccc) 55%, transparent);
  }

  .rr-rank {
    font: 700 0.75em "Orbitron", sans-serif;
    color: var(--or-cyan, #0b8a9a);
  }

  img,
  .rr-noAv {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    object-fit: cover;
  }

  .rr-text {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .rr-title {
    padding: 0;
    border: 0;
    background: none;
    font: inherit;
    font-weight: 700;
    font-size: 0.82em;
    color: var(--or-text, var(--g333));
    text-align: left;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  button.rr-title {
    cursor: pointer;
  }

  button.rr-title:hover {
    color: var(--or-pink, var(--blueOne));
  }

  .rr-sub {
    font-size: 0.7em;
    color: var(--or-muted, var(--g999));
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .rr-value {
    font: 700 0.8em "Orbitron", sans-serif;
    white-space: nowrap;
  }

  .rr-empty {
    margin: 4px 0;
    font-size: 0.82em;
    color: var(--or-muted, var(--g999));
  }
</style>
