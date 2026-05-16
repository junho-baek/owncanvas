# OwnCanvas Remaining Issues Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the remaining Image Generation Node v2 gap and complete the de-console pass so OwnCanvas reads as a creative campaign canvas instead of a provider/admin console.

**Architecture:** Keep domain/provider behavior in `app/features/creative-canvas/model/`, keep React Flow and canvas wiring in `app/features/creative-canvas/adapters/`, and keep the visible UI pass limited to `creative-canvas-screen.tsx` plus `app/app.css`. Provider/debug details stay available through developer disclosure; first-screen copy uses Campaign, Creative Canvas, Generation Block, Image Block, and Creative Output language.

**Tech Stack:** React Router v7, React 19, TypeScript, React Flow, Node test runner, GitHub CLI, Browser plugin for visual evidence.

---

## Current Issue State

- Closed before this plan: `#2`, `#3`, `#4`, `#5`.
- Keep open until this plan is executed: `#1`, `#6`, `#7`, `#8`, `#9`, `#10`, `#11`, `#12`, `#13`.
- Treat `#6` as the only remaining Image Generation Node v2 implementation gap: Seedream-like provider-size behavior needs a focused contract tying manual frame resize to provider `size` input.
- Treat `#7` and `#13` as evidence gates: browser screenshot, console check, DESIGN.md review note, tests, typecheck, build, and diff check.
- Treat the manual QA finding “drag a line from the Image Block output and drop it onto empty canvas” as a required pre-`#7` bug fix. Root cause: React Flow connection gestures are disabled by `nodesConnectable={false}` and no `onConnectStart`/`onConnectEnd` path opens the next-node menu.

## File Structure

- Modify `app/features/creative-canvas/model/image-generation-node.test.ts`: add the Seedream custom-size/frame test for `#6`.
- Modify `app/features/creative-canvas/model/image-generation-node.ts`: derive Seedream-like provider `size` from manual canvas frame when no explicit provider size control is supplied.
- Modify `app/features/creative-canvas/model/creative-canvas.ts`: simplify `generationPalette` labels/descriptions for creator-facing copy.
- Modify `app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts`: add source-level UI copy, containment, disclosure, and de-console regression tests.
- Modify `app/features/creative-canvas/components/creative-canvas-screen.tsx`: update palette, campaign brief panel, inspector/docs progressive disclosure, and developer details.
- Modify `app/app.css`: reduce nested containment, align radii with `DESIGN.md`, and make inner rows use dividers/typography instead of card-in-card treatment.
- Modify `wiki/log.md`: record issue closures, plan execution result, verification, and deferred limits.

---

### Task 0: Restore Output Line Drop-to-Empty Next-Node Menu

**Files:**
- Modify: `app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts`
- Modify: `app/features/creative-canvas/components/creative-canvas-screen.tsx`
- Modify: `app/app.css`
- Modify: `wiki/log.md`

- [ ] **Step 1: Write the failing source regression**

Add this test near the existing output next-node tests in `app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts`:

```ts
test("Image output drag to empty canvas opens the next-node menu", () => {
  const screenStart = creativeCanvasScreen.indexOf("export function CreativeCanvasScreen");
  const screenEnd = creativeCanvasScreen.indexOf("function ImageGenerationInspectorPanel");
  assert.notEqual(screenStart, -1);
  assert.notEqual(screenEnd, -1);

  const screenSource = creativeCanvasScreen.slice(screenStart, screenEnd);

  assert.match(screenSource, /const pendingImageOutputConnectionRef = useRef/);
  assert.match(screenSource, /const \[imageOutputDropMenu, setImageOutputDropMenu\] = useState/);
  assert.match(screenSource, /onConnectStart=\{\(_, connection\) => \{/);
  assert.match(screenSource, /connection\.handleId !== "outputs\.generated_image_asset"/);
  assert.match(screenSource, /onConnectEnd=\{\(event, connectionState\) => \{/);
  assert.match(screenSource, /if \(connectionState\.isValid\) \{/);
  assert.match(screenSource, /setImageOutputDropMenu\(\{/);
  assert.match(screenSource, /nodesConnectable/);
  assert.doesNotMatch(screenSource, /nodesConnectable=\{false\}/);
  assert.match(screenSource, /className="canvas-output-drop-menu nodrag"/);
  assert.match(screenSource, /role="menu"/);
  assert.match(screenSource, /handleImageOutputNextNodeAction\(/);
  assert.match(appCss, /\.canvas-output-drop-menu\s*\{[\s\S]*position:\s*fixed/);
});
```

- [ ] **Step 2: Run the focused test to verify the gap**

Run:

```bash
node --experimental-strip-types --test --test-name-pattern "Image output drag to empty canvas opens the next-node menu" app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts
```

Expected before implementation:

```text
not ok ... Image output drag to empty canvas opens the next-node menu
AssertionError
```

- [ ] **Step 3: Implement connection lifecycle state**

In `app/features/creative-canvas/components/creative-canvas-screen.tsx`, add these types near the top-level constants:

```ts
type PendingImageOutputConnection = {
  sourceNodeId: string;
  selectedResultAssetId: string;
};

type ImageOutputDropMenuState = PendingImageOutputConnection & {
  x: number;
  y: number;
};
```

Inside `CreativeCanvasScreen`, add:

```tsx
const pendingImageOutputConnectionRef = useRef<PendingImageOutputConnection | null>(null);
const [imageOutputDropMenu, setImageOutputDropMenu] =
  useState<ImageOutputDropMenuState | null>(null);
```

Add this helper inside `CreativeCanvasScreen` before the `return`:

