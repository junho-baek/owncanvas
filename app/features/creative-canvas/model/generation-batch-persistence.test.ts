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

class MemoryStorage implements Pick<Storage, "getItem" | "setItem"> {
  #store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.#store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.#store.set(key, value);
  }
}
