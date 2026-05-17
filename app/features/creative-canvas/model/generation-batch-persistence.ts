import {
  createGeneratedCreativeOutputAssetId,
  type GenerationMediaType,
  type GenerationBatchRequest,
  type GenerationBatchResponse,
  type GenerationJobRequest,
  type GenerationJobResult,
} from "./generation-batch.ts";
import {
  applyCampaignAssetGenerationExecutionResult,
  type CampaignAssetGenerationExecutionRecord,
  type CampaignAssetGenerationExecutionResult,
  type CampaignAssetGenerationExecutionStatusEvent,
  type CampaignAssetGenerationJob,
  type CampaignAssetGenerationJobStatusSnapshot,
  type CampaignAssetGenerationResultMetadata,
  type CampaignCanvasBlock,
  type CampaignDraft,
} from "./creative-canvas.ts";

export type PersistGenerationBatchResponseToCampaignResult<
  TCampaign extends CampaignDraft = CampaignDraft,
> = {
  campaign: TCampaign;
  response: GenerationBatchResponse;
  persistedCreativeOutputAssetIds: Map<string, string>;
};

export function persistGenerationBatchResponseToCampaign<
  TCampaign extends CampaignDraft,
>(input: {
  campaign: TCampaign;
  request: GenerationBatchRequest;
  response: GenerationBatchResponse;
  now?: () => string;
}): PersistGenerationBatchResponseToCampaignResult<TCampaign> {
  const safeResponse = stripPersistedCreativeOutputRefs(input.response);
  const executionResult = createCampaignExecutionResultFromGenerationBatch({
    campaign: input.campaign,
    request: input.request,
    response: safeResponse,
    observedAt: input.now?.() ?? new Date().toISOString(),
  });
  const campaignWithJobLinks = linkGenerationJobsToCanvasNodes(
    input.campaign,
    executionResult.jobs,
    input.request,
  );
  const campaign = applyCampaignAssetGenerationExecutionResult(
    campaignWithJobLinks,
    executionResult,
    {
      now: input.now,
      createdBy: "agent",
      rightsOwner: "OwnCanvas generated output",
      rightsLicense: "campaign-use",
    },
  );
  const persistedAssetIds = new Set(campaign.assets.map((asset) => asset.id));
  const persistedCreativeOutputAssetIds = new Map<string, string>();

  for (const job of executionResult.completedJobs) {
    const assetId = job.resultMetadata?.[0]?.assetId;

    if (assetId !== undefined && persistedAssetIds.has(assetId)) {
      persistedCreativeOutputAssetIds.set(job.id, assetId);
    }
  }

  return {
    campaign,
    response: attachPersistedCreativeOutputRefs(
      safeResponse,
      persistedCreativeOutputAssetIds,
    ),
    persistedCreativeOutputAssetIds,
  };
}

export function stripPersistedCreativeOutputRefs(
  response: GenerationBatchResponse,
): GenerationBatchResponse {
  return {
    ...response,
    results: response.results.map((result) => {
      const { persistedCreativeOutputAssetId: _ignored, ...safeResult } =
        result;

      return safeResult;
    }),
  };
}

function attachPersistedCreativeOutputRefs(
  response: GenerationBatchResponse,
  persistedAssetIdsByJobId: Map<string, string>,
): GenerationBatchResponse {
  return {
    ...response,
    results: response.results.map((result) => {
      const persistedCreativeOutputAssetId = persistedAssetIdsByJobId.get(
        result.jobId,
      );

      if (
        result.status !== "succeeded" ||
        persistedCreativeOutputAssetId === undefined
      ) {
        return result;
      }

      return {
        ...result,
        persistedCreativeOutputAssetId,
      };
    }),
  };
}

