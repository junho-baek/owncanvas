import assert from "node:assert/strict";
import { test } from "node:test";

import { action } from "./api.campaign-generation.ts";

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
          generatedAt: "2026-05-17T00:00:00Z",
        },
      ],
    },
  });
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
