# OwnCanvas CLI Agent Contracts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish issues #33, #31, and #32 so agents can validate, diff, execute, recover, and cost-guard file-backed Creative Canvas Campaigns without corrupting user work.

**Architecture:** Keep the CLI local-first and Campaign-first. Add focused model modules for validation, diffing, provider guardrails, and snapshot/recovery, then wire them through the existing stable JSON envelope in `cli.ts`. Mock generation stays the default; real provider execution is an explicit guarded path that produces durable manifests before any future paid adapter work.

**Tech Stack:** TypeScript, Node `fs/promises`, Node `node:test`, OwnCanvas CLI workspace repository, Creative Canvas Campaign model, existing Image/Video generation model catalogs.

---

## File Structure

- Create `app/features/owncanvas-cli/model/validation.ts`: Campaign/workspace/run-manifest validator and agent inspect summary builder.
- Create `app/features/owncanvas-cli/model/validation.test.ts`: validation, run-ready, strict, and inspect summary tests.
- Create `app/features/owncanvas-cli/model/diff.ts`: deterministic JSON diff entries plus human formatter.
- Create `app/features/owncanvas-cli/model/diff.test.ts`: structured and human diff tests.
- Create `app/features/owncanvas-cli/model/provider-runs.ts`: real-provider intent validation, env loading/redaction, budget guard, and durable provider run manifests.
- Create `app/features/owncanvas-cli/model/provider-runs.test.ts`: default mock, missing key, budget guard, provider failure, partial failure, and redaction tests.
- Create `app/features/owncanvas-cli/model/snapshots.ts`: pre-write snapshots, conflict checks, restore, and migration guard helpers.
- Create `app/features/owncanvas-cli/model/snapshots.test.ts`: snapshot, restore, destructive confirmation, revision conflict, and migration tests.
- Modify `app/features/owncanvas-cli/cli.ts`: add `validate`, `diff`, `apply --dry-run`, provider flags, recovery commands, structured envelope exits, and better `campaign inspect` summaries.
- Modify `app/features/owncanvas-cli/cli.test.ts`: add end-to-end CLI contract, exit code, and smoke flow coverage.
- Modify `app/features/owncanvas-cli/model/workspace-repository.ts`: add optional `expectRevision` and `snapshotBeforeWrite` controls to write-capable updates.
- Modify `app/features/owncanvas-cli/model/mock-generation.ts`: emit shared manifest fields and allow provider guard integration while keeping deterministic mock as default.
- Modify `wiki/log.md`: record completed issue outcomes and verification.

## Task 1: Validation, Inspect, Diff, and Envelope Contracts (#33)

**Files:**
- Create: `app/features/owncanvas-cli/model/validation.ts`
- Create: `app/features/owncanvas-cli/model/validation.test.ts`
- Create: `app/features/owncanvas-cli/model/diff.ts`
- Create: `app/features/owncanvas-cli/model/diff.test.ts`
- Modify: `app/features/owncanvas-cli/cli.ts`
- Modify: `app/features/owncanvas-cli/cli.test.ts`

- [ ] **Step 1: Add failing validation tests**

Add tests that create a file-backed Campaign, validate it, then corrupt one requirement at a time:

```ts
test("validateCampaignWorkspace reports draft warnings without failing default validation", async () => {
  const root = await createWorkspaceWithCampaign("agent-contracts");
  const report = await validateCampaignWorkspace({ root, campaignId: "agent-contracts" });

  assert.equal(report.valid, true);
  assert.equal(report.errors.length, 0);
  assert.equal(report.warnings.some((warning) => warning.code === "block.prompt_empty"), true);
});

test("validateCampaignWorkspace promotes run-ready warnings to errors", async () => {
  const root = await createWorkspaceWithCampaign("agent-contracts");
  const report = await validateCampaignWorkspace({
    root,
    campaignId: "agent-contracts",
    runReady: true,
  });

  assert.equal(report.valid, false);
  assert.equal(report.errors.some((error) => error.code === "block.prompt_empty"), true);
});

test("validateCampaignWorkspace reports missing asset references and output refs", async () => {
  const root = await createWorkspaceWithCampaign("agent-contracts");
  await mutateCampaign(root, "agent-contracts", (campaign) => ({
    ...campaign,
    canvasState: {
      ...campaign.canvasState,
      nodes: campaign.canvasState.nodes.map((node) =>
        node.id === "image_hero"
          ? {
              ...node,
              properties: {
                ...node.properties,
                referenceImageAssetId: "missing_ref",
                latestResultRefs: { generatedAssetIds: ["missing_output"] },
              },
            }
          : node,
      ),
    },
  }));

  const report = await validateCampaignWorkspace({ root, campaignId: "agent-contracts" });

  assert.equal(report.valid, false);
  assert.equal(report.errors.some((error) => error.code === "asset_ref_missing"), true);
  assert.equal(report.errors.some((error) => error.code === "output_ref_missing"), true);
});
```

