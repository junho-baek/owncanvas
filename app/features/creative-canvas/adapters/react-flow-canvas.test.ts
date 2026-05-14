import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createBlankCampaign,
  createCampaignAssetGenerationJob,
  createCampaignBlock,
} from "../model/creative-canvas.ts";
import { isImageGenerationNodeProperties } from "../model/image-generation-node.ts";
import {
  createCreativeCanvasSnapshotFromCampaignSpecJsonEdit,
  createGenerationFlowNode,
  syncCampaignFromCreativeCanvasInteraction,
  toCreativeFlowEdges,
  toCreativeFlowNodes,
} from "./react-flow-canvas.ts";

test("new Image Block creation initializes vertical image generation model state", () => {
  const imageFlowNode = createGenerationFlowNode("image", 1);

  assert.equal(isImageGenerationNodeProperties(imageFlowNode.data.properties), true);

  if (!isImageGenerationNodeProperties(imageFlowNode.data.properties)) {
    throw new Error("expected image generation properties");
  }

  assert.equal(imageFlowNode.data.properties.aspectRatio, "9:16");
  assert.equal(imageFlowNode.width, 360);
  assert.equal(imageFlowNode.height, 640);
});

test("React Flow canvas creation and update operations synchronize into the JSON spec", () => {
  const textFlowNode = createGenerationFlowNode("text", 0);
  const imageFlowNode = createGenerationFlowNode("image", 1);
  const campaignWithCreatedNodes = syncCampaignFromCreativeCanvasInteraction(
    createBlankCampaign(),
    [
      {
        ...textFlowNode,
        position: { x: 128, y: 176 },
      },
      {
        ...imageFlowNode,
        position: { x: 528, y: 176 },
      },
    ],
    [],
  );

  assert.deepEqual(campaignWithCreatedNodes.canvasState, {
    nodes: [
      {
        ...textFlowNode.data,
        position: { x: 128, y: 176 },
      },
      {
        ...imageFlowNode.data,
        position: { x: 528, y: 176 },
      },
    ],
    edges: [],
  });
  assert.deepEqual(campaignWithCreatedNodes.campaignSpec, {
    nodes: campaignWithCreatedNodes.canvasState.nodes,
    edges: [],
    assetGenerationJobs: [],
  });

  const updatedTextFlowNode = {
    ...textFlowNode,
    position: { x: 196, y: 248 },
    data: {
      ...textFlowNode.data,
      title: "Creator brief",
      properties: {
        promptTemplate: "Generate a conversion-focused comment reply.",
      },
    },
  };
  const promptEdge = {
    id: "edge_creator_brief_to_image",
    source: textFlowNode.id,
    sourceHandle: "outputs.prompt",
    target: imageFlowNode.id,
    targetHandle: "inputs.prompt",
    label: "prompt",
    data: {
      edgeType: "asset-generation",
      properties: {
        required: true,
      },
    },
  };
  const campaignWithUpdatedNode = syncCampaignFromCreativeCanvasInteraction(
    campaignWithCreatedNodes,
    [
      updatedTextFlowNode,
      {
        ...imageFlowNode,
        position: { x: 528, y: 176 },
      },
    ],
    [promptEdge],
  );

  const expectedUpdatedCanvas = {
    nodes: [
      {
        ...textFlowNode.data,
        title: "Creator brief",
        position: { x: 196, y: 248 },
        properties: {
          promptTemplate: "Generate a conversion-focused comment reply.",
        },
      },
      {
        ...imageFlowNode.data,
        position: { x: 528, y: 176 },
      },
    ],
    edges: [
      {
        id: "edge_creator_brief_to_image",
        source: textFlowNode.id,
        sourcePort: "outputs.prompt",
        target: imageFlowNode.id,
        targetPort: "inputs.prompt",
        type: "asset-generation",
        label: "prompt",
        properties: {
          required: true,
        },
      },
    ],
  };

  assert.deepEqual(campaignWithUpdatedNode.canvasState, expectedUpdatedCanvas);
  assert.deepEqual(campaignWithUpdatedNode.campaignSpec, {
    ...expectedUpdatedCanvas,
    assetGenerationJobs: [],
  });
});

