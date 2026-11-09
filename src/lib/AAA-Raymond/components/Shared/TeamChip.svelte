<!-- Avatar + team name; clicking goes to the manager page when onclick is given. Used across the custom pages. -->
<script>
  let { team, onclick = null, size = 28 } = $props();
</script>

{#if onclick}
  <button type="button" class="rr-chip rr-clickable" {onclick} title={team?.name}>
    {#if team?.avatar}<img alt="" src={team.avatar} style="width:{size}px;height:{size}px" />{/if}
    <span class="rr-name">{team?.name ?? 'Unknown team'}</span>
  </button>
{:else}
  <span class="rr-chip" title={team?.name}>
    {#if team?.avatar}<img alt="" src={team.avatar} style="width:{size}px;height:{size}px" />{/if}
    <span class="rr-name">{team?.name ?? 'Unknown team'}</span>
  </span>
{/if}

<style>
  .rr-chip {
    display: inline-flex;
    vertical-align: middle;
    align-items: center;
    gap: 8px;
    min-width: 0;
    max-width: 100%;
    padding: 0;
    border: 0;
    background: none;
    color: inherit;
    font: inherit;
    text-align: left;
  }

  .rr-clickable {
    cursor: pointer;
  }

  .rr-clickable:hover .rr-name {
    color: var(--or-pink, var(--blueOne));
  }

  img {
    flex: none;
    border-radius: 50%;
    border: 1px solid var(--or-table-border, var(--ccc));
    object-fit: cover;
  }

  .rr-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
