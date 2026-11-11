<!--
  Solid position tag ("WR", "LB", ...) in the position's color (posColor → --or-pos-*). The text color is
  --or-pos-chip-text: dark on the bright night colors, white on the darker day shades (theme/outrun.css).
  Used by the draft board and the draft picks panel. `size` is the font size relative to the surrounding text.
-->
<script>
  import { posColor } from "../../utils/positions.js";

  let { pos, size = "0.68em" } = $props();
</script>

<span class="rr-posChip" style="--pos: {posColor(pos)}; font-size: {size}">{pos}</span>

<style>
  .rr-posChip {
    padding: 0 4px;
    border-radius: 4px;
    background: var(--pos);
    color: var(--or-pos-chip-text, white);
    font-family: "Roboto", sans-serif;
    font-weight: 700;
    letter-spacing: 0.06em;
    line-height: 16px;
  }
</style>
