<!--
  Error page (404, 500, ...), wired in by src/routes/+error.svelte.
  "Wide right": neon goalposts on a starry night field, a dashed kick path and a football sailing past the right
  upright, with the status code in outlined Orbitron beside "NO GOOD". Then what happened and where to go next.
  Deliberately not the header's look (no sun, no grid, no chrome letters). The scene is dark in both themes.
-->
<script>
  import { page } from "$app/state";

  const status = $derived(page.status || 500);
  const notFound = $derived(status === 404);
  const serverSide = $derived(status >= 500);
  // SvelteKit's own messages ("Not Found", "Internal Error") add nothing to the copy below; show anything else
  const detail = $derived.by(() => {
    const m = page.error?.message?.trim();
    return m && !["Not Found", "Internal Error"].includes(m) ? m : "";
  });

  const copy = $derived(
    notFound
      ? { kicker: "Wide right", title: "Page not found", text: "That page isn't in the playbook. It may have moved, or the link has a typo." }
      : serverSide
        ? { kicker: "Flag on the play", title: "Something broke", text: "The site hit an error loading this page. Sleeper can be slow to answer, so give it a minute and try again." }
        : { kicker: "Flag on the play", title: "Can't open this page", text: "This page couldn't be shown." }
  );

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
    <svg viewBox="0 0 760 360" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Error {status}: a field goal sailing wide right of the uprights">
      <defs>
        <filter id="rre-glowCyan" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="rre-glowPink" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3.5" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <linearGradient id="rre-turf" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stop-color="#2a0a4a" />
          <stop offset="1" stop-color="#0a0218" />
        </linearGradient>
      </defs>

      <!-- field -->
      <rect x="0" y="322" width="760" height="38" fill="url(#rre-turf)" />
      <line x1="0" y1="322" x2="760" y2="322" stroke="#b537f2" stroke-width="2" opacity="0.7" />

      <!-- goalposts: post, gooseneck, crossbar, uprights; pink pad at the base -->
      <g stroke="#05d9e8" stroke-width="7" stroke-linecap="round" fill="none" filter="url(#rre-glowCyan)">
        <path d="M380 322 V214 Q380 200 366 200 H250 M366 200 H510 M250 200 V36 M510 200 V36" />
      </g>
      <rect x="370" y="268" width="20" height="54" rx="3" fill="none" stroke="#ff2a6d" stroke-width="3" filter="url(#rre-glowPink)" />

      <!-- the kick: dashed path, then the ball just outside the right upright -->
      <path class="rr-errPath" d="M368 352 C 392 236, 470 140, 560 112" fill="none" stroke="#ffeaf6" stroke-width="3" stroke-dasharray="10 18" stroke-linecap="round" opacity="0.8" />
      <g class="rr-errBall" filter="url(#rre-glowPink)">
        <ellipse cx="576" cy="106" rx="20" ry="12" transform="rotate(-24 576 106)" fill="#1a0630" stroke="#ff2a6d" stroke-width="3.5" />
        <path d="M562 106 H590 M567 101.5 V110.5 M573 101.5 V110.5 M579 101.5 V110.5 M585 101.5 V110.5" transform="rotate(-24 576 106)" stroke="#ffeaf6" stroke-width="2" stroke-linecap="round" />
        <path d="M604 92 H636 M608 104 H650 M604 116 H630" stroke="#ff2a6d" stroke-width="3" stroke-linecap="round" opacity="0.7" />
      </g>

      <!-- status code -->
      <text x="40" y="150" class="rr-errCode" font-size="82" fill="none" stroke="#ff2a6d" stroke-width="3" filter="url(#rre-glowPink)">{status}</text>
      <text x="42" y="186" class="rr-errCall" font-size="17" fill="#7ff6ff">NO GOOD</text>
    </svg>
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
  }

  /* ---------- scene (dark in both themes) ---------- */
  .rr-errScene {
    position: relative;
    aspect-ratio: 760 / 360;
    border-radius: 16px;
    overflow: hidden;
    background-color: #0a0218;
    background-image:
      radial-gradient(1.5px 1.5px at 12% 22%, #fff 50%, transparent 51%),
      radial-gradient(1px 1px at 28% 12%, #ffd6f0 50%, transparent 51%),
      radial-gradient(1.5px 1.5px at 44% 30%, #c9fdff 50%, transparent 51%),
      radial-gradient(1px 1px at 63% 9%, #fff 50%, transparent 51%),
      radial-gradient(1.5px 1.5px at 78% 26%, #ffd6f0 50%, transparent 51%),
      radial-gradient(1px 1px at 90% 14%, #c9fdff 50%, transparent 51%),
      radial-gradient(1px 1px at 6% 46%, #fff 50%, transparent 51%),
      radial-gradient(1px 1px at 94% 44%, #fff 50%, transparent 51%),
      radial-gradient(1px 1px at 20% 60%, #fff 50%, transparent 51%),
      radial-gradient(1px 1px at 70% 58%, #ffd6f0 50%, transparent 51%),
      radial-gradient(1.5px 1.5px at 54% 72%, #c9fdff 50%, transparent 51%),
      radial-gradient(1px 1px at 84% 80%, #fff 50%, transparent 51%);
    border: 1px solid var(--or-table-border, rgba(181, 55, 242, 0.38));
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.35), 0 0 30px rgba(5, 217, 232, 0.18);
  }

  .rr-errScene svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }

  .rr-errCode,
  .rr-errCall {
    font-family: "Orbitron", "Eurostile", "Arial Black", sans-serif;
  }

  .rr-errCode {
    font-weight: 900;
  }

  .rr-errCall {
    font-weight: 700;
    letter-spacing: 6px;
  }

  /* the dashes march along the kick path; the ball bobs */
  .rr-errPath {
    animation: rr-errMarch 1.2s linear infinite;
  }

  @keyframes rr-errMarch {
    to {
      stroke-dashoffset: -28;
    }
  }

  .rr-errBall {
    transform-origin: 576px 106px;
    animation: rr-errBob 2.4s ease-in-out infinite;
  }

  @keyframes rr-errBob {
    50% {
      transform: translate(4px, -4px) rotate(-8deg);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .rr-errPath,
    .rr-errBall {
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

  .rr-errDetail {
    margin: 12px auto 0;
    font-size: 0.85em;
    color: var(--or-muted, var(--g999));
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
    h1.rr-pageTitle {
      font-size: 1.5rem;
    }
  }
</style>
