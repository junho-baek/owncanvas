# Image Block Reference Fan-Out Catalog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Seed `seed_f02200db0442`: Image Block xN fan-out creates independent output nodes with duplicated visible reference edges, and Image Block model choice is catalog/model-first rather than Replicate-first.

**Architecture:** Keep Image Block domain rules in `app/features/creative-canvas/model/image-generation-node.ts`, keep fan-out graph mutation in `app/features/creative-canvas/adapters/image-generation-fanout.ts`, and keep React Flow UI wiring in `app/features/creative-canvas/components/creative-canvas-screen.tsx`. Replicate remains an internal service adapter used by provider request assembly; compact UI exposes catalog model entries and disables incompatible model choices when current references exceed model capability.

**Tech Stack:** React Router v7, TypeScript, React Flow `@xyflow/react`, `node:test`, existing Go generation service bridge.

---

## Engineering Review Notes

- DDD external skills are missing in this workspace; use `CONTEXT.md` terminology: Campaign, Creative Canvas, Image Block, Creative Output, Generation Block.
- Keep this first slice generation-first: prompt and references are primary. Do not add inpaint/edit/mask controls to the base Image Block UI.
- Do not rename every internal `providerId` in this slice. Add a catalog/service-adapter boundary while preserving existing storage/API compatibility.
- The fan-out adapter must block invalid model/reference combinations before allocating output nodes or edges.
- The UI may show the internal service adapter only in developer/inspector surfaces if needed; compact model choice must read as model entries such as Nano Banana, GPT Image, Seedream 3.

## File Structure

- Modify `app/features/creative-canvas/model/image-generation-node.ts`: add catalog option metadata, model picker option validation, model selection transition, and explicit fan-out readiness validation using existing `validateImageGenerationNodeModelOptions()`.
- Modify `app/features/creative-canvas/model/image-generation-node.test.ts`: add catalog/model picker and fan-out readiness tests.
- Modify `app/features/creative-canvas/adapters/image-generation-fanout.ts`: return `createdEdges`, accept `existingEdges`, duplicate incoming prompt/reference edges to every fan-out output node, and throw a typed compatibility error before creating nodes.
- Modify `app/features/creative-canvas/adapters/image-generation-fanout.test.ts`: add edge duplication and invalid reference-count fan-out tests.
- Modify `app/features/creative-canvas/components/creative-canvas-screen.tsx`: pass existing edges into fan-out, append `plan.createdEdges`, render a real model select, handle model changes, and surface fan-out compatibility errors inline on the source node without creating nodes.
- Modify `app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts`: static coverage for model select options, disabled incompatible options, edge append path, and inline compatibility failure path.
- Modify `wiki/log.md`: after implementation and verification, record the result in Korean.

---

### Task 1: Model Catalog Options and Fan-Out Readiness

**Files:**
- Modify: `app/features/creative-canvas/model/image-generation-node.ts`
- Modify: `app/features/creative-canvas/model/image-generation-node.test.ts`

- [ ] **Step 1: Add failing catalog tests**

Add tests near existing capability/registry tests in `image-generation-node.test.ts`:

```ts
test("image generation model catalog exposes model-first picker options", () => {
  const properties = createImageGenerationNodeProperties({
    providerId: "replicate",
    modelSlug: "google/nano-banana",
    referenceImages: [],
  });

  const options = resolveImageGenerationModelPickerOptions(properties);

  assert.deepEqual(
    options.map((option) => ({
      value: option.value,
      label: option.label,
      disabled: option.disabled,
      serviceAdapterId: option.serviceAdapterId,
      serviceModelRef: option.serviceModelRef,
    })),
    [
      {
        value: "replicate:google/nano-banana",
        label: "Nano Banana",
        disabled: false,
        serviceAdapterId: "replicate",
        serviceModelRef: "google/nano-banana",
      },
      {
        value: "replicate:openai/gpt-image-1",
        label: "GPT Image",
        disabled: false,
        serviceAdapterId: "replicate",
        serviceModelRef: "openai/gpt-image-1",
      },
      {
        value: "replicate:bytedance/seedream-3",
        label: "Seedream 3",
        disabled: false,
        serviceAdapterId: "replicate",
        serviceModelRef: "bytedance/seedream-3",
      },
    ],
  );
  assert.doesNotMatch(options.map((option) => option.label).join(" "), /Replicate/i);
});

test("image generation model picker disables entries incompatible with attached references", () => {
  const properties = createImageGenerationNodeProperties({
    referenceImages: [
      { type: "url", ref: "https://example.com/ref-1.png" },
      { type: "url", ref: "https://example.com/ref-2.png" },
    ],
  });

  const options = resolveImageGenerationModelPickerOptions(properties);
  const nano = options.find((option) => option.modelSlug === "google/nano-banana");
  const gpt = options.find((option) => option.modelSlug === "openai/gpt-image-1");
  const seedream = options.find((option) => option.modelSlug === "bytedance/seedream-3");

  assert.equal(nano?.disabled, false);
  assert.equal(gpt?.disabled, true);
  assert.equal(gpt?.disabledReason, "GPT Image accepts at most 1 reference image(s).");
  assert.equal(seedream?.disabled, true);
  assert.equal(seedream?.disabledReason, "Seedream 3 does not accept reference images.");
});

test("image generation fan-out readiness reports reference/model mismatch", () => {
  const properties = createImageGenerationNodeProperties({
    providerId: "replicate",
    modelSlug: "openai/gpt-image-1",
    referenceImages: [
      { type: "url", ref: "https://example.com/ref-1.png" },
      { type: "url", ref: "https://example.com/ref-2.png" },
    ],
  });

  const readiness = validateImageGenerationFanOutReadiness(properties);

  assert.equal(readiness.valid, false);
  assert.equal(readiness.error?.name, "ImageGenerationCompatibilityError");
  assert.equal(
    readiness.error?.message,
    "GPT Image accepts at most 1 reference image(s).",
  );
  assert.equal(readiness.error?.providerId, "replicate");
  assert.equal(readiness.error?.modelSlug, "openai/gpt-image-1");
});
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
node --experimental-strip-types --test app/features/creative-canvas/model/image-generation-node.test.ts
```

Expected: FAIL because `resolveImageGenerationModelPickerOptions()` and `validateImageGenerationFanOutReadiness()` do not exist.

- [ ] **Step 3: Implement catalog option helpers**

In `image-generation-node.ts`, add these public types/functions near the capability registry helpers:

```ts
export type ImageGenerationServiceAdapterId = "replicate";

export type ImageGenerationModelPickerOption = {
  value: ImageGenerationModelCapabilityKey;
  providerId: ImageGenerationProviderId;
  modelSlug: string;
  label: string;
  serviceAdapterId: ImageGenerationServiceAdapterId;
  serviceModelRef: string;
  disabled: boolean;
  disabledReason: string | null;
};

function getImageGenerationCapabilityServiceAdapter(
  capability: ImageGenerationModelCapability,
): { serviceAdapterId: ImageGenerationServiceAdapterId; serviceModelRef: string } {
  if (capability.replicate) {
    return {
      serviceAdapterId: "replicate",
      serviceModelRef: capability.replicate.modelRef,
    };
  }

  return {
    serviceAdapterId: "replicate",
    serviceModelRef: capability.model.slug,
  };
}

export function resolveImageGenerationModelPickerOptions(
  properties: Pick<ImageGenerationNodeProperties, "referenceImages">,
): ImageGenerationModelPickerOption[] {
  return listImageGenerationModelCapabilities().map((capability) => {
    const validation = validateImageGenerationNodeModelOptions(capability, {
      referenceImages: properties.referenceImages,
    });
    const error = validation.issues.find((issue) => issue.severity === "error");
    const service = getImageGenerationCapabilityServiceAdapter(capability);

    return {
      value: createImageGenerationModelCapabilityKey({
        providerId: capability.provider.providerId,
        modelSlug: capability.model.slug,
      }),
      providerId: capability.provider.providerId,
      modelSlug: capability.model.slug,
      label: capability.model.label,
      serviceAdapterId: service.serviceAdapterId,
      serviceModelRef: service.serviceModelRef,
      disabled: error !== undefined,
      disabledReason: error?.message ?? null,
    };
  });
}
```

- [ ] **Step 4: Implement model selection transition and fan-out readiness**

Add:

```ts
export function parseImageGenerationModelPickerValue(
  value: string,
): { providerId: ImageGenerationProviderId; modelSlug: string } | null {
  const [providerId, ...modelSlugParts] = value.split(":");
  const modelSlug = modelSlugParts.join(":");

  if (!providerId || !modelSlug) {
    return null;
  }

  const capability = getImageGenerationModelCapability({
    providerId: providerId as ImageGenerationProviderId,
    modelSlug,
  });

  return capability
    ? { providerId: capability.provider.providerId, modelSlug: capability.model.slug }
    : null;
}

export function selectImageGenerationNodeModelTransition(
  properties: ImageGenerationNodeProperties,
  selection: { providerId: ImageGenerationProviderId; modelSlug: string },
): ImageGenerationNodeProperties {
  const capability = getImageGenerationModelCapability(selection);

  if (!capability) {
    return properties;
  }

  return {
    ...properties,
    providerId: capability.provider.providerId,
    modelSlug: capability.model.slug,
  };
}

export function validateImageGenerationFanOutReadiness(
  properties: ImageGenerationNodeProperties,
): {
  valid: boolean;
  error: ImageGenerationNodeFailureDetails | null;
} {
  const capability = resolveImageGenerationNodeModelCapability(properties);
  const validation = validateImageGenerationNodeModelOptions(capability, {
    aspectRatio: properties.aspectRatio,
    referenceImages: properties.referenceImages,
  });
  const issue = validation.issues.find((candidate) => candidate.severity === "error");

  if (!issue) {
    return { valid: true, error: null };
  }

  return {
    valid: false,
    error: {
      name: "ImageGenerationCompatibilityError",
      category: "provider_rejected",
      message: issue.message,
      providerId: properties.providerId,
      modelSlug: properties.modelSlug,
      providerRequestId: null,
      retryable: false,
    },
  };
}
```

- [ ] **Step 5: Run focused tests**

Run:

```bash
node --experimental-strip-types --test app/features/creative-canvas/model/image-generation-node.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit Task 1**

```bash
git add app/features/creative-canvas/model/image-generation-node.ts app/features/creative-canvas/model/image-generation-node.test.ts
git commit -m "feat: add image model catalog picker metadata"
```

---

### Task 2: Fan-Out Reference Edge Duplication and Blocking

**Files:**
- Modify: `app/features/creative-canvas/adapters/image-generation-fanout.ts`
- Modify: `app/features/creative-canvas/adapters/image-generation-fanout.test.ts`

- [ ] **Step 1: Add failing edge duplication test**

Add a test in `image-generation-fanout.test.ts`:

```ts
test("createImageGenerationFanOutPlan duplicates incoming prompt and reference edges to every output node", () => {
  const source = imageNode({ id: "image_source", x: 100, y: 200, batchCount: 3 });
  const existingEdges = [
    {
      id: "edge_prompt_to_image",
      source: "prompt_source",
      sourceHandle: "outputs.prompt",
      target: "image_source",
      targetHandle: "inputs.prompt",
      type: "smoothstep",
      label: "prompt",
      data: { edgeType: "prompt" },
    },
    {
      id: "edge_ref_to_image",
      source: "reference_source",
      sourceHandle: "outputs.generated_image_asset",
      target: "image_source",
      targetHandle: "inputs.reference_image",
      type: "smoothstep",
      label: "reference image",
      data: { edgeType: "asset-generation" },
    },
  ];

  const plan = createImageGenerationFanOutPlan({
    campaignId: "campaign_fanout",
    sourceNode: source,
    existingNodes: [source],
    existingEdges,
    now: () => "2026-05-17T00:00:00.000Z",
  });

  assert.equal(plan.createdEdges.length, 6);

  for (const createdNode of plan.createdNodes) {
    const incoming = plan.createdEdges.filter((edge) => edge.target === createdNode.id);

    assert.deepEqual(
      incoming.map((edge) => ({
        source: edge.source,
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle,
        label: edge.label,
        data: edge.data,
      })),
      [
        {
          source: "prompt_source",
          sourceHandle: "outputs.prompt",
          targetHandle: "inputs.prompt",
          label: "prompt",
          data: { edgeType: "prompt" },
        },
        {
          source: "reference_source",
          sourceHandle: "outputs.generated_image_asset",
          targetHandle: "inputs.reference_image",
          label: "reference image",
          data: { edgeType: "asset-generation" },
        },
      ],
    );
  }
});
```

- [ ] **Step 2: Add failing invalid reference blocking test**

```ts
test("createImageGenerationFanOutPlan blocks incompatible references before creating nodes or edges", () => {
  const source = imageNode({ id: "image_source", x: 100, y: 200, batchCount: 3 });
  const incompatibleSource: CreativeFlowNode = {
    ...source,
    data: {
      ...source.data,
      properties: createImageGenerationNodeProperties({
        ...source.data.properties,
        providerId: "replicate",
        modelSlug: "openai/gpt-image-1",
        referenceImages: [
          { type: "url", ref: "https://example.com/ref-1.png" },
          { type: "url", ref: "https://example.com/ref-2.png" },
        ],
      }),
    },
  };

  assert.throws(
    () =>
      createImageGenerationFanOutPlan({
        campaignId: "campaign_fanout",
        sourceNode: incompatibleSource,
        existingNodes: [incompatibleSource],
        existingEdges: [],
        now: () => "2026-05-17T00:00:00.000Z",
      }),
    /GPT Image accepts at most 1 reference image/,
  );
});
```

- [ ] **Step 3: Run tests and verify failure**

Run:

```bash
node --experimental-strip-types --test app/features/creative-canvas/adapters/image-generation-fanout.test.ts
```

Expected: FAIL because `existingEdges` and `createdEdges` are not implemented.

- [ ] **Step 4: Implement fan-out edge duplication**

In `image-generation-fanout.ts`:

```ts
import type { CreativeFlowEdge, CreativeFlowNode } from "./react-flow-canvas.ts";

