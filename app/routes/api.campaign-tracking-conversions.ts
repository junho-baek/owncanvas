import {
  getAttributedCampaignConversionAnalytics,
  type UpdateCampaignRecordOptions,
} from "../features/creative-canvas/model/creative-canvas.ts";
import { action } from "./api.campaign-tracking-events.ts";
import { createCampaignTrackingMetricReportLoader } from "./api.campaign-tracking-metric-report.ts";

export { action };

type CampaignTrackingConversionsStorage = Pick<Storage, "getItem">;

type CampaignTrackingConversionsLoaderArgs = {
  request: Request;
  params?: {
    campaignId?: string;
  };
  storage?: CampaignTrackingConversionsStorage;
  now?: UpdateCampaignRecordOptions["now"];
};

const fallbackCampaignTrackingConversionsStorage = new Map<string, string>();
const loadConversionMetricReport =
  createCampaignTrackingMetricReportLoader("conversion");

export async function loader({
  request,
  params,
  storage,
  now,
}: CampaignTrackingConversionsLoaderArgs) {
  if (shouldLoadConversionMetricReport(request)) {
    return loadConversionMetricReport({ request, params, storage, now });
  }

  if (request.method !== "GET") {
    return conversionAnalyticsErrorResponse(
      {
        code: "method_not_allowed",
        message: "Campaign conversion analytics must use GET.",
      },
      405,
    );
  }

  const campaignId = params?.campaignId ?? "";

  if (campaignId.trim() === "") {
    return conversionAnalyticsErrorResponse(
      {
        code: "campaign_id_required",
        message: "Campaign conversion analytics requests require a campaignId.",
      },
      400,
    );
  }

  const analytics = getAttributedCampaignConversionAnalytics(
    storage ?? createFallbackCampaignTrackingConversionsStorage(),
    campaignId,
    { now },
  );

  if (analytics === null) {
    return conversionAnalyticsErrorResponse(
      {
        code: "campaign.not_found",
        message: `Campaign "${campaignId}" was not found.`,
      },
      404,
    );
  }

  return Response.json(analytics, { status: 200 });
}

function shouldLoadConversionMetricReport(request: Request) {
  if (request.method !== "GET") return false;

  const searchParams = new URL(request.url).searchParams;

  return (
    searchParams.get("metric") === "conversion" ||
    searchParams.has("groupBy") ||
    searchParams.has("conversionEventName") ||
    searchParams.has("orderId") ||
    searchParams.has("currency")
  );
}

function conversionAnalyticsErrorResponse(
  error: {
    code: string;
    message: string;
  },
  status: number,
) {
  return Response.json(
    {
      schemaVersion: "owncanvas.campaign-conversion-analytics.v1",
      error,
    },
    { status },
  );
}

function createFallbackCampaignTrackingConversionsStorage(): CampaignTrackingConversionsStorage {
  return {
    getItem(key: string) {
      return fallbackCampaignTrackingConversionsStorage.get(key) ?? null;
    },
  };
}
