# Non-Image Generation Node Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every non-image generation node use the same visual grammar as the current Image Block without changing Image Block layout or behavior.

**Architecture:** Treat the existing Image Block as the visual contract and leave it intact. Add a non-image shell path in `GenerationBlockNode` that projects existing `CampaignCanvasBlock` data into fixed title, toolbar, primary surface, bottom prompt/control zone, and generic left/right port stacks. Keep the first pass UI-only for non-image nodes: no model schema migration and no fake executable provider behavior.

**Tech Stack:** React, React Flow handles, lucide-react icons, Node test runner, CSS in `app/app.css`, local wiki memory.

---

## Files

- Modify: `app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts`
  - Add source-level regression tests for the non-image shell contract.
  - Keep existing Image Block regression tests passing.
- Modify: `app/features/creative-canvas/components/creative-canvas-screen.tsx`
  - Replace the legacy generic node card path with non-image shell components and helpers.
  - Do not rename or refactor `FreepikReferenceImageNode` in this pass.
- Modify: `app/app.css`
  - Add styles for non-image primary surfaces and generic node port stacks.
  - Reuse existing `space-*` shell classes where practical without changing Image Block rules.
- Modify: `wiki/log.md`
  - Append the implementation and verification outcome in Korean.

---

## Task 1: Lock The Shell Contract With Tests

**Files:**
- Modify: `app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts`

- [ ] **Step 1: Add tests for the non-image shell**

Add these tests near the existing “Spaces-style image generation node” tests:

```ts
test("non-image generation nodes use the Image Block-aligned shell", () => {
  const generationNodeStart = creativeCanvasScreen.indexOf(
    "function GenerationBlockNode",
  );
  const imageNodeStart = creativeCanvasScreen.indexOf(
    "function FreepikReferenceImageNode",
  );
  assert.notEqual(generationNodeStart, -1);
  assert.notEqual(imageNodeStart, -1);

  const nonImageNodeSource = creativeCanvasScreen.slice(
    generationNodeStart,
    imageNodeStart,
  );

  assert.match(nonImageNodeSource, /function NonImageGenerationNodeShell/);
  assert.match(nonImageNodeSource, /resolveNonImageGenerationNodePorts/);
  assert.match(nonImageNodeSource, /const shellClassName = cn\([\s\S]*"space-image-node-shell"[\s\S]*"space-generation-node-shell"/);
  assert.match(nonImageNodeSource, /className=\{shellClassName\}/);
  assert.match(nonImageNodeSource, /className="space-node-toolbar nodrag"/);
  assert.match(nonImageNodeSource, /"space-side-port-stack"/);
  assert.match(nonImageNodeSource, /"space-side-port-stack output"/);
  assert.match(nonImageNodeSource, /className="space-node-prompt nodrag nowheel"/);
  assert.match(nonImageNodeSource, /value=\{promptValue\}/);
  assert.match(nonImageNodeSource, /onChange=\{\(event\) => onPromptChange\(event\.target\.value\)\}/);
  assert.match(nonImageNodeSource, /onNonImagePromptChange\(data\.id, prompt\)/);
  assert.match(creativeCanvasScreen, /const handleNonImagePromptChange = useCallback/);
  assert.match(creativeCanvasScreen, /properties:\s*\{\s*\.\.\.\(properties \?\? \{\}\),\s*prompt,/);
  assert.match(nonImageNodeSource, /className="space-node-controls nodrag"/);
  assert.doesNotMatch(nonImageNodeSource, /generation-node-header/);
  assert.doesNotMatch(nonImageNodeSource, /generation-description/);
  assert.doesNotMatch(nonImageNodeSource, /generation-contracts/);
  assert.doesNotMatch(nonImageNodeSource, /generation-node-footer/);
  assert.doesNotMatch(nonImageNodeSource, /Ready to create|Run block|GENERATION BLOCK/);
  assert.doesNotMatch(creativeCanvasScreen, /function ContractRow|function statusTone/);
  assert.doesNotMatch(
    appCss,
    /generation-node-header|generation-description|generation-contract-row|generation-node-footer|generation-status|node-kicker-inline|generation-node-icon|(^|\n)\.run-button/,
  );
});

test("non-image generation node ports cover every palette kind except image", () => {
  const expectedKinds = generationPalette
    .map((item) => item.kind)
    .filter((kind) => kind !== "image");

  assert.deepEqual(expectedKinds, [
    "text",
    "llm",
    "video",
    "voice",
    "agent",
    "dm",
    "landing",
    "custom",
  ]);

  const resolverStart = creativeCanvasScreen.indexOf(
    "function resolveNonImageGenerationNodePorts",
  );
  const resolverEnd = creativeCanvasScreen.indexOf(
    "function NonImageGenerationNodeShell",
  );
  assert.notEqual(resolverStart, -1);
  assert.notEqual(resolverEnd, -1);

  const resolverSource = creativeCanvasScreen.slice(resolverStart, resolverEnd);

  for (const kind of expectedKinds) {
    assert.match(
      resolverSource,
      new RegExp(`case "${kind}"`),
      `${kind} should have explicit port projection`,
    );
  }

  assert.match(resolverSource, /direction: "input"/);
  assert.match(resolverSource, /direction: "output"/);
  assert.match(resolverSource, /mediaType: "text"/);
  assert.match(resolverSource, /mediaType: "image"/);
  assert.match(resolverSource, /mediaType: "video"/);
  assert.match(resolverSource, /mediaType: "audio"/);
  assert.match(resolverSource, /mediaType: "web"/);
  assert.match(resolverSource, /mediaType: "action"/);
});
```

