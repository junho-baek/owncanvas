import { createHash } from "node:crypto";

export type JsonObject = Record<string, unknown>;

export function stableStringify(value: unknown): string {
  return `${JSON.stringify(sortJsonValue(value), null, 2)}\n`;
}

export function parseJsonObject(value: string): JsonObject {
  const parsed = JSON.parse(value) as unknown;

  if (!isJsonObject(parsed)) {
    throw new Error("Expected a JSON object.");
  }

  return parsed;
}

export function hashStableJson(value: unknown): string {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

export function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sortJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sortJsonValue(item));
  }

  if (!isJsonObject(value)) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, sortJsonValue(item)]),
  );
}