```tsx
const getConnectionEventPoint = (event: MouseEvent | TouchEvent) => {
  if ("changedTouches" in event) {
    const touch = event.changedTouches[0];
    return touch ? { x: touch.clientX, y: touch.clientY } : null;
  }

  return { x: event.clientX, y: event.clientY };
};
```

- [ ] **Step 4: Wire React Flow connect start/end**

On `<ReactFlow>`, add:

```tsx
onConnectStart={(_, connection) => {
  pendingImageOutputConnectionRef.current = null;

  if (
    connection.handleType !== "source" ||
    connection.handleId !== "outputs.generated_image_asset" ||
    connection.nodeId === null
  ) {
    return;
  }

  const sourceNode = canvasSnapshotRef.current.nodes.find(
    (node) => node.id === connection.nodeId,
  );
  const properties = sourceNode?.data.properties;

  if (
    !isImageGenerationNodeProperties(properties) ||
    !properties.uiState.outputConnectionReady ||
    properties.uiState.selectedResultAssetId === null
  ) {
    return;
  }

  pendingImageOutputConnectionRef.current = {
    sourceNodeId: connection.nodeId,
    selectedResultAssetId: properties.uiState.selectedResultAssetId,
  };
}}
onConnectEnd={(event, connectionState) => {
  const pendingConnection = pendingImageOutputConnectionRef.current;
  pendingImageOutputConnectionRef.current = null;

  if (pendingConnection === null || connectionState.isValid) {
    return;
  }

  const eventPoint = getConnectionEventPoint(event);

  if (eventPoint === null) {
    return;
  }

  setImageOutputDropMenu({
    ...pendingConnection,
    x: eventPoint.x,
    y: eventPoint.y,
  });
}}
nodesConnectable
```

Remove `nodesConnectable={false}`.

- [ ] **Step 5: Render the drop menu**

Before the closing `</div>` of `.canvas-overlays`, render:

```tsx
{imageOutputDropMenu ? (
  <div
    className="canvas-output-drop-menu nodrag"
    role="menu"
    aria-label="Create next generation block from output"
    style={{ left: imageOutputDropMenu.x, top: imageOutputDropMenu.y }}
  >
    {resolveImageGenerationOutputNextNodeActions(
      nodes.find((node) => node.id === imageOutputDropMenu.sourceNodeId)?.data
        .properties as ImageGenerationNodeProperties,
    ).map((action) => {
      const ActionIcon = imageOutputNextNodeActionIcons[action.kind];

      return (
        <button
          key={action.kind}
          type="button"
          role="menuitem"
          disabled={action.availability === "disabled"}
          onClick={() => {
            handleImageOutputNextNodeAction(
              imageOutputDropMenu.sourceNodeId,
              action.kind,
              imageOutputDropMenu.selectedResultAssetId,
            );
            setImageOutputDropMenu(null);
          }}
        >
          <ActionIcon className="size-4" />
          <span>{action.label}</span>
        </button>
      );
    })}
  </div>
) : null}
```

If TypeScript complains about the cast, replace it with a local `const dropMenuImageProperties = ...` guard before `return` and render only when `isImageGenerationNodeProperties(dropMenuImageProperties)`.

- [ ] **Step 6: Add menu CSS**

Add to `app/app.css` near the existing next-node menu styles:

```css
.canvas-output-drop-menu {
  position: fixed;
  z-index: 28;
  display: grid;
  width: 220px;
  gap: 4px;
  border: 1px solid #dddddd;
  border-radius: 8px;
  background: #ffffff;
  padding: 6px;
  box-shadow: 0 18px 44px rgba(24, 29, 38, 0.12);
}

.canvas-output-drop-menu button {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr);
  min-height: 32px;
  align-items: center;
  gap: 8px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #181d26;
  font-size: 12px;
  font-weight: 500;
  text-align: left;
}

.canvas-output-drop-menu button:disabled {
  cursor: not-allowed;
  color: #9297a0;
}
```

- [ ] **Step 7: Verify**

Run:

```bash
node --experimental-strip-types --test --test-name-pattern "Image output drag to empty canvas opens the next-node menu" app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts
node --experimental-strip-types --test app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts
npm run typecheck
```

Expected:

```text
# pass
```

- [ ] **Step 8: Record in wiki/log.md**

Append a Korean entry noting:

- Root cause: `nodesConnectable={false}` plus missing `onConnectStart/onConnectEnd`.
- Fix: output handle drag/drop opens a drop-positioned next-node menu while preserving the click menu.
- Verification commands and manual QA target.

---

### Task 1: Finish `#6` Seedream Provider Size Contract

**Files:**
- Modify: `app/features/creative-canvas/model/image-generation-node.test.ts`
- Modify: `app/features/creative-canvas/model/image-generation-node.ts`
- Modify: `wiki/log.md`

- [ ] **Step 1: Write the failing Seedream custom-size test**

Add this test after `test("image generation provider request keeps native aspect ratios unchanged", ...)` in `app/features/creative-canvas/model/image-generation-node.test.ts`:

