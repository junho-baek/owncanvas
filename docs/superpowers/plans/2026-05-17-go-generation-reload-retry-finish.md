# Go Generation Reload Retry Finish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the remaining seed-aligned Go-backed Image Block generation work: persisted generated outputs must fill Image Blocks after reload, failed duplicated Image Blocks must retry as single nodes, source reruns must append new visual batches, and verification/GitHub triage must be auditable.

**Architecture:** Keep provider execution behind React Router and Go. Move the route's GenerationBatchResponse-to-Campaign persistence mapping into a shared Creative Canvas model helper so both the server route and the browser local-first canvas can apply the same Campaign Asset/Creative Output update. Keep retry behavior in the fan-out adapter and CreativeCanvasScreen: source Image Blocks append xN batches; failed duplicated Image Blocks submit one job for the existing node.

**Tech Stack:** React Router v7, TypeScript `node:test`, existing Creative Canvas model/adapters, Go generation service tests, browser-local `window.localStorage` Campaign persistence.

---

## File Structure

- Create `app/features/creative-canvas/model/generation-batch-persistence.ts`: shared pure helper that converts a validated `GenerationBatchRequest` + terminal `GenerationBatchResponse` into updated Campaign state and persisted Creative Output asset ids.
- Create `app/features/creative-canvas/model/generation-batch-persistence.test.ts`: focused reload/persistence contract tests for local-first Campaign storage.
- Modify `app/routes/api.campaign-generation.ts`: delegate persistence mapping to the shared helper; keep route validation and secret-safe boundary behavior.
- Modify `app/routes/campaign-generation-api.test.ts`: keep current route coverage passing after helper extraction.
- Modify `app/features/creative-canvas/adapters/image-generation-fanout.ts`: add a single-node retry plan for failed duplicated Image Blocks and keep existing source xN fan-out append plan.
- Modify `app/features/creative-canvas/adapters/image-generation-fanout.test.ts`: prove duplicated retry targets one existing node and source rerun appends a new batch.
- Modify `app/features/creative-canvas/components/creative-canvas-screen.tsx`: apply local Campaign persistence after the route returns, then apply node result states from persisted refs.
- Modify `app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts`: static regression for local persistence helper use and single retry branch.
- Modify `wiki/log.md`: append outcome and verification notes in Korean.

---

### Task 1: Shared Generation Batch Persistence Helper

**Files:**
- Create: `app/features/creative-canvas/model/generation-batch-persistence.ts`
- Create: `app/features/creative-canvas/model/generation-batch-persistence.test.ts`
- Modify: `app/routes/api.campaign-generation.ts`
- Test: `app/features/creative-canvas/model/generation-batch-persistence.test.ts`
- Test: `app/routes/campaign-generation-api.test.ts`

- [x] **Step 1: Write the failing model test**

Add tests that create a blank Campaign with three Image Blocks, apply a mixed generation response, and assert:
- succeeded nodes get Campaign Assets and `properties.assetGeneration.outputLocations`
- failed nodes keep failure status without asset ids
- the returned batch includes `persistedCreativeOutputAssetId` only for succeeded persisted assets

Run:

```bash
node --experimental-strip-types --test app/features/creative-canvas/model/generation-batch-persistence.test.ts
```

Expected before implementation: FAIL because the file/helper does not exist.

- [x] **Step 2: Implement shared helper**

Create `persistGenerationBatchResponseToCampaign()` with this public contract:

```ts
export function persistGenerationBatchResponseToCampaign(input: {
  campaign: CampaignRecord;
  request: GenerationBatchRequest;
  response: GenerationBatchResponse;
  now?: () => string;
}): {
  campaign: CampaignRecord;
  response: GenerationBatchResponse;
  persistedCreativeOutputAssetIds: Map<string, string>;
}
```

The helper must strip any provider-supplied `persistedCreativeOutputAssetId`, build `CampaignAssetGenerationExecutionResult`, link jobs to canvas/spec nodes, call `applyCampaignAssetGenerationExecutionResult()`, then attach persisted asset ids only when the resulting Campaign actually contains the asset.

- [x] **Step 3: Refactor route to use helper**

Replace route-local persistence mapping with `persistGenerationBatchResponseToCampaign()`, then store the returned Campaign through `updatePersistedCampaignRecord()`. Route must still validate request, campaignId, service response shape, job/node ownership, and secret redaction.

- [x] **Step 4: Verify task**

Run:

```bash
node --experimental-strip-types --test app/features/creative-canvas/model/generation-batch-persistence.test.ts app/routes/campaign-generation-api.test.ts
npm run typecheck
```

Expected: all tests pass and typecheck exits 0.

- [x] **Step 5: Commit**

```bash
git add app/features/creative-canvas/model/generation-batch-persistence.ts app/features/creative-canvas/model/generation-batch-persistence.test.ts app/routes/api.campaign-generation.ts app/routes/campaign-generation-api.test.ts
git commit -m "model: share generation batch persistence"
```