test("React Flow canvas interactions synchronize moved nodes and connected ports into the JSON spec", () => {
  const textNode = createCampaignBlock("text", 0, { x: 120, y: 160 });
  const imageNode = createCampaignBlock("image", 1, { x: 520, y: 160 });
  const campaign = {
    ...createBlankCampaign(),
    campaignSpec: {
      nodes: [textNode, imageNode],
      edges: [],
      assetGenerationJobs: [],
    },
    canvasState: {
      nodes: [textNode, imageNode],
      edges: [],
    },
  };
  const movedNodes = toCreativeFlowNodes([
    textNode,
    {
      ...imageNode,
      position: { x: 680, y: 260 },
    },
  ]);
  const connectedEdges = toCreativeFlowEdges([
    {
      id: "edge_prompt_to_image",
      source: textNode.id,
      sourcePort: "outputs.prompt",
      target: imageNode.id,
      targetPort: "inputs.prompt",
      type: "asset-generation",
      label: "prompt",
      properties: {
        required: true,
      },
    },
  ]);

  const result = syncCampaignFromCreativeCanvasInteraction(
    campaign,
    movedNodes,
    connectedEdges,
  );

  const expectedCanvas = {
    nodes: [
      textNode,
      {
        ...imageNode,
        position: { x: 680, y: 260 },
      },
    ],
    edges: [
      {
        id: "edge_prompt_to_image",
        source: textNode.id,
        sourcePort: "outputs.prompt",
        target: imageNode.id,
        targetPort: "inputs.prompt",
        type: "asset-generation",
        label: "prompt",
        properties: {
          required: true,
        },
      },
    ],
  };

  assert.deepEqual(result.canvasState, expectedCanvas);
  assert.deepEqual(result.campaignSpec, {
    ...expectedCanvas,
    assetGenerationJobs: [],
  });
});

test("parsed campaign spec JSON immediately projects node and edge changes to rendered canvas state", () => {
  const textNode = createCampaignBlock("text", 0, { x: 120, y: 160 });
  const imageNode = createCampaignBlock("image", 1, { x: 520, y: 160 });
  const campaignSpecJson = JSON.stringify({
    nodes: [
      {
        ...textNode,
        title: "Prompt source",
        position: { x: 180, y: 220 },
      },
      imageNode,
    ],
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
  });

  const result = createCreativeCanvasSnapshotFromCampaignSpecJsonEdit(
    createBlankCampaign(),
    campaignSpecJson,
  );

  assert.equal(result.valid, true);
  assert.equal(result.nodes.length, 2);
  assert.equal(result.nodes[0]?.id, textNode.id);
  assert.deepEqual(result.nodes[0]?.position, { x: 180, y: 220 });
  assert.equal(result.nodes[0]?.data.title, "Prompt source");
  assert.equal(result.edges.length, 1);
  assert.equal(result.edges[0]?.source, textNode.id);
  assert.equal(result.edges[0]?.sourceHandle, "prompt.out");
  assert.equal(result.edges[0]?.target, imageNode.id);
  assert.equal(result.edges[0]?.targetHandle, "prompt.in");
  assert.deepEqual(result.campaign.canvasState, {
    nodes: result.nodes.map((node) => ({
      ...node.data,
      id: node.id,
      position: node.position,
    })),
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
  });
});

