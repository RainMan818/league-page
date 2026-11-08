<!--
  Outrun chrome logo, used in the site header (src/lib/Nav/index.svelte).
  Change the words with the title/subtitle props. Letters come from ./glyphs.js;
  any character without a glyph there is skipped.
-->
<script>
  import { logoSvg } from "./logo.js";

  let { title = "DYNASTY", subtitle = "LEAGUE · IDP SF" } = $props();

  const svg = $derived(logoSvg({ title, subtitle }));
</script>

<span class="outrunLogoWrap">{@html svg}</span>

<style>
  .outrunLogoWrap {
    display: block;
    width: 340px;
    max-width: 62vw;
    margin: 0 auto;
    padding: 16px 0 26px;
    line-height: 0;
  }

  .outrunLogoWrap :global(svg) {
    width: 100%;
    height: auto;
    overflow: visible;
  }

  @media (max-width: 950px) {
    .outrunLogoWrap {
      width: 260px;
      padding: 14px 0 12px;
    }
  }
</style>
