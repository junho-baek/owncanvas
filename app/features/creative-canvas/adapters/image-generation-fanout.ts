import {
  createGenerationBatchRequest,
  type GenerationBatchRequest,
} from "../model/generation-batch.ts";
import {
  createImageGenerationNodeProperties,
  createImageGenerationNodeProviderRequest,
  isImageGenerationNodeProperties,
  validateImageGenerationFanOutReadiness,
  type ImageGenerationNodeProperties,
} from "../model/image-generation-node.ts";
import type { CreativeFlowEdge, CreativeFlowNode } from "./react-flow-canvas.ts";

export type ImageGenerationFanOutPlan = {
  batchId: string;
  createdNodes: CreativeFlowNode[];
  createdEdges: CreativeFlowEdge[];
  targetNodeIds: string[];
  batch: GenerationBatchRequest;
};

export function createImageGenerationFanOutPlan(input: {
  campaignId: string;
  sourceNode: CreativeFlowNode;
  existingNodes: CreativeFlowNode[];
  existingEdges?: CreativeFlowEdge[];
  now: () => string;
}): ImageGenerationFanOutPlan {
  const properties = input.sourceNode.data.properties;

  if (
    input.sourceNode.data.kind !== "image" ||
    !isImageGenerationNodeProperties(properties)
  ) {
    throw new Error("source node must be an Image Block");
  }

  const count = properties.batchCount;
  const readiness = validateImageGenerationFanOutReadiness(properties);

  if (!readiness.valid) {
    throw new Error(readiness.error?.message ?? "Image Block is not ready to fan out");
  }

  const providerRequest = createImageGenerationNodeProviderRequest({
    properties,
    prompt: properties.prompt,
  });
  const batchId = createStableBatchId({
    sourceNodeId: input.sourceNode.id,
    isoTimestamp: input.now(),
    fanOutCount: count,
    existingNodes: input.existingNodes,
  });
  const createdNodes = Array.from({ length: count }, (_, index) =>
    createQueuedImageGenerationNode({
      sourceNode: input.sourceNode,
      sourceProperties: properties,
      batchId,
      index,
    }),
  );
  const createdEdges = createFanOutReferenceEdges({
    sourceNodeId: input.sourceNode.id,
    createdNodes,
    existingEdges: input.existingEdges ?? [],
    batchId,
  });
  const targetNodeIds =
    count === 1
      ? [input.sourceNode.id]
      : createdNodes.map((node) => node.id);

  return {
    batchId,
    createdNodes: count === 1 ? [] : createdNodes,
    createdEdges: count === 1 ? [] : createdEdges,
    targetNodeIds,
    batch: createGenerationBatchRequest({
      batchId,
      campaignId: input.campaignId,
      sourceNodeId: input.sourceNode.id,
      prompt: properties.prompt,
      provider: properties.providerId,
      model: properties.modelSlug,
      aspectRatio: properties.aspectRatio,
      nodeIds: targetNodeIds,
      parameters: {
        replicate: providerRequest.replicate,
      },
    }),
  };
}

export function createImageGenerationSingleNodeRetryPlan(input: {
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

  const providerRequest = createImageGenerationNodeProviderRequest({
    properties,
    prompt: properties.prompt,
  });
  const batchId = createStableRetryBatchId({
    sourceNodeId: input.sourceNode.id,
    isoTimestamp: input.now(),
    existingNodes: input.existingNodes,
  });

  return {
    batchId,
    createdNodes: [],
    createdEdges: [],
    targetNodeIds: [input.sourceNode.id],
    batch: createGenerationBatchRequest({
      batchId,
      campaignId: input.campaignId,
      sourceNodeId: input.sourceNode.id,
      prompt: properties.prompt,
      provider: properties.providerId,
      model: properties.modelSlug,
      aspectRatio: properties.aspectRatio,
      nodeIds: [input.sourceNode.id],
      parameters: {
        replicate: providerRequest.replicate,
      },
    }),
  };
}

function createFanOutReferenceEdges(input: {
  sourceNodeId: string;
  createdNodes: CreativeFlowNode[];
  existingEdges: CreativeFlowEdge[];
  batchId: string;
}): CreativeFlowEdge[] {
  const fanOutInputEdges = input.existingEdges.filter(
    (edge) =>
      edge.target === input.sourceNodeId &&
      (edge.targetHandle === "inputs.prompt" ||
        edge.targetHandle === "inputs.reference_image"),
  );

  return input.createdNodes.flatMap((node, nodeIndex) =>
    fanOutInputEdges.map((edge, edgeIndex) => ({
      ...edge,
      id: `${input.batchId}_${nodeIndex + 1}_edge_${edgeIndex + 1}_${edge.id}`,
      target: node.id,
    })),
  );
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
    batchCount: 1,
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

function createStableBatchId(input: {
  sourceNodeId: string;
  isoTimestamp: string;
  fanOutCount: number;
  existingNodes: CreativeFlowNode[];
}): string {
  const timestampDigits = input.isoTimestamp.replace(/\D/g, "").slice(0, 17);
  const baseBatchId = `${input.sourceNodeId}_batch_${timestampDigits}`;
  const existingNodeIds = new Set(input.existingNodes.map((node) => node.id));

  for (let suffix = 0; suffix < 1_000; suffix += 1) {
    const batchId = suffix === 0 ? baseBatchId : `${baseBatchId}_run_${suffix + 1}`;

    if (!fanOutBatchIdConflicts(batchId, input.fanOutCount, existingNodeIds)) {
      return batchId;
    }
  }

  throw new Error("could not allocate unique Image Block fan-out batch id");
}

function createStableRetryBatchId(input: {
  sourceNodeId: string;
  isoTimestamp: string;
  existingNodes: CreativeFlowNode[];
}): string {
  const timestampDigits = input.isoTimestamp.replace(/\D/g, "").slice(0, 17);
  const baseBatchId = `${input.sourceNodeId}_retry_${timestampDigits}`;
  const existingNodeIds = new Set(input.existingNodes.map((node) => node.id));

  for (let suffix = 0; suffix < 1_000; suffix += 1) {
    const batchId = suffix === 0 ? baseBatchId : `${baseBatchId}_run_${suffix + 1}`;

    if (!existingNodeIds.has(batchId)) {
      return batchId;
    }
  }

  throw new Error("could not allocate unique Image Block retry batch id");
}

function fanOutBatchIdConflicts(
  batchId: string,
  fanOutCount: number,
  existingNodeIds: Set<string>,
) {
  if (existingNodeIds.has(batchId)) {
    return true;
  }

  for (let index = 0; index < fanOutCount; index += 1) {
    if (existingNodeIds.has(`${batchId}_${index + 1}`)) {
      return true;
    }
  }

  return false;
}