```ts
test("Seedream provider request derives provider size from a manual canvas frame", () => {
  const seedreamProperties = resizeImageGenerationNodeFrameTransition(
    createImageGenerationNodeProperties({
      providerId: "replicate",
      modelSlug: "bytedance/seedream-3",
      aspectRatio: "9:16",
    }),
    { width: 384, height: 640 },
  );

  const request = createImageGenerationNodeProviderRequest({
    properties: seedreamProperties,
    prompt: "Tall product shot on a coral studio sweep",
  });

  assert.equal(request.replicate.model, "bytedance/seedream-3");
  assert.equal(request.replicate.input.prompt, "Tall product shot on a coral studio sweep");
  assert.equal(request.replicate.input.aspect_ratio, "9:16");
  assert.equal(request.replicate.input.size, "384x640");
  assert.equal("width" in request.replicate.input, false);
  assert.equal("height" in request.replicate.input, false);
  assert.equal(request.replicate.aspectRatio.requested, "9:16");
  assert.equal(request.replicate.aspectRatio.providerValue, "9:16");
  assert.equal(request.replicate.aspectRatio.mapped, false);

  const explicitSizeRequest = createImageGenerationNodeProviderRequest({
    properties: seedreamProperties,
    prompt: "Tall product shot on a coral studio sweep",
    controlValues: {
      size: "1024x1792",
      guidance_scale: 3.5,
      seed: 12345,
    },
  });

  assert.equal(explicitSizeRequest.replicate.input.size, "1024x1792");
  assert.equal(explicitSizeRequest.replicate.input.guidance_scale, 3.5);
  assert.equal(explicitSizeRequest.replicate.input.seed, 12345);
});
```

- [ ] **Step 2: Run the focused test to verify the gap**

Run:

```bash
node --experimental-strip-types --test --test-name-pattern "Seedream provider request derives provider size" app/features/creative-canvas/model/image-generation-node.test.ts
```

Expected before implementation:

```text
not ok ... Seedream provider request derives provider size from a manual canvas frame
AssertionError: Expected values to be strictly equal:
+ undefined
- '384x640'
```

- [ ] **Step 3: Implement manual-frame-to-provider-size derivation**

In `app/features/creative-canvas/model/image-generation-node.ts`, add this helper near `createImageGenerationNodeProviderRequest`:

```ts
function resolveImageGenerationProviderFrameSizeControl({
  capability,
  properties,
  controlValues,
}: {
  capability: ImageGenerationModelCapability;
  properties: ImageGenerationNodeProperties;
  controlValues: Record<string, ImageGenerationInputControlDefaultValue>;
}): { schemaKey: string; value: string } | null {
  const sizeField = capability.schemaAdapter.sizeField;

  if (!capability.capabilities.customSize || sizeField === null) {
    return null;
  }

  if (properties.frame.source !== "user-resize") {
    return null;
  }

  if (sizeField in controlValues || "size" in controlValues) {
    return null;
  }

  const width = Math.round(properties.frame.width);
  const height = Math.round(properties.frame.height);

  if (width <= 0 || height <= 0) {
    return null;
  }

  return {
    schemaKey: sizeField,
    value: `${width}x${height}`,
  };
}
```

Then in `createImageGenerationNodeProviderRequest`, immediately after `const controlValues = input.controlValues ?? {};`, add:

```ts
  const providerFrameSizeControl = resolveImageGenerationProviderFrameSizeControl({
    capability,
    properties: input.properties,
    controlValues,
  });

  if (providerFrameSizeControl) {
    replicateInput[providerFrameSizeControl.schemaKey] =
      providerFrameSizeControl.value;
  }
```

Keep the existing `for (const control of capability.inputControls)` loop. It will still add explicit `size`, `guidance_scale`, and `seed` values from `controlValues`, and the helper will stay out of the way when the user supplied an explicit provider size.

- [ ] **Step 4: Run focused and model tests**

Run:

```bash
node --experimental-strip-types --test --test-name-pattern "Seedream provider request derives provider size" app/features/creative-canvas/model/image-generation-node.test.ts
node --experimental-strip-types --test app/features/creative-canvas/model/image-generation-node.test.ts
```

Expected:

```text
# pass
```

- [ ] **Step 5: Record and close `#6`**

Append this entry near the top of `wiki/log.md`:

```md
## [2026-05-16] image-generation-seedream-provider-size-frame-sync | Issue #6

- Seedream-like `replicate:bytedance/seedream-3` provider requests now derive `input.size` from manual Image Block frame dimensions when the user has resized the compact canvas node and has not supplied an explicit provider size.
- Explicit provider `size`, `guidance_scale`, and `seed` controls still win over frame-derived defaults.
- GPT Image ratio mapping/rejection behavior remains unchanged.
- 검증: focused Seedream provider-size test, full `image-generation-node.test.ts`.
```

Run:

```bash
gh issue close 6 --repo junho-baek/owncanvas --reason completed --comment "Closing as completed. Seedream-like provider requests now reconcile manual Image Block frame resize with provider size input, while explicit provider size controls still win. Evidence is recorded in wiki/log.md under image-generation-seedream-provider-size-frame-sync."
```

Expected:

```text
✓ Closed issue junho-baek/owncanvas#6
```

---

### Task 2: Simplify Palette Copy for `#9`

**Files:**
- Modify: `app/features/creative-canvas/model/creative-canvas.ts`
- Modify: `app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts`
- Modify: `app/features/creative-canvas/components/creative-canvas-screen.tsx`
- Modify: `app/app.css`

- [ ] **Step 1: Add the palette copy regression**

In `app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts`, add this import:

```ts
import { generationPalette } from "../model/creative-canvas.ts";
```

Then add this test after `test("campaign editor exposes landing navigation and conversion authoring controls", ...)`:

