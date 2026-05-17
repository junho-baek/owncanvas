import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createGeneratedCreativeOutputAssetId,
  createGenerationBatchRequest,
  isGenerationBatchRequest,
  isGenerationBatchResponse,
  isGenerationBatchResponseForRequest,
  normalizeGenerationBatchResponse,
} from "./generation-batch.ts";

test("createGeneratedCreativeOutputAssetId maps duplicated Image Blocks to campaign asset ids", () => {
  assert.equal(
    createGeneratedCreativeOutputAssetId("image_source_batch_20260517000000000_2"),
    "asset_image_source_batch_20260517000000000_2_creative_output",
  );
  assert.equal(
    createGeneratedCreativeOutputAssetId("image source/batch#1"),
    "asset_image_source_batch_1_creative_output",
  );
});

test("createGenerationBatchRequest caps fan-out at x10 and preserves node job mapping", () => {
  const parameters = { size: "1024x1792" };
  const request = createGenerationBatchRequest({
    batchId: "batch_contract",
    campaignId: "campaign_contract",
    sourceNodeId: "source_image",
    prompt: "same prompt",
    provider: "mock",
    model: "mock-image",
    aspectRatio: "9:16",
    nodeIds: ["node_1", "node_2", "node_3"],
    parameters,
  });

  parameters.size = "mutated";

  assert.equal(request.fanOutCount, 3);
  assert.deepEqual(
    request.jobs.map((job) => [job.jobId, job.nodeId]),
    [
      ["batch_contract_job_1", "node_1"],
      ["batch_contract_job_2", "node_2"],
      ["batch_contract_job_3", "node_3"],
    ],
  );
  assert.deepEqual(request.spec, {
    specId: "batch_contract_spec",
    campaignId: "campaign_contract",
    sourceNodeId: "source_image",
    mediaType: "image",
    prompt: "same prompt",
    provider: "mock",
    model: "mock-image",
    aspectRatio: "9:16",
    parameters: { size: "1024x1792" },
  });
  assert.equal(request.jobs[0]?.mediaType, "image");
  assert.equal(request.jobs[0]?.prompt, "same prompt");
  assert.deepEqual(request.jobs[0]?.parameters, { size: "1024x1792" });
});

test("createGenerationBatchRequest can target Video Block generation", () => {
  const request = createGenerationBatchRequest({
    batchId: "batch_video_contract",
    campaignId: "campaign_contract",
    sourceNodeId: "video_source",
    mediaType: "video",
    prompt: "educational 3D animation",
    provider: "replicate",
    model: "bytedance/seedance-1-lite",
    aspectRatio: "16:9",
    nodeIds: ["video_source"],
    parameters: {
      replicate: {
        input: {
          prompt: "educational 3D animation",
          duration: 2,
          resolution: "480p",
          aspect_ratio: "16:9",
        },
      },
    },
  });

  assert.equal(request.spec.mediaType, "video");
  assert.equal(request.jobs[0]?.mediaType, "video");
  assert.equal(request.jobs[0]?.model, "bytedance/seedance-1-lite");
  assert.deepEqual(request.jobs[0]?.parameters, {
    replicate: {
      input: {
        prompt: "educational 3D animation",
        duration: 2,
        resolution: "480p",
        aspect_ratio: "16:9",
      },
    },
  });
  assert.equal(isGenerationBatchRequest(request), true);
});

test("createGenerationBatchRequest rejects more than ten nodes", () => {
  assert.throws(
    () =>
      createGenerationBatchRequest({
        batchId: "batch_too_large",
        campaignId: "campaign_contract",
        sourceNodeId: "source_image",
        prompt: "same prompt",
        provider: "mock",
        model: "mock-image",
        aspectRatio: "9:16",
        nodeIds: Array.from({ length: 11 }, (_, index) => `node_${index}`),
        parameters: {},
      }),
    /fan-out count must be between 1 and 10/,
  );
});

test("createGenerationBatchRequest rejects empty fan-out", () => {
  assert.throws(
    () =>
      createGenerationBatchRequest({
        batchId: "batch_empty",
        campaignId: "campaign_contract",
        sourceNodeId: "source_image",
        prompt: "same prompt",
        provider: "mock",
        model: "mock-image",
        aspectRatio: "9:16",
        nodeIds: [],
        parameters: {},
      }),
    /fan-out count must be between 1 and 10/,
  );
});

