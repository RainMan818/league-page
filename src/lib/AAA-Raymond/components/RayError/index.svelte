<!--
  Error page (404, 500, ...), wired in by src/routes/+error.svelte.
  The status code in chrome block letters (codeSvg.js, same letters as the site logo) over a neon sun and a rolling
  grid horizon, then what happened and where to go next. The scene is a dark sky in both themes, like the header.
-->
<script>
  import { page } from "$app/state";
  import { codeSvg } from "./codeSvg.js";

  const status = $derived(page.status || 500);
  const notFound = $derived(status === 404);
  const serverSide = $derived(status >= 500);
  const path = $derived(page.url?.pathname ?? "");
  // SvelteKit's own messages ("Not Found", "Internal Error") add nothing to the copy below; show anything else
  const detail = $derived.by(() => {
    const m = page.error?.message?.trim();
    return m && !["Not Found", "Internal Error"].includes(m) ? m : "";
  });

  const copy = $derived(
    notFound
      ? { kicker: `Hut, hut, blue ${status}!`, title: "Page not found", text: "That page isn't in the playbook. It may have moved, or the link has a typo." }
      : serverSide
        ? { kicker: "Flag on the play", title: "Something broke", text: "The site hit an error loading this page. Sleeper can be slow to answer, so give it a minute and try again." }
        : { kicker: "Flag on the play", title: "Can't open this page", text: "This page couldn't be shown." }
  );

  const svg = $derived(codeSvg(status));

  function back() {
    if (history.length > 1) history.back();
    else location.href = "/";
  }
</script>

<svelte:head>
  <title>{status} · {copy.title}</title>
</svelte:head>