test("campaign spec JSON changes commit to canvas state and rendered canvas together", () => {
  const textNode = createCampaignBlock("text", 0, { x: 120, y: 160 });
  const imageNode = createCampaignBlock("image", 1, { x: 520, y: 160 });
  const videoNode = createCampaignBlock("video", 2, { x: 920, y: 220 });
  const existingJob = createCampaignAssetGenerationJob({
    id: "job_parallel_images",
    mediaType: "image",
    providerPluginId: "plugin.provider.openai-media",
    capabilityId: "cap.bulk-image",
    requiredInputs: [
      {
        key: "prompt",
        label: "Prompt",
        source: "node:text_block_1.outputs.prompt",
        dataType: "text",
      },
    ],
    outputTargets: [
      {
        assetId: "asset_generated_image_1",
        field: "uri",
      },
    ],
  });
  const existingCampaign = {
    ...createBlankCampaign(),
    campaignSpec: {
      nodes: [textNode, imageNode],
      edges: [
        {
          id: "edge_prompt_to_image",
          source: textNode.id,
          sourcePort: "outputs.prompt",
          target: imageNode.id,
          targetPort: "inputs.prompt",
          label: "prompt",
        },
      ],
      assetGenerationJobs: [existingJob],
    },
    canvasState: {
      nodes: [textNode, imageNode],
      edges: [
        {
          id: "edge_prompt_to_image",
          source: textNode.id,
          sourcePort: "outputs.prompt",
          target: imageNode.id,
          targetPort: "inputs.prompt",
          label: "prompt",
        },
      ],
    },
  };
  const updatedTextNode = {
    ...textNode,
    title: "Video prompt brief",
    position: { x: 180, y: 240 },
  };
  const videoEdge = {
    id: "edge_prompt_to_video",
    source: textNode.id,
    sourcePort: "outputs.storyboard",
    target: videoNode.id,
    targetPort: "inputs.prompt",
    label: "storyboard",
  };

  const result = createCreativeCanvasSnapshotFromCampaignSpecJsonEdit(
    existingCampaign,
    JSON.stringify({
      nodes: [updatedTextNode, videoNode],
      edges: [videoEdge],
    }),
  );

  assert.equal(result.valid, true);
  assert.deepEqual(result.campaign.canvasState, {
    nodes: [updatedTextNode, videoNode],
    edges: [videoEdge],
  });
  assert.deepEqual(result.campaign.campaignSpec, {
    nodes: [updatedTextNode, videoNode],
    edges: [videoEdge],
    assetGenerationJobs: [existingJob],
  });
  assert.deepEqual(
    result.nodes.map((node) => ({
      id: node.id,
      position: node.position,
      title: node.data.title,
    })),
    [
      {
        id: textNode.id,
        position: { x: 180, y: 240 },
        title: "Video prompt brief",
      },
      {
        id: videoNode.id,
        position: videoNode.position,
        title: videoNode.title,
      },
    ],
  );
  assert.deepEqual(
    result.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      sourceHandle: edge.sourceHandle,
      target: edge.target,
      targetHandle: edge.targetHandle,
      label: edge.label,
    })),
    [
      {
        id: "edge_prompt_to_video",
        source: textNode.id,
        sourceHandle: "outputs.storyboard",
        target: videoNode.id,
        targetHandle: "inputs.prompt",
        label: "storyboard",
      },
    ],
  );
  assert.deepEqual(existingCampaign.canvasState.nodes, [textNode, imageNode]);
});

