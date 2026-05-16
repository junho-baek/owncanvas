import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createGenerationBatchRequest,
  isGenerationBatchRequest,
  isGenerationBatchResponse,
  normalizeGenerationBatchResponse,
} from "./generation-batch.ts";

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
    prompt: "same prompt",
    provider: "mock",
    model: "mock-image",
    aspectRatio: "9:16",
    parameters: { size: "1024x1792" },
  });
  assert.equal(request.jobs[0]?.prompt, "same prompt");
  assert.deepEqual(request.jobs[0]?.parameters, { size: "1024x1792" });
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
          message: "provider rejected prompt",
          retryable: true,
        },
      },
    ],
  });

  assert.equal(result.results[0]?.status, "succeeded");
  assert.equal(result.results[1]?.status, "failed");
  assert.equal(result.results[1]?.error?.message, "provider rejected prompt");
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
});