function createCampaignExecutionResultFromGenerationBatch(input: {
  campaign: CampaignDraft;
  request: GenerationBatchRequest;
  response: GenerationBatchResponse;
  observedAt: string;
}): CampaignAssetGenerationExecutionResult {
  const requestJobsById = new Map(
    input.request.jobs.map((job) => [job.jobId, job] as const),
  );
  const existingJobsById = new Map(
    (input.campaign.campaignSpec.assetGenerationJobs ?? []).map(
      (job) => [job.id, job] as const,
    ),
  );
  const jobs = input.response.results.map((result, index) => {
    const requestJob = requestJobsById.get(result.jobId);
    const mediaType = resolveGenerationMediaType(
      requestJob?.mediaType ?? input.request.spec.mediaType,
    );
    const expectedAssetId = createGeneratedCreativeOutputAssetId(result.nodeId);
    const existingJob = getReusableExistingGenerationJobForNode(
      existingJobsById.get(result.jobId),
      expectedAssetId,
    );
    const generatedAt = result.generatedAt || input.observedAt;
    const attempt = (existingJob?.lifecycle?.attempt ?? 0) + 1;
    const assetId =
      existingJob?.outputTargets.find((target) => target.field === "uri")
        ?.assetId ?? expectedAssetId;
    const resultMetadata =
      result.status === "succeeded"
        ? [
            createResultMetadataFromGenerationJob({
              result,
              assetId,
              prompt: requestJob?.prompt ?? input.request.spec.prompt,
              model: requestJob?.model ?? input.request.spec.model,
              mediaType,
              parameters:
                requestJob?.parameters ?? input.request.spec.parameters,
              index,
            }),
          ]
        : existingJob?.resultMetadata?.map((metadata) =>
            cloneCampaignAssetGenerationResultMetadata(metadata),
          ) ?? [];
    const lifecycle = {
      createdAt: existingJob?.lifecycle?.createdAt ?? input.observedAt,
      updatedAt: generatedAt,
      queuedAt: existingJob?.lifecycle?.queuedAt ?? input.observedAt,
      startedAt: existingJob?.lifecycle?.startedAt ?? input.observedAt,
      completedAt: result.status === "succeeded" ? generatedAt : null,
      failedAt: result.status === "failed" ? generatedAt : null,
      canceledAt: null,
      actor: "system" as const,
      attempt,
      progress: result.status === "succeeded" ? 100 : 0,
      error:
        result.status === "failed"
          ? result.error?.message ?? "Generation failed."
          : null,
      ...(result.status === "failed" && result.error !== undefined
        ? {
            failureDetails: {
              name: result.error.name,
              message: result.error.message,
              stack: null,
              jobId: result.jobId,
              mediaType,
              providerPluginId:
                requestJob?.provider ?? input.request.spec.provider,
              capabilityId: generationCapabilityIdForMediaType(mediaType),
              attempt,
              failedAt: generatedAt,
            },
          }
        : {}),
    };

    return {
      id: result.jobId,
      mediaType,
      providerPluginId: requestJob?.provider ?? input.request.spec.provider,
      capabilityId: generationCapabilityIdForMediaType(mediaType),
      requiredInputs: [
        {
          key: "prompt",
          label: "Prompt",
          source: input.request.spec.sourceNodeId,
          dataType: "text",
        },
      ],
      ...(mediaType === "image"
        ? {
            imageInputs: {
              prompt: requestJob?.prompt ?? input.request.spec.prompt,
              negativePrompt: "",
              referenceAssetIds: [],
              productAssetIds: [],
              count: 1,
              aspectRatio:
                requestJob?.aspectRatio ?? input.request.spec.aspectRatio,
              size: {
                width: result.width,
                height: result.height,
              },
              style: "",
              seed: null,
              providerParameters:
                requestJob?.parameters ?? input.request.spec.parameters,
            },
          }
        : {
            videoInputs: {
              prompt: requestJob?.prompt ?? input.request.spec.prompt,
              negativePrompt: "",
              storyboard: {},
              script: "",
              referenceAssetIds: [],
              productAssetIds: [],
              count: 1,
              aspectRatio:
                requestJob?.aspectRatio ?? input.request.spec.aspectRatio,
              durationSeconds: resolveVideoDurationSeconds(
                requestJob?.parameters ?? input.request.spec.parameters,
              ),
              resolution: {
                width: result.width,
                height: result.height,
              },
              frameRate: resolveVideoFrameRate(
                requestJob?.parameters ?? input.request.spec.parameters,
              ),
              style: "",
              seed: null,
              providerParameters:
                requestJob?.parameters ?? input.request.spec.parameters,
            },
          }),
      outputTargets: [{ assetId, field: "uri" }],
      ...(resultMetadata.length === 0 ? {} : { resultMetadata }),
      status: result.status === "succeeded" ? "completed" : "failed",
      lifecycle,
    } satisfies CampaignAssetGenerationJob;
  });
  const skippedJobIds = new Set<string>();
  const jobStatuses = jobs.map((job) =>
    createJobStatusSnapshot(job, skippedJobIds),
  );
  const executionRecords = jobs.map((job, index) =>
    createExecutionRecord(input.campaign.id, job, jobStatuses[index], input.observedAt),
  );

  return {
    campaignId: input.campaign.id,
    jobs,
    completedJobs: jobs.filter((job) => job.status === "completed"),
    failedJobs: jobs.filter((job) => job.status === "failed"),
    skippedJobs: [],
    jobStatuses,
    progressUpdates: jobStatuses,
    executionRecords,
  };
}