test("campaign spec JSON edits refresh rendered canvas without resetting layout or node configuration", () => {
  const textNode = {
    ...createCampaignBlock("text", 0, { x: 144, y: 208 }),
    id: "prompt_source",
    title: "Prompt source",
    properties: {
      promptTemplate: "Frame the offer for Instagram comments.",
      mode: "basic",
    },
  };
  const imageNode = {
    ...createCampaignBlock("image", 1, { x: 576, y: 244 }),
    id: "bulk_image_generator",
    title: "Bulk image generator",
    properties: {
      providerPluginId: "plugin.provider.openai-media",
      capabilityId: "cap.bulk-image",
      mode: "advanced",
      configuration: {
        variantCount: 4,
        requireHumanApproval: true,
      },
    },
  };
  const existingCampaign = {
    ...createBlankCampaign(),
    campaignSpec: {
      nodes: [textNode, imageNode],
      edges: [],
      assetGenerationJobs: [],
    },
    canvasState: {
      nodes: [textNode, imageNode],
      edges: [],
    },
  };
  const campaignSpecJson = JSON.stringify({
    nodes: [
      {
        id: textNode.id,
        kind: textNode.kind,
        title: "Updated prompt source",
      },
      {
        id: imageNode.id,
        kind: imageNode.kind,
        title: "Updated bulk image generator",
      },
    ],
    edges: [
      {
        id: "edge_prompt_to_bulk_image",
        source: textNode.id,
        sourcePort: "outputs.prompt",
        target: imageNode.id,
        targetPort: "inputs.prompt",
        label: "prompt",
      },
    ],
    assetGenerationJobs: [],
  });

  const result = createCreativeCanvasSnapshotFromCampaignSpecJsonEdit(
    existingCampaign,
    campaignSpecJson,
  );

  assert.equal(result.valid, true);
  assert.deepEqual(
    result.nodes.map((node) => ({
      id: node.id,
      position: node.position,
      title: node.data.title,
      properties: node.data.properties,
    })),
    [
      {
        id: textNode.id,
        position: textNode.position,
        title: "Updated prompt source",
        properties: {
          mode: "basic",
          promptTemplate: "Frame the offer for Instagram comments.",
        },
      },
      {
        id: imageNode.id,
        position: imageNode.position,
        title: "Updated bulk image generator",
        properties: {
          capabilityId: "cap.bulk-image",
          configuration: {
            requireHumanApproval: true,
            variantCount: 4,
          },
          mode: "advanced",
          providerPluginId: "plugin.provider.openai-media",
        },
      },
    ],
  );
  assert.deepEqual(
    result.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      sourceHandle: edge.sourceHandle,
      target: edge.target,
      targetHandle: edge.targetHandle,
      label: edge.label,
    })),
    [
      {
        id: "edge_prompt_to_bulk_image",
        source: textNode.id,
        sourceHandle: "outputs.prompt",
        target: imageNode.id,
        targetHandle: "inputs.prompt",
        label: "prompt",
      },
    ],
  );
  assert.deepEqual(result.campaign.canvasState.nodes, [
    {
      ...textNode,
      title: "Updated prompt source",
      properties: {
        mode: "basic",
        promptTemplate: "Frame the offer for Instagram comments.",
      },
    },
    {
      ...imageNode,
      title: "Updated bulk image generator",
      properties: {
        capabilityId: "cap.bulk-image",
        configuration: {
          requireHumanApproval: true,
          variantCount: 4,
        },
        mode: "advanced",
        providerPluginId: "plugin.provider.openai-media",
      },
    },
  ]);
});

test("invalid or incomplete campaign spec JSON preserves the rendered canvas snapshot", () => {
  const textNode = createCampaignBlock("text", 0, { x: 120, y: 160 });
  const imageNode = createCampaignBlock("image", 1, { x: 520, y: 160 });
  const campaign = createBlankCampaign();
  const existingCampaign = {
    ...campaign,
    campaignSpec: {
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
    },
    canvasState: {
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
    },
  };

  const result = createCreativeCanvasSnapshotFromCampaignSpecJsonEdit(
    existingCampaign,
    JSON.stringify({
      nodes: [
        {
          id: "landing_block_3",
          kind: "landing",
          position: { x: 840, y: 160 },
        },
      ],
    }),
  );

  assert.equal(result.valid, false);
  assert.deepEqual(result.campaign, existingCampaign);
  assert.deepEqual(result.campaign.canvasState, existingCampaign.canvasState);
  assert.deepEqual(
    result.nodes.map((node) => ({
      id: node.id,
      position: node.position,
      title: node.data.title,
    })),
    [
      {
        id: textNode.id,
        position: textNode.position,
        title: textNode.title,
      },
      {
        id: imageNode.id,
        position: imageNode.position,
        title: imageNode.title,
      },
    ],
  );
  assert.deepEqual(
    result.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      sourceHandle: edge.sourceHandle,
      target: edge.target,
      targetHandle: edge.targetHandle,
      label: edge.label,
    })),
    [
      {
        id: "edge_prompt_to_image",
        source: textNode.id,
        sourceHandle: "prompt.out",
        target: imageNode.id,
        targetHandle: "prompt.in",
        label: "prompt",
      },
    ],
  );
});