```ts
test("campaign blocks palette uses concise creative labels without visible technical badges", () => {
  const paletteStart = creativeCanvasScreen.indexOf("function GenerationPalette");
  const paletteEnd = creativeCanvasScreen.indexOf("function CanvasStatus");
  assert.notEqual(paletteStart, -1);
  assert.notEqual(paletteEnd, -1);

  const paletteSource = creativeCanvasScreen.slice(paletteStart, paletteEnd);

  assert.deepEqual(
    generationPalette.map((item) => ({
      kind: item.kind,
      title: item.title,
      description: item.description,
    })),
    [
      { kind: "text", title: "Copy", description: "Hooks, captions, prompts" },
      { kind: "llm", title: "Prompt", description: "Structured drafts from a brief" },
      { kind: "image", title: "Image", description: "Generate, edit, remix" },
      { kind: "video", title: "Video", description: "Turn frames into motion" },
      { kind: "voice", title: "Voice", description: "Narration variants" },
      { kind: "agent", title: "Operator", description: "Repeat campaign steps" },
      { kind: "dm", title: "DM", description: "Replies and comment triggers" },
      { kind: "landing", title: "Landing", description: "Publishable offer page" },
      { kind: "custom", title: "Plugin", description: "Add-on creative action" },
    ],
  );

  assert.match(paletteSource, /aria-label="Campaign blocks"/);
  assert.match(paletteSource, /<span className="palette-kicker">CREATE<\/span>/);
  assert.match(paletteSource, /<strong>Blocks<\/strong>/);
  assert.doesNotMatch(paletteSource, /GENERATION PALETTE|palette-badge|LLM Block|Agent Block|Custom Block/);
  assert.doesNotMatch(appCss, /\.palette-item:hover/);
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run:

```bash
node --experimental-strip-types --test --test-name-pattern "campaign blocks palette uses concise creative labels" app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts
```

Expected before implementation:

```text
not ok ... campaign blocks palette uses concise creative labels without visible technical badges
AssertionError
```

- [ ] **Step 3: Replace palette labels**

In `app/features/creative-canvas/model/creative-canvas.ts`, replace the `generationPalette` array with:

```ts
export const generationPalette = [
  {
    kind: "text",
    title: "Copy",
    description: "Hooks, captions, prompts",
    badge: "TXT",
  },
  {
    kind: "llm",
    title: "Prompt",
    description: "Structured drafts from a brief",
    badge: "AI",
  },
  {
    kind: "image",
    title: "Image",
    description: "Generate, edit, remix",
    badge: "IMG",
  },
  {
    kind: "video",
    title: "Video",
    description: "Turn frames into motion",
    badge: "VID",
  },
  {
    kind: "voice",
    title: "Voice",
    description: "Narration variants",
    badge: "VO",
  },
  {
    kind: "agent",
    title: "Operator",
    description: "Repeat campaign steps",
    badge: "OPS",
  },
  {
    kind: "dm",
    title: "DM",
    description: "Replies and comment triggers",
    badge: "DM",
  },
  {
    kind: "landing",
    title: "Landing",
    description: "Publishable offer page",
    badge: "WEB",
  },
  {
    kind: "custom",
    title: "Plugin",
    description: "Add-on creative action",
    badge: "EXT",
  },
] satisfies GenerationPaletteItem[];
```

- [ ] **Step 4: Remove visible palette badges**

In `app/features/creative-canvas/components/creative-canvas-screen.tsx`, replace the `GenerationPalette` section header and remove the badge span:

```tsx
<section className="generation-palette canvas-generation-palette" aria-label="Campaign blocks">
  <div className="palette-header">
    <span className="palette-kicker">CREATE</span>
    <strong>Blocks</strong>
  </div>
```

Inside each palette button, delete this line:

```tsx
<span className="palette-badge">{item.badge}</span>
```

- [ ] **Step 5: Flatten palette CSS**

In `app/app.css`, remove the `.palette-item:hover` block and remove the `.palette-badge` block. Update `.palette-item` and `.palette-icon`:

```css
.palette-item {
  display: flex;
  min-height: 52px;
  width: auto;
  min-width: 0;
  justify-self: stretch;
  align-items: center;
  gap: 10px;
  border: 1px solid #dddddd;
  border-radius: 8px;
  background: #ffffff;
  padding: 9px 10px;
  color: #181d26;
  text-align: left;
}

.palette-icon {
  display: grid;
  width: 32px;
  height: 32px;
  flex: none;
  place-items: center;
  border-radius: 6px;
  background: #f8fafc;
  color: #181d26;
}
```

- [ ] **Step 6: Run focused test**

Run:

```bash
node --experimental-strip-types --test --test-name-pattern "campaign blocks palette uses concise creative labels" app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts
```

Expected:

```text
# pass
```

---

### Task 3: Turn the Right Panel into a Campaign Brief Surface for `#10`

**Files:**
- Modify: `app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts`
- Modify: `app/features/creative-canvas/components/creative-canvas-screen.tsx`
- Modify: `app/app.css`

- [ ] **Step 1: Add the campaign brief regression**

Add this test after the palette test in `app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts`:

