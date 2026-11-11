<!--
  Drafts page layout (wraps everything in src/lib/Drafts/index.svelte). When a team is selected on any draft board
  (draftHighlight.svelte.js), its picks panel opens: a sticky column on the right on wide screens, a bottom sheet
  on narrower ones. Escape clears the selection.
-->
<script>
  import { onDestroy } from "svelte";
  import DraftPicksPanel from "./DraftPicksPanel.svelte";
  import { draftHighlight, clearTeam } from "./draftHighlight.svelte.js";

  let { children } = $props();

  const open = $derived(draftHighlight.rosterID != null);

  // the selection lives in a shared module, so clear it on leaving: a fresh visit starts with nothing selected
  onDestroy(clearTeam);
</script>

<svelte:window onkeydown={(e) => e.key === "Escape" && open && clearTeam()} />

<div class="rr-draftsLayout" class:rr-open={open}>
  <div class="rr-draftsMain">
    {@render children?.()}
  </div>
  {#if open}
    <DraftPicksPanel />
  {/if}
</div>

<style>
  .rr-draftsLayout {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
  }

  .rr-draftsMain {
    min-width: 0;
  }

  /* same breakpoint as SHEET_QUERY in draftHighlight.svelte.js */
  @media (min-width: 1100px) {
    .rr-draftsLayout.rr-open {
      grid-template-columns: minmax(0, 1fr) 300px;
      gap: 12px;
      padding-right: 16px;
    }
  }

  /* room under the boards for the bottom sheet */
  @media (max-width: 1099.98px) {
    .rr-draftsLayout.rr-open {
      padding-bottom: 46vh;
    }
  }
</style>