test("streaming campaign spec JSON sync buffers parseable partial frames without changing rendered canvas", () => {
  const textNode = createCampaignBlock("text", 0, { x: 120, y: 160 });
  const imageNode = createCampaignBlock("image", 1, { x: 520, y: 160 });
  const existingCampaign = {
    ...createBlankCampaign(),
    campaignSpec: {
      nodes: [textNode, imageNode],
      edges: [
        {
          id: "edge_prompt_to_image",
          source: textNode.id,
          target: imageNode.id,
          label: "prompt",
        },
      ],
      assetGenerationJobs: [],
    },
    canvasState: {
      nodes: [textNode, imageNode],
      edges: [
        {
          id: "edge_prompt_to_image",
          source: textNode.id,
          target: imageNode.id,
          label: "prompt",
        },
      ],
    },
  };

  const result = createCreativeCanvasSnapshotFromCampaignSpecJsonEdit(
    existingCampaign,
    JSON.stringify({
      nodes: [],
      edges: [],
      assetGenerationJobs: [],
    }),
    { commit: false },
  );

  assert.equal(result.valid, false);
  assert.deepEqual(result.campaign, existingCampaign);
  assert.deepEqual(
    result.nodes.map((node) => node.id),
    [textNode.id, imageNode.id],
  );
  assert.deepEqual(
    result.edges.map((edge) => edge.id),
    ["edge_prompt_to_image"],
  );
  assert.deepEqual(result.errors, [
    {
      code: "campaign_spec.json_incomplete",
      path: "campaignSpec",
      message: "Campaign spec JSON input is incomplete.",
    },
  ]);
});