```ts
test("right panel reads as a campaign brief instead of required metadata", () => {
  const panelStart = creativeCanvasScreen.indexOf("function CampaignMetadataPanel");
  const panelEnd = creativeCanvasScreen.indexOf("function MetadataSection");
  assert.notEqual(panelStart, -1);
  assert.notEqual(panelEnd, -1);

  const panelSource = creativeCanvasScreen.slice(panelStart, panelEnd);

  assert.match(panelSource, /aria-label="Campaign brief"/);
  assert.match(panelSource, /<span>BRIEF<\/span>/);
  assert.match(panelSource, /<strong>Campaign basics<\/strong>/);
  assert.match(panelSource, /className="campaign-brief-readiness"/);
  assert.match(panelSource, /<MetadataSection title="Audience">/);
  assert.match(panelSource, /<MetadataSection title="Offer product">/);
  assert.match(panelSource, /<MetadataSection title="Offer">/);
  assert.match(panelSource, /<MetadataSection title="Channels">/);
  assert.match(panelSource, /<MetadataSection title="Assets">/);
  assert.match(panelSource, /<MetadataSection title="Goals">/);
  assert.match(panelSource, /<details className="metadata-developer-details">/);
  assert.match(panelSource, /<summary>Developer details<\/summary>/);
  assert.doesNotMatch(panelSource, /Required metadata|Campaign JSON spec|Canonical spec/);
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run:

```bash
node --experimental-strip-types --test --test-name-pattern "right panel reads as a campaign brief" app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts
```

Expected before implementation:

```text
not ok ... right panel reads as a campaign brief instead of required metadata
AssertionError
```

- [ ] **Step 3: Add the readiness helper**

In `app/features/creative-canvas/components/creative-canvas-screen.tsx`, add this helper before `function CampaignMetadataPanel`:

```tsx
function getCampaignBriefReadiness(campaign: CampaignDraft): {
  completed: number;
  total: number;
  label: string;
} {
  const requiredValues = [
    campaign.title,
    campaign.objective,
    campaign.targetAudience.persona,
    campaign.productOffer.offer.summary,
    campaign.tracking.measurementGoals[0]?.name ?? "",
  ];
  const completed = requiredValues.filter((value) => value.trim().length > 0).length;
  const total = requiredValues.length;

  return {
    completed,
    total,
    label: completed === total ? "Ready to create" : "Draft brief",
  };
}
```

Inside `CampaignMetadataPanel`, after `const updateCampaignSpecJson = (value: string) => { ... };`, add:

```tsx
  const briefReadiness = getCampaignBriefReadiness(campaign);
```

- [ ] **Step 4: Replace the panel header and readiness surface**

Replace the opening aside/header block with:

```tsx
<aside className="campaign-metadata-panel" aria-label="Campaign brief">
  <div className="metadata-panel-header">
    <span>BRIEF</span>
    <strong>Campaign basics</strong>
  </div>

  <div className="campaign-brief-readiness" aria-label="Campaign brief readiness">
    <span>
      {briefReadiness.completed}/{briefReadiness.total} ready
    </span>
    <strong>{briefReadiness.label}</strong>
  </div>
```

Then rename these section titles:

```tsx
<MetadataSection title="Audience">
<MetadataSection title="Offer product">
<MetadataSection title="Channels">
<MetadataSection title="Goals">
<MetadataSection title="Assets">
```

Keep `Offer` as `Offer`.

- [ ] **Step 5: Move source JSON into developer disclosure**

Replace the current `MetadataSection title="Campaign JSON spec"` block with:

```tsx
<details className="metadata-developer-details">
  <summary>Developer details</summary>
  <MetadataSection title="Source JSON">
    <MetadataJsonArea
      id="campaign-spec-json"
      label="Canvas source"
      value={campaignSpecJson}
      onChange={updateCampaignSpecJson}
      invalid={campaignSpecValidationErrors.length > 0}
    />
    {campaignSpecValidationErrors.length > 0 ? (
      <div
        className="metadata-validation-errors metadata-field-wide"
        role="status"
        aria-live="polite"
      >
        {campaignSpecValidationErrors.map((error) => (
          <p key={`${error.path}-${error.code}`}>
            <strong>{error.path}</strong>
            <span>{error.message}</span>
          </p>
        ))}
      </div>
    ) : null}
  </MetadataSection>
</details>
```

- [ ] **Step 6: Stop rendering per-field Required chips**

In `MetadataTextField` and `MetadataTextArea`, replace the label span body:

```tsx
<span>{label}</span>
```

Keep the `required` prop in the component signature because existing call sites still pass it, but do not render a visible `Required` chip.

- [ ] **Step 7: Add brief CSS**

Add this CSS near `.metadata-panel-header` in `app/app.css`:

```css
.campaign-brief-readiness {
  display: grid;
  gap: 4px;
  border-bottom: 1px solid #dddddd;
  padding: 12px 0;
}

.campaign-brief-readiness span {
  color: #41454d;
  font-size: 12px;
  font-weight: 500;
}

.campaign-brief-readiness strong {
  color: #181d26;
  font-size: 14px;
  font-weight: 500;
}

.metadata-developer-details {
  margin-top: 14px;
  border-top: 1px solid #dddddd;
  padding-top: 12px;
}

.metadata-developer-details summary {
  cursor: pointer;
  color: #41454d;
  font-size: 12px;
  font-weight: 500;
}
```

- [ ] **Step 8: Run focused test**

Run:

```bash
node --experimental-strip-types --test --test-name-pattern "right panel reads as a campaign brief" app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts
```

Expected:

```text
# pass
```

---

### Task 4: Refactor Image Block Inspector into Product-Facing Disclosure for `#11`

**Files:**
- Modify: `app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts`
- Modify: `app/features/creative-canvas/components/creative-canvas-screen.tsx`
- Modify: `app/app.css`

- [ ] **Step 1: Add the inspector disclosure regression**

Replace the assertions inside `test("Image generation docs panel renders provider model documentation", ...)` with this product-facing contract:

```ts
  assert.match(panelSource, /className="image-generation-inspector-panel nodrag"/);
  assert.match(panelSource, /aria-label="Image Block setup"/);
  assert.match(panelSource, /<span>Image setup<\/span>/);
  assert.match(panelSource, /<h2>Model summary<\/h2>/);
  assert.match(panelSource, /<dt>Provider<\/dt>/);
  assert.match(panelSource, /<dt>Model<\/dt>/);
  assert.match(panelSource, /<dt>Status<\/dt>/);
  assert.match(panelSource, /<h2>Inputs<\/h2>/);
  assert.match(panelSource, /<h2>Creative controls<\/h2>/);
  assert.match(panelSource, /<details className="image-generation-developer-details">/);
  assert.match(panelSource, /<summary>Developer details<\/summary>/);
  assert.match(panelSource, /<h2>Provider diagnostics<\/h2>/);
  assert.match(panelSource, /<h2>Adapter mapping<\/h2>/);
  assert.match(panelSource, /<h2>Model limits<\/h2>/);
  assert.doesNotMatch(panelSource, /Provider settings|Provider model docs|Required inputs|Schema adapter|Compatibility/);
```