function getReusableExistingGenerationJobForNode(
  existingJob: CampaignAssetGenerationJob | undefined,
  expectedAssetId: string,
): CampaignAssetGenerationJob | undefined {
  if (existingJob === undefined) {
    return undefined;
  }

  const hasMatchingOutputTarget = existingJob.outputTargets.some(
    (target) => target.assetId === expectedAssetId,
  );
  const hasMatchingResultMetadata = (existingJob.resultMetadata ?? []).some(
    (metadata) => metadata.assetId === expectedAssetId,
  );

  return hasMatchingOutputTarget || hasMatchingResultMetadata
    ? existingJob
    : undefined;
}

export function hasGenerationBatchJobOwnershipConflict(
  campaign: CampaignDraft,
  request: GenerationBatchRequest,
): boolean {
  const existingJobsById = new Map(
    (campaign.campaignSpec.assetGenerationJobs ?? []).map(
      (job) => [job.id, job] as const,
    ),
  );

  for (const job of request.jobs) {
    const expectedAssetId = createGeneratedCreativeOutputAssetId(job.nodeId);
    const existingJob = existingJobsById.get(job.jobId);

    if (
      existingJob !== undefined &&
      getReusableExistingGenerationJobForNode(existingJob, expectedAssetId) ===
        undefined
    ) {
      return true;
    }

    if (isGenerationJobLinkedToDifferentCanvasNode(campaign, job)) {
      return true;
    }
  }

  return false;
}

function createResultMetadataFromGenerationJob(input: {
  result: GenerationJobResult;
  assetId: string;
  prompt: string;
  model: string;
  mediaType: GenerationMediaType;
  parameters: Record<string, unknown>;
  index: number;
}): CampaignAssetGenerationResultMetadata {
  return {
    id: `${input.result.jobId}_result_${input.index + 1}`,
    assetId: input.assetId,
    uri: input.result.providerUrl,
    mimeType: input.result.mimeType,
    width: input.result.width,
    height: input.result.height,
    ...(input.mediaType === "video"
      ? {
          durationSeconds: resolveVideoDurationSeconds(input.parameters),
          frameRate: resolveVideoFrameRate(input.parameters),
        }
      : {}),
    ...(input.result.thumbnailUri === undefined
      ? {}
      : { thumbnailUri: input.result.thumbnailUri }),
    sizeBytes: input.result.sizeBytes ?? null,
    model: input.model,
    seed: null,
    promptHash: createPromptHash(input.prompt),
    providerRequestId: input.result.providerRequestId,
    generatedAt: input.result.generatedAt,
    durationMs: 0,
    costUsd: null,
    finishReason: "completed",
  };
}

function resolveGenerationMediaType(value: unknown): GenerationMediaType {
  return value === "video" ? "video" : "image";
}

function generationCapabilityIdForMediaType(mediaType: GenerationMediaType) {
  return mediaType === "video" ? "generate.video" : "generate.image";
}

function resolveVideoDurationSeconds(parameters: Record<string, unknown>) {
  return numberFromReplicateInput(parameters, "duration") ?? 0;
}

function resolveVideoFrameRate(parameters: Record<string, unknown>) {
  return numberFromReplicateInput(parameters, "fps") ?? 24;
}