test("campaign spec JSON sync recovers from invalid and partial input once valid JSON arrives", () => {
  const textNode = createCampaignBlock("text", 0, { x: 120, y: 160 });
  const imageNode = createCampaignBlock("image", 1, { x: 520, y: 160 });
  const landingNode = createCampaignBlock("landing", 2, { x: 920, y: 160 });
  const existingCampaign = {
    ...createBlankCampaign(),
    campaignSpec: {
      nodes: [textNode, imageNode],
      edges: [
        {
          id: "edge_prompt_to_image",
          source: textNode.id,
          target: imageNode.id,
          label: "prompt",
        },
      ],
      assetGenerationJobs: [],
    },
    canvasState: {
      nodes: [textNode, imageNode],
      edges: [
        {
          id: "edge_prompt_to_image",
          source: textNode.id,
          target: imageNode.id,
          label: "prompt",
        },
      ],
    },
  };

  const invalidResult = createCreativeCanvasSnapshotFromCampaignSpecJsonEdit(
    existingCampaign,
    `{"nodes":[{"id":"landing_block_3","kind":"landing"}],`,
  );
  const partialResult = createCreativeCanvasSnapshotFromCampaignSpecJsonEdit(
    existingCampaign,
    JSON.stringify({
      nodes: [landingNode],
      edges: [],
      assetGenerationJobs: [],
    }),
    { commit: false },
  );
  const recoveredResult = createCreativeCanvasSnapshotFromCampaignSpecJsonEdit(
    existingCampaign,
    JSON.stringify({
      nodes: [textNode, landingNode],
      edges: [
        {
          id: "edge_prompt_to_landing",
          source: textNode.id,
          target: landingNode.id,
          label: "landing copy",
        },
      ],
      assetGenerationJobs: [],
    }),
  );

  assert.equal(invalidResult.valid, false);
  assert.deepEqual(invalidResult.campaign, existingCampaign);
  assert.deepEqual(
    invalidResult.nodes.map((node) => node.id),
    [textNode.id, imageNode.id],
  );
  assert.deepEqual(invalidResult.errors, [
    {
      code: "campaign_spec.json_invalid",
      path: "campaignSpec",
      message: "Campaign spec JSON is invalid.",
    },
  ]);

  assert.equal(partialResult.valid, false);
  assert.deepEqual(partialResult.campaign, existingCampaign);
  assert.deepEqual(
    partialResult.nodes.map((node) => node.id),
    [textNode.id, imageNode.id],
  );
  assert.deepEqual(partialResult.errors, [
    {
      code: "campaign_spec.json_incomplete",
      path: "campaignSpec",
      message: "Campaign spec JSON input is incomplete.",
    },
  ]);

  assert.equal(recoveredResult.valid, true);
  assert.deepEqual(
    recoveredResult.nodes.map((node) => node.id),
    [textNode.id, landingNode.id],
  );
  assert.deepEqual(
    recoveredResult.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label,
    })),
    [
      {
        id: "edge_prompt_to_landing",
        source: textNode.id,
        target: landingNode.id,
        label: "landing copy",
      },
    ],
  );
  assert.deepEqual(recoveredResult.campaign.canvasState, {
    nodes: [textNode, landingNode],
    edges: [
      {
        id: "edge_prompt_to_landing",
        source: textNode.id,
        target: landingNode.id,
        label: "landing copy",
      },
    ],
  });
});

test("campaign spec JSON sync restores the last valid rendered canvas after a synchronization failure", () => {
  const textNode = createCampaignBlock("text", 0, { x: 120, y: 160 });
  const imageNode = createCampaignBlock("image", 1, { x: 520, y: 160 });
  const lastValidCanvas = {
    nodes: toCreativeFlowNodes([textNode, imageNode]),
    edges: toCreativeFlowEdges([
      {
        id: "edge_prompt_to_image",
        source: textNode.id,
        sourcePort: "prompt.out",
        target: imageNode.id,
        targetPort: "prompt.in",
        label: "prompt",
      },
    ]),
  };

  const result = createCreativeCanvasSnapshotFromCampaignSpecJsonEdit(
    createBlankCampaign(),
    `{"nodes":[{"id":"landing_block_3","kind":"landing"}],`,
    { lastValidCanvasSnapshot: lastValidCanvas },
  );

  assert.equal(result.valid, false);
  assert.deepEqual(
    result.nodes.map((node) => ({
      id: node.id,
      position: node.position,
      title: node.data.title,
    })),
    [
      {
        id: textNode.id,
        position: textNode.position,
        title: textNode.title,
      },
      {
        id: imageNode.id,
        position: imageNode.position,
        title: imageNode.title,
      },
    ],
  );
  assert.deepEqual(
    result.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      sourceHandle: edge.sourceHandle,
      target: edge.target,
      targetHandle: edge.targetHandle,
      label: edge.label,
    })),
    [
      {
        id: "edge_prompt_to_image",
        source: textNode.id,
        sourceHandle: "prompt.out",
        target: imageNode.id,
        targetHandle: "prompt.in",
        label: "prompt",
      },
    ],
  );
  assert.deepEqual(
    result.campaign.canvasState,
    createBlankCampaign().canvasState,
  );
  assert.deepEqual(result.errors, [
    {
      code: "campaign_spec.json_invalid",
      path: "campaignSpec",
      message: "Campaign spec JSON is invalid.",
    },
  ]);
});