Keep the existing CSS placement assertions in that test.

- [ ] **Step 2: Run focused test to verify it fails**

Run:

```bash
node --experimental-strip-types --test --test-name-pattern "Image generation docs panel renders provider model documentation" app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts
```

Expected before implementation:

```text
not ok ... Image generation docs panel renders provider model documentation
AssertionError
```

- [ ] **Step 3: Replace inspector panel copy and structure**

In `ImageGenerationInspectorPanel`, replace the `<aside>` label and header:

```tsx
<aside
  className="image-generation-inspector-panel nodrag"
  aria-label="Image Block setup"
  data-node-id={nodeId}
  data-panel-state="open"
>
  <header className="image-generation-inspector-header">
    <span>Image setup</span>
    <strong>{title}</strong>
    <button
      type="button"
      aria-label="Close Image Block setup"
      onClick={() => onClose(nodeId)}
    >
      <X className="size-4" />
    </button>
  </header>
```

Replace the two-column body with:

```tsx
<div className="image-generation-inspector-grid">
  <section className="image-generation-inspector-section" aria-label="Image Block model summary">
    <h2>Model summary</h2>
    <dl>
      <div>
        <dt>Provider</dt>
        <dd>{docsMetadata.provider.name}</dd>
      </div>
      <div>
        <dt>Model</dt>
        <dd>{docsMetadata.selectedModel.name}</dd>
      </div>
      <div>
        <dt>Status</dt>
        <dd>{resolveImageGenerationNodeStatusView(resolveImageGenerationNodeStatus({
          selected: true,
          uiState: details.uiState,
        })).label}</dd>
      </div>
    </dl>

    <h2>Creative controls</h2>
    <ul className="image-generation-inspector-list">
      {inspectorControls.map((control) => (
        <li key={control.id}>
          <span>{control.label}</span>
          <strong>
            {control.options.length > 0
              ? control.options.join(", ")
              : formatImageGenerationControlDefaultValue(control.defaultValue)}
          </strong>
        </li>
      ))}
    </ul>
  </section>

  <section className="image-generation-docs-panel" aria-label="Image Block inputs">
    <h2>Inputs</h2>
    <ul className="image-generation-docs-required-inputs">
      {docsMetadata.requiredInputs.length === 0 ? (
        <li>
          <span>Prompt</span>
          <strong>Describe what to create</strong>
          <em>Text</em>
        </li>
      ) : (
        docsMetadata.requiredInputs.map((control) => (
          <li key={control.id}>
            <span>{control.label}</span>
            <strong>{control.required ? "Needed to generate" : "Optional"}</strong>
            <em>{control.kind.replaceAll("_", " ")}</em>
          </li>
        ))
      )}
    </ul>
  </section>
</div>

<details className="image-generation-developer-details">
  <summary>Developer details</summary>
  <section aria-label="Provider diagnostics">
    <h2>Provider diagnostics</h2>
    <dl>
      <div>
        <dt>Credential env</dt>
        <dd>
          <code>
            {docsMetadata.provider.credentialStatus.envName ?? "No provider env var"}
          </code>
        </dd>
      </div>
      <div>
        <dt>Frame source</dt>
        <dd>{details.frame.source === "user-resize" ? "Manual resize" : "Aspect ratio"}</dd>
      </div>
      <div>
        <dt>Supported ratios</dt>
        <dd>
          {docsMetadata.supportedRatios.length === 0
            ? "No documented ratios"
            : docsMetadata.supportedRatios.join(", ")}
        </dd>
      </div>
    </dl>
  </section>

  <section aria-label="Adapter mapping">
    <h2>Adapter mapping</h2>
    <dl>
      {schemaRows.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  </section>

  <section aria-label="Model limits">
    <h2>Model limits</h2>
    <ul className="image-generation-inspector-list">
      {compatibilityWarnings.length === 0 ? (
        <li>
          <span>Current setup</span>
          <strong>Ready for current settings</strong>
        </li>
      ) : (
        compatibilityWarnings.map((warning) => (
          <li key={warning} data-warning="compatibility">
            <span>Warning</span>
            <strong>{warning}</strong>
          </li>
        ))
      )}
    </ul>
  </section>
</details>
```

- [ ] **Step 4: Add developer details CSS**

Add near the image inspector CSS in `app/app.css`:

```css
.image-generation-developer-details {
  margin-top: 14px;
  border-top: 1px solid #dddddd;
  padding-top: 12px;
}

.image-generation-developer-details summary {
  cursor: pointer;
  color: #41454d;
  font-size: 12px;
  font-weight: 500;
}

.image-generation-developer-details section {
  margin-top: 12px;
}
```

- [ ] **Step 5: Run focused test**

Run:

```bash
node --experimental-strip-types --test --test-name-pattern "Image generation docs panel renders provider model documentation" app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts
```

Expected:

```text
# pass
```

---

### Task 5: Reduce Nested Containment and Console Language for `#12`

**Files:**
- Modify: `app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts`
- Modify: `app/app.css`

- [ ] **Step 1: Add the de-console containment regression**

Add this test near the other source-level UI tests:

