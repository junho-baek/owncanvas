import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createImageGenerationFrame,
  createImageGenerationNodeProperties,
  isImageGenerationNodeProperties,
  resizeImageGenerationNodeFrameTransition,
  type ImageGenerationNodeProperties,
} from "../model/image-generation-node.ts";
import { createImageGenerationFanOutPlan } from "./image-generation-fanout.ts";
import {
  createGenerationFlowNode,
  type CreativeFlowNode,
} from "./react-flow-canvas.ts";

type ImageGenerationBatchCount = ImageGenerationNodeProperties["batchCount"];

function imageNode(input: {
  id: string;
  x: number;
  y: number;
  batchCount: ImageGenerationBatchCount;
  width?: number;
}): CreativeFlowNode {
  const node = createGenerationFlowNode("image", 1, { x: input.x, y: input.y });

  return {
    id: input.id,
    type: node.type,
    position: node.position,
    ...(input.width === undefined ? {} : { width: input.width }),
    data: {
      ...node.data,
      id: input.id,
      properties: createImageGenerationNodeProperties({
        providerId: "replicate",
        modelSlug: "google/nano-banana",
        prompt: "same prompt",
        batchCount: input.batchCount,
        aspectRatio: "1:1",
        frame: createImageGenerationFrame("1:1"),
        latestResultRefs: {
          generatedAssetIds: ["asset_previous"],
          metadataRunId: "metadata_previous",
          costUsageRunId: "cost_previous",
        },
        uiState: {
          viewMode: "compact",
          inspectorOpen: true,
          docsPanelOpen: false,
          referenceTrayOpen: false,
          status: "succeeded",
          progressPercent: 100,
          statusMessage: "Done",
          errorReason: null,
          failureDetails: null,
          selectedResultAssetId: "asset_previous",
          outputConnectionReady: true,
        },
      }),
    },
  };
}

test("createImageGenerationFanOutPlan creates same-type queued image nodes and a matching batch", () => {
  const source = imageNode({ id: "image_source", x: 100, y: 200, batchCount: 3 });
  const plan = createImageGenerationFanOutPlan({
    campaignId: "campaign_fanout",
    sourceNode: source,
    existingNodes: [source],
    now: () => "2026-05-17T00:00:00.000Z",
  });

  assert.equal(plan.batchId, "image_source_batch_20260517000000000");
  assert.equal(plan.createdNodes.length, 3);
  assert.equal(plan.batch.fanOutCount, 3);
  assert.deepEqual(
    plan.createdNodes.map((node) => node.id),
    [
      "image_source_batch_20260517000000000_1",
      "image_source_batch_20260517000000000_2",
      "image_source_batch_20260517000000000_3",
    ],
  );
  assert.deepEqual(
    plan.batch.jobs.map((job) => job.nodeId),
    plan.createdNodes.map((node) => node.id),
  );
  assert.deepEqual(
    plan.batch.jobs.map((job) => job.jobId),
    [
      "image_source_batch_20260517000000000_job_1",
      "image_source_batch_20260517000000000_job_2",
      "image_source_batch_20260517000000000_job_3",
    ],
  );
  assert.equal(plan.batch.spec.sourceNodeId, "image_source");
  assert.equal(plan.batch.spec.prompt, "same prompt");
  assert.equal(plan.batch.spec.provider, "replicate");
  assert.equal(plan.batch.spec.model, "google/nano-banana");
  assert.equal(plan.batch.spec.aspectRatio, "1:1");
  assert.deepEqual(plan.batch.spec.parameters, {
    replicate: {
      providerId: "replicate",
      model: "google/nano-banana",
      credentialEnvName: "OWNCANVAS_REPLICATE_API_TOKEN",
      inputEnvelopeField: "input",
      input: {
        prompt: "same prompt",
        aspect_ratio: "1:1",
      },
      aspectRatio: {
        requested: "1:1",
        providerValue: "1:1",
        mapped: false,
      },
    },
  });
  assert.deepEqual(plan.batch.jobs[0]?.parameters, plan.batch.spec.parameters);

  for (const node of plan.createdNodes) {
    assert.equal(node.data.kind, "image");
    assert.ok(isImageGenerationNodeProperties(node.data.properties));
    if (!isImageGenerationNodeProperties(node.data.properties)) {
      continue;
    }
    assert.equal(node.data.properties.providerId, "replicate");
    assert.equal(node.data.properties.modelSlug, "google/nano-banana");
    assert.equal(node.data.properties.prompt, "same prompt");
    assert.equal(node.data.properties.aspectRatio, "1:1");
    assert.deepEqual(node.data.properties.latestResultRefs, {
      generatedAssetIds: [],
      metadataRunId: null,
      costUsageRunId: null,
    });
    assert.equal(node.data.properties.uiState.status, "queued");
    assert.equal(node.data.properties.uiState.progressPercent, null);
    assert.equal(node.data.properties.uiState.statusMessage, "Queued");
    assert.equal(node.data.properties.uiState.selectedResultAssetId, null);
    assert.equal(node.data.properties.uiState.outputConnectionReady, false);
  }
});

test("createImageGenerationFanOutPlan lays out ten nodes in rows", () => {
  const source = imageNode({
    id: "image_source",
    x: 0,
    y: 0,
    batchCount: 10,
    width: 640,
  });
  const plan = createImageGenerationFanOutPlan({
    campaignId: "campaign_fanout",
    sourceNode: source,
    existingNodes: [source],
    now: () => "2026-05-17T00:00:00.000Z",
  });

  assert.equal(plan.createdNodes.length, 10);
  assert.deepEqual(plan.createdNodes.slice(0, 4).map((node) => node.position), [
    { x: 340, y: 0 },
    { x: 720, y: 0 },
    { x: 1100, y: 0 },
    { x: 1480, y: 0 },
  ]);
  assert.deepEqual(plan.createdNodes.slice(4, 8).map((node) => node.position), [
    { x: 340, y: 700 },
    { x: 720, y: 700 },
    { x: 1100, y: 700 },
    { x: 1480, y: 700 },
  ]);
  assert.deepEqual(plan.createdNodes.slice(8, 10).map((node) => node.position), [
    { x: 340, y: 1400 },
    { x: 720, y: 1400 },
  ]);
});

