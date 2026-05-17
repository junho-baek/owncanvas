import {
  createGenerationBatchRequest,
  type GenerationBatchRequest,
} from "../model/generation-batch.ts";
import type { CampaignAsset } from "../model/creative-canvas.ts";
import {
  createVideoGenerationNodeProviderRequest,
  isVideoGenerationNodeProperties,
  validateVideoGenerationRunReadiness,
} from "../model/video-generation-node.ts";
import type { CreativeFlowNode } from "./react-flow-canvas.ts";

export type VideoGenerationRunPlan = {
  batchId: string;
  batch: GenerationBatchRequest;
};

export function createVideoGenerationRunPlan(input: {
  campaignId: string;
  sourceNode: CreativeFlowNode;
  existingNodes: CreativeFlowNode[];
  campaignAssets: CampaignAsset[];
  now: () => string;
}): VideoGenerationRunPlan {
  const properties = input.sourceNode.data.properties;

  if (
    input.sourceNode.data.kind !== "video" ||
    !isVideoGenerationNodeProperties(properties)
  ) {
    throw new Error("source node must be a Video Block");
  }

  const referenceImageUri = resolveVideoGenerationReferenceImageUri({
    properties,
    campaignAssets: input.campaignAssets,
  });
  const readiness = validateVideoGenerationRunReadiness({
    properties,
    referenceImageUri,
  });

  if (!readiness.valid) {
    throw new Error(readiness.error.message);
  }

  const providerRequest = createVideoGenerationNodeProviderRequest({
    properties,
    prompt: properties.prompt,
    referenceImageUri,
  });
  const batchId = createStableVideoBatchId({
    sourceNodeId: input.sourceNode.id,
    isoTimestamp: input.now(),
    existingNodes: input.existingNodes,
  });

  return {
    batchId,
    batch: createGenerationBatchRequest({
      batchId,
      campaignId: input.campaignId,
      sourceNodeId: input.sourceNode.id,
      mediaType: "video",
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

export function resolveVideoGenerationReferenceImageUri(input: {
  properties: {
    referenceImageUri: string | null;
    referenceImageAssetId: string | null;
    sourceOutputAssetId?: string;
  };
  campaignAssets: CampaignAsset[];
}): string | null {
  if (input.properties.referenceImageUri !== null) {
    return input.properties.referenceImageUri;
  }

  const assetId =
    input.properties.referenceImageAssetId ??
    input.properties.sourceOutputAssetId ??
    null;

  if (assetId === null) {
    return null;
  }

  return input.campaignAssets.find((asset) => asset.id === assetId)?.uri ?? null;
}

function createStableVideoBatchId(input: {
  sourceNodeId: string;
  isoTimestamp: string;
  existingNodes: CreativeFlowNode[];
}): string {
  const timestampDigits = input.isoTimestamp.replace(/\D/g, "").slice(0, 17);
  const baseBatchId = `${input.sourceNodeId}_video_${timestampDigits}`;
  const existingNodeIds = new Set(input.existingNodes.map((node) => node.id));

  for (let suffix = 0; suffix < 1_000; suffix += 1) {
    const batchId = suffix === 0 ? baseBatchId : `${baseBatchId}_run_${suffix + 1}`;

    if (!existingNodeIds.has(batchId)) {
      return batchId;
    }
  }

  throw new Error("could not allocate unique Video Block batch id");
}