```ts
test("creative canvas primary surfaces avoid console language and nested card treatment", () => {
  const paletteStart = creativeCanvasScreen.indexOf("function GenerationPalette");
  const paletteEnd = creativeCanvasScreen.indexOf("function CanvasStatus");
  const campaignStart = creativeCanvasScreen.indexOf("function CampaignMetadataPanel");
  const campaignEnd = creativeCanvasScreen.indexOf("function MetadataSection");
  const inspectorStart = creativeCanvasScreen.indexOf("function ImageGenerationInspectorPanel");
  const inspectorEnd = creativeCanvasScreen.indexOf("function PersistentShortFormPlayer");

  assert.notEqual(paletteStart, -1);
  assert.notEqual(paletteEnd, -1);
  assert.notEqual(campaignStart, -1);
  assert.notEqual(campaignEnd, -1);
  assert.notEqual(inspectorStart, -1);
  assert.notEqual(inspectorEnd, -1);

  const primarySurfaceSource = [
    creativeCanvasScreen.slice(paletteStart, paletteEnd),
    creativeCanvasScreen.slice(campaignStart, campaignEnd),
    creativeCanvasScreen
      .slice(inspectorStart, inspectorEnd)
      .replace(/<details className="image-generation-developer-details">[\s\S]*?<\/details>/, ""),
  ].join("\n");

  assert.doesNotMatch(
    primarySurfaceSource,
    /Provider settings|Schema adapter|Compatibility|Campaign JSON spec|Required metadata|Canonical spec|pipeline|log language/i,
  );
  assert.doesNotMatch(appCss, /\.metadata-section\s*\{[\s\S]*border-top:\s*1px/);
  assert.doesNotMatch(appCss, /\.image-generation-inspector-section dl div,\s*\.image-generation-docs-panel dl div\s*\{[\s\S]*border:\s*1px/);
  assert.match(appCss, /\.campaign-metadata-panel\s*\{[\s\S]*border-radius:\s*10px/);
  assert.match(appCss, /\.generation-palette\s*\{[\s\S]*border-radius:\s*10px/);
  assert.match(appCss, /\.image-generation-inspector-panel\s*\{[\s\S]*border-radius:\s*10px/);
  assert.match(appCss, /\.metadata-field input,\s*\.metadata-field textarea,\s*\.metadata-field select\s*\{[\s\S]*border-radius:\s*6px/);
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run:

```bash
node --experimental-strip-types --test --test-name-pattern "creative canvas primary surfaces avoid console language" app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts
```

Expected before CSS/copy cleanup:

```text
not ok ... creative canvas primary surfaces avoid console language and nested card treatment
AssertionError
```

- [ ] **Step 3: Flatten panel radii and inner rows**

In `app/app.css`, update the main overlay panels:

```css
.campaign-metadata-panel {
  position: fixed;
  right: 20px;
  top: 66px;
  z-index: 20;
  width: 340px;
  max-height: calc(100dvh - 90px);
  overflow: auto;
  border: 1px solid #dddddd;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.97);
  padding: 14px;
  box-shadow: 0 18px 44px rgba(24, 29, 38, 0.08);
  backdrop-filter: blur(12px);
}

.image-generation-inspector-panel {
  position: fixed;
  right: 376px;
  top: 66px;
  z-index: 22;
  width: min(620px, calc(100vw - 428px));
  max-height: calc(100dvh - 90px);
  overflow: auto;
  border: 1px solid #dddddd;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.98);
  padding: 14px;
  color: #181d26;
  box-shadow: 0 18px 44px rgba(24, 29, 38, 0.1);
  backdrop-filter: blur(12px);
}

.generation-palette {
  position: fixed;
  left: 128px;
  top: 66px;
  z-index: 20;
  width: 288px;
  border: 1px solid #dddddd;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.96);
  padding: 14px;
  box-shadow: 0 18px 44px rgba(24, 29, 38, 0.08);
  backdrop-filter: blur(12px);
}
```

Replace `.metadata-section` and row/card rules:

```css
.metadata-section {
  padding-top: 14px;
}

.image-generation-inspector-section dl div,
.image-generation-docs-panel dl div,
.image-generation-inspector-list li,
.image-generation-docs-required-inputs li,
.image-generation-docs-optional-controls li {
  border-bottom: 1px solid #dddddd;
  background: transparent;
  padding: 8px 0;
}

.metadata-field input,
.metadata-field textarea,
.metadata-field select {
  width: 100%;
  min-width: 0;
  border: 1px solid #dddddd;
  border-radius: 6px;
  background: #ffffff;
  color: #181d26;
  font: inherit;
  font-size: 12px;
  font-weight: 500;
  outline: none;
}
```

Remove `border`, `border-radius`, and `background` declarations from the old inner list/card blocks that conflict with these replacements.

- [ ] **Step 4: Run focused test**

Run:

```bash
node --experimental-strip-types --test --test-name-pattern "creative canvas primary surfaces avoid console language" app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts
```

Expected:

```text
# pass
```

---

### Task 6: Evidence, GitHub Sync, and Final Closure for `#7`, `#8`, `#9`-`#13`

**Files:**
- Modify: `wiki/log.md`
- Use Browser plugin after the dev server is running.

- [ ] **Step 1: Run focused component and model tests**

Run:

```bash
node --experimental-strip-types --test app/features/creative-canvas/model/image-generation-node.test.ts
node --experimental-strip-types --test app/features/creative-canvas/adapters/react-flow-canvas.test.ts
node --experimental-strip-types --test app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts
```

Expected:

```text
# pass
```

- [ ] **Step 2: Run project gates**

Run:

```bash
npm run typecheck
npm run build
git diff --check
```

Expected:

```text
typecheck exits 0
build exits 0
git diff --check exits 0
```