export type ImageGenerationFanOutPlan = {
  batchId: string;
  createdNodes: CreativeFlowNode[];
  createdEdges: CreativeFlowEdge[];
  batch: GenerationBatchRequest;
};
```

Update `createImageGenerationFanOutPlan()` input to include:

```ts
  existingEdges?: CreativeFlowEdge[];
```

Before `createImageGenerationNodeProviderRequest()`, call `validateImageGenerationFanOutReadiness(properties)` and throw `new Error(readiness.error.message)` if invalid.

After `createdNodes`, add:

```ts
const createdEdges = createFanOutInputEdges({
  sourceNodeId: input.sourceNode.id,
  batchId,
  createdNodes,
  existingEdges: input.existingEdges ?? [],
});
```

Add helper:

```ts
const fanOutInputTargetHandles = new Set(["inputs.prompt", "inputs.reference_image"]);

function createFanOutInputEdges(input: {
  sourceNodeId: string;
  batchId: string;
  createdNodes: CreativeFlowNode[];
  existingEdges: CreativeFlowEdge[];
}): CreativeFlowEdge[] {
  const sourceInputEdges = input.existingEdges.filter(
    (edge) =>
      edge.target === input.sourceNodeId &&
      typeof edge.targetHandle === "string" &&
      fanOutInputTargetHandles.has(edge.targetHandle),
  );

  return input.createdNodes.flatMap((node, nodeIndex) =>
    sourceInputEdges.map((edge, edgeIndex) => ({
      ...edge,
      id: `${input.batchId}_${nodeIndex + 1}_input_edge_${edgeIndex + 1}_${edge.id}`,
      target: node.id,
    })),
  );
}
```

- [ ] **Step 5: Preserve current call sites**

For tests/callers that do not pass edges, default `existingEdges` to `[]` so existing fan-out tests remain valid.

- [ ] **Step 6: Run focused tests**

Run:

```bash
node --experimental-strip-types --test app/features/creative-canvas/adapters/image-generation-fanout.test.ts app/features/creative-canvas/model/image-generation-node.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit Task 2**

```bash
git add app/features/creative-canvas/adapters/image-generation-fanout.ts app/features/creative-canvas/adapters/image-generation-fanout.test.ts
git commit -m "feat: duplicate reference edges during image fanout"
```

---

### Task 3: Creative Canvas UI Wiring

**Files:**
- Modify: `app/features/creative-canvas/components/creative-canvas-screen.tsx`
- Modify: `app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts`

- [ ] **Step 1: Add failing static UI tests**

In `creative-canvas-screen-authoring-controls.test.ts`, add tests near existing Image Block controls tests:

