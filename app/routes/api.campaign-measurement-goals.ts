import {
  createCampaignMeasurementGoal,
  editCampaignMeasurementGoal,
  getPersistedCampaignRecord,
  saveCampaignMeasurementGoals,
  type CampaignMeasurementGoal,
  type CampaignMeasurementGoalEditInput,
  type CampaignMeasurementGoalInput,
  type CampaignRecord,
} from "../features/creative-canvas/model/creative-canvas.ts";

export const CAMPAIGN_MEASUREMENT_GOALS_SCHEMA_VERSION =
  "owncanvas.campaign-measurement-goals.v1";

type CampaignMeasurementGoalActionArgs = {
  request: Request;
  params?: {
    campaignId?: string;
  };
  storage?: Pick<Storage, "getItem" | "setItem">;
};

export async function action({
  request,
  params,
  storage = defaultApiStorage,
}: CampaignMeasurementGoalActionArgs) {
  const campaignId = params?.campaignId;

  if (!campaignId) {
    return Response.json(
      {
        error: {
          code: "campaign_id_required",
          message: "Campaign measurement goal requests require a campaignId.",
        },
      },
      { status: 400 },
    );
  }

  if (request.method !== "POST" && request.method !== "PATCH") {
    return Response.json(
      {
        error: {
          code: "method_not_allowed",
          message: "Campaign measurement goals support POST and PATCH.",
        },
      },
      { status: 405 },
    );
  }

  const body = await readMeasurementGoalRequestBody(request);

  if (!body) {
    return Response.json(
      {
        error: {
          code: "invalid_json",
          message: "Campaign measurement goal requests require a JSON body.",
        },
      },
      { status: 400 },
    );
  }

  try {
    if (request.method === "PATCH") {
      if (typeof body.id !== "string" || body.id.trim() === "") {
        return Response.json(
          {
            error: {
              code: "measurement_goal_id_required",
              message: "Editing a measurement goal requires an id.",
            },
          },
          { status: 400 },
        );
      }

      const campaign = editCampaignMeasurementGoal(
        storage,
        campaignId,
        body.id,
        toMeasurementGoalEditInput(body),
      );
      const goal = campaign.tracking.measurementGoals.find(
        (measurementGoal) => measurementGoal.id === body.id,
      );

      return Response.json(
        createMeasurementGoalResponse(campaign, goal),
        { status: 200 },
      );
    }

    const existingCampaign = getPersistedCampaignRecord(storage, campaignId);

    if (!existingCampaign) {
      throw new Error(`Campaign "${campaignId}" was not found.`);
    }

    const goal = createCampaignMeasurementGoal(
      toMeasurementGoalCreateInput(body, existingCampaign),
    );
    const campaign = saveCampaignMeasurementGoals(
      storage,
      campaignId,
      [...existingCampaign.tracking.measurementGoals, goal],
    );

    return Response.json(createMeasurementGoalResponse(campaign, goal), {
      status: 201,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error.";

    return Response.json(
      {
        error: {
          code: message.includes("was not found")
            ? "not_found"
            : "measurement_goal_invalid",
          message,
        },
      },
      { status: message.includes("was not found") ? 404 : 422 },
    );
  }
}

function createMeasurementGoalResponse(
  campaign: CampaignRecord,
  goal: CampaignMeasurementGoal | undefined,
) {
  return {
    schemaVersion: CAMPAIGN_MEASUREMENT_GOALS_SCHEMA_VERSION,
    campaignId: campaign.id,
    goal,
    measurementGoals: campaign.tracking.measurementGoals,
  };
}

async function readMeasurementGoalRequestBody(request: Request) {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function toMeasurementGoalCreateInput(
  body: Record<string, unknown>,
  campaign: CampaignRecord,
): CampaignMeasurementGoalInput {
  return {
    id:
      typeof body.id === "string" && body.id.trim() !== ""
        ? body.id
        : `measurement_goal_${campaign.tracking.measurementGoals.length}`,
    name: readStringInput(body.name, body.targetMetric),
    target: readNumberInput(body.target, body.targetValue),
    unit: typeof body.unit === "string" ? body.unit : "",
    successCriteria:
      typeof body.successCriteria === "string" ? body.successCriteria : "",
    reportingTimeframe: readReportingTimeframe(body.reportingTimeframe),
  };
}

function toMeasurementGoalEditInput(
  body: Record<string, unknown>,
): CampaignMeasurementGoalEditInput {
  const input: CampaignMeasurementGoalEditInput = {};

  if (typeof body.name === "string" || typeof body.targetMetric === "string") {
    input.name = readStringInput(body.name, body.targetMetric);
  }

  if (
    typeof body.target === "number" ||
    body.target === null ||
    typeof body.targetValue === "number" ||
    body.targetValue === null
  ) {
    input.target = readNumberInput(body.target, body.targetValue);
  }

  if (typeof body.unit === "string") {
    input.unit = body.unit;
  }

  if (typeof body.successCriteria === "string") {
    input.successCriteria = body.successCriteria;
  }

  if (isRecord(body.reportingTimeframe)) {
    input.reportingTimeframe = readPartialReportingTimeframe(
      body.reportingTimeframe,
    );
  }

  return input;
}

function readReportingTimeframe(
  value: unknown,
): CampaignMeasurementGoalInput["reportingTimeframe"] {
  if (!isRecord(value)) {
    return {
      startsAt: "",
      endsAt: "",
      timezone: "UTC",
    };
  }

  return {
    startsAt: typeof value.startsAt === "string" ? value.startsAt : "",
    endsAt: typeof value.endsAt === "string" ? value.endsAt : "",
    timezone: typeof value.timezone === "string" ? value.timezone : "UTC",
  };
}

function readPartialReportingTimeframe(value: Record<string, unknown>) {
  return {
    ...(typeof value.startsAt === "string" ? { startsAt: value.startsAt } : {}),
    ...(typeof value.endsAt === "string" ? { endsAt: value.endsAt } : {}),
    ...(typeof value.timezone === "string" ? { timezone: value.timezone } : {}),
  };
}

function readStringInput(...values: unknown[]) {
  const value = values.find((candidate) => typeof candidate === "string");

  return typeof value === "string" ? value : "";
}

function readNumberInput(...values: unknown[]) {
  const value = values.find(
    (candidate) => typeof candidate === "number" || candidate === null,
  );

  return typeof value === "number" || value === null ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

class MapBackedStorage implements Pick<Storage, "getItem" | "setItem"> {
  private readonly values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

const defaultApiStorage = new MapBackedStorage();
