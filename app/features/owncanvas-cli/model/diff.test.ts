import assert from "node:assert/strict";
import { test } from "node:test";

import {
  diffJsonDocuments,
  formatDiffEntriesForHumans,
} from "./diff.ts";

test("diffJsonDocuments returns stable structured entries", () => {
  const entries = diffJsonDocuments(
    { title: "Before", nodes: [{ id: "a" }] },
    { title: "After", nodes: [{ id: "a" }, { id: "b" }] },
  );

  assert.deepEqual(entries, [
    {
      path: "nodes.1",
      operation: "added",
      after: { id: "b" },
    },
    {
      path: "title",
      operation: "changed",
      before: "Before",
      after: "After",
    },
  ]);
});

test("diffJsonDocuments reports removals and nested changes", () => {
  const entries = diffJsonDocuments(
    { title: "Before", meta: { count: 2 }, removed: true },
    { title: "Before", meta: { count: 3 } },
  );

  assert.deepEqual(entries, [
    {
      path: "meta.count",
      operation: "changed",
      before: 2,
      after: 3,
    },
    {
      path: "removed",
      operation: "removed",
      before: true,
    },
  ]);
});

test("formatDiffEntriesForHumans prints a readable patch summary", () => {
  assert.equal(
    formatDiffEntriesForHumans([
      {
        path: "title",
        operation: "changed",
        before: "Before",
        after: "After",
      },
    ]),
    '~ title: "Before" -> "After"\n',
  );
});

test("formatDiffEntriesForHumans handles empty diffs", () => {
  assert.equal(formatDiffEntriesForHumans([]), "No changes.\n");
});
