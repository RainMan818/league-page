<!--
  Homepage sidebar: the latest trades and waivers in one list, grouped by day (option C).
  Replaces the template's Transactions.svelte via src/lib/components.js.
  Shows the newest RECENT_PER_TYPE waivers and RECENT_PER_TYPE trades, picked from the full transaction list
  (the same download and cache the Trades & Waivers page uses, so no extra Sleeper calls).
-->
<script>
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { getLeagueTransactions, getLeagueTeamManagers, loadPlayers, waitForAll } from "$lib/utils/helper";
  import Loading from "../Shared/Loading.svelte";
  import TransactionFeed from "./TransactionFeed.svelte";
  import { sortNewestFirst } from "./transactionView.js";

  let loading = $state(true);
  let players = $state.raw({});
  let recent = $state.raw([]);
  let leagueTeamManagers = $state.raw(null);

  // how many of each kind to show
  const RECENT_PER_TYPE = 4;

  // all transactions arrive newest first; keep the first N of each kind
  const pickRecent = (all = []) => {
    const waivers = all.filter((t) => t.type === "waiver").slice(0, RECENT_PER_TYPE);
    const trades = all.filter((t) => t.type === "trade").slice(0, RECENT_PER_TYPE);
    return sortNewestFirst([...waivers, ...trades]);
  };

  onMount(async () => {
    const [transactionsData, playersData, managers] = await waitForAll(getLeagueTransactions(false), loadPlayers(null), getLeagueTeamManagers());
    players = playersData.players;
    recent = pickRecent(transactionsData.transactions);
    leagueTeamManagers = managers;
    loading = false;

    if (transactionsData.stale) {
      const fresh = await getLeagueTransactions(false, true);
      recent = pickRecent(fresh.transactions);
    }
    if (playersData.stale) {
      const freshPlayers = await loadPlayers(null, true);
      players = freshPlayers.players;
    }
  });
</script>

<div class="rr-recent">
  {#if loading}
    <Loading message="Loading league transactions..." margin="20px auto" />
  {:else if recent.length}
    <h5>Recent Moves</h5>
    <TransactionFeed transactions={recent} {players} {leagueTeamManagers} compact />
    <button type="button" class="rr-more" onclick={() => goto("/transactions?show=both&query=&page=1")}>View all trades &amp; waivers</button>
  {:else}
    <p class="rr-none">No trades or waiver moves yet...</p>
  {/if}
</div>

<style>
  .rr-recent {
    position: relative;
    z-index: 1;
    width: 100%;
  }

  h5 {
    text-align: center;
    margin: 10px auto 16px;
  }

  .rr-more {
    display: block;
    margin: 12px auto 10px;
    min-height: 44px;
    padding: 0 20px;
    border: 0;
    background: none;
    color: var(--or-cyan, var(--blueOne));
    font: 600 0.8em "Roboto", sans-serif;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    cursor: pointer;
  }

  .rr-more:hover {
    color: var(--or-pink, var(--blueOne));
  }

  .rr-none {
    margin: 5em 0;
    text-align: center;
  }
</style>
