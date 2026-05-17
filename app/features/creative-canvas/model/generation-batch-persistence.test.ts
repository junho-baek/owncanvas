import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createGenerationBatchRequest,
  type GenerationBatchResponse,
} from "./generation-batch.ts";
import {
  createBlankCampaignRecord,
  type CampaignCanvasBlock,
} from "./creative-canvas.ts";
import { persistGenerationBatchResponseToCampaign } from "./generation-batch-persistence.ts";

function createImageBlock(id: string, x: number): CampaignCanvasBlock {
  return {
    id,
    kind: "image",
    type: "image",
    title: "Image Block",
    subtitle: "Ready",
    description: "Image generation",
    tone: "ink",
    status: "DRAFT",
    contracts: [],
    position: { x, y: 0 },
    properties: {},
  };
}

function createVideoBlock(id: string, x: number): CampaignCanvasBlock {
  return {
    id,
    kind: "video",
    type: "video",
    title: "Video",
    subtitle: "Ready",
    description: "Video generation",
    tone: "violet",
    status: "DRAFT",
    contracts: [],
    position: { x, y: 0 },
    properties: {},
  };
}

test("persistGenerationBatchResponseToCampaign stores local Creative Output refs for succeeded duplicated Image Blocks", () => {
  const storage = new MemoryStorage();
  const campaign = createBlankCampaignRecord(storage, {
    id: "campaign_generation_persistence",
    now: () => "2026-05-17T03:00:00.000Z",
  });
  const request = createGenerationBatchRequest({
    batchId: "image_source_batch_20260517030000000",
    campaignId: campaign.id,
    sourceNodeId: "image_source",
    prompt: "same prompt",
    provider: "replicate",
    model: "google/nano-banana",
    aspectRatio: "1:1",
    nodeIds: ["node_1", "node_2", "node_3"],
    parameters: {},
  });
  const campaignWithNodes = {
    ...campaign,
    campaignSpec: {
      ...campaign.campaignSpec,
      nodes: [
        createImageBlock("node_1", 0),
        createImageBlock("node_2", 360),
        createImageBlock("node_3", 720),
      ],
    },
    canvasState: {
      ...campaign.canvasState,
      nodes: [
        createImageBlock("node_1", 0),
        createImageBlock("node_2", 360),
        createImageBlock("node_3", 720),
      ],
    },
  };
  const response: GenerationBatchResponse = {
    batchId: request.batchId,
    results: [
      {
        jobId: request.jobs[0]!.jobId,
        nodeId: "node_1",
        status: "succeeded",
        providerRequestId: "replicate_prediction_1",
        providerUrl: "https://replicate.delivery/pbxt/generated-1.png",
        mimeType: "image/png",
        width: 1024,
        height: 1024,
        thumbnailUri: "https://replicate.delivery/pbxt/generated-1-thumb.png",
        sizeBytes: 4096,
        persistedCreativeOutputAssetId: "forged_by_provider",
        generatedAt: "2026-05-17T03:00:01.000Z",
      },
      {
        jobId: request.jobs[1]!.jobId,
        nodeId: "node_2",
        status: "failed",
        providerRequestId: "",
        providerUrl: "",
        mimeType: "",
        width: 0,
        height: 0,
        generatedAt: "2026-05-17T03:00:02.000Z",
        error: {
          name: "GenerationProviderUnavailable",
          category: "transport_error",
          message: "provider timeout",
          retryable: true,
        },
      },
      {
        jobId: request.jobs[2]!.jobId,
        nodeId: "node_3",
        status: "succeeded",
        providerRequestId: "replicate_prediction_3",
        providerUrl: "https://replicate.delivery/pbxt/generated-3.png",
        mimeType: "image/png",
        width: 1024,
        height: 1024,
        generatedAt: "2026-05-17T03:00:03.000Z",
      },
    ],
  };

  const result = persistGenerationBatchResponseToCampaign({
    campaign: campaignWithNodes,
    request,
    response,
    now: () => "2026-05-17T03:00:04.000Z",
  });

  assert.deepEqual(
    result.response.results.map((jobResult) => ({
      nodeId: jobResult.nodeId,
      status: jobResult.status,
      persistedCreativeOutputAssetId:
        jobResult.persistedCreativeOutputAssetId,
    })),
    [
      {
        nodeId: "node_1",
        status: "succeeded",
        persistedCreativeOutputAssetId: "asset_node_1_creative_output",
      },
      {
        nodeId: "node_2",
        status: "failed",
        persistedCreativeOutputAssetId: undefined,
      },
      {
        nodeId: "node_3",
        status: "succeeded",
        persistedCreativeOutputAssetId: "asset_node_3_creative_output",
      },
    ],
  );
  assert.equal(
    result.response.results[0]?.persistedCreativeOutputAssetId ===
      "forged_by_provider",
    false,
  );
  assert.deepEqual(
    result.campaign.assets.map((asset) => ({
      id: asset.id,
      uri: asset.uri,
      primaryUri: asset.outputLocations?.primaryUri,
    })),
    [
      {
        id: "asset_node_1_creative_output",
        uri: "https://replicate.delivery/pbxt/generated-1.png",
        primaryUri: "https://replicate.delivery/pbxt/generated-1.png",
      },
      {
        id: "asset_node_3_creative_output",
        uri: "https://replicate.delivery/pbxt/generated-3.png",
        primaryUri: "https://replicate.delivery/pbxt/generated-3.png",
      },
    ],
  );
  assert.deepEqual(
    result.campaign.canvasState.nodes.map((node) => ({
      id: node.id,
      status: node.status,
      assetGeneration: node.properties?.assetGeneration,
    })),
    [
      {
        id: "node_1",
        status: "READY",
        assetGeneration: {
          completed: 1,
          failed: 0,
          jobIds: [request.jobs[0]!.jobId],
          status: "completed",
          assetIds: ["asset_node_1_creative_output"],
          resultIds: [`${request.jobs[0]!.jobId}_result_1`],
          outputLocations: [
            {
              assetId: "asset_node_1_creative_output",
              primaryUri: "https://replicate.delivery/pbxt/generated-1.png",
              thumbnailUri: "https://replicate.delivery/pbxt/generated-1-thumb.png",
            },
          ],
        },
      },
      {
        id: "node_2",
        status: "NEEDS INPUT",
        assetGeneration: {
          completed: 0,
          failed: 1,
          jobIds: [request.jobs[1]!.jobId],
          status: "failed",
        },
      },
      {
        id: "node_3",
        status: "READY",
        assetGeneration: {
          completed: 1,
          failed: 0,
          jobIds: [request.jobs[2]!.jobId],
          status: "completed",
          assetIds: ["asset_node_3_creative_output"],
          resultIds: [`${request.jobs[2]!.jobId}_result_3`],
          outputLocations: [
            {
              assetId: "asset_node_3_creative_output",
              primaryUri: "https://replicate.delivery/pbxt/generated-3.png",
            },
          ],
        },
      },
    ],
  );
});