Run:

```bash
node --experimental-strip-types --test app/features/owncanvas-cli/model/validation.test.ts
```

Expected: fail because `validation.ts` does not exist.

- [ ] **Step 2: Implement validation report model**

Implement:
- `validateCampaignWorkspace({ root, campaignId, runReady, strict })`
- `createCampaignInspectSummary(document, paths)`
- diagnostics with `code`, `message`, `path`, `severity`, `retryable`, `recoveryHint`, and `details`
- required document fields: schema, id, title, timestamps, `revision.hash`, `revision.number`, `campaignSpec`, `canvasState`, `assets`
- canvas validation through `validateCampaignCanvasEdit(document.canvasState)`
- supported block kinds using the current Creative Canvas definitions
- image/video model catalog checks using `getImageGenerationModelCapability()` and `resolveVideoGenerationModelCapability()`
- asset/output ref checks against `document.assets`
- run manifest checks for `runs/<run_id>/status.json`, `response.json`, and `pricing.json`
- workspace layout checks for `assets`, `outputs`, `runs`, and `snapshots`

- [ ] **Step 3: Add failing diff tests**

Add tests:

```ts
test("diffJsonDocuments returns stable structured entries", () => {
  const entries = diffJsonDocuments(
    { title: "Before", nodes: [{ id: "a" }] },
    { title: "After", nodes: [{ id: "a" }, { id: "b" }] },
  );

  assert.deepEqual(entries, [
    { path: "nodes.1", operation: "added", before: undefined, after: { id: "b" } },
    { path: "title", operation: "changed", before: "Before", after: "After" },
  ]);
});

test("formatDiffEntriesForHumans prints a readable patch summary", () => {
  assert.equal(
    formatDiffEntriesForHumans([
      { path: "title", operation: "changed", before: "Before", after: "After" },
    ]),
    "~ title: \"Before\" -> \"After\"\n",
  );
});
```

Run:

```bash
node --experimental-strip-types --test app/features/owncanvas-cli/model/diff.test.ts
```

Expected: fail because `diff.ts` does not exist.

- [ ] **Step 4: Implement diff model**

Implement:
- `diffJsonDocuments(before, after)`
- operations: `added`, `removed`, `changed`
- stable object key ordering
- array index paths
- `formatDiffEntriesForHumans(entries)`

- [ ] **Step 5: Wire CLI validation, inspect summary, diff, and dry-run apply**

Update `cli.ts`:
- add boolean flags `--run-ready`, `--strict`, `--dry-run`
- add value flag `--against`
- add `validate --campaign <id> [--run-ready] [--strict]`
- add `diff --campaign <id> --against <path>`
- update `campaign inspect --json` to include `summary` while preserving `campaign`
- update `apply --dry-run` to return preview data without writing
- add an envelope exit helper so validation failures return JSON with exit code `2`

- [ ] **Step 6: Add CLI contract and exit-code tests**

Add tests for:
- `validate` success with warnings exits `0`
- `validate --run-ready` exits `2`
- `diff --json` returns structured entries
- human `diff` writes readable text
- `apply --dry-run` changes no revision
- usage exits `6`
- conflict exits `3`
- repository/file exits `7`

Run:

```bash
node --experimental-strip-types --test app/features/owncanvas-cli/model/validation.test.ts app/features/owncanvas-cli/model/diff.test.ts app/features/owncanvas-cli/cli.test.ts
```

Expected: validation/diff/CLI tests pass.

- [ ] **Step 7: Commit #33**

Run:

```bash
git add app/features/owncanvas-cli docs/superpowers/plans/2026-05-18-owncanvas-cli-agent-contracts.md
git commit -m "feat: add owncanvas cli validation and diff contracts"
```

## Task 2: Provider Opt-In, Budget Guards, and Run Manifests (#31)

**Files:**
- Create: `app/features/owncanvas-cli/model/provider-runs.ts`
- Create: `app/features/owncanvas-cli/model/provider-runs.test.ts`
- Modify: `app/features/owncanvas-cli/model/mock-generation.ts`
- Modify: `app/features/owncanvas-cli/cli.ts`
- Modify: `app/features/owncanvas-cli/cli.test.ts`

- [ ] **Step 1: Add failing provider guard tests**

Add tests:

```ts
test("resolveProviderRunIntent keeps mock as the default provider", () => {
  const intent = resolveProviderRunIntent({});

  assert.equal(intent.providerMode, "mock");
  assert.equal(intent.requiresCredential, false);
});

test("resolveProviderRunIntent rejects real provider without explicit cost intent", () => {
  assert.throws(
    () => resolveProviderRunIntent({ providerMode: "real", env: { OWNCANVAS_REPLICATE_API_TOKEN: "token" } }),
    /requires --allow-cost or --max-cost-usd/,
  );
});

test("resolveProviderRunIntent rejects real provider without credential", () => {
  assert.throws(
    () => resolveProviderRunIntent({ providerMode: "real", allowCost: true, env: {} }),
    /OWNCANVAS_REPLICATE_API_TOKEN/,
  );
});

test("createProviderRunManifest redacts credential-shaped values", () => {
  const manifest = createProviderRunManifest({
    runId: "run_real_1",
    campaignId: "launch",
    target: { kind: "block", blockId: "image_hero" },
    providerMode: "real",
    serviceAdapterId: "replicate",
    model: "bytedance/seedance-1-lite",
    inputs: { prompt: "hello", token: "secret" },
    estimatedCostUsd: 0.02,
  });

  assert.equal(manifest.inputs.token, "[redacted]");
});
```

Run:

```bash
node --experimental-strip-types --test app/features/owncanvas-cli/model/provider-runs.test.ts
```

Expected: fail because `provider-runs.ts` does not exist.

- [ ] **Step 2: Implement provider run guard model**

Implement:
- `resolveProviderRunIntent({ providerMode, allowCost, maxCostUsd, env, envFilePath })`
- `.env.local` and `--env-file` parsing without printing or persisting values
- real provider requires provider selection, credential, and cost intent
- missing credential exits `5`
- budget guard exits `4`
- provider failure exits `5`
- `redactSecrets(value)`
- `createProviderRunManifest(input)` with run id, status, target, provider mode, `serviceAdapterId`, model, inputs, outputs, timestamps, latency, costs, failure details, `parentRunId`, and attempt

- [ ] **Step 3: Wire provider flags into CLI**

Update `cli.ts`:
- add value flags `--provider`, `--env-file`, `--max-cost-usd`
- add boolean flag `--allow-cost`
- default `generate run` continues to call mock generation
- `generate run --provider real|replicate` validates intent and writes a guarded manifest
- without a real adapter implementation, return a structured provider failure after writing the manifest when the fake provider flag is not used
- add `--provider fake-success` and `--provider fake-failure` only for deterministic tests

- [ ] **Step 4: Add CLI tests for cost and provider exits**

Add tests:
- `generate run` default mock succeeds without env
- `generate run --provider real` without cost exits `4`
- `generate run --provider real --allow-cost` without key exits `5`
- `generate run --provider fake-failure --allow-cost --max-cost-usd 1` exits `5` and writes a failed manifest
- manifest files contain no token values
- partial failure preserves existing mock outputs and status `partial_failed`

Run:

```bash
node --experimental-strip-types --test app/features/owncanvas-cli/model/provider-runs.test.ts app/features/owncanvas-cli/model/mock-generation.test.ts app/features/owncanvas-cli/cli.test.ts
```

Expected: provider guard and existing generation tests pass.

- [ ] **Step 5: Commit #31**

Run:

```bash
git add app/features/owncanvas-cli
git commit -m "feat: add owncanvas cli provider run guards"
```

## Task 3: Snapshots, Conflicts, Restore, and Migration Guard (#32)

**Files:**
- Create: `app/features/owncanvas-cli/model/snapshots.ts`
- Create: `app/features/owncanvas-cli/model/snapshots.test.ts`
- Modify: `app/features/owncanvas-cli/model/workspace-repository.ts`
- Modify: `app/features/owncanvas-cli/cli.ts`
- Modify: `app/features/owncanvas-cli/cli.test.ts`

- [ ] **Step 1: Add failing snapshot and conflict tests**

Add tests:

```ts
test("write-capable updates create snapshots before campaign changes", async () => {
  const root = await createWorkspaceWithCampaign("safe-edits");
  const before = await inspectCampaignInWorkspace({ root, id: "safe-edits" });

  await updateCampaignInWorkspace({
    root,
    id: "safe-edits",
    command: "test.update",
    snapshotBeforeWrite: true,
    update: (document) => ({ ...document, title: "Updated" }),
  });

  const snapshots = await listCampaignSnapshots({ root, campaignId: "safe-edits" });
  assert.equal(snapshots.length, 1);
  assert.equal(snapshots[0]?.revisionHash, before.document.revision.hash);
});

test("expectRevision mismatch fails with conflict exit code", async () => {
  const root = await createWorkspaceWithCampaign("safe-edits");

  await assert.rejects(
    () =>
      updateCampaignInWorkspace({
        root,
        id: "safe-edits",
        command: "test.update",
        expectRevision: "stale",
        update: (document) => ({ ...document, title: "Updated" }),
      }),
    /revision mismatch/,
  );
});
```

Run:

```bash
node --experimental-strip-types --test app/features/owncanvas-cli/model/snapshots.test.ts
```

