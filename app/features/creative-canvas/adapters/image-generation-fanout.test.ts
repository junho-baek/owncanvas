import assert from "node:assert/strict";
import { test } from "node:test";

import { MarkerType } from "@xyflow/react";

import {
  createImageGenerationFrame,
  createImageGenerationNodeProperties,
  isImageGenerationNodeProperties,
  resizeImageGenerationNodeFrameTransition,
  type ImageGenerationNodeProperties,
} from "../model/image-generation-node.ts";
import {
  createImageGenerationFanOutPlan,
  createImageGenerationSingleNodeRetryPlan,
} from "./image-generation-fanout.ts";
import {
  createGenerationFlowNode,
  type CreativeFlowEdge,
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
  assert.equal(plan.createdEdges.length, 0);
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
    plan.targetNodeIds,
    plan.createdNodes.map((node) => node.id),
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
    assert.equal(node.data.properties.batchCount, 1);
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

test("createImageGenerationFanOutPlan targets the source Image Block in place for x1", () => {
  const source = imageNode({ id: "image_source", x: 100, y: 200, batchCount: 1 });
  const plan = createImageGenerationFanOutPlan({
    campaignId: "campaign_fanout",
    sourceNode: source,
    existingNodes: [source],
    now: () => "2026-05-17T00:00:00.000Z",
  });

  assert.equal(plan.batchId, "image_source_batch_20260517000000000");
  assert.equal(plan.createdNodes.length, 0);
  assert.equal(plan.createdEdges.length, 0);
  assert.deepEqual(plan.targetNodeIds, ["image_source"]);
  assert.equal(plan.batch.fanOutCount, 1);
  assert.deepEqual(
    plan.batch.jobs.map((job) => job.nodeId),
    ["image_source"],
  );
  assert.equal(plan.batch.spec.sourceNodeId, "image_source");
});

test("createImageGenerationFanOutPlan duplicates prompt and reference edges to every output node", () => {
  const source = imageNode({ id: "image_source", x: 100, y: 200, batchCount: 3 });
  const existingEdges: CreativeFlowEdge[] = [
    {
      id: "edge_prompt_to_image",
      source: "prompt_source",
      sourceHandle: "outputs.prompt",
      target: "image_source",
      targetHandle: "inputs.prompt",
      type: "smoothstep",
      label: "prompt",
      data: { edgeType: "prompt" },
      markerStart: {
        type: MarkerType.Arrow,
        width: 12,
        height: 12,
        color: "#0f172a",
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 18,
        height: 18,
        color: "#2563eb",
      },
      style: {
        stroke: "#2563eb",
        strokeWidth: 2,
      },
      labelStyle: {
        fill: "#1e3a8a",
        fontSize: 11,
        fontWeight: 700,
      },
      labelBgPadding: [8, 4],
      labelBgBorderRadius: 999,
      labelBgStyle: {
        fill: "#eff6ff",
        fillOpacity: 0.96,
      },
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
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 18,
        height: 18,
        color: "#0f766e",
      },
      style: {
        stroke: "#0f766e",
        strokeWidth: 2,
        strokeDasharray: "4 3",
      },
      labelStyle: {
        fill: "#115e59",
        fontSize: 10,
        fontWeight: 700,
      },
      labelBgPadding: [10, 5],
      labelBgBorderRadius: 6,
      labelBgStyle: {
        fill: "#f0fdfa",
        fillOpacity: 0.94,
      },
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

  for (const [nodeIndex, node] of plan.createdNodes.entries()) {
    const incomingEdges = plan.createdEdges.filter(
      (edge) => edge.target === node.id,
    );

    assert.equal(incomingEdges.length, 2);
    assert.deepEqual(
      incomingEdges.map((edge) => edge.id),
      [
        `image_source_batch_20260517000000000_${nodeIndex + 1}_edge_1_edge_prompt_to_image`,
        `image_source_batch_20260517000000000_${nodeIndex + 1}_edge_2_edge_ref_to_image`,
      ],
    );
    assert.deepEqual(
      incomingEdges.map((edge) => ({
        source: edge.source,
        sourceHandle: edge.sourceHandle,
        target: edge.target,
        targetHandle: edge.targetHandle,
        type: edge.type,
        label: edge.label,
        data: edge.data,
        markerStart: edge.markerStart,
        markerEnd: edge.markerEnd,
        style: edge.style,
        labelStyle: edge.labelStyle,
        labelBgPadding: edge.labelBgPadding,
        labelBgBorderRadius: edge.labelBgBorderRadius,
        labelBgStyle: edge.labelBgStyle,
      })),
      [
        {
          source: "prompt_source",
          sourceHandle: "outputs.prompt",
          target: node.id,
          targetHandle: "inputs.prompt",
          type: "smoothstep",
          label: "prompt",
          data: { edgeType: "prompt" },
          markerStart: {
            type: MarkerType.Arrow,
            width: 12,
            height: 12,
            color: "#0f172a",
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 18,
            height: 18,
            color: "#2563eb",
          },
          style: {
            stroke: "#2563eb",
            strokeWidth: 2,
          },
          labelStyle: {
            fill: "#1e3a8a",
            fontSize: 11,
            fontWeight: 700,
          },
          labelBgPadding: [8, 4],
          labelBgBorderRadius: 999,
          labelBgStyle: {
            fill: "#eff6ff",
            fillOpacity: 0.96,
          },
        },
        {
          source: "reference_source",
          sourceHandle: "outputs.generated_image_asset",
          target: node.id,
          targetHandle: "inputs.reference_image",
          type: "smoothstep",
          label: "reference image",
          data: { edgeType: "asset-generation" },
          markerStart: undefined,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 18,
            height: 18,
            color: "#0f766e",
          },
          style: {
            stroke: "#0f766e",
            strokeWidth: 2,
            strokeDasharray: "4 3",
          },
          labelStyle: {
            fill: "#115e59",
            fontSize: 10,
            fontWeight: 700,
          },
          labelBgPadding: [10, 5],
          labelBgBorderRadius: 6,
          labelBgStyle: {
            fill: "#f0fdfa",
            fillOpacity: 0.94,
          },
        },
      ],
    );
  }
});

test("createImageGenerationFanOutPlan blocks incompatible references before creating nodes or edges", () => {
  const source = imageNode({ id: "image_source", x: 100, y: 200, batchCount: 3 });
  const gptImageSource: CreativeFlowNode = {
    ...source,
    data: {
      ...source.data,
      properties: createImageGenerationNodeProperties({
        ...source.data.properties,
        providerId: "replicate",
        modelSlug: "openai/gpt-image-1",
        referenceImages: [
          { type: "url", ref: "https://cdn.example.test/reference-one.png" },
          { type: "url", ref: "https://cdn.example.test/reference-two.png" },
        ],
      }),
    },
  };

  assert.throws(
    () =>
      createImageGenerationFanOutPlan({
        campaignId: "campaign_fanout",
        sourceNode: gptImageSource,
        existingNodes: [gptImageSource],
        existingEdges: [],
        now: () => "2026-05-17T00:00:00.000Z",
      }),
    /GPT Image accepts at most 1 reference image/,
  );
});

test("createImageGenerationSingleNodeRetryPlan retries a failed duplicated Image Block in place", () => {
  const source = imageNode({ id: "image_source", x: 100, y: 200, batchCount: 3 });
  const firstFanOut = createImageGenerationFanOutPlan({
    campaignId: "campaign_fanout",
    sourceNode: source,
    existingNodes: [source],
    now: () => "2026-05-17T00:00:00.000Z",
  });
  const duplicatedNode = firstFanOut.createdNodes[1];

  assert.ok(duplicatedNode);
  assert.ok(isImageGenerationNodeProperties(duplicatedNode.data.properties));

  if (
    duplicatedNode === undefined ||
    !isImageGenerationNodeProperties(duplicatedNode.data.properties)
  ) {
    throw new Error("expected duplicated Image Block properties");
  }

  const failedNode: CreativeFlowNode = {
    ...duplicatedNode,
    data: {
      ...duplicatedNode.data,
      properties: createImageGenerationNodeProperties({
        ...duplicatedNode.data.properties,
        batchCount: 10,
        uiState: {
          ...duplicatedNode.data.properties.uiState,
          status: "failed",
          progressPercent: null,
          statusMessage: "Generation failed",
          errorReason: "provider timeout",
          failureDetails: {
            name: "GenerationProviderUnavailable",
            message: "provider timeout",
            providerId: "replicate",
            modelSlug: "google/nano-banana",
            providerRequestId: null,
            retryable: true,
          },
          selectedResultAssetId: null,
          outputConnectionReady: false,
        },
      }),
    },
  };
  const retryPlan = createImageGenerationSingleNodeRetryPlan({
    campaignId: "campaign_fanout",
    sourceNode: failedNode,
    existingNodes: [source, ...firstFanOut.createdNodes],
    now: () => "2026-05-17T00:00:01.000Z",
  });
  const secondFanOut = createImageGenerationFanOutPlan({
    campaignId: "campaign_fanout",
    sourceNode: source,
    existingNodes: [source, ...firstFanOut.createdNodes],
    now: () => "2026-05-17T00:00:00.000Z",
  });

  assert.equal(
    retryPlan.batchId,
    "image_source_batch_20260517000000000_2_retry_20260517000001000",
  );
  assert.deepEqual(retryPlan.createdNodes, []);
  assert.equal(retryPlan.batch.fanOutCount, 1);
  assert.deepEqual(
    retryPlan.batch.jobs.map((job) => job.nodeId),
    ["image_source_batch_20260517000000000_2"],
  );
  assert.deepEqual(
    retryPlan.batch.jobs.map((job) => job.jobId),
    ["image_source_batch_20260517000000000_2_retry_20260517000001000_job_1"],
  );
  assert.equal(
    retryPlan.batch.spec.sourceNodeId,
    "image_source_batch_20260517000000000_2",
  );
  assert.equal(retryPlan.batch.spec.prompt, "same prompt");
  assert.equal(retryPlan.batch.spec.provider, "replicate");
  assert.equal(retryPlan.batch.spec.model, "google/nano-banana");
  assert.equal(retryPlan.batch.spec.aspectRatio, "1:1");
  assert.equal(secondFanOut.batchId, "image_source_batch_20260517000000000_run_2");
  assert.deepEqual(
    secondFanOut.createdNodes.map((node) => node.id),
    [
      "image_source_batch_20260517000000000_run_2_1",
      "image_source_batch_20260517000000000_run_2_2",
      "image_source_batch_20260517000000000_run_2_3",
    ],
  );
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
  assert.equal(plan.createdNodes.length, 0);
  assert.deepEqual(plan.targetNodeIds, ["image_source"]);
  assert.deepEqual(
    plan.batch.jobs.map((job) => job.nodeId),
    ["image_source"],
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
