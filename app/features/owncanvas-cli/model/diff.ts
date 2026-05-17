import { stableStringify } from "./stable-json.ts";

export type OwnCanvasJsonDiffOperation = "added" | "removed" | "changed";

export type OwnCanvasJsonDiffEntry = {
  path: string;
  operation: OwnCanvasJsonDiffOperation;
  before?: unknown;
  after?: unknown;
};

export function diffJsonDocuments(
  before: unknown,
  after: unknown,
): OwnCanvasJsonDiffEntry[] {
  const entries: OwnCanvasJsonDiffEntry[] = [];
  collectDiffEntries(before, after, "", entries);
  return entries.sort((left, right) => left.path.localeCompare(right.path));
}

export function formatDiffEntriesForHumans(entries: OwnCanvasJsonDiffEntry[]) {
  if (entries.length === 0) {
    return "No changes.\n";
  }

  return entries.map(formatDiffEntryForHumans).join("");
}

function collectDiffEntries(
  before: unknown,
  after: unknown,
  path: string,
  entries: OwnCanvasJsonDiffEntry[],
) {
  if (isJsonEqual(before, after)) {
    return;
  }

  if (Array.isArray(before) && Array.isArray(after)) {
    const length = Math.max(before.length, after.length);

    for (let index = 0; index < length; index += 1) {
      const childPath = joinPath(path, String(index));

      if (index >= before.length) {
        entries.push({ path: childPath, operation: "added", after: after[index] });
      } else if (index >= after.length) {
        entries.push({
          path: childPath,
          operation: "removed",
          before: before[index],
        });
      } else {
        collectDiffEntries(before[index], after[index], childPath, entries);
      }
    }

    return;
  }

  if (isPlainObject(before) && isPlainObject(after)) {
    const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort(
      (left, right) => left.localeCompare(right),
    );

    for (const key of keys) {
      const childPath = joinPath(path, key);

      if (!(key in before)) {
        entries.push({ path: childPath, operation: "added", after: after[key] });
      } else if (!(key in after)) {
        entries.push({
          path: childPath,
          operation: "removed",
          before: before[key],
        });
      } else {
        collectDiffEntries(before[key], after[key], childPath, entries);
      }
    }

    return;
  }

  entries.push({
    path: path || "$",
    operation: "changed",
    before,
    after,
  });
}

function formatDiffEntryForHumans(entry: OwnCanvasJsonDiffEntry) {
  if (entry.operation === "added") {
    return `+ ${entry.path}: ${formatValue(entry.after)}\n`;
  }

  if (entry.operation === "removed") {
    return `- ${entry.path}: ${formatValue(entry.before)}\n`;
  }

  return `~ ${entry.path}: ${formatValue(entry.before)} -> ${formatValue(entry.after)}\n`;
}

function joinPath(parent: string, child: string) {
  return parent ? `${parent}.${child}` : child;
}

function formatValue(value: unknown) {
  if (typeof value === "string") {
    return JSON.stringify(value);
  }

  if (value === undefined) {
    return "undefined";
  }

  return stableStringify(value).trim().replace(/\n/g, " ");
}

function isJsonEqual(left: unknown, right: unknown) {
  return stableStringify(left) === stableStringify(right);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