test("persistGenerationBatchResponseToCampaign stores Video Block outputs as video assets", () => {
  const storage = new MemoryStorage();
  const campaign = createBlankCampaignRecord(storage, {
    id: "campaign_video_generation_persistence",
    now: () => "2026-05-17T05:00:00.000Z",
  });
  const request = createGenerationBatchRequest({
    batchId: "video_source_video_20260517050000000",
    campaignId: campaign.id,
    sourceNodeId: "video_source",
    mediaType: "video",
    prompt: "educational 3D animation about an AI-native CEO co-coding",
    provider: "replicate",
    model: "bytedance/seedance-1-lite",
    aspectRatio: "16:9",
    nodeIds: ["video_source"],
    parameters: {
      replicate: {
        input: {
          prompt: "educational 3D animation about an AI-native CEO co-coding",
          duration: 2,
          resolution: "480p",
          aspect_ratio: "16:9",
          fps: 24,
        },
      },
    },
  });
  const campaignWithNode = {
    ...campaign,
    campaignSpec: {
      ...campaign.campaignSpec,
      nodes: [createVideoBlock("video_source", 0)],
    },
    canvasState: {
      ...campaign.canvasState,
      nodes: [createVideoBlock("video_source", 0)],
    },
  };
  const response: GenerationBatchResponse = {
    batchId: request.batchId,
    results: [
      {
        jobId: request.jobs[0]!.jobId,
        nodeId: "video_source",
        status: "succeeded",
        providerRequestId: "replicate_video_prediction_1",
        providerUrl: "https://replicate.delivery/pbxt/owncanvas-ceo.mp4",
        mimeType: "video/mp4",
        width: 1024,
        height: 576,
        generatedAt: "2026-05-17T05:00:02.000Z",
      },
    ],
  };

  const result = persistGenerationBatchResponseToCampaign({
    campaign: campaignWithNode,
    request,
    response,
    now: () => "2026-05-17T05:00:03.000Z",
  });

  assert.equal(
    result.response.results[0]?.persistedCreativeOutputAssetId,
    "asset_video_source_creative_output",
  );
  assert.deepEqual(
    result.campaign.assets.map((asset) => ({
      id: asset.id,
      mediaType: asset.mediaType,
      uri: asset.uri,
      mimeType: asset.mimeType,
      durationSeconds: asset.generatedMetadata?.durationSeconds,
      frameRate: asset.generatedMetadata?.frameRate,
    })),
    [
      {
        id: "asset_video_source_creative_output",
        mediaType: "video",
        uri: "https://replicate.delivery/pbxt/owncanvas-ceo.mp4",
        mimeType: "video/mp4",
        durationSeconds: 2,
        frameRate: 24,
      },
    ],
  );
  assert.equal(
    result.campaign.campaignSpec.assetGenerationJobs?.[0]?.mediaType,
    "video",
  );
  assert.equal(
    result.campaign.campaignSpec.assetGenerationJobs?.[0]?.capabilityId,
    "generate.video",
  );
  assert.equal(
    result.campaign.campaignSpec.assetGenerationJobs?.[0]?.videoInputs
      ?.durationSeconds,
    2,
  );
});

class MemoryStorage implements Pick<Storage, "getItem" | "setItem"> {
  #store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.#store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.#store.set(key, value);
  }
}
