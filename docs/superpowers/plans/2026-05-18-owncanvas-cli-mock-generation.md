# OwnCanvas CLI Mock Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement issue #34 so agents can execute a file-backed Creative Canvas in deterministic mock mode without provider credentials.

**Architecture:** Add a `mock-generation.ts` model that plans graph execution from Campaign nodes and domain edges, writes durable run records under `runs/<run_id>/`, writes deterministic Creative Output files under `outputs/<run_id>/`, and updates Campaign-visible output refs through the existing repository update path. Keep provider-real execution out of this slice; every run is deterministic mock by default and safe for CI.

**Tech Stack:** TypeScript, Node `fs/promises`, Node `crypto`, Node `node:test`, OwnCanvas CLI workspace repository, Creative Canvas Campaign model.

---

## File Structure

- Create `app/features/owncanvas-cli/model/mock-generation.ts`: graph planner, deterministic mock executor, run record IO, status/logs/cancel/retry/outputs helpers.
- Create `app/features/owncanvas-cli/model/mock-generation.test.ts`: planner and run persistence tests.
- Modify `app/features/owncanvas-cli/cli.ts`: add `generate run/status/logs/cancel/retry/outputs` commands.
- Modify `app/features/owncanvas-cli/cli.test.ts`: add CLI smoke test for authoring a canvas and running mock generation.
- Modify `wiki/log.md`: record outcome and verification.

## Task 1: Planner and Mock Executor

**Files:**
- Create: `app/features/owncanvas-cli/model/mock-generation.ts`
- Create: `app/features/owncanvas-cli/model/mock-generation.test.ts`

- [ ] **Step 1: Add failing planner tests**

Add tests for:
- block target run executes upstream prompt/reference dependencies before the target.
- `--canvas` executes all blocks in dependency order.
- `--from`/`--to` executes the subgraph path.
- `--selection` executes selected blocks plus upstream selected dependencies.

Run:

```bash
node --experimental-strip-types --test app/features/owncanvas-cli/model/mock-generation.test.ts
```

Expected: fail because mock-generation module does not exist.

- [ ] **Step 2: Implement planner**

Implement:
- `planMockGenerationRun(document, target)`
- deterministic topological ordering over selected nodes
- edge-aware dependencies using `source`, `target`, `sourcePort`, and `targetPort`
- target modes: `{ kind: "block" }`, `{ kind: "canvas" }`, `{ kind: "range" }`, `{ kind: "selection" }`

- [ ] **Step 3: Run planner tests**

Run:

```bash
node --experimental-strip-types --test app/features/owncanvas-cli/model/mock-generation.test.ts
```

Expected: planner tests pass.

## Task 2: Run Persistence and Campaign Output Refs

**Files:**
- Modify: `app/features/owncanvas-cli/model/mock-generation.ts`
- Modify: `app/features/owncanvas-cli/model/mock-generation.test.ts`

- [ ] **Step 1: Add failing execution tests**

Add tests that run a text -> image -> video canvas and assert:
- `runs/<run_id>/request.json`, `response.json`, `status.json`, `events.jsonl`, `pricing.json` are written.
- deterministic output files are written under `outputs/<run_id>/`.
- Campaign assets are added for image/video/text mock outputs.
- Image/Video block `latestResultRefs.generatedAssetIds` and output-ready UI state are updated.
- partial failure preserves successful outputs and marks run `partial_failed`.

- [ ] **Step 2: Implement mock run**

Implement:
- `executeMockGenerationRun({ root, campaignId, target, runId })`
- `createDeterministicRunId()`
- output file writers
- run manifest writers
- Campaign update through `updateCampaignInWorkspace()`
- simple failure injection for tests via block property `mockFailure: true`

- [ ] **Step 3: Run execution tests**

Run:

```bash
node --experimental-strip-types --test app/features/owncanvas-cli/model/mock-generation.test.ts
```

Expected: all model tests pass.

## Task 3: Run Lifecycle Commands

**Files:**
- Modify: `app/features/owncanvas-cli/model/mock-generation.ts`
- Modify: `app/features/owncanvas-cli/model/mock-generation.test.ts`

- [ ] **Step 1: Add failing lifecycle tests**

Add tests for:
- `getMockGenerationRunStatus()`
- `getMockGenerationRunLogs()`
- `getMockGenerationRunOutputs()`
- `cancelMockGenerationRun()` marks queued/running runs cancelled and leaves succeeded runs unchanged.
- `retryMockGenerationRun()` creates a new attempt linked to `parentRunId`.

- [ ] **Step 2: Implement lifecycle helpers**

Read/write run files under `runs/<run_id>/`. Retry uses the original request and increments attempt.

- [ ] **Step 3: Run lifecycle tests**

Run:

```bash
node --experimental-strip-types --test app/features/owncanvas-cli/model/mock-generation.test.ts
```

Expected: lifecycle tests pass.

## Task 4: CLI Generate Surface

**Files:**
- Modify: `app/features/owncanvas-cli/cli.ts`
- Modify: `app/features/owncanvas-cli/cli.test.ts`

- [ ] **Step 1: Add failing CLI smoke tests**

Extend `cli.test.ts` to:
- create a Campaign
- author text/image/video blocks and edges
- run `generate run --campaign launch-pack --canvas --json`
- inspect `generate status/logs/outputs --campaign launch-pack <run_id> --json`
- run `generate retry --campaign launch-pack <run_id> --json`

- [ ] **Step 2: Implement CLI commands**

Add:
- `generate run [block_id] --campaign <id> --canvas --from <id> --to <id> --selection <ids> --run-id <id> --json`
- `generate status --campaign <id> <run_id> --json`
- `generate logs --campaign <id> <run_id> --json`
- `generate outputs --campaign <id> <run_id> --json`
- `generate cancel --campaign <id> <run_id> --json`
- `generate retry --campaign <id> <run_id> --json`

- [ ] **Step 3: Run CLI tests**

Run:

```bash
node --experimental-strip-types --test app/features/owncanvas-cli/cli.test.ts
```

Expected: all CLI tests pass.

## Task 5: Verification, Wiki, and Close Issue

**Files:**
- Modify: `wiki/log.md`

- [ ] **Step 1: Run verification**

Run:

```bash
npm run skills:check
node --experimental-strip-types --test app/features/owncanvas-cli/model/workspace-repository.test.ts app/features/owncanvas-cli/model/authoring-commands.test.ts app/features/owncanvas-cli/model/mock-generation.test.ts app/features/owncanvas-cli/cli.test.ts
npm run typecheck
git diff --check
```

- [ ] **Step 2: Update wiki log**

Append a Korean log entry for issue #34.

- [ ] **Step 3: Commit, push, and close issue**

Run:

```bash
git add app/features/owncanvas-cli wiki/log.md docs/superpowers/plans/2026-05-18-owncanvas-cli-mock-generation.md
git commit -m "feat: add owncanvas cli mock generation"
git push
gh issue comment 34 -R junho-baek/owncanvas --body "<summary and verification>"
gh issue close 34 -R junho-baek/owncanvas --comment "Closing as completed by <commit>."
```

## Self-Review

- Spec coverage: This plan covers #34 run targets, canvas/subgraph/selection planning, edge-aware mock execution, deterministic outputs, run files, output refs, status/logs/cancel/retry/outputs, and partial failure. Real provider execution is intentionally left to #31.
- Placeholder scan: No TBD/TODO/later placeholders are present.
- Type consistency: Planned helpers and CLI commands use stable names throughout.
