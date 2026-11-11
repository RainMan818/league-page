<!--
  Sortable table shell used by the homepage Team Breakdown and the /standings table: header (with an optional
  group row above it), click-to-sort buttons with ▲/▼ and aria-sort, and the sorted rows. Each page still renders its
  own <td> cells through the `cell` snippet, so cell styles stay in that page's component.
  Look comes from common.css (rr-tableWrap / rr-table); `sticky` columns stay put while the table scrolls sideways.

  columns: [{ key, label, title?, group?, sticky?, thClass?, get?, firstDir? }]
    get(row) -> number makes the column sortable; firstDir is the first click's direction (-1 = high to low, default).
    group: consecutive columns with the same group get one header cell above them; ungrouped columns span both rows.
  rows, rowKey(row): the rows and a unique key for each
  defaultKey: the column used until another is picked (or when the picked one disappears)
  tiebreak(a, b): order for rows that tie on the sorted column
  sortKey / sortDir: bindable, for a parent that needs to know the current order (e.g. to draw a playoff line)
  rowClass(row): optional class for each <tr>
-->
<script>
  import "./common.css";

  let {
    columns,
    rows,
    rowKey,
    cell,
    defaultKey,
    tiebreak = () => 0,
    tableClass = "",
    rowClass = null,
    sortKey = $bindable(null),
    sortDir = $bindable(null),
  } = $props();

  const column = (key) => columns.find((c) => c.key === key);
  const firstDir = (key) => column(key)?.firstDir ?? -1;

  const activeKey = $derived(column(sortKey)?.get ? sortKey : defaultKey);
  const activeDir = $derived(sortKey === activeKey && sortDir != null ? sortDir : firstDir(activeKey));

  const sortedRows = $derived.by(() => {
    const get = column(activeKey)?.get;
    if (!get) return rows;
    return [...rows].sort((a, b) => activeDir * (get(a) - get(b)) || tiebreak(a, b));
  });

  const sortBy = (key) => {
    const dir = key === activeKey ? -activeDir : firstDir(key);
    sortKey = key;
    sortDir = dir;
  };

  const hasGroups = $derived(columns.some((c) => c.group));
  // first header row: ungrouped columns (spanning both rows) and one cell per run of same-group columns
  const topRow = $derived(
    columns.reduce((acc, c) => {
      const last = acc[acc.length - 1];
      if (!c.group) acc.push({ column: c });
      else if (last?.group === c.group) last.span++;
      else acc.push({ group: c.group, span: 1 });
      return acc;
    }, [])
  );
  const thClass = (c) => [c.thClass, c.sticky && "rr-sticky"].filter(Boolean).join(" ");
  const ariaSort = (c) => (!c.get ? undefined : c.key !== activeKey ? "none" : activeDir < 0 ? "descending" : "ascending");
</script>

{#snippet head(c, rowspan = 1)}
  <th class={thClass(c)} {rowspan} aria-sort={ariaSort(c)}>
    {#if c.get}
      <button type="button" class="rr-sortBtn" class:rr-active={c.key === activeKey} title={c.title ?? `Sort by ${c.label}`} onclick={() => sortBy(c.key)}>
        {c.label}{#if c.key === activeKey}<span class="rr-arrow">{activeDir < 0 ? "▼" : "▲"}</span>{/if}
      </button>
    {:else}
      {c.label}
    {/if}
  </th>
{/snippet}

<div class="rr-tableWrap">
  <table class="rr-table {tableClass}">
    <thead>
      {#if hasGroups}
        <tr class="rr-groupRow">
          {#each topRow as h}
            {#if h.column}
              {@render head(h.column, 2)}
            {:else}
              <th colspan={h.span} class="rr-group">{h.group}</th>
            {/if}
          {/each}
        </tr>
        <tr>
          {#each columns.filter((c) => c.group) as c (c.key)}
            {@render head(c)}
          {/each}
        </tr>
      {:else}
        <tr>
          {#each columns as c (c.key)}
            {@render head(c)}
          {/each}
        </tr>
      {/if}
    </thead>
    <tbody>
      {#each sortedRows as row (rowKey(row))}
        <tr class={rowClass?.(row) ?? ""}>
          {#each columns as c (c.key)}
            {@render cell(row, c)}
          {/each}
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<style>
  .rr-groupRow .rr-group {
    font-size: 0.72em;
    font-weight: 500;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--or-muted, var(--g999));
    border-bottom: 1px solid var(--or-table-border, var(--ccc));
    padding-bottom: 4px;
  }

  .rr-sortBtn {
    padding: 0;
    border: 0;
    background: none;
    color: inherit;
    font: inherit;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
  }

  .rr-sortBtn:hover,
  .rr-sortBtn.rr-active {
    color: var(--or-pink, var(--blueOne));
  }

  .rr-arrow {
    font-size: 0.75em;
    margin-left: 3px;
  }
</style>