### Task 2: Browser Local-First Persistence and Reload

**Files:**
- Modify: `app/features/creative-canvas/components/creative-canvas-screen.tsx`
- Modify: `app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts`
- Test: `app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts`

- [x] **Step 1: Write static regression**

Add assertions that `CreativeCanvasScreen` imports `persistGenerationBatchResponseToCampaign`, applies it after `submitImageGenerationBatch()`, and updates `campaignRef.current`/`onCampaignChange` before applying Image Block result refs.

Run:

```bash
node --experimental-strip-types --test app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts
```

Expected before implementation: FAIL.

- [x] **Step 2: Apply client-side persistence**

After a successful route response, call:

```ts
const persisted = persistGenerationBatchResponseToCampaign({
  campaign: campaignRef.current,
  request: plan.batch,
  response,
});
```

Then update `campaignRef.current`, call `onCampaignChange?.(persisted.campaign)`, and pass `persisted.response` to `applyImageGenerationBatchResults()`. This keeps `campaign.assets[]`, `canvasState.nodes[].properties.assetGeneration`, and Image Block selected output refs in browser `localStorage`.

- [x] **Step 3: Verify task**

Run:

```bash
node --experimental-strip-types --test app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts app/features/creative-canvas/model/generation-batch-persistence.test.ts
npm run typecheck
```

Expected: all tests pass and typecheck exits 0.

- [x] **Step 4: Commit**

```bash
git add app/features/creative-canvas/components/creative-canvas-screen.tsx app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts
git commit -m "ui: persist generation outputs locally"
```

### Task 3: Single-Node Retry for Failed Duplicated Image Blocks

**Files:**
- Modify: `app/features/creative-canvas/adapters/image-generation-fanout.ts`
- Modify: `app/features/creative-canvas/adapters/image-generation-fanout.test.ts`
- Modify: `app/features/creative-canvas/components/creative-canvas-screen.tsx`
- Modify: `app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts`

- [x] **Step 1: Write retry planner test**

Add `createImageGenerationSingleNodeRetryPlan()` test that starts from a failed duplicated Image Block and asserts:
- `createdNodes` is empty
- `batch.fanOutCount` is `1`
- the only job targets the existing failed node id
- source x3 rerun still allocates a new `_run_2` visual batch when ids collide

Run:

```bash
node --experimental-strip-types --test app/features/creative-canvas/adapters/image-generation-fanout.test.ts
```

Expected before implementation: FAIL because the retry planner does not exist.

- [x] **Step 2: Implement retry planner**

Add `createImageGenerationSingleNodeRetryPlan()` beside the existing fan-out planner. It should derive provider request parameters from the failed Image Block, generate a collision-safe retry batch id, and create no new visible nodes.

- [x] **Step 3: Wire screen retry branch**

In `runImageGenerationNode()`, if the selected Image Block has `uiState.status === "failed"`, submit the single retry plan, immediately mark that existing node queued, and apply success/failure to that same node id. Otherwise keep the current source xN append behavior.

- [x] **Step 4: Verify task**

Run:

```bash
node --experimental-strip-types --test app/features/creative-canvas/adapters/image-generation-fanout.test.ts app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts app/features/creative-canvas/model/generation-batch-persistence.test.ts
npm run typecheck
```

Expected: all tests pass and typecheck exits 0.

- [x] **Step 5: Commit**

```bash
git add app/features/creative-canvas/adapters/image-generation-fanout.ts app/features/creative-canvas/adapters/image-generation-fanout.test.ts app/features/creative-canvas/components/creative-canvas-screen.tsx app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts
git commit -m "ui: retry failed image block in place"
```

### Task 4: Final Verification, Wiki, and GitHub Triage

**Files:**
- Modify: `wiki/log.md`

- [x] **Step 1: Run full verification**

Run:

```bash
npm run skills:check
GOCACHE=/private/tmp/owncanvas-go-build-cache go test ./...
node --experimental-strip-types --test $(rg --files app scripts | rg '\.test\.(ts|tsx|js|mjs)$')
npm run typecheck
npm run build
git diff --check
```

Expected: skill check may report the known 8 missing external DDD/marketing skills with fallback; all code/build checks pass.

- [x] **Step 2: Update wiki/log.md**

Append a Korean outcome section covering:
- shared persistence helper
- browser localStorage reload path
- single-node duplicated retry
- source rerun append behavior
- verification commands and results

- [ ] **Step 3: Push and triage GitHub**

Push `feature/go-generation-fanout-slice`. Then inspect GitHub issues `#19`-`#24`, close only fully complete issues, and comment remaining gaps if any.

Run:

```bash
git push origin feature/go-generation-fanout-slice
gh issue list --repo junho-baek/owncanvas --state open --limit 20
```

Expected: branch pushed; issue status updated conservatively.
