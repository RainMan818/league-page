<!--
  Centered status message for the custom sections: a progress bar while loading,
  or just the message (progress={false}) for errors and empty states.
-->
<script>
  import LinearProgress from "@smui/linear-progress";

  let { message, progress = true, margin = "80px auto" } = $props();
</script>

<div class="rr-loading" style:margin>
  <p>{message}</p>
  {#if progress}<LinearProgress indeterminate />{/if}
</div>

<style>
  .rr-loading {
    display: block;
    width: 85%;
    max-width: 500px;
    text-align: center;
  }
</style>
