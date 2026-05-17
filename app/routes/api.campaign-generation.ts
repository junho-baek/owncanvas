import {
  isGenerationBatchRequest,
  isGenerationBatchResponse,
  isGenerationBatchResponseForRequest,
  normalizeGenerationBatchResponse,
  type GenerationBatchRequest,
  type GenerationBatchResponse,
} from "../features/creative-canvas/model/generation-batch.ts";
import {
  getPersistedCampaignRecord,
  updatePersistedCampaignRecord,
} from "../features/creative-canvas/model/creative-canvas.ts";
import {
  hasGenerationBatchJobOwnershipConflict,
  persistGenerationBatchResponseToCampaign,
  stripPersistedCreativeOutputRefs,
} from "../features/creative-canvas/model/generation-batch-persistence.ts";

export const CAMPAIGN_GENERATION_API_SCHEMA_VERSION =
  "owncanvas.generation-api.v1";

type CampaignGenerationActionArgs = {
  request: Request;
  params: {
    campaignId?: string;
  };
  storage?: Pick<Storage, "getItem" | "setItem">;
  now?: () => string;
  fetchGenerationService?: typeof fetch;
  generationServiceUrl?: string;
};

export async function action({
  request,
  params,
  storage,
  now,
  fetchGenerationService = fetch,
  generationServiceUrl =
    process.env.OWNCANVAS_GENERATION_SERVICE_URL ?? "http://127.0.0.1:8787",
}: CampaignGenerationActionArgs) {
  if (request.method !== "POST") {
    return generationErrorResponse(
      {
        code: "method_not_allowed",
        message: "Generation batches require POST.",
      },
      405,
      { Allow: "POST" },
    );
  }

  const campaignId = params.campaignId ?? "";
  const body = await readJson(request);

  if (body === null || !isGenerationBatchRequest(body)) {
    return invalidBatchResponse(
      "Generation batch request must match the generation batch contract.",
    );
  }

  if (body.campaignId !== campaignId) {
    return generationErrorResponse(
      {
        code: "generation.invalid_batch",
        message: "Generation batch campaignId must match the route campaignId.",
      },
      400,
    );
  }

  const campaignStorage = storage ?? createFallbackCampaignGenerationStorage();
  const persistedCampaign = getPersistedCampaignRecord(campaignStorage, campaignId);

  if (
    persistedCampaign !== null &&
    hasGenerationBatchJobOwnershipConflict(persistedCampaign, body)
  ) {
    return invalidBatchResponse(
      "Generation batch job ids must belong to their requested Image Blocks.",
    );
  }

  let serviceResponse: Response;

  try {
    const serviceUrl = normalizeGenerationServiceUrl(generationServiceUrl);
    serviceResponse = await fetchGenerationService(
      `${serviceUrl}/v1/generation/batches`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      },
    );
  } catch {
    return generationErrorResponse(
      {
        code: "generation.service_unavailable",
        message: "Generation service is unavailable.",
      },
      502,
    );
  }

  if (!serviceResponse.ok) {
    if (serviceResponse.status >= 400 && serviceResponse.status < 500) {
      return invalidBatchResponse("Generation service rejected the batch.");
    }

    return generationErrorResponse(
      {
        code: "generation.service_error",
        message: "Generation service rejected the batch.",
      },
      502,
    );
  }

  const batchResponse = await readJson(serviceResponse);

  if (
    batchResponse === null ||
    !isGenerationBatchResponse(batchResponse) ||
    !isGenerationBatchResponseForRequest(batchResponse, body)
  ) {
    return generationErrorResponse(
      {
        code: "generation.invalid_service_response",
        message: "Generation service response must be valid JSON.",
      },
      502,
    );
  }

  const normalizedBatch = stripPersistedCreativeOutputRefs(
    normalizeGenerationBatchResponse(batchResponse),
  );
  const persistedBatch =
    persistedCampaign === null
      ? normalizedBatch
      : persistGenerationBatchResponse({
          storage: campaignStorage,
          campaign: persistedCampaign,
          request: body,
          response: normalizedBatch,
          now,
        });

  return Response.json({
    schemaVersion: CAMPAIGN_GENERATION_API_SCHEMA_VERSION,
    batch: persistedBatch,
  });
}

const fallbackCampaignGenerationStorage = new Map<string, string>();

function createFallbackCampaignGenerationStorage(): Pick<
  Storage,
  "getItem" | "setItem"
> {
  return {
    getItem(key) {
      return fallbackCampaignGenerationStorage.get(key) ?? null;
    },
    setItem(key, value) {
      fallbackCampaignGenerationStorage.set(key, value);
    },
  };
}

function persistGenerationBatchResponse(input: {
  storage: Pick<Storage, "getItem" | "setItem">;
  campaign: NonNullable<ReturnType<typeof getPersistedCampaignRecord>>;
  request: GenerationBatchRequest;
  response: GenerationBatchResponse;
  now?: () => string;
}): GenerationBatchResponse {
  const result = persistGenerationBatchResponseToCampaign({
    campaign: input.campaign,
    request: input.request,
    response: input.response,
    now: input.now,
  });

  updatePersistedCampaignRecord(input.storage, result.campaign, {
    now: input.now,
  });

  return result.response;
}

async function readJson(request: Request | Response): Promise<unknown | null> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function normalizeGenerationServiceUrl(url: string): string {
  const trimmedUrl = url.trim();
  return trimmedUrl === ""
    ? "http://127.0.0.1:8787"
    : trimmedUrl.replace(/\/$/, "");
}

function invalidBatchResponse(message: string) {
  return generationErrorResponse(
    {
      code: "generation.invalid_batch",
      message,
    },
    400,
  );
}

function generationErrorResponse(
  error: { code: string; message: string },
  status: number,
  headers?: HeadersInit,
) {
  return Response.json({ error }, { status, headers });
}
