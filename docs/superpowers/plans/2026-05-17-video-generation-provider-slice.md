# Video Generation Provider Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Attach the existing Replicate-backed generation service to the Video Block so a prompt-only Seedance smoke test can create a persisted Creative Output video.

**Architecture:** Keep Replicate as a service adapter, not a user-facing model category. Add a Video Block model/catalog that exposes model names such as Seedance and Kling, creates `mediaType: "video"` generation batches, and reuses the existing React Router to Go generation bridge. Extend batch persistence to write video assets when the request is video media, while preserving image fan-out behavior.

**Tech Stack:** React Router v7, React/TypeScript, React Flow, Go generation service, Replicate Predictions API.

---

## File Structure

- Modify `generation/internal/generation/types.go`: add optional `mediaType` to batch specs/jobs.
- Modify `generation/internal/generation/providers.go`: poll Replicate predictions when sync wait returns `starting` or `processing`; detect video MIME types.
- Modify `generation/internal/generation/providers_test.go`: lock polling and video output behavior.
- Modify `generation/internal/generation/server.go`: make mock provider return video-shaped output for video jobs.
- Modify `app/features/creative-canvas/model/generation-batch.ts`: add `GenerationMediaType`, optional defaulted media type in requests, and validation.
- Modify `app/features/creative-canvas/model/generation-batch.test.ts`: lock image default and video request contract.
- Modify `app/features/creative-canvas/model/generation-batch-persistence.ts`: persist video batches as `mediaType: "video"` and `capabilityId: "generate.video"`.
- Modify `app/features/creative-canvas/model/generation-batch-persistence.test.ts`: add a video persistence contract.
- Create `app/features/creative-canvas/model/video-generation-node.ts`: Video Block properties, Seedance/Kling catalog, request assembly, and lifecycle transitions.
- Create `app/features/creative-canvas/model/video-generation-node.test.ts`: catalog/request/status tests.
- Create `app/features/creative-canvas/adapters/video-generation-run.ts`: one-node video generation batch planner.
- Create `app/features/creative-canvas/adapters/video-generation-run.test.ts`: planner contract.
- Modify `app/features/creative-canvas/model/creative-canvas.ts`: initialize Video Block properties.
- Modify `app/features/creative-canvas/adapters/react-flow-canvas.ts`: preserve video properties and attach image-output references to Video Blocks.
- Modify `app/features/creative-canvas/components/creative-canvas-screen.tsx`: run Video Block, render model/duration/resolution controls, show generated video preview.
- Modify `app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts`: source assertions for Video Block provider controls and run wiring.
- Modify `app/app.css`: video preview styling aligned with Image Block surface.
- Modify `wiki/log.md`: record implementation and smoke generation outcome.

---

### Task 1: Generation Batch Contract Supports Video

**Files:**
- Modify: `app/features/creative-canvas/model/generation-batch.ts`
- Modify: `app/features/creative-canvas/model/generation-batch.test.ts`
- Modify: `generation/internal/generation/types.go`
- Modify: `generation/internal/generation/service.go`
- Modify: `generation/internal/generation/server.go`
- Test: `app/features/creative-canvas/model/generation-batch.test.ts`
- Test: `generation/internal/generation/service_test.go`

- [x] **Step 1: Add failing TS contract test**

Add a test that calls `createGenerationBatchRequest({ mediaType: "video", ... })` and asserts both `spec.mediaType` and `jobs[0].mediaType` equal `"video"`.

- [x] **Step 2: Add TypeScript media type field**

Add `export type GenerationMediaType = "image" | "video";`, default `mediaType` to `"image"` in `createGenerationBatchRequest`, include it in spec/jobs, and validate it in `isGenerationSpec()` and `isGenerationJobRequest()`.

- [x] **Step 3: Add Go media type field**

Add `MediaType string json:"mediaType,omitempty"` to `GenerationSpec` and `GenerationJob`. In validation, accept empty as legacy image, otherwise require `image` or `video`.

- [x] **Step 4: Make mock provider video-aware**

When `job.MediaType == "video"`, return `ProviderURL: https://mock.owncanvas.local/<node>.mp4`, `MimeType: video/mp4`, `Width: 1280`, `Height: 720`.

- [x] **Step 5: Verify**

Run:

```bash
node --experimental-strip-types --test app/features/creative-canvas/model/generation-batch.test.ts
go test ./...
```

Expected: pass.

---

### Task 2: Replicate Provider Handles Long Video Predictions

**Files:**
- Modify: `generation/internal/generation/providers.go`
- Modify: `generation/internal/generation/providers_test.go`
- Test: `generation/internal/generation/providers_test.go`

- [x] **Step 1: Add failing polling test**

Add a test where the create response returns `status: "processing"`, `output: null`, and `urls.get`; the provider must poll the get URL until `status: "succeeded"` with an `.mp4` output.

- [x] **Step 2: Implement polling**

After decoding the create response, if the prediction is not terminal and has no parseable output, repeatedly GET `prediction.urls.get` until terminal or timeout. Use `provider.waitSeconds` as the total budget and a short ticker interval.

- [x] **Step 3: Add video MIME detection**

Map `.mp4` to `video/mp4`, `.webm` to `video/webm`, and `.mov` to `video/quicktime`.