- [ ] **Step 2: Run the focused tests and verify they fail**

Run:

```bash
node --test app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts
```

Expected: FAIL because `NonImageGenerationNodeShell` and `resolveNonImageGenerationNodePorts` do not exist yet.

---

## Task 2: Implement The Non-Image Shell

**Files:**
- Modify: `app/features/creative-canvas/components/creative-canvas-screen.tsx`

- [ ] **Step 1: Add the non-image node shell types and default frame constants**

Add these near the existing image frame constants and local component types:

```tsx
const NON_IMAGE_GENERATION_NODE_FRAME = {
  width: 360,
  height: 420,
} as const;

type NonImageGenerationNodePortMediaType =
  | "text"
  | "image"
  | "video"
  | "audio"
  | "web"
  | "action";

type NonImageGenerationNodePort = {
  id: string;
  label: string;
  direction: "input" | "output";
  mediaType: NonImageGenerationNodePortMediaType;
  connectable: boolean;
};
```

- [ ] **Step 2: Add deterministic port projection for every non-image kind**

Add this helper before `GenerationBlockNode`:

```tsx
function resolveNonImageGenerationNodePorts(
  kind: GenerationBlockKind,
): NonImageGenerationNodePort[] {
  switch (kind) {
    case "text":
      return [
        { id: "brief", label: "Brief", direction: "input", mediaType: "text", connectable: false },
        { id: "copy", label: "Copy", direction: "output", mediaType: "text", connectable: false },
      ];
    case "llm":
      return [
        { id: "brief", label: "Brief", direction: "input", mediaType: "text", connectable: false },
        { id: "prompt", label: "Prompt", direction: "output", mediaType: "text", connectable: false },
      ];
    case "video":
      return [
        { id: "prompt", label: "Prompt", direction: "input", mediaType: "text", connectable: false },
        { id: "frame", label: "Frame", direction: "input", mediaType: "image", connectable: false },
        { id: "video", label: "Video", direction: "output", mediaType: "video", connectable: false },
      ];
    case "voice":
      return [
        { id: "script", label: "Script", direction: "input", mediaType: "text", connectable: false },
        { id: "voice", label: "Voice", direction: "output", mediaType: "audio", connectable: false },
      ];
    case "agent":
      return [
        { id: "campaign", label: "Campaign", direction: "input", mediaType: "action", connectable: false },
        { id: "action", label: "Action", direction: "output", mediaType: "action", connectable: false },
      ];
    case "dm":
      return [
        { id: "trigger", label: "Trigger", direction: "input", mediaType: "text", connectable: false },
        { id: "dm", label: "DM", direction: "output", mediaType: "text", connectable: false },
      ];
    case "landing":
      return [
        { id: "offer", label: "Offer", direction: "input", mediaType: "text", connectable: false },
        { id: "page", label: "Landing", direction: "output", mediaType: "web", connectable: false },
      ];
    case "custom":
      return [
        { id: "input", label: "Input", direction: "input", mediaType: "action", connectable: false },
        { id: "output", label: "Output", direction: "output", mediaType: "action", connectable: false },
      ];
    case "image":
      return [];
  }
}
```