```ts
test("Image Block model selector renders model catalog options without Replicate as visible option text", () => {
  const nodeStart = creativeCanvasScreen.indexOf("function FreepikReferenceImageNode");
  const nodeEnd = creativeCanvasScreen.indexOf("function ReferenceTrayAttachmentItem");
  const nodeSource = creativeCanvasScreen.slice(nodeStart, nodeEnd);

  assert.match(nodeSource, /resolveImageGenerationModelPickerOptions\(details\)/);
  assert.match(nodeSource, /onModelChange\(parsedSelection\)/);
  assert.match(nodeSource, /<select[\s\S]*aria-label="Image model"/);
  assert.match(nodeSource, /data-service-adapter-id=\{option\.serviceAdapterId\}/);
  assert.match(nodeSource, /disabled=\{option\.disabled\}/);
  assert.doesNotMatch(nodeSource, />\{activeProvider\?\.label/);
});

test("Image Block fan-out appends duplicated input edges and blocks compatibility errors before node creation", () => {
  const runStart = creativeCanvasScreen.indexOf("const runImageGenerationNode = useCallback");
  const runEnd = creativeCanvasScreen.indexOf("const getConnectionEventPoint", runStart);
  const runSource = creativeCanvasScreen.slice(runStart, runEnd);

  assert.match(runSource, /existingEdges:\s*canvasSnapshotRef\.current\.edges/);
  assert.match(runSource, /\.\.\.plan\.createdEdges/);
  assert.match(runSource, /ImageGenerationCompatibilityError/);
  assert.match(runSource, /failImageGenerationNodeV2Transition/);
  assert.ok(
    runSource.indexOf("failImageGenerationNodeV2Transition") <
      runSource.indexOf("...plan.createdNodes"),
    "compatibility failure should be handled before appending fan-out nodes",
  );
});
```

- [ ] **Step 2: Run test and verify failure**

Run:

```bash
node --experimental-strip-types --test app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts
```

Expected: FAIL because the real model select, `existingEdges`, `createdEdges`, and compatibility UI branch are not wired.

- [ ] **Step 3: Wire model selection in screen component**

Import from `image-generation-node.ts`:

```ts
parseImageGenerationModelPickerValue,
resolveImageGenerationModelPickerOptions,
selectImageGenerationNodeModelTransition,
validateImageGenerationFanOutReadiness,
```

Add `handleImageModelChange` beside `handleImageAspectRatioChange`:

```ts
const handleImageModelChange = useCallback((
  nodeId: string,
  selection: { providerId: ImageGenerationProviderId; modelSlug: string },
) => {
  setNodes((currentNodes) => {
    const nextNodes = currentNodes.map((node) => {
      const properties = node.data.properties;

      if (node.id !== nodeId || !isImageGenerationNodeProperties(properties)) {
        return node;
      }

      return {
        ...node,
        data: {
          ...node.data,
          properties: selectImageGenerationNodeModelTransition(properties, selection),
        },
      };
    });

    queueMicrotask(() => {
      updateCampaignCanvas(nextNodes, canvasSnapshotRef.current.edges);
    });

    return nextNodes;
  });
}, [setNodes, updateCampaignCanvas]);
```

Thread `onImageModelChange` through `GenerationBlockNode` and `FreepikReferenceImageNode`.

- [ ] **Step 4: Replace model button with real select**

In `FreepikReferenceImageNode()`:

```ts
const modelPickerOptions = resolveImageGenerationModelPickerOptions(details);
const selectedModelPickerValue =
  modelCapability === undefined
    ? `${details.providerId}:${details.modelSlug}`
    : `${modelCapability.provider.providerId}:${modelCapability.model.slug}`;
const handleModelChange = (event: ChangeEvent<HTMLSelectElement>) => {
  const parsedSelection = parseImageGenerationModelPickerValue(event.currentTarget.value);

  if (parsedSelection === null) {
    return;
  }

  onModelChange(parsedSelection);
};
```

Replace the model button with:

```tsx
<label className="space-control-chip model" aria-label="Image model selector">
  <select
    className="space-control-select"
    value={selectedModelPickerValue}
    onChange={handleModelChange}
    aria-label="Image model"
  >
    {modelPickerOptions.map((option) => (
      <option
        key={option.value}
        value={option.value}
        disabled={option.disabled}
        data-service-adapter-id={option.serviceAdapterId}
        data-service-model-ref={option.serviceModelRef}
        title={option.disabledReason ?? undefined}
      >
        {option.label}
      </option>
    ))}
  </select>
  <em>⌄</em>
</label>
```

- [ ] **Step 5: Handle compatibility failure before fan-out appends nodes**

In `runImageGenerationNode()`, before calling `createImageGenerationFanOutPlan()` for non-failed source nodes:

```ts
const readiness = validateImageGenerationFanOutReadiness(sourceProperties);

if (!readiness.valid && readiness.error !== null) {
  const nextNodes = canvasSnapshotRef.current.nodes.map((node) =>
    node.id === sourceNode.id
      ? {
          ...node,
          data: {
            ...node.data,
            properties: failImageGenerationNodeV2Transition(sourceProperties, readiness.error),
          },
        }
      : node,
  );

  canvasSnapshotRef.current = {
    nodes: nextNodes,
    edges: canvasSnapshotRef.current.edges,
  };
  setNodes(nextNodes);
  updateCampaignCanvas(nextNodes, canvasSnapshotRef.current.edges);
  return;
}
```

Then call `createImageGenerationFanOutPlan({ existingEdges: canvasSnapshotRef.current.edges, ... })` and set:

```ts
const nextEdges = [...canvasSnapshotRef.current.edges, ...plan.createdEdges];
```

- [ ] **Step 6: Run focused UI static tests**

Run:

```bash
node --experimental-strip-types --test app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts
```

Expected: PASS.

- [ ] **Step 7: Run integrated TS test slice**

Run:

```bash
node --experimental-strip-types --test app/features/creative-canvas/model/image-generation-node.test.ts app/features/creative-canvas/adapters/image-generation-fanout.test.ts app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit Task 3**

```bash
git add app/features/creative-canvas/components/creative-canvas-screen.tsx app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts
git commit -m "feat: wire image model catalog validation in canvas"
```

---

### Task 4: Verification, Wiki, and GitHub Issues

**Files:**
- Modify: `wiki/log.md`

- [ ] **Step 1: Run project checks**

Run:

```bash
npm run skills:check
node --experimental-strip-types --test app/features/creative-canvas/model/image-generation-node.test.ts app/features/creative-canvas/adapters/image-generation-fanout.test.ts app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts app/features/creative-canvas/adapters/react-flow-canvas.test.ts app/features/creative-canvas/model/generation-batch.test.ts
npm run typecheck
git diff --check
```

Expected:
- `npm run skills:check` may report the known 8 missing DDD/marketing skills; record fallback use.
- Focused tests pass.
- `npm run typecheck` passes.
- `git diff --check` passes.

- [ ] **Step 2: Update `wiki/log.md`**

Append a Korean entry:

```md
## [2026-05-17] image-block-reference-fanout-catalog | seed execution

- Seed `seed_f02200db0442`의 첫 Superpowers execution slice를 구현했다. Image Block xN fan-out은 기존 source Image Block으로 들어오는 prompt/reference React Flow edge를 각 독립 output Image Block으로 복제한다.
- compact model selector는 Replicate 같은 실행 서비스를 user-facing model로 노출하지 않고 catalog model entry(Nano Banana, GPT Image, Seedream 3)를 표시한다. 현재 reference count와 맞지 않는 model은 disabled reason을 가진 option으로 표시한다.
- fan-out 실행 전 `validateImageGenerationFanOutReadiness()`가 model/reference compatibility를 검사해 incompatible reference count에서는 output node/edge를 만들지 않고 source Image Block에 inline compatibility error를 남긴다.
- 검증: `npm run skills:check`(DDD/marketing 외부 skill 8개 누락, 문서 fallback 사용), focused TS tests, `npm run typecheck`, `git diff --check`.
```

- [ ] **Step 3: Close or comment GitHub issues**

Use `gh`:

```bash
gh issue comment -R junho-baek/owncanvas 25 --body "Implemented in branch feature/go-generation-fanout-slice. Verification: focused TS tests, typecheck, git diff --check."
gh issue close -R junho-baek/owncanvas 26 --comment "Implemented: fan-out duplicates incoming prompt/reference edges to each independent Image Block output node."
gh issue close -R junho-baek/owncanvas 27 --comment "Implemented: compact Image Block model choice uses catalog model entries and internal service adapter metadata."
gh issue close -R junho-baek/owncanvas 28 --comment "Implemented: incompatible reference/model fan-out blocks before node/edge creation and surfaces inline error."
```

Only close #25 if all acceptance criteria are fully covered after final review.

- [ ] **Step 4: Commit wiki/GitHub status if changed**

```bash
git add wiki/log.md
git commit -m "docs: log image fanout catalog execution"
```

- [ ] **Step 5: Final verification and push**

```bash
git status --short --branch
git push
```

Expected: branch pushed cleanly to `origin/feature/go-generation-fanout-slice`.