test("normalizeGenerationBatchResponse keeps partial failures", () => {
  const result = normalizeGenerationBatchResponse({
    batchId: "batch_partial",
    results: [
      {
        jobId: "job_1",
        nodeId: "node_1",
        status: "succeeded",
        providerRequestId: "request_1",
        providerUrl: "https://provider.example.test/1.png",
        mimeType: "image/png",
        width: 1024,
        height: 1024,
        thumbnailUri: "https://provider.example.test/1-thumb.png",
        sizeBytes: 4096,
        persistedCreativeOutputAssetId: "asset_node_1_creative_output",
        generatedAt: "2026-05-17T00:00:00Z",
      },
      {
        jobId: "job_2",
        nodeId: "node_2",
        status: "failed",
        providerRequestId: "",
        providerUrl: "",
        mimeType: "",
        width: 0,
        height: 0,
        generatedAt: "2026-05-17T00:00:01Z",
        error: {
          name: "provider_error",
          category: "provider_rejected",
          message: "provider rejected prompt",
          retryable: true,
        },
      },
    ],
  });

  assert.equal(result.results[0]?.status, "succeeded");
  assert.equal(
    result.results[0]?.thumbnailUri,
    "https://provider.example.test/1-thumb.png",
  );
  assert.equal(result.results[0]?.sizeBytes, 4096);
  assert.equal(
    result.results[0]?.persistedCreativeOutputAssetId,
    "asset_node_1_creative_output",
  );
  assert.equal(result.results[1]?.status, "failed");
  assert.equal(result.results[1]?.error?.category, "provider_rejected");
  assert.equal(result.results[1]?.error?.message, "provider rejected prompt");
});

test("duplicated Image Block results keep persisted Creative Output asset bindings", () => {
  const request = createGenerationBatchRequest({
    batchId: "image_source_batch_20260517000000000",
    campaignId: "campaign_contract",
    sourceNodeId: "image_source",
    prompt: "same prompt",
    provider: "mock",
    model: "mock-image",
    aspectRatio: "9:16",
    nodeIds: [
      "image_source_batch_20260517000000000_1",
      "image_source_batch_20260517000000000_2",
      "image_source_batch_20260517000000000_3",
    ],
    parameters: {},
  });
  const response = normalizeGenerationBatchResponse({
    batchId: request.batchId,
    results: request.jobs.map((job, index) => ({
      jobId: job.jobId,
      nodeId: job.nodeId,
      status: "succeeded",
      providerRequestId: `replicate_prediction_${index + 1}`,
      providerUrl: `https://replicate.delivery/pbxt/generated-${index + 1}.png`,
      mimeType: "image/png",
      width: 1024,
      height: 1792,
      persistedCreativeOutputAssetId: createGeneratedCreativeOutputAssetId(
        job.nodeId,
      ),
      generatedAt: `2026-05-17T04:00:0${index + 1}.000Z`,
    })),
  });

  assert.equal(isGenerationBatchResponse(response), true);
  assert.equal(isGenerationBatchResponseForRequest(response, request), true);
  assert.deepEqual(
    response.results.map((result) => ({
      nodeId: result.nodeId,
      providerUrl: result.providerUrl,
      persistedCreativeOutputAssetId: result.persistedCreativeOutputAssetId,
    })),
    [
      {
        nodeId: "image_source_batch_20260517000000000_1",
        providerUrl: "https://replicate.delivery/pbxt/generated-1.png",
        persistedCreativeOutputAssetId:
          "asset_image_source_batch_20260517000000000_1_creative_output",
      },
      {
        nodeId: "image_source_batch_20260517000000000_2",
        providerUrl: "https://replicate.delivery/pbxt/generated-2.png",
        persistedCreativeOutputAssetId:
          "asset_image_source_batch_20260517000000000_2_creative_output",
      },
      {
        nodeId: "image_source_batch_20260517000000000_3",
        providerUrl: "https://replicate.delivery/pbxt/generated-3.png",
        persistedCreativeOutputAssetId:
          "asset_image_source_batch_20260517000000000_3_creative_output",
      },
    ],
  );
});

