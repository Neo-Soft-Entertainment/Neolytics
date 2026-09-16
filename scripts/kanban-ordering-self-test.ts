import assert from "node:assert/strict";

type KanbanItem = {
  id: string;
  sortOrder: number;
  createdAt: string;
};

function orderKanbanItems(items: KanbanItem[]) {
  return [...items].sort((left, right) => {
    const sortOrderDifference = left.sortOrder - right.sortOrder;

    if (sortOrderDifference !== 0) {
      return sortOrderDifference;
    }

    const createdAtDifference = left.createdAt.localeCompare(right.createdAt);

    if (createdAtDifference !== 0) {
      return createdAtDifference;
    }

    return left.id.localeCompare(right.id);
  });
}

function appendKanbanItem(items: KanbanItem[], item: Omit<KanbanItem, "sortOrder">) {
  let lastSortOrder = -1;

  for (const current of items) {
    if (current.sortOrder > lastSortOrder) {
      lastSortOrder = current.sortOrder;
    }
  }

  return [...items, { ...item, sortOrder: lastSortOrder + 1 }];
}

const existingItems: KanbanItem[] = [
  { id: "column-b", sortOrder: 0, createdAt: "2026-09-16T10:00:02.000Z" },
  { id: "column-a", sortOrder: 0, createdAt: "2026-09-16T10:00:01.000Z" },
  { id: "column-c", sortOrder: 4, createdAt: "2026-09-16T10:00:03.000Z" }
];

const appendedItems = appendKanbanItem(existingItems, {
  id: "column-d",
  createdAt: "2026-09-16T10:00:04.000Z"
});

assert.deepEqual(
  orderKanbanItems(appendedItems).map((item) => item.id),
  ["column-a", "column-b", "column-c", "column-d"]
);
assert.equal(appendedItems[appendedItems.length - 1].sortOrder, 5);

const simultaneousAppends = [
  ...appendedItems,
  { id: "column-f", sortOrder: 6, createdAt: "2026-09-16T10:00:05.000Z" },
  { id: "column-e", sortOrder: 6, createdAt: "2026-09-16T10:00:05.000Z" }
];

assert.deepEqual(
  orderKanbanItems(simultaneousAppends).map((item) => item.id),
  ["column-a", "column-b", "column-c", "column-d", "column-e", "column-f"]
);

console.log("Kanban ordering regression checks passed.");