- [ ] **Step 3: Add small icon helpers for the shell**

Add these helpers before `GenerationBlockNode`:

```tsx
function resolveNonImageGenerationPortIcon(
  mediaType: NonImageGenerationNodePortMediaType,
) {
  switch (mediaType) {
    case "text":
      return Type;
    case "image":
      return ImageIcon;
    case "video":
      return Video;
    case "audio":
      return Volume2;
    case "web":
      return Globe2;
    case "action":
      return Plug;
  }
}

function resolveNonImageGenerationPrimaryIcon(kind: GenerationBlockKind) {
  switch (kind) {
    case "video":
      return Video;
    case "voice":
      return Volume2;
    case "agent":
      return Bot;
    case "dm":
      return MessageSquare;
    case "landing":
      return Globe2;
    case "custom":
      return Plug;
    case "text":
    case "llm":
    case "image":
      return Type;
  }
}
```

- [ ] **Step 4: Replace the legacy non-image return path**

Inside `GenerationBlockNode`, replace the current non-image `<article>` return with:

```tsx
  return (
    <NonImageGenerationNodeShell
      data={data}
      Icon={Icon}
      selected={selected}
    />
  );
```

- [ ] **Step 5: Add `NonImageGenerationNodeShell` before `FreepikReferenceImageNode`**

Add this component:

```tsx
function NonImageGenerationNodeShell({
  data,
  Icon,
  selected,
}: {
  data: CreativeFlowNode["data"];
  Icon: ComponentType<{ className?: string }>;
  selected: boolean;
}) {
  const ports = resolveNonImageGenerationNodePorts(data.kind);
  const inputPorts = ports.filter((port) => port.direction === "input");
  const outputPorts = ports.filter((port) => port.direction === "output");
  const PrimaryIcon = resolveNonImageGenerationPrimaryIcon(data.kind);
  const promptPlaceholder =
    data.contracts.find((contract) => contract.label === "Brief")?.value ??
    data.title;
  const promptValue = resolveNonImageGenerationPromptValue(data);
  return (
    <article
      className={cn(
        "generation-node",
        data.tone,
        "image-generation-node",
        "non-image-generation-node",
        selected && "selected",
      )}
      style={{
        width: NON_IMAGE_GENERATION_NODE_FRAME.width,
        height: NON_IMAGE_GENERATION_NODE_FRAME.height,
      }}
    >
      <div
        className={cn("space-image-node-shell", "space-generation-node-shell", selected && "selected")}
        aria-label={`${data.title} node`}
      >
        <div className="space-image-node-label">
          <Icon className="size-3" />
          <span>{data.title}</span>
        </div>

        <div className="space-node-toolbar nodrag" aria-label="Node actions">
          <button type="button" aria-label={`Run ${data.title} node`}>
            <Play className="size-4" fill="currentColor" />
          </button>
          <button type="button" aria-label="Action menu">⌄</button>
          <button type="button" aria-label="Connect node">
            <Link2 className="size-4" />
          </button>
          <button type="button" aria-label="Connection menu">⌄</button>
          <button type="button" aria-label="Delete node">
            <Trash2 className="size-4" />
          </button>
          <button type="button" aria-label="More actions">•••</button>
        </div>

        <div className={cn("space-image-node-card", "space-generation-node-card", data.kind)}>
          <GenerationNodePortStack ports={inputPorts} tone={data.tone} />

          <div className="space-generation-node-primary" aria-hidden="true">
            <PrimaryIcon className="size-8" />
          </div>

          <textarea
            className="space-node-prompt nodrag nowheel"
            aria-label={`${data.title} brief`}
            placeholder={promptPlaceholder}
            value={promptValue}
            onChange={(event) => onPromptChange(event.target.value)}
            rows={2}
          />

          <div className="space-node-controls nodrag" aria-label={`${data.title} settings`}>
            <button className="space-control-chip model" type="button" aria-label={`${data.title} mode`}>
              <span>Draft</span>
              <em>⌄</em>
            </button>
            <button className="space-control-chip icon" type="button" aria-label={`${data.title} setup`}>
              <Settings2 className="size-3" />
            </button>
          </div>

          <button className="space-run-button nodrag" type="button" aria-label={`Run ${data.title}`}>
            <Play className="size-4" fill="currentColor" />
          </button>

          <GenerationNodePortStack ports={outputPorts} tone={data.tone} output />
        </div>
      </div>
    </article>
  );
}
```

