<!--
  Phone / tablet navigation (under 950px; Raymond's option C, Nov 17), in place of the template's ☰ drawer
  (src/lib/Nav/NavSmall.svelte, no longer used). The main pages are an icon row under the logo; More drops a panel of
  the rest (the desktop "Clubhouse" dropdown) as tiles. Only the page you're on is pink; More gets a cyan outline
  while it's open. Pages come from src/lib/utils/tabs.js (so they follow the league, e.g. Constitution only with
  house rules); which go where: phoneNav.js.
-->
<script>
  import { page } from "$app/state";
  import { tabs } from "$lib/utils/tabs";
  import { enableBlog } from "$lib/utils/leagueInfo";
  import { rowAndMore, isCurrent, isExternal } from "./phoneNav.js";

  const { row, more, moreLabel } = rowAndMore(tabs, { enableBlog });
  const path = $derived(page.url.pathname);

  let open = $state(false);
  // close the panel after moving to another page
  $effect(() => {
    path;
    open = false;
  });
  const onKey = (e) => {
    if (open && e.key === "Escape") open = false;
  };
</script>

<svelte:window onkeydown={onKey} />

<div class="rr-pn">
  <div class="rr-pnRow" role="navigation" aria-label="Pages">
    {#each row as t (t.dest)}
      {@const here = isCurrent(t.dest, path)}
      <a class="rr-pnBtn" class:here href={t.dest} aria-current={here ? "page" : undefined} data-sveltekit-preload-data="hover">
        <span class="material-icons" aria-hidden="true">{t.icon}</span>
        <span class="rr-pnLabel">{t.short}</span>
      </a>
    {/each}
    <button
      type="button"
      class="rr-pnBtn rr-pnMore"
      class:open
      aria-expanded={open}
      aria-controls="rr-pnPanel"
      onclick={() => (open = !open)}
    >
      <span class="material-icons" aria-hidden="true">more_horiz</span>
      <span class="rr-pnLabel">More</span>
    </button>
  </div>

  {#if open}
    <button type="button" class="rr-pnBackdrop" aria-label="Close menu" onclick={() => (open = false)}></button>
    <div class="rr-pnPanel" id="rr-pnPanel">
      <span class="rr-pnHead">{moreLabel}</span>
      <div class="rr-pnTiles">
        {#each more as t (t.dest)}
          {@const here = isCurrent(t.dest, path)}
          <a
            class="rr-pnTile"
            class:here
            href={t.dest}
            aria-current={here ? "page" : undefined}
            target={isExternal(t.dest) ? "_blank" : undefined}
            rel={isExternal(t.dest) ? "noopener noreferrer" : undefined}
            data-sveltekit-preload-data={isExternal(t.dest) ? "off" : "hover"}
            onclick={() => (open = false)}
          >
            <span class="material-icons" aria-hidden="true">{t.icon}</span>
            <span>{t.label}</span>
          </a>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .rr-pn {
    position: relative;
    padding: 2px 12px 12px;
  }

  .rr-pnRow {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 3px;
    max-width: 560px;
    margin: 0 auto;
    padding: 4px;
    border-radius: 16px;
    border: 1px solid var(--or-toggle-border);
    background: var(--or-toggle-bg);
    position: relative;
    z-index: 11;
  }

  .rr-pnBtn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    padding: 7px 0 6px;
    border: 0;
    border-radius: 12px;
    background: none;
    color: var(--or-toggle-text);
    font: inherit;
    text-decoration: none;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }

  .rr-pnBtn .material-icons {
    font-size: 21px;
    line-height: 1;
  }

  .rr-pnLabel {
    font: 600 10px/1.1 Roboto, system-ui, sans-serif;
    white-space: nowrap;
  }

  /* the page you're on: the only pink thing */
  .rr-pnBtn.here {
    color: #fff;
    background: linear-gradient(180deg, color-mix(in srgb, var(--or-pink) 70%, transparent), color-mix(in srgb, var(--or-purple) 50%, transparent));
    box-shadow: 0 0 10px var(--or-glow-pink);
  }

  .rr-pnMore.open {
    color: var(--or-cyan);
    box-shadow: inset 0 0 0 1px var(--or-cyan);
  }

  .rr-pnBackdrop {
    position: fixed;
    inset: 0;
    z-index: 9;
    border: 0;
    padding: 0;
    background: rgba(0, 0, 0, 0.35);
    cursor: default;
  }

  .rr-pnPanel {
    position: absolute;
    top: calc(100% - 6px);
    left: 12px;
    right: 12px;
    max-width: 560px;
    margin: 0 auto;
    z-index: 10;
    box-sizing: border-box;
    padding: 12px;
    border-radius: 18px;
    border: 1px solid var(--or-toggle-border);
    background: var(--or-footer-bg);
    box-shadow: 0 18px 40px rgba(0, 0, 0, 0.55);
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .rr-pnHead {
    font: 700 10px Roboto, system-ui, sans-serif;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--or-cyan);
  }

  .rr-pnTiles {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
    gap: 8px;
  }

  .rr-pnTile {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 7px;
    padding: 13px 4px;
    border-radius: 14px;
    border: 1px solid var(--or-toggle-border);
    background: var(--or-toggle-bg);
    color: var(--or-toggle-text);
    font-size: 11.5px;
    line-height: 1.2;
    text-align: center;
    text-decoration: none;
  }

  .rr-pnTile .material-icons {
    font-size: 24px;
    color: var(--or-cyan);
  }

  .rr-pnTile.here {
    border-color: var(--or-pink);
    background: color-mix(in srgb, var(--or-pink) 16%, var(--or-toggle-bg));
    color: var(--or-heading);
  }

  .rr-pnTile.here .material-icons {
    color: var(--or-pink);
  }
</style>
