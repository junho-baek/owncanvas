import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createBlankCampaign,
  createCampaignBlock,
} from "../model/creative-canvas.ts";
import {
  createCreativeCanvasSnapshotFromCampaignSpecJsonEdit,
  toCreativeFlowEdges,
  toCreativeFlowNodes,
} from "./react-flow-canvas.ts";

test("campaign spec JSON sync rejects invalid JSON while preserving the previous campaign and canvas", () => {
  const textNode = createCampaignBlock("text", 0, { x: 120, y: 160 });
  const previousCampaign = {
    ...createBlankCampaign(),
    campaignSpec: {
      nodes: [textNode],
      edges: [],
      assetGenerationJobs: [],
    },
    canvasState: {
      nodes: [textNode],
      edges: [],
    },
  };
  const previousCanvas = {
    nodes: toCreativeFlowNodes(previousCampaign.canvasState.nodes),
    edges: toCreativeFlowEdges(previousCampaign.canvasState.edges),
  };

  const result = createCreativeCanvasSnapshotFromCampaignSpecJsonEdit(
    previousCampaign,
    `{"nodes":[{"id":"image_block_2","kind":"image","position":{"x":320,"y":120}}],`,
    { lastValidCanvasSnapshot: previousCanvas },
  );

  assert.equal(result.valid, false);
  assert.deepEqual(result.campaign, previousCampaign);
  assert.deepEqual(result.nodes, previousCanvas.nodes);
  assert.deepEqual(result.edges, previousCanvas.edges);
  assert.deepEqual(result.errors, [
    {
      code: "campaign_spec.json_invalid",
      path: "campaignSpec",
      message: "Campaign spec JSON is invalid.",
    },
  ]);
});

test("campaign spec JSON sync rejects validation errors before replacing the last valid canvas", () => {
  const textNode = createCampaignBlock("text", 0, { x: 120, y: 160 });
  const previousCampaign = {
    ...createBlankCampaign(),
    campaignSpec: {
      nodes: [textNode],
      edges: [],
      assetGenerationJobs: [],
    },
    canvasState: {
      nodes: [textNode],
      edges: [],
    },
  };
  const previousCanvas = {
    nodes: toCreativeFlowNodes(previousCampaign.canvasState.nodes),
    edges: toCreativeFlowEdges(previousCampaign.canvasState.edges),
  };

  const result = createCreativeCanvasSnapshotFromCampaignSpecJsonEdit(
    previousCampaign,
    JSON.stringify({
      nodes: [
        {
          id: "image_block_2",
          kind: "image",
          position: { x: 320, y: 120 },
        },
      ],
      edges: [
        {
          id: "edge_missing_source",
          source: "missing_text",
          target: "image_block_2",
        },
      ],
      assetGenerationJobs: {},
    }),
    { lastValidCanvasSnapshot: previousCanvas },
  );

  assert.equal(result.valid, false);
  assert.deepEqual(result.campaign, previousCampaign);
  assert.deepEqual(result.nodes, previousCanvas.nodes);
  assert.deepEqual(result.edges, previousCanvas.edges);
  assert.deepEqual(
    result.errors.map((error) => error.code),
    ["canvas.edge_source_missing", "asset_generation_job.list_required"],
  );
});

test("campaign spec JSON sync keeps the most recent valid canvas after later invalid edits", () => {
  const textNode = createCampaignBlock("text", 0, { x: 120, y: 160 });
  const imageNode = createCampaignBlock("image", 1, { x: 520, y: 160 });
  const landingNode = createCampaignBlock("landing", 2, { x: 920, y: 160 });
  const baseCampaign = {
    ...createBlankCampaign(),
    campaignSpec: {
      nodes: [textNode],
      edges: [],
      assetGenerationJobs: [],
    },
    canvasState: {
      nodes: [textNode],
      edges: [],
    },
  };
  const validResult = createCreativeCanvasSnapshotFromCampaignSpecJsonEdit(
    baseCampaign,
    JSON.stringify({
      nodes: [textNode, imageNode],
      edges: [
        {
          id: "edge_prompt_to_image",
          source: textNode.id,
          sourcePort: "prompt.out",
          target: imageNode.id,
          targetPort: "prompt.in",
          label: "prompt",
        },
      ],
      assetGenerationJobs: [],
    }),
  );

  assert.equal(validResult.valid, true);

  const invalidResult = createCreativeCanvasSnapshotFromCampaignSpecJsonEdit(
    validResult.campaign,
    JSON.stringify({
      nodes: [landingNode],
      edges: [
        {
          id: "edge_missing_target",
          source: landingNode.id,
          target: "missing_checkout",
        },
      ],
      assetGenerationJobs: [],
    }),
    {
      lastValidCanvasSnapshot: {
        nodes: validResult.nodes,
        edges: validResult.edges,
      },
    },
  );

  assert.equal(invalidResult.valid, false);
  assert.deepEqual(invalidResult.campaign, validResult.campaign);
  assert.deepEqual(
    invalidResult.nodes.map((node) => node.id),
    [textNode.id, imageNode.id],
  );
  assert.deepEqual(
    invalidResult.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      sourceHandle: edge.sourceHandle,
      target: edge.target,
      targetHandle: edge.targetHandle,
    })),
    [
      {
        id: "edge_prompt_to_image",
        source: textNode.id,
        sourceHandle: "prompt.out",
        target: imageNode.id,
        targetHandle: "prompt.in",
      },
    ],
  );
  assert.deepEqual(
    invalidResult.errors.map((error) => error.code),
    ["canvas.edge_target_missing"],
  );
});
