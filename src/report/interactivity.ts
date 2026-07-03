export function createReportScript(): string {
  return `
(() => {
  const textFor = (row) => (row.dataset.filterText || row.textContent || "").toLowerCase();
  const countText = (count) => count === 1 ? "1 entry" : count + " entries";

  function filterTable(input) {
    const table = document.getElementById(input.dataset.tableTarget || "");
    if (!table || !table.tBodies.length) return;

    const query = input.value.trim().toLowerCase();
    const rows = Array.from(table.tBodies[0].rows).filter((row) => row.dataset.filterText !== undefined);
    let visible = 0;

    for (const row of rows) {
      const match = !query || textFor(row).includes(query);
      row.hidden = !match;
      if (match) visible += 1;
    }

    document.querySelectorAll('[data-table-count][data-table-target="' + table.id + '"]').forEach((node) => {
      node.textContent = countText(visible);
    });
  }

  function filterList(input) {
    const list = document.getElementById(input.dataset.listTarget || "");
    if (!list) return;

    const query = input.value.trim().toLowerCase();
    const items = Array.from(list.querySelectorAll("[data-filter-item]"));
    let visible = 0;

    for (const item of items) {
      const match = !query || textFor(item).includes(query);
      item.hidden = !match;
      if (match) visible += 1;
    }

    document.querySelectorAll('[data-list-count][data-list-target="' + list.id + '"]').forEach((node) => {
      node.textContent = String(visible);
    });
  }

  document.querySelectorAll("[data-table-filter]").forEach((input) => {
    input.addEventListener("input", () => filterTable(input));
    filterTable(input);
  });

  document.querySelectorAll("[data-list-filter]").forEach((input) => {
    input.addEventListener("input", () => filterList(input));
    filterList(input);
  });

  document.querySelectorAll("[data-report-table] .sortButton").forEach((button) => {
    button.addEventListener("click", () => {
      const table = button.closest("table");
      const th = button.closest("th");
      if (!table || !th || !table.tBodies.length) return;

      const headerCells = Array.from(th.parentElement.children);
      const columnIndex = headerCells.indexOf(th);
      const direction = button.dataset.sortDirection === "asc" ? "desc" : "asc";
      const multiplier = direction === "asc" ? 1 : -1;
      const sortType = button.dataset.sortType || "text";
      const rows = Array.from(table.tBodies[0].rows).filter((row) => row.dataset.filterText !== undefined);

      table.querySelectorAll(".sortButton").forEach((other) => {
        other.dataset.sortDirection = "";
        other.removeAttribute("aria-sort");
      });
      button.dataset.sortDirection = direction;
      button.setAttribute("aria-sort", direction === "asc" ? "ascending" : "descending");

      rows.sort((left, right) => {
        const leftCell = left.cells[columnIndex];
        const rightCell = right.cells[columnIndex];
        const leftValue = leftCell?.dataset.sortValue ?? leftCell?.textContent?.trim() ?? "";
        const rightValue = rightCell?.dataset.sortValue ?? rightCell?.textContent?.trim() ?? "";

        if (sortType === "number") {
          return (Number(leftValue) - Number(rightValue)) * multiplier;
        }

        return leftValue.localeCompare(rightValue, undefined, { numeric: true, sensitivity: "base" }) * multiplier;
      });

      table.tBodies[0].append(...rows);
    });
  });
})();
`;
}
