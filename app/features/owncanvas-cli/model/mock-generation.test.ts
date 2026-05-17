import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";

import { applyAuthoringCommands } from "./authoring-commands.ts";
import {
  executeMockGenerationRun,
  getMockGenerationRunLogs,
  getMockGenerationRunOutputs,
  getMockGenerationRunStatus,
  planMockGenerationRun,
  retryMockGenerationRun,
} from "./mock-generation.ts";
import {
  createCampaignInWorkspace,
  initializeWorkspace,
  inspectCampaignInWorkspace,
  updateCampaignInWorkspace,
} from "./workspace-repository.ts";
import { createFileBackedCampaignDocument } from "./campaign-document.ts";

test("planMockGenerationRun orders block target upstream dependencies first", () => {
  const document = createConnectedMockDocument();
  const plan = planMockGenerationRun(document, {
    kind: "block",
    blockId: "video_hero",
  });

  assert.deepEqual(plan.nodeIds, ["text_prompt", "image_hero", "video_hero"]);
});

test("planMockGenerationRun supports canvas, range, and selection targets", () => {
  const document = createConnectedMockDocument();

  assert.deepEqual(
    planMockGenerationRun(document, { kind: "canvas" }).nodeIds,
    ["text_prompt", "image_hero", "video_hero"],
  );
  assert.deepEqual(
    planMockGenerationRun(document, {
      kind: "range",
      fromBlockId: "image_hero",
      toBlockId: "video_hero",
    }).nodeIds,
    ["image_hero", "video_hero"],
  );
  assert.deepEqual(
    planMockGenerationRun(document, {
      kind: "selection",
      blockIds: ["image_hero", "video_hero"],
    }).nodeIds,
    ["image_hero", "video_hero"],
  );
});

test("executeMockGenerationRun writes run files, outputs, assets, and Campaign output refs", async () => {
  const root = await createGenerationWorkspace();

  const result = await executeMockGenerationRun({
    root,
    campaignId: "campaign_generation",
    target: { kind: "canvas" },
    runId: "run_canvas",
    now: () => "2026-05-18T01:00:00.000Z",
  });

  assert.equal(result.status.status, "succeeded");
  assert.deepEqual(result.status.nodeIds, ["text_prompt", "image_hero", "video_hero"]);
  assert.equal(
    JSON.parse(await readFile(result.paths.requestPath, "utf8")).runId,
    "run_canvas",
  );
  assert.equal(
    JSON.parse(await readFile(result.paths.responsePath, "utf8")).status,
    "succeeded",
  );
  assert.equal(
    JSON.parse(await readFile(result.paths.pricingPath, "utf8")).estimatedCostUsd,
    0,
  );
  assert.match(await readFile(result.paths.eventsPath, "utf8"), /run.started/);

  const inspected = await inspectCampaignInWorkspace({
    root,
    id: "campaign_generation",
  });
  const imageNode = inspected.document.canvasState.nodes.find(
    (node) => node.id === "image_hero",
  );
  const videoNode = inspected.document.canvasState.nodes.find(
    (node) => node.id === "video_hero",
  );

  assert.deepEqual(
    inspected.document.assets.map((asset) => asset.id),
    [
      "asset_run_canvas_text_prompt",
      "asset_run_canvas_image_hero",
      "asset_run_canvas_video_hero",
    ],
  );
  assert.deepEqual(imageNode?.properties?.latestResultRefs, {
    generatedAssetIds: ["asset_run_canvas_image_hero"],
    metadataRunId: "run_canvas",
    costUsageRunId: "run_canvas",
  });
  assert.deepEqual(videoNode?.properties?.latestResultRefs, {
    generatedAssetIds: ["asset_run_canvas_video_hero"],
    metadataRunId: "run_canvas",
    costUsageRunId: "run_canvas",
  });
});

