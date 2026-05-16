import {
  createGenerationBatchRequest,
  type GenerationBatchRequest,
} from "../model/generation-batch.ts";
import {
  createImageGenerationNodeProperties,
  isImageGenerationNodeProperties,
  type ImageGenerationNodeProperties,
} from "../model/image-generation-node.ts";
import type { CreativeFlowNode } from "./react-flow-canvas.ts";

export type ImageGenerationFanOutPlan = {
  batchId: string;
  createdNodes: CreativeFlowNode[];
  batch: GenerationBatchRequest;
};

export function createImageGenerationFanOutPlan(input: {
  campaignId: string;
  sourceNode: CreativeFlowNode;
  existingNodes: CreativeFlowNode[];
  now: () => string;
}): ImageGenerationFanOutPlan {
  const properties = input.sourceNode.data.properties;

  if (
    input.sourceNode.data.kind !== "image" ||
    !isImageGenerationNodeProperties(properties)
  ) {
    throw new Error("source node must be an Image Block");
  }

  const batchId = createStableBatchId(input.sourceNode.id, input.now());
  const count = properties.batchCount;
  const createdNodes = Array.from({ length: count }, (_, index) =>
    createQueuedImageGenerationNode({
      sourceNode: input.sourceNode,
      sourceProperties: properties,
      batchId,
      index,
    }),
  );

  return {
    batchId,
    createdNodes,
    batch: createGenerationBatchRequest({
      batchId,
      campaignId: input.campaignId,
      sourceNodeId: input.sourceNode.id,
      prompt: properties.prompt,
      provider: properties.providerId,
      model: properties.modelSlug,
      aspectRatio: properties.aspectRatio,
      nodeIds: createdNodes.map((node) => node.id),
      parameters: {},
    }),
  };
}

function createQueuedImageGenerationNode(input: {
  sourceNode: CreativeFlowNode;
  sourceProperties: ImageGenerationNodeProperties;
  batchId: string;
  index: number;
}): CreativeFlowNode {
  const column = input.index % 4;
  const row = Math.floor(input.index / 4);
  const id = `${input.batchId}_${input.index + 1}`;
  const properties = createImageGenerationNodeProperties({
    ...input.sourceProperties,
    latestResultRefs: {
      generatedAssetIds: [],
      metadataRunId: null,
      costUsageRunId: null,
    },
    uiState: {
      ...input.sourceProperties.uiState,
      status: "queued",
      progressPercent: null,
      statusMessage: "Queued",
      errorReason: null,
      failureDetails: null,
      selectedResultAssetId: null,
      outputConnectionReady: false,
    },
  });

  return {
    ...input.sourceNode,
    id,
    selected: input.index === 0,
    position: {
      x: input.sourceNode.position.x + 340 + column * 380,
      y: input.sourceNode.position.y + row * 700,
    },
    data: {
      ...input.sourceNode.data,
      id,
      status: "DRAFT",
      properties,
    },
  };
}

function createStableBatchId(sourceNodeId: string, isoTimestamp: string): string {
  const timestampDigits = isoTimestamp.replace(/\D/g, "").slice(0, 17);
  return `${sourceNodeId}_batch_${timestampDigits}`;
}
