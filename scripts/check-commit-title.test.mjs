import assert from "node:assert/strict";
import test from "node:test";

import { getCommitTitleFromMessage, validateCommitTitle } from "./check-commit-title.mjs";

test("accepts a commit title whose first token exposes the Campaign core scope", () => {
  assert.equal(
    validateCommitTitle("campaign-core: add completion transition guard").ok,
    true
  );
});

test("accepts titles for non-core Campaign consumers with explicit scopes", () => {
  for (const title of [
    "ui: render campaign completion blockers",
    "storage: map persisted campaign completion state",
    "plugin: adapt instagram campaign publish status",
    "api: expose campaign completion blockers"
  ]) {
    assert.equal(validateCommitTitle(title).ok, true, title);
  }
});

test("rejects titles that hide the change scope", () => {
  const result = validateCommitTitle("update campaign completion");

  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /<scope>: <summary>/);
});

test("rejects titles that join multiple change scopes", () => {
  const result = validateCommitTitle("campaign-core: add ui and storage completion state");

  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /one change scope/);
});

test("rejects titles whose summary names a different change scope", () => {
  for (const title of [
    "campaign-core: add ui completion state",
    "campaign-core: add route validation response",
    "ui: render storage migration status",
    "storage: map plugin adapter result"
  ]) {
    const result = validateCommitTitle(title);

    assert.equal(result.ok, false, title);
    assert.match(result.errors.join("\n"), /another change scope/);
  }
});

test("reads the first non-comment line from a commit message file body", () => {
  assert.equal(
    getCommitTitleFromMessage("\n# comment\nstorage: migrate campaign cache\n\nBody"),
    "storage: migrate campaign cache"
  );
});