- [ ] **Step 6: Add the generic port stack component**

Add this component next to `NonImageGenerationNodeShell`:

```tsx
function GenerationNodePortStack({
  ports,
  tone,
  output = false,
}: {
  ports: NonImageGenerationNodePort[];
  tone: GenerationBlockTone;
  output?: boolean;
}) {
  return (
    <div
      className={cn("space-side-port-stack", output && "output")}
      aria-label={output ? "Node output connections" : "Node input connections"}
    >
      {ports.map((port) => {
        const PortIcon = resolveNonImageGenerationPortIcon(port.mediaType);

        return (
          <div
            key={port.id}
            className={cn("space-side-port", `${port.mediaType}-port`)}
            aria-label={port.label}
            title={port.label}
          >
            <PortIcon className="size-3" />
            <Handle
              id={`${output ? "outputs" : "inputs"}.${port.id}`}
              type={output ? "source" : "target"}
              position={output ? Position.Right : Position.Left}
              className={cn("space-embedded-port-handle", `${tone}-handle`)}
              title={port.label}
              isConnectable={port.connectable}
            />
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 7: Run the focused tests**

Run:

```bash
node --test app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts
```

Expected: FAIL only on missing CSS selectors from Task 3, or PASS if CSS assertions are not yet added.

---

## Task 3: Style Non-Image Nodes To Match The Existing Shell

**Files:**
- Modify: `app/app.css`
- Modify: `app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts`

- [ ] **Step 1: Extend the test with CSS assertions**

Add these assertions to `non-image generation nodes use the Image Block-aligned shell`:

```ts
  assert.match(appCss, /\.generation-node\.non-image-generation-node\s*\{[\s\S]*border:\s*0/);
  assert.match(appCss, /\.space-generation-node-card\s*\{[\s\S]*min-height:\s*260px/);
  assert.match(appCss, /\.space-generation-node-primary\s*\{[\s\S]*place-items:\s*center/);
  assert.match(appCss, /\.space-side-port-stack\.output\s*\{[\s\S]*right:\s*-48px/);
```

- [ ] **Step 2: Run the focused tests and verify they fail on CSS**

Run:

```bash
node --test app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts
```

Expected: FAIL because the non-image CSS rules do not exist yet.

- [ ] **Step 3: Add CSS for the non-image shell**

Add this block near the current `space-*` node styles in `app/app.css`:

```css
.generation-node.non-image-generation-node {
  position: relative;
  overflow: visible;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.space-generation-node-card {
  min-height: 260px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(248, 250, 252, 0.92));
}

.space-generation-node-card.text,
.space-generation-node-card.llm,
.space-generation-node-card.custom {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.97), rgba(246, 245, 242, 0.92));
}

.space-generation-node-card.video,
.space-generation-node-card.landing {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.97), rgba(246, 242, 255, 0.88));
}