function numberFromReplicateInput(
  parameters: Record<string, unknown>,
  key: string,
): number | undefined {
  const replicate = isRecord(parameters.replicate) ? parameters.replicate : null;
  const input = replicate !== null && isRecord(replicate.input)
    ? replicate.input
    : isRecord(parameters.input)
      ? parameters.input
      : parameters;
  const value = input[key];

  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function cloneCampaignAssetGenerationResultMetadata(
  metadata: CampaignAssetGenerationResultMetadata,
): CampaignAssetGenerationResultMetadata {
  return {
    id: metadata.id,
    assetId: metadata.assetId,
    uri: metadata.uri,
    mimeType: metadata.mimeType,
    width: metadata.width,
    height: metadata.height,
    ...(metadata.durationSeconds === undefined
      ? {}
      : { durationSeconds: metadata.durationSeconds }),
    ...(metadata.frameRate === undefined ? {} : { frameRate: metadata.frameRate }),
    ...(metadata.codec === undefined ? {} : { codec: metadata.codec }),
    ...(metadata.thumbnailUri === undefined
      ? {}
      : { thumbnailUri: metadata.thumbnailUri }),
    sizeBytes: metadata.sizeBytes,
    model: metadata.model,
    seed: metadata.seed,
    promptHash: metadata.promptHash,
    providerRequestId: metadata.providerRequestId,
    ...(metadata.storageReferences === undefined
      ? {}
      : {
          storageReferences: metadata.storageReferences.map((reference) => ({
            provider: reference.provider,
            bucket: reference.bucket,
            objectKey: reference.objectKey,
            publicUri: reference.publicUri,
            ...(reference.contentHash === undefined
              ? {}
              : { contentHash: reference.contentHash }),
          })),
        }),
    generatedAt: metadata.generatedAt,
    durationMs: metadata.durationMs,
    costUsd: metadata.costUsd,
    finishReason: metadata.finishReason,
  };
}

function createJobStatusSnapshot(
  job: CampaignAssetGenerationJob,
  skippedJobIds: Set<string>,
): CampaignAssetGenerationJobStatusSnapshot {
  const lifecycle = job.lifecycle!;
  const executionStatus = skippedJobIds.has(job.id)
    ? "skipped"
    : job.status === "failed"
      ? "failed"
      : "completed";

  return {
    jobId: job.id,
    mediaType: job.mediaType,
    executionStatus,
    jobStatus: job.status,
    actor: lifecycle.actor,
    attempt: lifecycle.attempt,
    progress: lifecycle.progress,
    startedAt: lifecycle.startedAt,
    completedAt: lifecycle.completedAt,
    failedAt: lifecycle.failedAt,
    error: lifecycle.error,
    ...(lifecycle.failureDetails === undefined
      ? {}
      : { failureDetails: lifecycle.failureDetails }),
  };
}

function createExecutionRecord(
  campaignId: string,
  job: CampaignAssetGenerationJob,
  snapshot: CampaignAssetGenerationJobStatusSnapshot | undefined,
  observedAt: string,
): CampaignAssetGenerationExecutionRecord {
  if (snapshot === undefined) {
    throw new Error(`Missing generation snapshot for job "${job.id}".`);
  }

  const lifecycle = job.lifecycle!;
  const outputs = job.resultMetadata ?? [];
  const statusEvent: CampaignAssetGenerationExecutionStatusEvent = {
    status: snapshot.executionStatus,
    jobStatus: snapshot.jobStatus,
    progress: snapshot.progress,
    observedAt,
    error: snapshot.error,
    ...(snapshot.failureDetails === undefined
      ? {}
      : { failureDetails: snapshot.failureDetails }),
  };

  return {
    id: `exec_${sanitizeIdentifierPart(campaignId)}_${sanitizeIdentifierPart(job.id)}_${lifecycle.attempt}`,
    campaignId,
    jobId: job.id,
    mediaType: job.mediaType,
    providerPluginId: job.providerPluginId,
    capabilityId: job.capabilityId,
    status: snapshot.executionStatus,
    jobStatus: job.status,
    actor: lifecycle.actor,
    attempt: lifecycle.attempt,
    progress: lifecycle.progress,
    queuedAt: lifecycle.queuedAt,
    startedAt: lifecycle.startedAt,
    completedAt: lifecycle.completedAt,
    failedAt: lifecycle.failedAt,
    canceledAt: lifecycle.canceledAt,
    error: lifecycle.error,
    ...(lifecycle.failureDetails === undefined
      ? {}
      : { failureDetails: lifecycle.failureDetails }),
    resultIds: outputs.map((result) => result.id),
    assetIds: outputs.map((result) => result.assetId),
    providerRequestIds: outputs.map((result) => result.providerRequestId),
    outputs: outputs.map((output) => ({ ...output })),
    statusEvents: [statusEvent],
    createdAt: lifecycle.startedAt ?? observedAt,
    updatedAt: lifecycle.updatedAt,
  };
}

function linkGenerationJobsToCanvasNodes<TCampaign extends CampaignDraft>(
  campaign: TCampaign,
  jobs: CampaignAssetGenerationJob[],
  request: GenerationBatchRequest,
): TCampaign {
  const nodeIdsByJobId = new Map(
    request.jobs.map((job) => [job.jobId, job.nodeId] as const),
  );
  const jobsByNodeId = new Map(
    jobs.map((job) => [nodeIdsByJobId.get(job.id) ?? job.id, job] as const),
  );

  return {
    ...campaign,
    campaignSpec: {
      ...campaign.campaignSpec,
      nodes: linkJobsToNodes(campaign.campaignSpec.nodes, jobsByNodeId),
    },
    canvasState: {
      ...campaign.canvasState,
      nodes: linkJobsToNodes(campaign.canvasState.nodes, jobsByNodeId),
    },
  };
}

function linkJobsToNodes(
  nodes: CampaignCanvasBlock[],
  jobsByNodeId: Map<string, CampaignAssetGenerationJob>,
): CampaignCanvasBlock[] {
  return nodes.map((node) => {
    const job = jobsByNodeId.get(node.id);

    if (job === undefined) {
      return node;
    }

    return {
      ...node,
      properties: {
        ...node.properties,
        assetGenerationJobId: job.id,
      },
    };
  });
}

function isGenerationJobLinkedToDifferentCanvasNode(
  campaign: CampaignDraft,
  job: GenerationJobRequest,
): boolean {
  return [...campaign.campaignSpec.nodes, ...campaign.canvasState.nodes].some(
    (node) =>
      node.id !== job.nodeId &&
      getCampaignCanvasBlockGenerationJobIds(node).includes(job.jobId),
  );
}

function getCampaignCanvasBlockGenerationJobIds(
  node: CampaignCanvasBlock,
): string[] {
  const properties = node.properties;

  if (!isRecord(properties)) {
    return [];
  }

  const jobIds = new Set<string>();
  const assetGenerationJobId = properties.assetGenerationJobId;
  const assetGenerationJobIds = properties.assetGenerationJobIds;
  const assetGeneration = properties.assetGeneration;

  if (
    typeof assetGenerationJobId === "string" &&
    assetGenerationJobId.trim() !== ""
  ) {
    jobIds.add(assetGenerationJobId);
  }

  if (Array.isArray(assetGenerationJobIds)) {
    for (const jobId of assetGenerationJobIds) {
      if (typeof jobId === "string" && jobId.trim() !== "") {
        jobIds.add(jobId);
      }
    }
  }

  if (isRecord(assetGeneration) && Array.isArray(assetGeneration.jobIds)) {
    for (const jobId of assetGeneration.jobIds) {
      if (typeof jobId === "string" && jobId.trim() !== "") {
        jobIds.add(jobId);
      }
    }
  }

  return [...jobIds];
}

function sanitizeIdentifierPart(value: string): string {
  return value.replace(/[^a-zA-Z0-9_]+/g, "_");
}

function createPromptHash(prompt: string): string {
  let hash = 0;

  for (let index = 0; index < prompt.length; index += 1) {
    hash = (hash * 31 + prompt.charCodeAt(index)) >>> 0;
  }

  return `prompt_${hash.toString(16).padStart(8, "0")}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