- [ ] **Step 3: Capture browser evidence**

Start the dev server:

```bash
npm run dev -- --host 127.0.0.1 --port 5173
```

Use the Browser plugin to open:

```text
http://127.0.0.1:5173
```

Capture screenshots that show:

- left Campaign blocks palette
- right Campaign brief panel
- compact 9:16 Image Block node with no generic border dots
- Image Block setup panel with developer details collapsed
- developer details expanded once to show env var names without secret values

Save evidence under:

```text
output/deconsole-creative-ui-evidence.png
output/image-generation-v2-final-evidence.png
```

Browser console expectation:

```text
No uncaught JavaScript errors.
```

- [ ] **Step 4: Add final wiki log entry**

Append this entry near the top of `wiki/log.md`:

```md
## [2026-05-16] owncanvas-remaining-issues-finalization | Issues #6-#13

- GitHub issues `#2`-`#5` were closed as completed based on existing wiki/test evidence.
- `#6` was completed by reconciling Seedream-like manual Image Block frame resize with provider `size` payload defaults while preserving explicit provider size controls.
- `#9`-`#12` de-console pass simplified palette copy, reframed the right panel as Campaign brief, moved Image Block provider diagnostics behind Developer details, and reduced nested card treatment.
- `#7` and `#13` evidence covered palette, Campaign brief, compact Image Block, inspector/docs, redundant copy, console feel, nested containment, console errors, secrets, focused tests, typecheck, build, and diff check.
- Evidence files: `output/deconsole-creative-ui-evidence.png`, `output/image-generation-v2-final-evidence.png`.
```

- [ ] **Step 5: Close child task issues**

Run:

```bash
gh issue close 7 --repo junho-baek/owncanvas --reason completed --comment "Closing as completed. Final browser evidence, console check, focused tests, typecheck, build, diff check, and wiki/log documentation are recorded in the 2026-05-16 finalization entry."
gh issue close 9 --repo junho-baek/owncanvas --reason completed --comment "Closing as completed. Palette labels now use concise creator-facing copy and visible technical badges are removed from the primary palette surface."
gh issue close 10 --repo junho-baek/owncanvas --reason completed --comment "Closing as completed. The right panel now reads as Campaign brief / Campaign basics, consolidates readiness, and prioritizes audience, offer, channels, assets, and goals."
gh issue close 11 --repo junho-baek/owncanvas --reason completed --comment "Closing as completed. Image Block setup is product-facing, with provider diagnostics and adapter details behind Developer details."
gh issue close 12 --repo junho-baek/owncanvas --reason completed --comment "Closing as completed. Primary surfaces avoid console/admin language and reduce nested card-in-card containment."
gh issue close 13 --repo junho-baek/owncanvas --reason completed --comment "Closing as completed. Browser evidence and validation are recorded in wiki/log.md and output evidence files."
```

Expected:

```text
✓ Closed issue junho-baek/owncanvas#7
✓ Closed issue junho-baek/owncanvas#9
✓ Closed issue junho-baek/owncanvas#10
✓ Closed issue junho-baek/owncanvas#11
✓ Closed issue junho-baek/owncanvas#12
✓ Closed issue junho-baek/owncanvas#13
```

- [ ] **Step 6: Close epics after all children are closed**

Run:

```bash
gh issue close 1 --repo junho-baek/owncanvas --reason completed --comment "Closing epic as completed. Child tasks #2-#7 are closed and final Image Generation Node v2 evidence is recorded in wiki/log.md."
gh issue close 8 --repo junho-baek/owncanvas --reason completed --comment "Closing epic as completed. Child tasks #9-#13 are closed and the de-console creative campaign canvas pass is verified."
```

Expected:

```text
✓ Closed issue junho-baek/owncanvas#1
✓ Closed issue junho-baek/owncanvas#8
```

- [ ] **Step 7: Commit in small scopes**

Use the project commit-scope policy and keep commits small:

```bash
git add app/features/creative-canvas/model/image-generation-node.ts app/features/creative-canvas/model/image-generation-node.test.ts wiki/log.md
git commit -m "fix: reconcile seedream provider size"

git add app/features/creative-canvas/model/creative-canvas.ts app/features/creative-canvas/components/creative-canvas-screen.tsx app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts app/app.css wiki/log.md
git commit -m "ui: deconsole creative canvas surfaces"
```

Expected:

```text
[main ...] fix: reconcile seedream provider size
[main ...] ui: deconsole creative canvas surfaces
```

## Self-Review

Spec coverage:

- `#6`: Task 1 covers GPT Image preservation and Seedream custom-size/frame reconciliation.
- `#7`: Task 6 covers final browser evidence, console check, tests, typecheck, build, diff check, and wiki documentation.
- `#9`: Task 2 covers palette copy and technical badge removal.
- `#10`: Task 3 covers Campaign brief framing, readiness consolidation, and Audience/Offer/Channels/Assets/Goals prioritization.
- `#11`: Task 4 covers progressive disclosure and moves provider diagnostics to Developer details.
- `#12`: Task 5 covers primary-surface console language and nested containment.
- `#13`: Task 6 covers screenshot evidence, DESIGN.md review note through wiki/log, secrets check, and validation gates.

Placeholder scan:

- No banned placeholder phrases or unspecified validation steps remain.
- Each code-changing step includes the concrete code or exact replacement block.

Type consistency:

- `controlValues` uses existing `ImageGenerationInputControlDefaultValue`.
- Seedream capability keys use existing `schemaAdapter.sizeField`, `capabilities.customSize`, `frame.source`, and `replicate.input`.
- UI tests use existing `creativeCanvasScreen`, `appCss`, and Node test `assert`.