<div class="rr-errPage">
  <div class="rr-errScene">
    <div class="rr-errStars"></div>
    <div class="rr-errSun"></div>
    <div class="rr-errFloor"><div class="rr-errGrid"></div></div>
    <div class="rr-errCode">{@html svg}</div>
  </div>

  <p class="rr-errKicker">{copy.kicker}</p>
  <h1 class="rr-pageTitle">{copy.title}</h1>
  <p class="rr-errText">{copy.text}</p>
  {#if detail}
    <p class="rr-errDetail">{detail}</p>
  {/if}

  <div class="rr-errActions">
    <a class="rr-btn rr-primary" href="/">Back to Home</a>
    {#if serverSide}
      <button type="button" class="rr-btn" onclick={() => location.reload()}>Try again</button>
    {:else}
      <button type="button" class="rr-btn" onclick={back}>Go back</button>
    {/if}
  </div>

</div>

<style>
  .rr-errPage {
    position: relative;
    z-index: 1;
    max-width: 760px;
    margin: 0 auto;
    padding: 32px 16px 5em;
    text-align: center;

    /* scene colors: a dark sky in both themes (like the header) */
    --rre-sky: linear-gradient(180deg, #070114 0%, #1a0638 55%, #3a0d52 100%);
    --rre-floor: linear-gradient(180deg, #2a0846 0%, #10031f 100%);
    --rre-line: rgba(255, 42, 109, 0.75);
    --rre-horizon: #ff2a6d;
  }

  :global(html[data-theme="day"]) .rr-errPage {
    --rre-sky: linear-gradient(180deg, #2c0b52 0%, #7b1f74 50%, #e0457b 82%, #ff9e5e 100%);
    --rre-floor: linear-gradient(180deg, #3a0d52 0%, #1d0636 100%);
    --rre-line: rgba(255, 158, 94, 0.8);
    --rre-horizon: #ffb36b;
  }

  /* ---------- scene ---------- */
  .rr-errScene {
    position: relative;
    height: 330px;
    border-radius: 16px;
    overflow: hidden;
    background: var(--rre-sky);
    border: 1px solid var(--or-table-border, rgba(181, 55, 242, 0.38));
    box-shadow: 0 0 30px var(--or-glow-pink, rgba(255, 42, 109, 0.4)), 0 10px 40px rgba(0, 0, 0, 0.35);
  }

  .rr-errStars {
    position: absolute;
    inset: 0 0 40% 0;
    background-image:
      radial-gradient(1.5px 1.5px at 12% 22%, #fff 50%, transparent 51%),
      radial-gradient(1px 1px at 28% 12%, #ffd6f0 50%, transparent 51%),
      radial-gradient(1.5px 1.5px at 44% 30%, #c9fdff 50%, transparent 51%),
      radial-gradient(1px 1px at 63% 9%, #fff 50%, transparent 51%),
      radial-gradient(1.5px 1.5px at 78% 26%, #ffd6f0 50%, transparent 51%),
      radial-gradient(1px 1px at 90% 14%, #c9fdff 50%, transparent 51%),
      radial-gradient(1px 1px at 6% 46%, #fff 50%, transparent 51%),
      radial-gradient(1px 1px at 94% 44%, #fff 50%, transparent 51%);
    opacity: 0.85;
  }

  /* the sun: sunset gradient with widening slits toward the horizon */
  .rr-errSun {
    position: absolute;
    left: 50%;
    bottom: 34%;
    width: 270px;
    height: 270px;
    transform: translate(-50%, 22%);
    border-radius: 50%;
    background: linear-gradient(180deg, #ffe27a 0%, #ffb347 30%, #ff6a5e 55%, #ff2a6d 75%, #b537f2 100%);
    box-shadow: 0 0 60px rgba(255, 106, 94, 0.55);
    -webkit-mask-image: linear-gradient(180deg, #000 0 46%, transparent 46% 49%, #000 49% 57%, transparent 57% 61%, #000 61% 68%, transparent 68% 73%, #000 73% 79%, transparent 79% 85%, #000 85%);
    mask-image: linear-gradient(180deg, #000 0 46%, transparent 46% 49%, #000 49% 57%, transparent 57% 61%, #000 61% 68%, transparent 68% 73%, #000 73% 79%, transparent 79% 85%, #000 85%);
  }

  /* the floor covers the bottom of the sun; the grid rolls toward the viewer */
  .rr-errFloor {
    position: absolute;
    inset: 66% 0 0 0;
    overflow: hidden;
    background: var(--rre-floor);
    border-top: 2px solid var(--rre-horizon);
    box-shadow: 0 0 18px var(--rre-horizon);
    perspective: 240px;
  }

  .rr-errGrid {
    position: absolute;
    left: -100%;
    width: 300%;
    top: 0;
    height: 220%;
    transform-origin: top center;
    transform: rotateX(68deg);
    background-image:
      linear-gradient(var(--rre-line) 2px, transparent 2px),
      linear-gradient(90deg, var(--rre-line) 2px, transparent 2px);
    background-size: 46px 46px;
    background-position: center 0;
    -webkit-mask-image: linear-gradient(180deg, transparent 0%, #000 22%);
    mask-image: linear-gradient(180deg, transparent 0%, #000 22%);
    animation: rr-errRoll 1.4s linear infinite;
  }

  @keyframes rr-errRoll {
    to {
      background-position: center 46px;
    }
  }

  .rr-errCode {
    position: absolute;
    left: 50%;
    top: 50%;
    width: min(380px, 78%);
    transform: translate(-50%, -50%);
    line-height: 0;
    animation: rr-errFloat 4s ease-in-out infinite;
  }

  .rr-errCode :global(svg) {
    width: 100%;
    height: auto;
    overflow: visible;
  }

  @keyframes rr-errFloat {
    50% {
      transform: translate(-50%, calc(-50% - 6px));
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .rr-errGrid,
    .rr-errCode {
      animation: none;
    }
  }

  /* ---------- text ---------- */
  .rr-errKicker {
    margin: 28px 0 0;
    font-family: "Orbitron", "Eurostile", "Arial Black", sans-serif;
    font-size: 0.85rem;
    font-weight: 500;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--or-cyan, #05d9e8);
  }

  /* same heading as the other redesigned pages */
  h1.rr-pageTitle {
    margin: 0.3em 0 0.4em;
    font-size: 2.125rem;
    font-weight: 500;
    line-height: 1.2;
    color: var(--or-heading, var(--g111));
    text-shadow: var(--or-heading-glow, none);
  }

  .rr-errText {
    max-width: 520px;
    margin: 0 auto;
    color: var(--or-text, var(--g333));
    line-height: 1.5;
  }

  .rr-errPath,
  .rr-errDetail {
    margin: 12px auto 0;
    font-size: 0.85em;
    color: var(--or-muted, var(--g999));
  }

  .rr-errPath code {
    padding: 2px 8px;
    border-radius: 6px;
    border: 1px solid var(--or-table-border, var(--ccc));
    background: var(--fff);
    color: var(--or-pink, var(--blueOne));
    font-size: 0.95em;
    overflow-wrap: anywhere;
  }

  /* ---------- actions ---------- */
  .rr-errActions {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 12px;
    margin: 26px 0 0;
  }

  /* links need the extra class to beat the theme's html:root a / a:visited colors */
  .rr-errPage .rr-btn,
  .rr-errPage a.rr-btn:visited {
    display: inline-flex;
    align-items: center;
    height: 42px;
    padding: 0 22px;
    border-radius: 8px;
    border: 1px solid var(--or-pink, var(--blueOne));
    background: transparent;
    color: var(--or-text, var(--g333));
    font: 500 0.82rem "Orbitron", "Roboto", sans-serif;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    text-decoration: none;
    cursor: pointer;
    transition: box-shadow 0.15s, background 0.15s;
  }

  .rr-errPage .rr-btn:hover {
    background: var(--or-row-hover, rgba(255, 42, 109, 0.09));
    box-shadow: 0 0 12px var(--or-glow-pink, rgba(255, 42, 109, 0.45));
  }

  .rr-errPage .rr-btn.rr-primary,
  .rr-errPage a.rr-btn.rr-primary:visited {
    background: var(--or-pink, var(--blueOne));
    color: #fff;
    box-shadow: 0 0 10px var(--or-glow-pink, rgba(255, 42, 109, 0.45));
  }

  .rr-errPage .rr-btn.rr-primary:hover {
    box-shadow: 0 0 18px var(--or-glow-pink, rgba(255, 42, 109, 0.6));
  }

  .rr-errPage .rr-btn:focus-visible {
    outline: 2px solid var(--or-cyan, #05d9e8);
    outline-offset: 2px;
  }

  @media (max-width: 800px) {
    .rr-errScene {
      height: 250px;
    }
    .rr-errSun {
      width: 190px;
      height: 190px;
    }
    h1.rr-pageTitle {
      font-size: 1.5rem;
    }
  }
</style>