- [x] **Step 4: Verify**

Run:

```bash
go test ./...
```

Expected: pass.

---

### Task 3: Video Block Model and Run Planner

**Files:**
- Create: `app/features/creative-canvas/model/video-generation-node.ts`
- Create: `app/features/creative-canvas/model/video-generation-node.test.ts`
- Create: `app/features/creative-canvas/adapters/video-generation-run.ts`
- Create: `app/features/creative-canvas/adapters/video-generation-run.test.ts`
- Modify: `app/features/creative-canvas/model/creative-canvas.ts`
- Modify: `app/features/creative-canvas/adapters/react-flow-canvas.ts`
- Test: focused TS tests

- [x] **Step 1: Add Video Block model tests**

Cover default Seedance 1 Lite model, Seedance request payload with prompt/duration/resolution/aspect ratio, Kling blocking without a start image, and success/failure lifecycle transitions.

- [x] **Step 2: Implement Video Block model**

Create a model catalog with `bytedance/seedance-1-lite`, `bytedance/seedance-1-pro-fast`, `bytedance/seedance-2.0-fast`, and `kwaivgi/kling-v2.1`. Store user-facing model labels as model names and service binding as `serviceAdapterId: "replicate"`.

- [x] **Step 3: Add Video Block run planner**

Create `createVideoGenerationRunPlan()` that validates the node, builds one `mediaType: "video"` batch, and maps reference asset URI into `image` for Seedance or `start_image` for Kling.

- [x] **Step 4: Initialize Video Block properties**

`createCampaignBlock("video")` should include `createVideoGenerationNodeProperties()`. Existing non-video blocks remain unchanged.

- [x] **Step 5: Verify**

Run:

```bash
node --experimental-strip-types --test app/features/creative-canvas/model/video-generation-node.test.ts app/features/creative-canvas/adapters/video-generation-run.test.ts app/features/creative-canvas/model/generation-batch.test.ts
```

Expected: pass.

---

### Task 4: Persist Video Creative Outputs

**Files:**
- Modify: `app/features/creative-canvas/model/generation-batch-persistence.ts`
- Modify: `app/features/creative-canvas/model/generation-batch-persistence.test.ts`
- Test: `app/features/creative-canvas/model/generation-batch-persistence.test.ts`

- [x] **Step 1: Add failing video persistence test**

Create a campaign with one Video Block, persist a succeeded video batch response, and assert the stored campaign asset has `mediaType: "video"` and `mimeType: "video/mp4"`.

- [x] **Step 2: Implement media-aware persistence**

Resolve media type from request job/spec with default `"image"`, set `mediaType`, `capabilityId`, failure details media type, and `videoInputs`/`imageInputs` accordingly.

- [x] **Step 3: Verify**

Run:

```bash
node --experimental-strip-types --test app/features/creative-canvas/model/generation-batch-persistence.test.ts
```

Expected: pass.

---

### Task 5: Wire Video Block UI and Smoke Generate

**Files:**
- Modify: `app/features/creative-canvas/components/creative-canvas-screen.tsx`
- Modify: `app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts`
- Modify: `app/app.css`
- Modify: `wiki/log.md`

- [x] **Step 1: Add source-level component assertions**

Assert the screen imports `video-generation-node`, calls `createVideoGenerationRunPlan`, passes `onRunVideoGeneration`, renders model/duration/resolution controls, and renders a `<video>` preview.

- [x] **Step 2: Wire run handler**

Add `runVideoGenerationNode()` mirroring the single-node image retry flow: queue node, submit batch, persist response, then apply success/failure to the Video Block.

- [x] **Step 3: Render compact controls**

For Video Blocks, render a model selector, duration selector, resolution selector, prompt textarea, run button, and generated video preview. Keep labels minimal and use existing `space-control-chip` styling.

- [x] **Step 4: Verify typecheck/build**

Run:

```bash
node --experimental-strip-types --test app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts app/features/creative-canvas/model/video-generation-node.test.ts app/features/creative-canvas/adapters/video-generation-run.test.ts app/features/creative-canvas/model/generation-batch-persistence.test.ts
npm run typecheck
npm run build
git diff --check
```

Expected: pass.

- [x] **Step 5: Run real Seedance smoke**

Start the Go generation service with `OWNCANVAS_REPLICATE_API_TOKEN` and submit a one-job `mediaType: "video"` batch using `bytedance/seedance-1-lite`, `duration: 2`, `resolution: "480p"`, `aspect_ratio: "16:9"`, `fps: 24`, `camera_fixed: false`. Save the returned video URL and download a local copy under `output/replicate/`.

---

## Self-Review

- Spec coverage: The plan covers Video Block provider attachment, cheap Seedance-first smoke generation, Kling catalog presence with reference requirement, and persistence as Creative Output video.
- Placeholder scan: No future-only placeholders remain; smoke generation has concrete parameters.
- Type consistency: `mediaType` uses `"image" | "video"` in TypeScript and `"image"`/`"video"` strings in Go.
- Execution note: `bytedance/seedance-1-lite` entered a long-running state and was canceled; `bytedance/seedance-1-pro-fast` completed the 2s 480p smoke and produced `output/replicate/owncanvas-ai-native-ceo-seedance-pro-fast.mp4`.
