<!-- 1. Assign current route's path to `key` prop -->
<script context="module">
  export const load = async ({ page }) => ({
    props: {
      activeTab: page.path,
    },
  });
</script>

<!-- __layout.svelte -->
<script>
  import { Nav, Footer } from "$lib/components";
  export let activeTab;
</script>

<div>
  <Nav bind:activeTab />
  <!-- adds the nav (small and large) -->

  <slot {activeTab} />

  <Footer />
  <!-- adds the footer -->
</div>
