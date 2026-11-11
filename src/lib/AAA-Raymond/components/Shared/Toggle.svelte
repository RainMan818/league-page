<!--
  Segmented toggle (one style everywhere): the selected option is solid pink, the rest muted.
  options: [{ value, label }]; bind:value. small = compact version for inside a card header.
  SMUI button groups elsewhere on the site are restyled to match in theme/outrun.css.
-->
<script>
  let { options, value = $bindable(), label = "Show", small = false } = $props();
</script>

<div class="rr-toggle" class:rr-small={small} role="group" aria-label={label}>
  {#each options as o (o.value)}
    <button type="button" class:rr-on={value === o.value} aria-pressed={value === o.value} onclick={() => (value = o.value)}>
      {o.label}
    </button>
  {/each}
</div>

<style>
  .rr-toggle {
    display: inline-flex;
    gap: 3px;
    padding: 3px;
    border: 1px solid var(--or-toggle-border, var(--ccc));
    border-radius: 8px;
    background: var(--or-toggle-bg, var(--fff));
  }

  button {
    min-height: 34px;
    padding: 0 16px;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: var(--or-toggle-text, var(--g555));
    font: 600 0.75em "Roboto", sans-serif;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    cursor: pointer;
  }

  button:hover:not(.rr-on) {
    color: var(--or-heading, var(--g111));
  }

  button.rr-on {
    background: var(--or-pink, var(--blueOne));
    color: #fff;
    box-shadow: 0 0 10px var(--or-glow-pink, transparent);
  }

  .rr-small {
    gap: 2px;
    padding: 2px;
    border-radius: 7px;
  }

  .rr-small button {
    min-height: 28px;
    padding: 0 10px;
    font-size: 0.66em;
    letter-spacing: 0.06em;
  }
</style>