test("executeMockGenerationRun records partial_failed and preserves successful outputs", async () => {
  const root = await createGenerationWorkspace();
  await updateCampaignInWorkspace({
    root,
    id: "campaign_generation",
    command: "test.mock-failure",
    update: (document) => ({
      ...document,
      canvasState: {
        ...document.canvasState,
        nodes: document.canvasState.nodes.map((node) =>
          node.id === "video_hero"
            ? {
                ...node,
                properties: {
                  ...(node.properties ?? {}),
                  mockFailure: true,
                },
              }
            : node,
        ),
      },
      campaignSpec: {
        ...document.campaignSpec,
        nodes: document.campaignSpec.nodes.map((node) =>
          node.id === "video_hero"
            ? {
                ...node,
                properties: {
                  ...(node.properties ?? {}),
                  mockFailure: true,
                },
              }
            : node,
        ),
      },
    }),
  });

  const result = await executeMockGenerationRun({
    root,
    campaignId: "campaign_generation",
    target: { kind: "canvas" },
    runId: "run_partial",
    now: () => "2026-05-18T01:10:00.000Z",
  });

  assert.equal(result.status.status, "partial_failed");
  assert.deepEqual(
    result.response.outputs.map((output) => output.blockId),
    ["text_prompt", "image_hero"],
  );
});

test("mock generation lifecycle helpers read status, logs, outputs, and retry", async () => {
  const root = await createGenerationWorkspace();
  await executeMockGenerationRun({
    root,
    campaignId: "campaign_generation",
    target: { kind: "block", blockId: "image_hero" },
    runId: "run_lifecycle",
    now: () => "2026-05-18T01:20:00.000Z",
  });

  const status = await getMockGenerationRunStatus({
    root,
    campaignId: "campaign_generation",
    runId: "run_lifecycle",
  });
  const logs = await getMockGenerationRunLogs({
    root,
    campaignId: "campaign_generation",
    runId: "run_lifecycle",
  });
  const outputs = await getMockGenerationRunOutputs({
    root,
    campaignId: "campaign_generation",
    runId: "run_lifecycle",
  });
  const retry = await retryMockGenerationRun({
    root,
    campaignId: "campaign_generation",
    runId: "run_lifecycle",
    now: () => "2026-05-18T01:30:00.000Z",
  });

  assert.equal(status.status, "succeeded");
  assert.equal(logs.some((event) => event.type === "run.completed"), true);
  assert.deepEqual(
    outputs.outputs.map((output) => output.blockId),
    ["text_prompt", "image_hero"],
  );
  assert.equal(retry.status.parentRunId, "run_lifecycle");
  assert.equal(retry.status.attempt, 2);
});

async function createGenerationWorkspace() {
  const root = await mkdtemp(path.join(tmpdir(), "owncanvas-generation-"));
  await initializeWorkspace({
    root,
    now: () => "2026-05-18T00:00:00.000Z",
  });
  await createCampaignInWorkspace({
    root,
    id: "campaign_generation",
    title: "Generation Campaign",
    now: () => "2026-05-18T00:05:00.000Z",
  });
  await updateCampaignInWorkspace({
    root,
    id: "campaign_generation",
    command: "test.author-canvas",
    update: (document) => createConnectedMockDocument(document),
    now: () => "2026-05-18T00:10:00.000Z",
  });

  return root;
}

function createConnectedMockDocument(
  document = createFileBackedCampaignDocument({
    id: "campaign_generation_unit",
    title: "Generation Unit",
    now: () => "2026-05-18T00:00:00.000Z",
  }),
) {
  return applyAuthoringCommands(document, [
    {
      type: "block.add",
      id: "text_prompt",
      kind: "text",
      title: "Prompt",
    },
    {
      type: "block.add",
      id: "image_hero",
      kind: "image",
      title: "Image",
    },
    {
      type: "block.set",
      id: "image_hero",
      prompt: "Create a launch image",
      count: 1,
    },
    {
      type: "block.add",
      id: "video_hero",
      kind: "video",
      title: "Video",
    },
    {
      type: "edge.connect",
      source: "text_prompt:prompt",
      target: "image_hero:prompt",
    },
    {
      type: "edge.connect",
      source: "image_hero:generated_image_asset",
      target: "video_hero:reference_image",
    },
  ]).document;
}
