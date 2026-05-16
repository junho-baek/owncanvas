export const GENERATION_BATCH_MAX_FAN_OUT = 10;

export type GenerationJobStatus = "queued" | "running" | "succeeded" | "failed";

export type GenerationSpec = {
  specId: string;
  campaignId: string;
  sourceNodeId: string;
  prompt: string;
  provider: string;
  model: string;
  aspectRatio: string;
  parameters: Record<string, unknown>;
};

export type GenerationJobRequest = {
  jobId: string;
  nodeId: string;
  prompt: string;
  provider: string;
  model: string;
  aspectRatio: string;
  parameters: Record<string, unknown>;
};

export type GenerationBatchRequest = {
  batchId: string;
  campaignId: string;
  sourceNodeId: string;
  fanOutCount: number;
  spec: GenerationSpec;
  jobs: GenerationJobRequest[];
};

export type GenerationJobError = {
  name: string;
  message: string;
  retryable: boolean;
};

export type GenerationJobResult = {
  jobId: string;
  nodeId: string;
  status: GenerationJobStatus;
  providerRequestId: string;
  providerUrl: string;
  mimeType: string;
  width: number;
  height: number;
  generatedAt: string;
  error?: GenerationJobError;
};

export type GenerationBatchResponse = {
  batchId: string;
  results: GenerationJobResult[];
};

const generationJobStatuses: readonly GenerationJobStatus[] = [
  "queued",
  "running",
  "succeeded",
  "failed",
];

export function createGenerationBatchRequest(input: {
  batchId: string;
  campaignId: string;
  sourceNodeId: string;
  prompt: string;
  provider: string;
  model: string;
  aspectRatio: string;
  nodeIds: string[];
  parameters: Record<string, unknown>;
}): GenerationBatchRequest {
  const fanOutCount = input.nodeIds.length;

  if (fanOutCount < 1 || fanOutCount > GENERATION_BATCH_MAX_FAN_OUT) {
    throw new Error("fan-out count must be between 1 and 10");
  }

  const spec: GenerationSpec = {
    specId: `${input.batchId}_spec`,
    campaignId: input.campaignId,
    sourceNodeId: input.sourceNodeId,
    prompt: input.prompt,
    provider: input.provider,
    model: input.model,
    aspectRatio: input.aspectRatio,
    parameters: { ...input.parameters },
  };

  return {
    batchId: input.batchId,
    campaignId: input.campaignId,
    sourceNodeId: input.sourceNodeId,
    fanOutCount,
    spec,
    jobs: input.nodeIds.map((nodeId, index) => ({
      jobId: `${input.batchId}_job_${index + 1}`,
      nodeId,
      prompt: input.prompt,
      provider: input.provider,
      model: input.model,
      aspectRatio: input.aspectRatio,
      parameters: { ...input.parameters },
    })),
  };
}

export function normalizeGenerationBatchResponse(
  response: GenerationBatchResponse,
): GenerationBatchResponse {
  return {
    batchId: response.batchId,
    results: response.results.map((result) => ({
      ...result,
      error: result.error === undefined ? undefined : { ...result.error },
    })),
  };
}

export function isGenerationBatchRequest(
  value: unknown,
): value is GenerationBatchRequest {
  if (!isRecord(value)) {
    return false;
  }

  if (
    !isNonEmptyString(value.batchId) ||
    !isNonEmptyString(value.campaignId) ||
    !isNonEmptyString(value.sourceNodeId) ||
    !isFanOutCount(value.fanOutCount) ||
    !isGenerationSpec(value.spec) ||
    !Array.isArray(value.jobs) ||
    value.jobs.length !== value.fanOutCount ||
    !value.jobs.every(isGenerationJobRequest)
  ) {
    return false;
  }

  return (
    value.spec.campaignId === value.campaignId &&
    value.spec.sourceNodeId === value.sourceNodeId
  );
}

export function isGenerationBatchResponse(
  value: unknown,
): value is GenerationBatchResponse {
  return (
    isRecord(value) &&
    isNonEmptyString(value.batchId) &&
    Array.isArray(value.results) &&
    value.results.every(isGenerationJobResult)
  );
}

export function isGenerationBatchResponseForRequest(
  response: GenerationBatchResponse,
  request: GenerationBatchRequest,
): boolean {
  if (
    response.batchId !== request.batchId ||
    response.results.length !== request.jobs.length
  ) {
    return false;
  }

  const expectedJobsByJobId = new Map(
    request.jobs.map((job) => [job.jobId, job]),
  );
  const seenJobIds = new Set<string>();
  const seenNodeIds = new Set<string>();

  if (expectedJobsByJobId.size !== request.jobs.length) {
    return false;
  }

  for (const result of response.results) {
    const expectedJob = expectedJobsByJobId.get(result.jobId);

    if (
      expectedJob === undefined ||
      expectedJob.nodeId !== result.nodeId ||
      !isTerminalGenerationJobResult(result) ||
      seenJobIds.has(result.jobId) ||
      seenNodeIds.has(result.nodeId)
    ) {
      return false;
    }

    seenJobIds.add(result.jobId);
    seenNodeIds.add(result.nodeId);
  }

  return seenJobIds.size === request.jobs.length;
}

function isTerminalGenerationJobResult(result: GenerationJobResult) {
  return result.status === "succeeded" || result.status === "failed";
}

function isGenerationSpec(value: unknown): value is GenerationSpec {
  return (
    isRecord(value) &&
    isNonEmptyString(value.specId) &&
    isNonEmptyString(value.campaignId) &&
    isNonEmptyString(value.sourceNodeId) &&
    isString(value.prompt) &&
    isNonEmptyString(value.provider) &&
    isNonEmptyString(value.model) &&
    isNonEmptyString(value.aspectRatio) &&
    isRecord(value.parameters)
  );
}

function isGenerationJobRequest(value: unknown): value is GenerationJobRequest {
  return (
    isRecord(value) &&
    isNonEmptyString(value.jobId) &&
    isNonEmptyString(value.nodeId) &&
    isString(value.prompt) &&
    isNonEmptyString(value.provider) &&
    isNonEmptyString(value.model) &&
    isNonEmptyString(value.aspectRatio) &&
    isRecord(value.parameters)
  );
}

function isGenerationJobResult(value: unknown): value is GenerationJobResult {
  return (
    isRecord(value) &&
    isNonEmptyString(value.jobId) &&
    isNonEmptyString(value.nodeId) &&
    isGenerationJobStatus(value.status) &&
    isString(value.providerRequestId) &&
    isString(value.providerUrl) &&
    isString(value.mimeType) &&
    isFiniteNumber(value.width) &&
    isFiniteNumber(value.height) &&
    isNonEmptyString(value.generatedAt) &&
    (value.error === undefined || isGenerationJobError(value.error))
  );
}

function isGenerationJobError(value: unknown): value is GenerationJobError {
  return (
    isRecord(value) &&
    isNonEmptyString(value.name) &&
    isNonEmptyString(value.message) &&
    typeof value.retryable === "boolean"
  );
}

function isGenerationJobStatus(value: unknown): value is GenerationJobStatus {
  return (
    typeof value === "string" &&
    generationJobStatuses.includes(value as GenerationJobStatus)
  );
}

function isFanOutCount(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= GENERATION_BATCH_MAX_FAN_OUT
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