test("createImageGenerationFanOutPlan avoids duplicate node and job IDs for same-millisecond runs", () => {
  const timestamp = "2026-05-17T00:00:00.000Z";
  const source = imageNode({ id: "image_source", x: 100, y: 200, batchCount: 3 });
  const firstPlan = createImageGenerationFanOutPlan({
    campaignId: "campaign_fanout",
    sourceNode: source,
    existingNodes: [source],
    now: () => timestamp,
  });
  const secondPlan = createImageGenerationFanOutPlan({
    campaignId: "campaign_fanout",
    sourceNode: source,
    existingNodes: [source, ...firstPlan.createdNodes],
    now: () => timestamp,
  });

  assert.equal(firstPlan.batchId, "image_source_batch_20260517000000000");
  assert.equal(secondPlan.batchId, "image_source_batch_20260517000000000_run_2");

  const allNodeIds = [
    source.id,
    ...firstPlan.createdNodes.map((node) => node.id),
    ...secondPlan.createdNodes.map((node) => node.id),
  ];
  const allJobIds = [
    ...firstPlan.batch.jobs.map((job) => job.jobId),
    ...secondPlan.batch.jobs.map((job) => job.jobId),
  ];

  assert.equal(new Set(allNodeIds).size, allNodeIds.length);
  assert.equal(new Set(allJobIds).size, allJobIds.length);
  assert.deepEqual(
    secondPlan.createdNodes.map((node) => node.id),
    [
      "image_source_batch_20260517000000000_run_2_1",
      "image_source_batch_20260517000000000_run_2_2",
      "image_source_batch_20260517000000000_run_2_3",
    ],
  );
  assert.deepEqual(
    secondPlan.batch.jobs.map((job) => job.jobId),
    [
      "image_source_batch_20260517000000000_run_2_job_1",
      "image_source_batch_20260517000000000_run_2_job_2",
      "image_source_batch_20260517000000000_run_2_job_3",
    ],
  );
});

test("createImageGenerationFanOutPlan avoids a direct batch-id collision", () => {
  const timestamp = "2026-05-17T00:00:00.000Z";
  const source = imageNode({ id: "image_source", x: 100, y: 200, batchCount: 1 });
  const collidingBatchNode = {
    ...source,
    id: "image_source_batch_20260517000000000",
    data: {
      ...source.data,
      id: "image_source_batch_20260517000000000",
    },
  };
  const plan = createImageGenerationFanOutPlan({
    campaignId: "campaign_fanout",
    sourceNode: source,
    existingNodes: [source, collidingBatchNode],
    now: () => timestamp,
  });

  assert.equal(plan.batchId, "image_source_batch_20260517000000000_run_2");
  assert.deepEqual(
    plan.createdNodes.map((node) => node.id),
    ["image_source_batch_20260517000000000_run_2_1"],
  );
});

test("createImageGenerationFanOutPlan maps Creative Canvas Image Block inputs into a Replicate payload", () => {
  const source = imageNode({ id: "image_source", x: 100, y: 200, batchCount: 2 });
  const sourceProperties = resizeImageGenerationNodeFrameTransition(
    createImageGenerationNodeProperties({
      ...source.data.properties,
      providerId: "replicate",
      modelSlug: "bytedance/seedream-3",
      prompt: "Tall product shot on a coral studio sweep",
      batchCount: 2,
      aspectRatio: "9:16",
      referenceImages: [],
    }),
    { width: 384, height: 640 },
  );
  const seedreamSource: CreativeFlowNode = {
    ...source,
    data: {
      ...source.data,
      properties: sourceProperties,
    },
  };

  const plan = createImageGenerationFanOutPlan({
    campaignId: "campaign_fanout",
    sourceNode: seedreamSource,
    existingNodes: [seedreamSource],
    now: () => "2026-05-17T00:00:00.000Z",
  });

  assert.equal(plan.batch.spec.model, "bytedance/seedream-3");
  assert.deepEqual(plan.batch.spec.parameters, {
    replicate: {
      providerId: "replicate",
      model: "bytedance/seedream-3",
      credentialEnvName: "OWNCANVAS_REPLICATE_API_TOKEN",
      inputEnvelopeField: "input",
      input: {
        prompt: "Tall product shot on a coral studio sweep",
        aspect_ratio: "9:16",
        size: "384x640",
      },
      aspectRatio: {
        requested: "9:16",
        providerValue: "9:16",
        mapped: false,
      },
    },
  });
  assert.deepEqual(
    plan.batch.jobs.map((job) => job.parameters),
    [plan.batch.spec.parameters, plan.batch.spec.parameters],
  );
});

test("createImageGenerationFanOutPlan rejects non Image Block source nodes", () => {
  const node = createGenerationFlowNode("text", 1, { x: 0, y: 0 });
  const source: CreativeFlowNode = {
    id: "text_source",
    type: node.type,
    position: node.position,
    data: {
      ...node.data,
      id: "text_source",
      properties: {},
    },
  };

  assert.throws(
    () =>
      createImageGenerationFanOutPlan({
        campaignId: "campaign_fanout",
        sourceNode: source,
        existingNodes: [source],
        now: () => "2026-05-17T00:00:00.000Z",
      }),
    /source node must be an Image Block/,
  );
});
