import assert from "node:assert/strict";
import { test } from "node:test";

import { action } from "./api.campaign-generation.ts";
import {
  createBlankCampaignRecord,
  getPersistedCampaignRecord,
  updatePersistedCampaignRecord,
  type CampaignCanvasBlock,
} from "../features/creative-canvas/model/creative-canvas.ts";

function createBatchRequestBody(campaignId = "campaign_route") {
  return {
    batchId: "batch_route",
    campaignId,
    sourceNodeId: "source_image",
    fanOutCount: 1,
    spec: {
      specId: "batch_route_spec",
      campaignId,
      sourceNodeId: "source_image",
      prompt: "same prompt",
      provider: "mock",
      model: "mock-image",
      aspectRatio: "9:16",
      parameters: {},
    },
    jobs: [
      {
        jobId: "batch_route_job_1",
        nodeId: "node_1",
        prompt: "same prompt",
        provider: "mock",
        model: "mock-image",
        aspectRatio: "9:16",
        parameters: {},
      },
    ],
  };
}

function createRouteRequest(body: unknown) {
  return new Request(
    "http://localhost/api/campaigns/campaign_route/generation/batches",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

function createRouteRequestWithMethod(method: string, body?: unknown) {
  return new Request(
    "http://localhost/api/campaigns/campaign_route/generation/batches",
    {
      method,
      headers: { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    },
  );
}

function createImageCanvasBlock(
  id: string,
  position: CampaignCanvasBlock["position"],
): CampaignCanvasBlock {
  return {
    id,
    kind: "image",
    type: "image",
    title: "Image Block",
    subtitle: "Queued",
    description: "Image generation",
    tone: "ink",
    status: "DRAFT",
    contracts: [],
    position,
    properties: {},
  };
}

test("POST /api/campaigns/:campaignId/generation/batches forwards to Go service", async () => {
  const requestBody = createBatchRequestBody();
  const calls: Array<{ url: string; body: string }> = [];

  const response = await action({
    request: createRouteRequest(requestBody),
    params: { campaignId: "campaign_route" },
    fetchGenerationService: async (url, init) => {
      calls.push({ url: String(url), body: String(init?.body) });
      return Response.json({
        batchId: "batch_route",
        results: [
          {
            jobId: "batch_route_job_1",
            nodeId: "node_1",
            status: "succeeded",
            providerRequestId: "mock_request",
            providerUrl: "https://mock.owncanvas.local/node_1.png",
            mimeType: "image/png",
            width: 1024,
            height: 1024,
            thumbnailUri: "https://mock.owncanvas.local/node_1-thumb.png",
            sizeBytes: 4096,
            generatedAt: "2026-05-17T00:00:00Z",
          },
        ],
      });
    },
    generationServiceUrl: "http://127.0.0.1:8787",
  });
  const body = (await response.json()) as Record<string, unknown>;

  assert.equal(response.status, 200);
  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.url, "http://127.0.0.1:8787/v1/generation/batches");
  assert.deepEqual(JSON.parse(calls[0]?.body ?? "{}"), requestBody);
  assert.deepEqual(body, {
    schemaVersion: "owncanvas.generation-api.v1",
    batch: {
      batchId: "batch_route",
      results: [
        {
          jobId: "batch_route_job_1",
          nodeId: "node_1",
          status: "succeeded",
          providerRequestId: "mock_request",
          providerUrl: "https://mock.owncanvas.local/node_1.png",
          mimeType: "image/png",
          width: 1024,
          height: 1024,
          thumbnailUri: "https://mock.owncanvas.local/node_1-thumb.png",
          sizeBytes: 4096,
          generatedAt: "2026-05-17T00:00:00Z",
        },
      ],
    },
  });
});

test("generation route persists successful Go provider URLs as Campaign Creative Outputs", async () => {
  const storage = new MemoryStorage();
  const campaign = createBlankCampaignRecord(storage, {
    id: "campaign_route",
    now: () => "2026-05-17T00:00:00.000Z",
  });
  const requestBody = createBatchRequestBody();

  updatePersistedCampaignRecord(
    storage,
    {
      ...campaign,
      campaignSpec: {
        ...campaign.campaignSpec,
        nodes: [
          {
            id: "node_1",
            kind: "image",
            type: "image",
            title: "Image Block",
            subtitle: "Ready",
            description: "Image generation",
            tone: "ink",
            status: "DRAFT",
            contracts: [],
            position: { x: 0, y: 0 },
            properties: {},
          },
        ],
      },
      canvasState: {
        ...campaign.canvasState,
        nodes: [
          {
            id: "node_1",
            kind: "image",
            type: "image",
            title: "Image Block",
            subtitle: "Ready",
            description: "Image generation",
            tone: "ink",
            status: "DRAFT",
            contracts: [],
            position: { x: 0, y: 0 },
            properties: {},
          },
        ],
      },
    },
    { now: () => "2026-05-17T00:00:01.000Z" },
  );

  const response = await action({
    request: createRouteRequest(requestBody),
    params: { campaignId: "campaign_route" },
    storage,
    now: () => "2026-05-17T00:00:02.000Z",
    fetchGenerationService: async () =>
      Response.json({
        batchId: "batch_route",
        results: [
          {
            jobId: "batch_route_job_1",
            nodeId: "node_1",
            status: "succeeded",
            providerRequestId: "replicate_prediction_1",
            providerUrl: "https://replicate.delivery/pbxt/generated.png",
            mimeType: "image/png",
            width: 1024,
            height: 1024,
            thumbnailUri: "https://replicate.delivery/pbxt/generated-thumb.png",
            sizeBytes: 4096,
            generatedAt: "2026-05-17T00:00:03.000Z",
          },
        ],
      }),
    generationServiceUrl: "http://127.0.0.1:8787",
  });
  const body = await response.json();
  const persistedCampaign = getPersistedCampaignRecord(storage, "campaign_route");
  const persistedAsset = persistedCampaign?.assets.find(
    (asset) => asset.id === "asset_node_1_creative_output",
  );

  assert.equal(response.status, 200);
  assert.equal(
    (body as { batch?: { results?: Array<{ providerUrl?: string }> } }).batch
      ?.results?.[0]?.providerUrl,
    "https://replicate.delivery/pbxt/generated.png",
  );
  assert.equal(
    (
      body as {
        batch?: {
          results?: Array<{ persistedCreativeOutputAssetId?: string }>;
        };
      }
    ).batch?.results?.[0]?.persistedCreativeOutputAssetId,
    "asset_node_1_creative_output",
  );
  assert.equal(persistedAsset?.uri, "https://replicate.delivery/pbxt/generated.png");
  assert.equal(
    persistedAsset?.outputLocations?.primaryUri,
    "https://replicate.delivery/pbxt/generated.png",
  );
  assert.equal(
    persistedAsset?.outputLocations?.thumbnailUri,
    "https://replicate.delivery/pbxt/generated-thumb.png",
  );
  assert.equal(persistedAsset?.generatedMetadata?.jobId, "batch_route_job_1");
  assert.equal(
    persistedCampaign?.campaignSpec.assetGenerationJobs[0]?.resultMetadata?.[0]
      ?.assetId,
    "asset_node_1_creative_output",
  );
  assert.equal(
    persistedCampaign?.campaignSpec.assetGenerationExecutions?.[0]?.assetIds[0],
    "asset_node_1_creative_output",
  );
  assert.deepEqual(
    (persistedCampaign?.canvasState.nodes[0]?.properties as Record<string, unknown>)
      .assetGeneration,
    {
      completed: 1,
      failed: 0,
      jobIds: ["batch_route_job_1"],
      status: "completed",
      assetIds: ["asset_node_1_creative_output"],
      resultIds: ["batch_route_job_1_result_1"],
      outputLocations: [
        {
          assetId: "asset_node_1_creative_output",
          primaryUri: "https://replicate.delivery/pbxt/generated.png",
          thumbnailUri: "https://replicate.delivery/pbxt/generated-thumb.png",
        },
      ],
    },
  );
});

test("generation route persists x3 Go provider URLs without changing the bridge response", async () => {
  const storage = new MemoryStorage();
  const campaign = createBlankCampaignRecord(storage, {
    id: "campaign_route",
    now: () => "2026-05-17T01:00:00.000Z",
  });
  const requestBody = {
    ...createBatchRequestBody(),
    fanOutCount: 3,
    jobs: [1, 2, 3].map((index) => ({
      jobId: `batch_route_job_${index}`,
      nodeId: `node_${index}`,
      prompt: "same prompt",
      provider: "mock",
      model: "mock-image",
      aspectRatio: "9:16",
      parameters: {},
    })),
  };
  const providerUrls = [
    "https://replicate.delivery/pbxt/generated-1.png",
    "https://replicate.delivery/pbxt/generated-2.png",
    "https://replicate.delivery/pbxt/generated-3.png",
  ];
  const forwardedBodies: unknown[] = [];

  updatePersistedCampaignRecord(
    storage,
    {
      ...campaign,
      campaignSpec: {
        ...campaign.campaignSpec,
        nodes: [1, 2, 3].map((index) => ({
          id: `node_${index}`,
          kind: "image",
          type: "image",
          title: "Image Block",
          subtitle: "Queued",
          description: "Image generation",
          tone: "ink",
          status: "DRAFT",
          contracts: [],
          position: { x: index * 120, y: 0 },
          properties: {},
        })),
      },
      canvasState: {
        ...campaign.canvasState,
        nodes: [1, 2, 3].map((index) => ({
          id: `node_${index}`,
          kind: "image",
          type: "image",
          title: "Image Block",
          subtitle: "Queued",
          description: "Image generation",
          tone: "ink",
          status: "DRAFT",
          contracts: [],
          position: { x: index * 120, y: 0 },
          properties: {},
        })),
      },
    },
    { now: () => "2026-05-17T01:00:01.000Z" },
  );

  const response = await action({
    request: createRouteRequest(requestBody),
    params: { campaignId: "campaign_route" },
    storage,
    now: () => "2026-05-17T01:00:02.000Z",
    fetchGenerationService: async (_url, init) => {
      forwardedBodies.push(JSON.parse(String(init?.body)));

      return Response.json({
        batchId: "batch_route",
        results: providerUrls.map((providerUrl, index) => ({
          jobId: `batch_route_job_${index + 1}`,
          nodeId: `node_${index + 1}`,
          status: "succeeded",
          providerRequestId: `replicate_prediction_${index + 1}`,
          providerUrl,
          mimeType: "image/png",
          width: 1024,
          height: 1792,
          generatedAt: `2026-05-17T01:00:0${index + 3}.000Z`,
        })),
      });
    },
    generationServiceUrl: "http://127.0.0.1:8787",
  });
  const body = (await response.json()) as {
    batch?: {
      results?: Array<{
        providerUrl?: string;
        persistedCreativeOutputAssetId?: string;
      }>;
    };
  };
  const persistedCampaign = getPersistedCampaignRecord(storage, "campaign_route");

  assert.equal(response.status, 200);
  assert.deepEqual(forwardedBodies, [requestBody]);
  assert.deepEqual(
    body.batch?.results?.map((result) => result.providerUrl),
    providerUrls,
  );
  assert.deepEqual(
    body.batch?.results?.map(
      (result) => result.persistedCreativeOutputAssetId,
    ),
    [1, 2, 3].map((index) => `asset_node_${index}_creative_output`),
  );
  assert.deepEqual(
    persistedCampaign?.assets.map((asset) => ({
      id: asset.id,
      uri: asset.uri,
      primaryUri: asset.outputLocations?.primaryUri,
      providerRequestId: asset.generatedMetadata?.providerRequestId,
    })),
    providerUrls.map((providerUrl, index) => ({
      id: `asset_node_${index + 1}_creative_output`,
      uri: providerUrl,
      primaryUri: providerUrl,
      providerRequestId: `replicate_prediction_${index + 1}`,
    })),
  );
  assert.deepEqual(
    persistedCampaign?.campaignSpec.assetGenerationExecutions?.map(
      (execution) => ({
        jobId: execution.jobId,
        assetIds: execution.assetIds,
        outputUris: execution.outputs.map((output) => output.uri),
      }),
    ),
    providerUrls.map((providerUrl, index) => ({
      jobId: `batch_route_job_${index + 1}`,
      assetIds: [`asset_node_${index + 1}_creative_output`],
      outputUris: [providerUrl],
    })),
  );
  assert.deepEqual(
    persistedCampaign?.canvasState.nodes.map((node) => ({
      id: node.id,
      status: node.status,
      assetGeneration: node.properties?.assetGeneration,
    })),
    providerUrls.map((providerUrl, index) => ({
      id: `node_${index + 1}`,
      status: "READY",
      assetGeneration: {
        completed: 1,
        failed: 0,
        jobIds: [`batch_route_job_${index + 1}`],
        status: "completed",
        assetIds: [`asset_node_${index + 1}_creative_output`],
        resultIds: [`batch_route_job_${index + 1}_result_${index + 1}`],
        outputLocations: [
          {
            assetId: `asset_node_${index + 1}_creative_output`,
            primaryUri: providerUrl,
          },
        ],
      },
    })),
  );
});

test("generation route isolates mixed fan-out failures and retries only the failed Image Block output", async () => {
  const storage = new MemoryStorage();
  const campaign = createBlankCampaignRecord(storage, {
    id: "campaign_route",
    now: () => "2026-05-17T03:00:00.000Z",
  });
  const x3RequestBody = {
    ...createBatchRequestBody(),
    fanOutCount: 3,
    jobs: [1, 2, 3].map((index) => ({
      jobId: `batch_route_job_${index}`,
      nodeId: `node_${index}`,
      prompt: "same prompt",
      provider: "mock",
      model: "mock-image",
      aspectRatio: "9:16",
      parameters: {},
    })),
  };
  const nodes = [1, 2, 3].map((index) =>
    createImageCanvasBlock(`node_${index}`, { x: index * 120, y: 0 }),
  );

  updatePersistedCampaignRecord(
    storage,
    {
      ...campaign,
      campaignSpec: {
        ...campaign.campaignSpec,
        nodes,
      },
      canvasState: {
        ...campaign.canvasState,
        nodes,
      },
    },
    { now: () => "2026-05-17T03:00:01.000Z" },
  );

  const mixedResponse = await action({
    request: createRouteRequest(x3RequestBody),
    params: { campaignId: "campaign_route" },
    storage,
    now: () => "2026-05-17T03:00:02.000Z",
    fetchGenerationService: async () =>
      Response.json({
        batchId: "batch_route",
        results: [
          {
            jobId: "batch_route_job_1",
            nodeId: "node_1",
            status: "succeeded",
            providerRequestId: "replicate_prediction_1",
            providerUrl: "https://replicate.delivery/pbxt/generated-1.png",
            mimeType: "image/png",
            width: 1024,
            height: 1792,
            generatedAt: "2026-05-17T03:00:03.000Z",
          },
          {
            jobId: "batch_route_job_2",
            nodeId: "node_2",
            status: "failed",
            providerRequestId: "",
            providerUrl: "",
            mimeType: "",
            width: 0,
            height: 0,
            generatedAt: "2026-05-17T03:00:04.000Z",
            error: {
              name: "GenerationProviderRejectedRequest",
              category: "provider_rejected",
              message: "provider rejected node 2",
              retryable: true,
            },
          },
          {
            jobId: "batch_route_job_3",
            nodeId: "node_3",
            status: "succeeded",
            providerRequestId: "replicate_prediction_3",
            providerUrl: "https://replicate.delivery/pbxt/generated-3.png",
            mimeType: "image/png",
            width: 1024,
            height: 1792,
            generatedAt: "2026-05-17T03:00:05.000Z",
          },
        ],
      }),
    generationServiceUrl: "http://127.0.0.1:8787",
  });
  const mixedBody = (await mixedResponse.json()) as {
    batch?: {
      results?: Array<{
        status?: string;
        persistedCreativeOutputAssetId?: string;
      }>;
    };
  };
  const campaignAfterMixed = getPersistedCampaignRecord(storage, "campaign_route");

  assert.equal(mixedResponse.status, 200);
  assert.deepEqual(
    mixedBody.batch?.results?.map((result) => ({
      status: result.status,
      persistedCreativeOutputAssetId: result.persistedCreativeOutputAssetId,
    })),
    [
      {
        status: "succeeded",
        persistedCreativeOutputAssetId: "asset_node_1_creative_output",
      },
      { status: "failed", persistedCreativeOutputAssetId: undefined },
      {
        status: "succeeded",
        persistedCreativeOutputAssetId: "asset_node_3_creative_output",
      },
    ],
  );
  assert.deepEqual(
    campaignAfterMixed?.assets.map((asset) => [asset.id, asset.uri]),
    [
      [
        "asset_node_1_creative_output",
        "https://replicate.delivery/pbxt/generated-1.png",
      ],
      [
        "asset_node_3_creative_output",
        "https://replicate.delivery/pbxt/generated-3.png",
      ],
    ],
  );
  assert.deepEqual(
    campaignAfterMixed?.canvasState.nodes.map((node) => ({
      id: node.id,
      assetGeneration: node.properties?.assetGeneration,
    })),
    [
      {
        id: "node_1",
        assetGeneration: {
          completed: 1,
          failed: 0,
          jobIds: ["batch_route_job_1"],
          status: "completed",
          assetIds: ["asset_node_1_creative_output"],
          resultIds: ["batch_route_job_1_result_1"],
          outputLocations: [
            {
              assetId: "asset_node_1_creative_output",
              primaryUri: "https://replicate.delivery/pbxt/generated-1.png",
            },
          ],
        },
      },
      {
        id: "node_2",
        assetGeneration: {
          completed: 0,
          failed: 1,
          jobIds: ["batch_route_job_2"],
          status: "failed",
        },
      },
      {
        id: "node_3",
        assetGeneration: {
          completed: 1,
          failed: 0,
          jobIds: ["batch_route_job_3"],
          status: "completed",
          assetIds: ["asset_node_3_creative_output"],
          resultIds: ["batch_route_job_3_result_3"],
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

  const retryRequestBody = {
    ...createBatchRequestBody(),
    fanOutCount: 1,
    jobs: [
      {
        jobId: "batch_route_job_2",
        nodeId: "node_2",
        prompt: "same prompt",
        provider: "mock",
        model: "mock-image",
        aspectRatio: "9:16",
        parameters: {},
      },
    ],
  };
  const retryResponse = await action({
    request: createRouteRequest(retryRequestBody),
    params: { campaignId: "campaign_route" },
    storage,
    now: () => "2026-05-17T03:01:00.000Z",
    fetchGenerationService: async () =>
      Response.json({
        batchId: "batch_route",
        results: [
          {
            jobId: "batch_route_job_2",
            nodeId: "node_2",
            status: "succeeded",
            providerRequestId: "replicate_prediction_2_retry",
            providerUrl: "https://replicate.delivery/pbxt/generated-2-retry.png",
            mimeType: "image/png",
            width: 1024,
            height: 1792,
            generatedAt: "2026-05-17T03:01:01.000Z",
          },
        ],
      }),
    generationServiceUrl: "http://127.0.0.1:8787",
  });
  const retryBody = (await retryResponse.json()) as {
    batch?: {
      results?: Array<{
        persistedCreativeOutputAssetId?: string;
      }>;
    };
  };
  const campaignAfterRetry = getPersistedCampaignRecord(storage, "campaign_route");

  assert.equal(retryResponse.status, 200);
  assert.deepEqual(
    retryBody.batch?.results?.map(
      (result) => result.persistedCreativeOutputAssetId,
    ),
    ["asset_node_2_creative_output"],
  );
  assert.deepEqual(
    campaignAfterRetry?.assets.map((asset) => [asset.id, asset.uri]),
    [
      [
        "asset_node_1_creative_output",
        "https://replicate.delivery/pbxt/generated-1.png",
      ],
      [
        "asset_node_3_creative_output",
        "https://replicate.delivery/pbxt/generated-3.png",
      ],
      [
        "asset_node_2_creative_output",
        "https://replicate.delivery/pbxt/generated-2-retry.png",
      ],
    ],
  );
  assert.deepEqual(
    campaignAfterRetry?.canvasState.nodes.map((node) => ({
      id: node.id,
      assetGeneration: node.properties?.assetGeneration,
    })),
    [
      {
        id: "node_1",
        assetGeneration: campaignAfterMixed?.canvasState.nodes[0]?.properties
          ?.assetGeneration,
      },
      {
        id: "node_2",
        assetGeneration: {
          completed: 1,
          failed: 0,
          jobIds: ["batch_route_job_2"],
          status: "completed",
          assetIds: ["asset_node_2_creative_output"],
          resultIds: ["batch_route_job_2_result_1"],
          outputLocations: [
            {
              assetId: "asset_node_2_creative_output",
              primaryUri: "https://replicate.delivery/pbxt/generated-2-retry.png",
            },
          ],
        },
      },
      {
        id: "node_3",
        assetGeneration: campaignAfterMixed?.canvasState.nodes[2]?.properties
          ?.assetGeneration,
      },
    ],
  );
});

test("generation route only returns Creative Output refs after asset persistence", async () => {
  const requestBody = createBatchRequestBody();

  const response = await action({
    request: createRouteRequest(requestBody),
    params: { campaignId: "campaign_route" },
    fetchGenerationService: async () =>
      Response.json({
        batchId: "batch_route",
        results: [
          {
            jobId: "batch_route_job_1",
            nodeId: "node_1",
            status: "succeeded",
            providerRequestId: "replicate_prediction_1",
            providerUrl: "https://replicate.delivery/pbxt/generated.png",
            mimeType: "image/png",
            width: 1024,
            height: 1024,
            persistedCreativeOutputAssetId: "asset_forged_by_service",
            generatedAt: "2026-05-17T00:00:03.000Z",
          },
        ],
      }),
    generationServiceUrl: "http://127.0.0.1:8787",
  });
  const body = (await response.json()) as {
    batch?: {
      results?: Array<{
        providerUrl?: string;
        persistedCreativeOutputAssetId?: string;
      }>;
    };
  };

  assert.equal(response.status, 200);
  assert.equal(
    body.batch?.results?.[0]?.providerUrl,
    "https://replicate.delivery/pbxt/generated.png",
  );
  assert.equal(
    body.batch?.results?.[0]?.persistedCreativeOutputAssetId,
    undefined,
  );
});

test("generation route preserves prior Creative Output refs when a retry fails", async () => {
  const storage = new MemoryStorage();
  const campaign = createBlankCampaignRecord(storage, {
    id: "campaign_route",
    now: () => "2026-05-17T02:00:00.000Z",
  });
  const requestBody = createBatchRequestBody();

  updatePersistedCampaignRecord(
    storage,
    {
      ...campaign,
      campaignSpec: {
        ...campaign.campaignSpec,
        nodes: [
          {
            id: "node_1",
            kind: "image",
            type: "image",
            title: "Image Block",
            subtitle: "Ready",
            description: "Image generation",
            tone: "ink",
            status: "DRAFT",
            contracts: [],
            position: { x: 0, y: 0 },
            properties: {},
          },
        ],
      },
      canvasState: {
        ...campaign.canvasState,
        nodes: [
          {
            id: "node_1",
            kind: "image",
            type: "image",
            title: "Image Block",
            subtitle: "Ready",
            description: "Image generation",
            tone: "ink",
            status: "DRAFT",
            contracts: [],
            position: { x: 0, y: 0 },
            properties: {},
          },
        ],
      },
    },
    { now: () => "2026-05-17T02:00:01.000Z" },
  );

  await action({
    request: createRouteRequest(requestBody),
    params: { campaignId: "campaign_route" },
    storage,
    now: () => "2026-05-17T02:00:02.000Z",
    fetchGenerationService: async () =>
      Response.json({
        batchId: "batch_route",
        results: [
          {
            jobId: "batch_route_job_1",
            nodeId: "node_1",
            status: "succeeded",
            providerRequestId: "replicate_prediction_success",
            providerUrl: "https://replicate.delivery/pbxt/prior-success.png",
            mimeType: "image/png",
            width: 1024,
            height: 1024,
            thumbnailUri: "https://replicate.delivery/pbxt/prior-success-thumb.png",
            sizeBytes: 4096,
            generatedAt: "2026-05-17T02:00:03.000Z",
          },
        ],
      }),
    generationServiceUrl: "http://127.0.0.1:8787",
  });

  const response = await action({
    request: createRouteRequest(requestBody),
    params: { campaignId: "campaign_route" },
    storage,
    now: () => "2026-05-17T02:01:00.000Z",
    fetchGenerationService: async () =>
      Response.json({
        batchId: "batch_route",
        results: [
          {
            jobId: "batch_route_job_1",
            nodeId: "node_1",
            status: "failed",
            providerRequestId: "",
            providerUrl: "",
            mimeType: "",
            width: 0,
            height: 0,
            generatedAt: "2026-05-17T02:01:01.000Z",
            error: {
              name: "GenerationProviderRejectedRequest",
              category: "provider_rejected",
              message: "provider rejected retry prompt",
              retryable: false,
            },
          },
        ],
      }),
    generationServiceUrl: "http://127.0.0.1:8787",
  });
  const body = (await response.json()) as {
    batch?: {
      results?: Array<{ persistedCreativeOutputAssetId?: string }>;
    };
  };
  const persistedCampaign = getPersistedCampaignRecord(storage, "campaign_route");
  const persistedJob = persistedCampaign?.campaignSpec.assetGenerationJobs[0];
  const persistedExecution =
    persistedCampaign?.campaignSpec.assetGenerationExecutions?.at(-1);

  assert.equal(response.status, 200);
  assert.equal(
    body.batch?.results?.[0]?.persistedCreativeOutputAssetId,
    undefined,
  );
  assert.equal(persistedCampaign?.assets.length, 1);
  assert.equal(
    persistedCampaign?.assets[0]?.uri,
    "https://replicate.delivery/pbxt/prior-success.png",
  );
  assert.equal(persistedJob?.status, "failed");
  assert.equal(
    persistedJob?.lifecycle?.failureDetails?.message,
    "provider rejected retry prompt",
  );
  assert.deepEqual(persistedJob?.resultMetadata?.map((result) => result.assetId), [
    "asset_node_1_creative_output",
  ]);
  assert.deepEqual(persistedExecution?.assetIds, [
    "asset_node_1_creative_output",
  ]);
  assert.equal(persistedExecution?.status, "failed");
  assert.equal(
    persistedExecution?.outputs[0]?.uri,
    "https://replicate.delivery/pbxt/prior-success.png",
  );
  assert.deepEqual(
    (persistedCampaign?.canvasState.nodes[0]?.properties as Record<string, unknown>)
      .assetGeneration,
    {
      completed: 0,
      failed: 1,
      jobIds: ["batch_route_job_1"],
      status: "failed",
      assetIds: ["asset_node_1_creative_output"],
      resultIds: ["batch_route_job_1_result_1"],
      outputLocations: [
        {
          assetId: "asset_node_1_creative_output",
          primaryUri: "https://replicate.delivery/pbxt/prior-success.png",
          thumbnailUri: "https://replicate.delivery/pbxt/prior-success-thumb.png",
        },
      ],
    },
  );
});

test("generation route rejects retry job ids already owned by another Image Block", async () => {
  const storage = new MemoryStorage();
  const campaign = createBlankCampaignRecord(storage, {
    id: "campaign_route",
    now: () => "2026-05-17T02:10:00.000Z",
  });
  const node1: CampaignCanvasBlock = {
    id: "node_1",
    kind: "image",
    type: "image",
    title: "Image Block 1",
    subtitle: "Ready",
    description: "Image generation",
    tone: "ink",
    status: "DRAFT",
    contracts: [],
    position: { x: 0, y: 0 },
    properties: {},
  };
  const node2: CampaignCanvasBlock = {
    ...node1,
    id: "node_2",
    title: "Image Block 2",
    position: { x: 120, y: 0 },
  };

  updatePersistedCampaignRecord(
    storage,
    {
      ...campaign,
      campaignSpec: {
        ...campaign.campaignSpec,
        nodes: [node1, node2],
      },
      canvasState: {
        ...campaign.canvasState,
        nodes: [node1, node2],
      },
    },
    { now: () => "2026-05-17T02:10:01.000Z" },
  );

  await action({
    request: createRouteRequest(createBatchRequestBody()),
    params: { campaignId: "campaign_route" },
    storage,
    now: () => "2026-05-17T02:10:02.000Z",
    fetchGenerationService: async () =>
      Response.json({
        batchId: "batch_route",
        results: [
          {
            jobId: "batch_route_job_1",
            nodeId: "node_1",
            status: "succeeded",
            providerRequestId: "replicate_prediction_node_1",
            providerUrl: "https://replicate.delivery/pbxt/node-1-success.png",
            mimeType: "image/png",
            width: 1024,
            height: 1024,
            generatedAt: "2026-05-17T02:10:03.000Z",
          },
        ],
      }),
    generationServiceUrl: "http://127.0.0.1:8787",
  });

  const conflictingRetryRequest = {
    ...createBatchRequestBody(),
    jobs: [
      {
        ...createBatchRequestBody().jobs[0],
        nodeId: "node_2",
      },
    ],
  };
  let providerCalled = false;

  const response = await action({
    request: createRouteRequest(conflictingRetryRequest),
    params: { campaignId: "campaign_route" },
    storage,
    now: () => "2026-05-17T02:11:00.000Z",
    fetchGenerationService: async () => {
      providerCalled = true;

      return Response.json({
        batchId: "batch_route",
        results: [
          {
            jobId: "batch_route_job_1",
            nodeId: "node_2",
            status: "failed",
            providerRequestId: "",
            providerUrl: "",
            mimeType: "",
            width: 0,
            height: 0,
            generatedAt: "2026-05-17T02:11:01.000Z",
            error: {
              name: "GenerationProviderRejectedRequest",
              category: "provider_rejected",
              message: "provider rejected retried sibling",
              retryable: false,
            },
          },
        ],
      });
    },
    generationServiceUrl: "http://127.0.0.1:8787",
  });
  const body = await response.json();
  const persistedCampaign = getPersistedCampaignRecord(storage, "campaign_route");

  assert.equal(response.status, 400);
  assert.equal(providerCalled, false);
  assert.deepEqual(body, {
    error: {
      code: "generation.invalid_batch",
      message:
        "Generation batch job ids must belong to their requested Image Blocks.",
    },
  });
  assert.deepEqual(
    persistedCampaign?.assets.map((asset) => ({
      id: asset.id,
      uri: asset.uri,
    })),
    [
      {
        id: "asset_node_1_creative_output",
        uri: "https://replicate.delivery/pbxt/node-1-success.png",
      },
    ],
  );
  assert.equal(
    persistedCampaign?.campaignSpec.assetGenerationJobs[0]?.resultMetadata?.[0]
      ?.assetId,
    "asset_node_1_creative_output",
  );
  assert.equal(
    (persistedCampaign?.canvasState.nodes[0]?.properties as Record<string, unknown>)
      .assetGenerationJobId,
    "batch_route_job_1",
  );
  assert.equal(
    (persistedCampaign?.canvasState.nodes[1]?.properties as Record<string, unknown>)
      .assetGenerationJobId,
    undefined,
  );
});

test("generation route preserves typed per-job failure categories", async () => {
  const response = await action({
    request: createRouteRequest(createBatchRequestBody()),
    params: { campaignId: "campaign_route" },
    fetchGenerationService: async () =>
      Response.json({
        batchId: "batch_route",
        results: [
          {
            jobId: "batch_route_job_1",
            nodeId: "node_1",
            status: "failed",
            providerRequestId: "",
            providerUrl: "",
            mimeType: "",
            width: 0,
            height: 0,
            generatedAt: "2026-05-17T00:00:00Z",
            error: {
              name: "GenerationTransportRequestFailed",
              category: "transport_error",
              message: "Generation service could not reach provider.",
              retryable: true,
            },
          },
        ],
      }),
    generationServiceUrl: "http://127.0.0.1:8787",
  });
  const body = (await response.json()) as {
    batch?: { results?: Array<{ error?: { category?: string } }> };
  };

  assert.equal(response.status, 200);
  assert.equal(body.batch?.results?.[0]?.error?.category, "transport_error");
});

test("generation route redacts secret-shaped per-job failure messages", async () => {
  const response = await action({
    request: createRouteRequest(createBatchRequestBody()),
    params: { campaignId: "campaign_route" },
    fetchGenerationService: async () =>
      Response.json({
        batchId: "batch_route",
        results: [
          {
            jobId: "batch_route_job_1",
            nodeId: "node_1",
            status: "failed",
            providerRequestId: "",
            providerUrl: "",
            mimeType: "",
            width: 0,
            height: 0,
            generatedAt: "2026-05-17T00:00:00Z",
            error: {
              name: "GenerationProviderAuthenticationFailed",
              category: "provider_configuration",
              message:
                "replicate rejected authorization=Bearer sk-secret-token token=sk-secret-token",
              retryable: false,
            },
          },
        ],
      }),
    generationServiceUrl: "http://127.0.0.1:8787",
  });
  const body = (await response.json()) as {
    batch?: { results?: Array<{ error?: { message?: string } }> };
  };

  assert.equal(response.status, 200);
  const message = body.batch?.results?.[0]?.error?.message ?? "";
  assert.equal(message.includes("sk-secret-token"), false);
  assert.match(message, /\[redacted\]/);
});

test("generation route falls back when service URL is blank", async () => {
  const calls: Array<{ url: string }> = [];

  const response = await action({
    request: createRouteRequest(createBatchRequestBody()),
    params: { campaignId: "campaign_route" },
    fetchGenerationService: async (url) => {
      calls.push({ url: String(url) });
      return Response.json({
        batchId: "batch_route",
        results: [
          {
            jobId: "batch_route_job_1",
            nodeId: "node_1",
            status: "succeeded",
            providerRequestId: "mock_request",
            providerUrl: "https://mock.owncanvas.local/node_1.png",
            mimeType: "image/png",
            width: 1024,
            height: 1024,
            generatedAt: "2026-05-17T00:00:00Z",
          },
        ],
      });
    },
    generationServiceUrl: "   ",
  });

  assert.equal(response.status, 200);
  assert.equal(calls[0]?.url, "http://127.0.0.1:8787/v1/generation/batches");
});

test("generation route reports Go service unavailable", async () => {
  const response = await action({
    request: createRouteRequest(createBatchRequestBody()),
    params: { campaignId: "campaign_route" },
    fetchGenerationService: async () => {
      throw new Error("connect ECONNREFUSED 127.0.0.1:8787");
    },
    generationServiceUrl: "http://127.0.0.1:8787",
  });
  const body = await response.json();

  assert.equal(response.status, 502);
  assert.deepEqual(body, {
    error: {
      code: "generation.service_unavailable",
      message: "Generation service is unavailable.",
    },
  });
});

test("generation route returns Allow header for non-POST requests", async () => {
  const response = await action({
    request: createRouteRequestWithMethod("GET"),
    params: { campaignId: "campaign_route" },
    fetchGenerationService: async () => Response.json({}),
    generationServiceUrl: "http://127.0.0.1:8787",
  });
  const body = await response.json();

  assert.equal(response.status, 405);
  assert.equal(response.headers.get("allow"), "POST");
  assert.deepEqual(body, {
    error: {
      code: "method_not_allowed",
      message: "Generation batches require POST.",
    },
  });
});

test("generation route rejects campaignId mismatches before forwarding", async () => {
  let called = false;

  const response = await action({
    request: createRouteRequest(createBatchRequestBody("other_campaign")),
    params: { campaignId: "campaign_route" },
    fetchGenerationService: async () => {
      called = true;
      return Response.json({});
    },
    generationServiceUrl: "http://127.0.0.1:8787",
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(called, false);
  assert.deepEqual(body, {
    error: {
      code: "generation.invalid_batch",
      message: "Generation batch campaignId must match the route campaignId.",
    },
  });
});

test("generation route rejects malformed client batch before forwarding", async () => {
  let called = false;
  const malformedRequest = {
    ...createBatchRequestBody(),
    fanOutCount: 2,
  };

  const response = await action({
    request: createRouteRequest(malformedRequest),
    params: { campaignId: "campaign_route" },
    fetchGenerationService: async () => {
      called = true;
      return Response.json({});
    },
    generationServiceUrl: "http://127.0.0.1:8787",
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(called, false);
  assert.deepEqual(body, {
    error: {
      code: "generation.invalid_batch",
      message: "Generation batch request must match the generation batch contract.",
    },
  });
});

test("generation route reports Go service errors", async () => {
  const response = await action({
    request: createRouteRequest(createBatchRequestBody()),
    params: { campaignId: "campaign_route" },
    fetchGenerationService: async () =>
      Response.json({ error: "provider failed" }, { status: 500 }),
    generationServiceUrl: "http://127.0.0.1:8787",
  });
  const body = await response.json();

  assert.equal(response.status, 502);
  assert.deepEqual(body, {
    error: {
      code: "generation.service_error",
      message: "Generation service rejected the batch.",
    },
  });
});

test("generation route maps Go validation errors to invalid batch", async () => {
  const response = await action({
    request: createRouteRequest(createBatchRequestBody()),
    params: { campaignId: "campaign_route" },
    fetchGenerationService: async () =>
      Response.json(
        { error: { code: "fan_out_invalid", message: "too many jobs" } },
        { status: 400 },
      ),
    generationServiceUrl: "http://127.0.0.1:8787",
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.deepEqual(body, {
    error: {
      code: "generation.invalid_batch",
      message: "Generation service rejected the batch.",
    },
  });
});

test("generation route reports invalid service JSON", async () => {
  const response = await action({
    request: createRouteRequest(createBatchRequestBody()),
    params: { campaignId: "campaign_route" },
    fetchGenerationService: async () =>
      new Response("not json", {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    generationServiceUrl: "http://127.0.0.1:8787",
  });
  const body = await response.json();

  assert.equal(response.status, 502);
  assert.deepEqual(body, {
    error: {
      code: "generation.invalid_service_response",
      message: "Generation service response must be valid JSON.",
    },
  });
});

test("generation route reports structurally invalid service JSON", async () => {
  const response = await action({
    request: createRouteRequest(createBatchRequestBody()),
    params: { campaignId: "campaign_route" },
    fetchGenerationService: async () => Response.json({ batchId: "x" }),
    generationServiceUrl: "http://127.0.0.1:8787",
  });
  const body = await response.json();

  assert.equal(response.status, 502);
  assert.deepEqual(body, {
    error: {
      code: "generation.invalid_service_response",
      message: "Generation service response must be valid JSON.",
    },
  });
});

test("generation route rejects incomplete service result sets", async () => {
  const response = await action({
    request: createRouteRequest(createBatchRequestBody()),
    params: { campaignId: "campaign_route" },
    fetchGenerationService: async () =>
      Response.json({
        batchId: "batch_route",
        results: [],
      }),
    generationServiceUrl: "http://127.0.0.1:8787",
  });
  const body = await response.json();

  assert.equal(response.status, 502);
  assert.deepEqual(body, {
    error: {
      code: "generation.invalid_service_response",
      message: "Generation service response must be valid JSON.",
    },
  });
});

test("generation route rejects mismatched service result node IDs", async () => {
  const response = await action({
    request: createRouteRequest(createBatchRequestBody()),
    params: { campaignId: "campaign_route" },
    fetchGenerationService: async () =>
      Response.json({
        batchId: "batch_route",
        results: [
          {
            jobId: "batch_route_job_1",
            nodeId: "other_node",
            status: "succeeded",
            providerRequestId: "mock_request",
            providerUrl: "https://mock.owncanvas.local/node_1.png",
            mimeType: "image/png",
            width: 1024,
            height: 1024,
            generatedAt: "2026-05-17T00:00:00Z",
          },
        ],
      }),
    generationServiceUrl: "http://127.0.0.1:8787",
  });
  const body = await response.json();

  assert.equal(response.status, 502);
  assert.deepEqual(body, {
    error: {
      code: "generation.invalid_service_response",
      message: "Generation service response must be valid JSON.",
    },
  });
});

test("generation route rejects non-terminal service results", async () => {
  const response = await action({
    request: createRouteRequest(createBatchRequestBody()),
    params: { campaignId: "campaign_route" },
    fetchGenerationService: async () =>
      Response.json({
        batchId: "batch_route",
        results: [
          {
            jobId: "batch_route_job_1",
            nodeId: "node_1",
            status: "running",
            providerRequestId: "mock_request",
            providerUrl: "https://mock.owncanvas.local/node_1.png",
            mimeType: "image/png",
            width: 1024,
            height: 1024,
            generatedAt: "2026-05-17T00:00:00Z",
          },
        ],
      }),
    generationServiceUrl: "http://127.0.0.1:8787",
  });
  const body = await response.json();

  assert.equal(response.status, 502);
  assert.deepEqual(body, {
    error: {
      code: "generation.invalid_service_response",
      message: "Generation service response must be valid JSON.",
    },
  });
});

class MemoryStorage implements Pick<Storage, "getItem" | "setItem"> {
  private readonly store = new Map<string, string>();

  getItem(key: string) {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.store.set(key, value);
  }
}
