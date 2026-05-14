# Image Generation Node Spaces UI Implementation Plan

> **For Hermes:** Use subagent-driven-development style execution and independent review. Do not commit or push until the user approves the UI capture.

**Goal:** Replace the page-like Image Block with a Freepik Spaces-style, resizable canvas prompt-composer node.

**Architecture:** Keep the image generation data contract in the model, but render the visible block as a node surface: header label, selected frame, prompt area, bottom chips, floating actions, ports, and resize handle. Aspect ratio and size belong in node properties/JSON source of truth; visible implementation details stay out of the node UI.

**Tech Stack:** React/TypeScript, React Flow canvas, CSS in `app/app.css`, model in `app/features/creative-canvas/model/*`.

---

### Task 1: Normalize the Image Generation node model for aspect/size

**Objective:** Ensure the model can store the selected aspect ratio and node size without exposing implementation details in visible UI.

**Files:**
- Modify: `app/features/creative-canvas/model/image-generation-node.ts`
- Modify: `app/features/creative-canvas/model/image-generation-node.test.ts`
- Possibly modify: `app/features/creative-canvas/model/creative-canvas.ts`

**Steps:**
1. Add/confirm `aspectRatio`, `frame`, or equivalent size metadata for image generation node properties.
2. Support at least `16:9`, `9:16`, `1:1`; default to `16:9` with a wide frame.
3. Keep batch default at `x1` for the UI spec unless the model needs a max separately.
4. Update tests to verify aspect/size metadata and no secret values.

**Verification:**
```bash
node --experimental-strip-types --test app/features/creative-canvas/model/image-generation-node.test.ts
```

### Task 2: Replace page-like UI with Spaces node UI

**Objective:** Render Image Block as the provided UI spec: node composer, not page generator.

**Files:**
- Modify: `app/features/creative-canvas/components/creative-canvas-screen.tsx`
- Modify: `app/app.css`

**Steps:**
1. Remove the large white page UI with internal preview grid.
2. Render node label above the card: icon + `이미지 생성기 #1`/localized equivalent.
3. Render floating action bar above top-right: play, connection, trash, more.
4. Render prompt area with placeholder: `어떤 이미지를 생성하고 싶은지 설명해주세요...`.
5. Render bottom setting chips: count, model, ratio, quality, settings.
6. Render circular play button at bottom-right.
7. Render input/reference/output connection affordances consistent with React Flow handles.
8. Render a bottom-right resize affordance.
9. Ensure visible UI contains no JSON/storage/secrets/debug copy.

**Verification:**
```bash
npm run typecheck
```

### Task 3: Aspect-ratio-aware visual behavior

**Objective:** Make ratio selection visible as node frame ratio and prepare for resize.

**Files:**
- Modify: `app/features/creative-canvas/components/creative-canvas-screen.tsx`
- Modify: `app/app.css`
- Possibly modify: React Flow adapter if position/size needs defaults.

**Steps:**
1. Apply CSS aspect ratio from the node property (`16 / 9`, `9 / 16`, `1 / 1`).
2. Ensure the default node shape is wide 16:9.
3. If project already has React Flow resize controls, wire them; otherwise add a visual handle and persist size metadata for future wiring.
4. Ensure chips remain inside the card and do not overlap the run button.

**Verification:**
```bash
npm run typecheck
npm run build
```

### Task 4: Remove obsolete preview assets/references

**Objective:** Clean up the erroneous page-generator preview-grid artifacts.

**Files:**
- Remove if unused: `public/assets/image-node/freepik-preview-*.jpg`
- Modify any references in `creative-canvas-screen.tsx` or CSS.

**Verification:**
```bash
git diff --check
```

### Task 5: Browser and Codex review gate before user approval

**Objective:** Prove the UI matches the provided spec before asking user to approve commit/push.

**Steps:**
1. Start local dev server.
2. Navigate to canvas and add/select Image Block.
3. Capture screenshot.
4. Browser vision prompt must explicitly say: “Spaces canvas node, not generator page.”
5. Run Codex read-only review with the same checklist.
6. Report screenshot and PASS/FAIL to user.

**Verification commands:**
```bash
node --experimental-strip-types --test app/features/creative-canvas/model/image-generation-node.test.ts
npm run typecheck
npm run build
git diff --check
```

**Stop condition:** Do not commit or push until user approves the screenshot.