test("isGenerationBatchRequest rejects malformed fan-out and jobs contract", () => {
  const validRequest = createGenerationBatchRequest({
    batchId: "batch_contract",
    campaignId: "campaign_contract",
    sourceNodeId: "source_image",
    prompt: "same prompt",
    provider: "mock",
    model: "mock-image",
    aspectRatio: "9:16",
    nodeIds: ["node_1"],
    parameters: {},
  });

  assert.equal(isGenerationBatchRequest(validRequest), true);
  assert.equal(
    isGenerationBatchRequest({ ...validRequest, fanOutCount: 2 }),
    false,
  );
  assert.equal(
    isGenerationBatchRequest({
      ...validRequest,
      jobs: [{ ...validRequest.jobs[0], provider: "" }],
    }),
    false,
  );
  assert.equal(
    isGenerationBatchRequest({
      ...validRequest,
      spec: { ...validRequest.spec, mediaType: "audio" },
    }),
    false,
  );
});

test("isGenerationBatchResponse rejects malformed result contract", () => {
  assert.equal(isGenerationBatchResponse({ batchId: "batch_missing" }), false);
  assert.equal(
    isGenerationBatchResponse({
      batchId: "batch_bad_status",
      results: [
        {
          jobId: "job_1",
          nodeId: "node_1",
          status: "done",
          providerRequestId: "request_1",
          providerUrl: "https://provider.example.test/1.png",
          mimeType: "image/png",
          width: 1024,
          height: 1024,
          generatedAt: "2026-05-17T00:00:00Z",
        },
      ],
    }),
    false,
  );
  assert.equal(
    isGenerationBatchResponse({
      batchId: "batch_bad_metadata",
      results: [
        {
          jobId: "job_1",
          nodeId: "node_1",
          status: "succeeded",
          providerRequestId: "request_1",
          providerUrl: "https://provider.example.test/1.png",
          mimeType: "image/png",
          width: 1024,
          height: 1024,
          thumbnailUri: "not-a-url",
          sizeBytes: -1,
          generatedAt: "2026-05-17T00:00:00Z",
        },
      ],
    }),
    false,
  );
  assert.equal(
    isGenerationBatchResponse({
      batchId: "batch_bad_failure_category",
      results: [
        {
          jobId: "job_1",
          nodeId: "node_1",
          status: "failed",
          providerRequestId: "",
          providerUrl: "",
          mimeType: "",
          width: 0,
          height: 0,
          generatedAt: "2026-05-17T00:00:00Z",
          error: {
            name: "provider_error",
            category: "unknown_failure_category",
            message: "provider rejected prompt",
            retryable: true,
          },
        },
      ],
    }),
    false,
  );
});

test("isGenerationBatchResponseForRequest rejects incomplete or mismatched service results", () => {
  const request = createGenerationBatchRequest({
    batchId: "batch_contract",
    campaignId: "campaign_contract",
    sourceNodeId: "source_image",
    prompt: "same prompt",
    provider: "mock",
    model: "mock-image",
    aspectRatio: "9:16",
    nodeIds: ["node_1", "node_2"],
    parameters: {},
  });
  const result = {
    jobId: "batch_contract_job_1",
    nodeId: "node_1",
    status: "succeeded" as const,
    providerRequestId: "request_1",
    providerUrl: "https://provider.example.test/1.png",
    mimeType: "image/png",
    width: 1024,
    height: 1024,
    generatedAt: "2026-05-17T00:00:00Z",
  };
  const validResponse = {
    batchId: "batch_contract",
    results: [
      result,
      {
        ...result,
        jobId: "batch_contract_job_2",
        nodeId: "node_2",
        providerRequestId: "request_2",
        providerUrl: "https://provider.example.test/2.png",
      },
    ],
  };

  assert.equal(isGenerationBatchResponseForRequest(validResponse, request), true);
  assert.equal(
    isGenerationBatchResponseForRequest(
      {
        ...validResponse,
        results: [],
      },
      request,
    ),
    false,
  );
  assert.equal(
    isGenerationBatchResponseForRequest(
      {
        ...validResponse,
        results: [{ ...result, nodeId: "other_node" }, validResponse.results[1]],
      },
      request,
    ),
    false,
  );
  assert.equal(
    isGenerationBatchResponseForRequest(
      {
        ...validResponse,
        batchId: "other_batch",
      },
      request,
    ),
    false,
  );
  assert.equal(
    isGenerationBatchResponseForRequest(
      {
        ...validResponse,
        results: [
          { ...result, status: "running" },
          validResponse.results[1],
        ],
      },
      request,
    ),
    false,
  );
});
