import {
  isGenerationBatchRequest,
  isGenerationBatchResponse,
  normalizeGenerationBatchResponse,
} from "../features/creative-canvas/model/generation-batch.ts";

export const CAMPAIGN_GENERATION_API_SCHEMA_VERSION =
  "owncanvas.generation-api.v1";

type CampaignGenerationActionArgs = {
  request: Request;
  params: {
    campaignId?: string;
  };
  fetchGenerationService?: typeof fetch;
  generationServiceUrl?: string;
};

export async function action({
  request,
  params,
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

  if (batchResponse === null || !isGenerationBatchResponse(batchResponse)) {
    return generationErrorResponse(
      {
        code: "generation.invalid_service_response",
        message: "Generation service response must be valid JSON.",
      },
      502,
    );
  }

  return Response.json({
    schemaVersion: CAMPAIGN_GENERATION_API_SCHEMA_VERSION,
    batch: normalizeGenerationBatchResponse(batchResponse),
  });
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