Expected: fail because snapshot helpers do not exist.

- [ ] **Step 2: Implement snapshots and repository guards**

Implement:
- `createCampaignSnapshot({ root, campaignId, document, reason })`
- `listCampaignSnapshots({ root, campaignId })`
- `restoreCampaignSnapshot({ root, campaignId, snapshotId, yes, expectRevision })`
- repository `updateCampaignInWorkspace()` options: `expectRevision?: string`, `snapshotBeforeWrite?: boolean`
- conflict error code `revision_conflict` with exit code `3`
- read-only commands do not snapshot
- atomic write remains via temp file and rename

- [ ] **Step 3: Wire restore/destructive/migration CLI**

Update `cli.ts`:
- add value flag `--expect-revision`
- add boolean flag `--yes`
- `block remove`, `edge disconnect`, snapshot restore, and future destructive operations require `--yes` when not idempotent
- add `snapshot list --campaign <id>`
- add `snapshot restore --campaign <id> <snapshot_id> --yes --expect-revision <hash>`
- add `migrate --campaign <id>` that reports explicit unsupported/no-op migration for v1 and never silently mutates

- [ ] **Step 4: Add CLI round-trip and recovery tests**

Add tests:
- CLI-created Campaign validates, exports, diffs against exported copy, applies edit, and validates again
- `--expect-revision stale` exits `3`
- write commands create snapshots; `campaign inspect`, `validate`, and `diff` do not
- restore requires `--yes`
- restore recovers previous valid Campaign
- `migrate --campaign <id> --json` returns no-op for v1

Run:

```bash
node --experimental-strip-types --test app/features/owncanvas-cli/model/snapshots.test.ts app/features/owncanvas-cli/cli.test.ts
```

Expected: snapshot, conflict, restore, and migration tests pass.

- [ ] **Step 5: Commit #32**

Run:

```bash
git add app/features/owncanvas-cli
git commit -m "feat: add owncanvas cli snapshots and recovery guards"
```

## Task 4: Final Verification, Wiki, GitHub Issues, and Push

**Files:**
- Modify: `wiki/log.md`

- [ ] **Step 1: Run full CLI verification**

Run:

```bash
npm run skills:check
node --experimental-strip-types --test app/features/owncanvas-cli/model/workspace-repository.test.ts app/features/owncanvas-cli/model/authoring-commands.test.ts app/features/owncanvas-cli/model/mock-generation.test.ts app/features/owncanvas-cli/model/validation.test.ts app/features/owncanvas-cli/model/diff.test.ts app/features/owncanvas-cli/model/provider-runs.test.ts app/features/owncanvas-cli/model/snapshots.test.ts app/features/owncanvas-cli/cli.test.ts
npm run typecheck
git diff --check
```

Expected:
- `npm run skills:check` reports the known eight missing external DDD/marketing skills and available `llm-wiki`/Superpowers/gstack skills.
- CLI model and integration tests pass.
- typecheck passes.
- whitespace check passes.

- [ ] **Step 2: Update wiki log**

Use `llm-wiki`, then append a Korean entry to `wiki/log.md` summarizing issues #33, #31, and #32, with commands and exit-code behavior.

- [ ] **Step 3: Commit wiki log**

Run:

```bash
git add wiki/log.md
git commit -m "docs: log owncanvas cli agent contracts"
```

- [ ] **Step 4: Push and close issues**

Run:

```bash
git push
gh issue close 33 -R junho-baek/owncanvas --comment "Completed by the CLI validation/diff contracts commit. Verification: focused CLI tests, typecheck, git diff --check."
gh issue close 31 -R junho-baek/owncanvas --comment "Completed by the CLI provider guard commit. Verification: provider guard tests, CLI exit-code tests, typecheck, git diff --check."
gh issue close 32 -R junho-baek/owncanvas --comment "Completed by the CLI snapshot/recovery guard commit. Verification: snapshot/conflict tests, CLI round-trip smoke, typecheck, git diff --check."
gh issue close 29 -R junho-baek/owncanvas --comment "Epic completed after tasks #30-#35 were implemented and closed."
```

## Self-Review

- Spec coverage: Task 1 covers #33 validation, inspect, diff, envelope, structured errors, and exit-code surface. Task 2 covers #31 default mock, explicit provider/cost intent, env loading, redaction, budget/provider exits, and manifests. Task 3 covers #32 snapshots, revision conflicts, destructive confirmation, restore, atomic-write trust, and explicit migration. Task 4 covers final wiki/GitHub closure.
- Placeholder scan: No placeholder markers or vague follow-up placeholders remain. Real paid provider invocation is explicitly not invented here; this slice creates the safe opt-in contract and deterministic fake provider tests so later adapters can plug in without changing the agent contract.
- Type consistency: Function names, CLI flags, file paths, and exit code meanings are consistent across tasks.
