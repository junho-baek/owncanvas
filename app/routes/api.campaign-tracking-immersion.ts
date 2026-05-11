import {
  getCampaignLandingPageImmersionAnalytics,
  type UpdateCampaignRecordOptions,
} from "../features/creative-canvas/model/creative-canvas.ts";

type CampaignTrackingImmersionStorage = Pick<Storage, "getItem">;

type CampaignTrackingImmersionLoaderArgs = {
  request: Request;
  params?: {
    campaignId?: string;
  };
  storage?: CampaignTrackingImmersionStorage;
  now?: UpdateCampaignRecordOptions["now"];
};

const fallbackCampaignTrackingImmersionStorage = new Map<string, string>();

export async function loader({
  request,
  params,
  storage,
  now,
}: CampaignTrackingImmersionLoaderArgs) {
  if (request.method !== "GET") {
    return immersionAnalyticsErrorResponse(
      {
        code: "method_not_allowed",
        message: "Campaign landing immersion analytics must use GET.",
      },
      405,
    );
  }

  const campaignId = params?.campaignId ?? "";

  if (campaignId.trim() === "") {
    return immersionAnalyticsErrorResponse(
      {
        code: "campaign_id_required",
        message: "Campaign landing immersion analytics requests require a campaignId.",
      },
      400,
    );
  }

  const analytics = getCampaignLandingPageImmersionAnalytics(
    storage ?? createFallbackCampaignTrackingImmersionStorage(),
    campaignId,
    { now },
  );

  if (analytics === null) {
    return immersionAnalyticsErrorResponse(
      {
        code: "campaign.not_found",
        message: `Campaign "${campaignId}" was not found.`,
      },
      404,
    );
  }

  return Response.json(analytics, { status: 200 });
}

function immersionAnalyticsErrorResponse(
  error: {
    code: string;
    message: string;
  },
  status: number,
) {
  return Response.json(
    {
      schemaVersion: "owncanvas.campaign-landing-immersion-analytics.v1",
      error,
    },
    { status },
  );
}

function createFallbackCampaignTrackingImmersionStorage(): CampaignTrackingImmersionStorage {
  return {
    getItem(key: string) {
      return fallbackCampaignTrackingImmersionStorage.get(key) ?? null;
    },
  };
}