.space-generation-node-card.voice,
.space-generation-node-card.agent {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.97), rgba(236, 253, 245, 0.82));
}

.space-generation-node-primary {
  position: absolute;
  inset: 56px 42px 142px;
  display: grid;
  min-height: 120px;
  place-items: center;
  gap: 8px;
  color: #333840;
  text-align: center;
}

.space-generation-node-primary svg {
  color: #41454d;
}

.space-generation-node-primary strong,
.space-generation-node-primary span {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.space-generation-node-primary strong {
  color: #181d26;
  font-size: 18px;
  font-weight: 800;
  letter-spacing: 0;
}

.space-generation-node-primary span {
  color: #626970;
  font-size: 12px;
  font-weight: 650;
  letter-spacing: 0;
}

.space-side-port-stack.output {
  left: auto;
  right: -48px;
}

```

- [ ] **Step 4: Run the focused tests**

Run:

```bash
node --test app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts
```

Expected: PASS.

---

## Task 4: Verify, Document, Commit, And Push

**Files:**
- Modify: `wiki/log.md`

- [ ] **Step 1: Run the full relevant test suite**

Run:

```bash
node --test app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 2: Start the local app**

Run:

```bash
npm run dev
```

Expected: a local dev server URL, usually `http://localhost:5173`.

- [ ] **Step 3: Perform browser QA**

Open the local app and verify:

```text
1. Image Block still has the same full-card image/prompt/control composition.
2. Copy, Prompt, Video, Voice, Operator, DM, Landing, and Plugin nodes render with the same shell grammar.
3. Each non-image node has a top title, floating toolbar, left input stack, right output stack, primary content surface, bottom prompt zone, bottom controls, and run button.
4. The UI does not show legacy labels such as GENERATION BLOCK, Ready to create, or Run block.
5. The UI does not show the private visual reference name.
```

Save a screenshot:

```text
output/playwright/non-image-generation-node-shell-evidence.png
```

- [ ] **Step 4: Append wiki log**

Append this Korean entry to `wiki/log.md`:

```md
## 2026-05-16 - 비이미지 생성 노드 shell 통합

- Seed `seed_bbc7409474c7`를 GitHub 이슈 `#14`-`#18`로 발행한 뒤, Image Block은 기준 UI로 유지하고 비이미지 생성 노드만 같은 shell 문법으로 정리했다.
- Copy, Prompt, Video, Voice, Operator, DM, Landing, Plugin 노드는 top label, floating toolbar, left/right port stack, primary surface, bottom prompt zone, compact controls, run button을 공유한다.
- Image Block의 기존 이미지 프리뷰/프롬프트/컨트롤 구성은 변경하지 않았고, 회귀 테스트로 보호했다.
- 검증: `node --test app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts`, `npm run typecheck`, 브라우저 QA 스크린샷 `output/playwright/non-image-generation-node-shell-evidence.png`.
```

- [ ] **Step 5: Commit and push**

Run:

```bash
git status --short --branch
git add app/features/creative-canvas/components/creative-canvas-screen-authoring-controls.test.ts app/features/creative-canvas/components/creative-canvas-screen.tsx app/app.css wiki/log.md docs/superpowers/plans/2026-05-16-non-image-generation-node-shell.md output/playwright/non-image-generation-node-shell-evidence.png
git commit -m "ui: unify non-image generation nodes"
git push
```

Expected: commit succeeds and `main` pushes to `origin/main`.

---

## Self-Review

- Spec coverage: Covers Seed publication follow-up, Superpowers plan, non-image node shell unification, generic port stacks, DESIGN.md-driven removal of legacy labels/descriptions, Image Block no-change constraint, visual QA, wiki memory, commit, and push.
- Placeholder scan: No placeholder steps remain.
- Type consistency: `NonImageGenerationNodePort`, `resolveNonImageGenerationNodePorts`, `NonImageGenerationNodeShell`, and `GenerationNodePortStack` use the same type and property names throughout the plan.
