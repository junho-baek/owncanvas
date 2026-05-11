import {
  getCampaignMetricQueryReport,
  type CampaignMetricKind,
  type CampaignMetricQuery,
  type UpdateCampaignRecordOptions,
} from "../features/creative-canvas/model/creative-canvas.ts";

type CampaignTrackingMetricsStorage = Pick<Storage, "getItem">;

type CampaignTrackingMetricsLoaderArgs = {
  request: Request;
  params?: {
    campaignId?: string;
  };
  storage?: CampaignTrackingMetricsStorage;
  now?: UpdateCampaignRecordOptions["now"];
};

const fallbackCampaignTrackingMetricsStorage = new Map<string, string>();

export async function loader({
  request,
  params,
  storage,
  now,
}: CampaignTrackingMetricsLoaderArgs) {
  if (request.method !== "GET") {
    return metricQueryErrorResponse(
      {
        code: "method_not_allowed",
        message: "Campaign metric query reports must use GET.",
      },
      405,
    );
  }

  const campaignId = params?.campaignId ?? "";

  if (campaignId.trim() === "") {
    return metricQueryErrorResponse(
      {
        code: "campaign_id_required",
        message: "Campaign metric query reports require a campaignId.",
      },
      400,
    );
  }

  const url = new URL(request.url);
  const query = createCampaignMetricQueryFromSearchParams(url.searchParams);

  if (query === null) {
    return metricQueryErrorResponse(
      {
        code: "metric_query.metric_unsupported",
        message:
          "Campaign metric query metric must be one of all, exposure, click, conversion, or revisit.",
      },
      400,
    );
  }

  const report = getCampaignMetricQueryReport(
    storage ?? createFallbackCampaignTrackingMetricsStorage(),
    campaignId,
    query,
    { now },
  );

  if (report === null) {
    return metricQueryErrorResponse(
      {
        code: "campaign.not_found",
        message: `Campaign "${campaignId}" was not found.`,
      },
      404,
    );
  }

  return Response.json(report, { status: 200 });
}

function createCampaignMetricQueryFromSearchParams(
  searchParams: URLSearchParams,
): CampaignMetricQuery | null {
  const metric = searchParams.get("metric") ?? "all";

  if (!isCampaignMetricQueryMetric(metric)) {
    return null;
  }

  return {
    metric,
    sessionId: getOptionalSearchParam(searchParams, "sessionId"),
    clickId: getOptionalSearchParam(searchParams, "clickId"),
    pageId: getOptionalSearchParam(searchParams, "pageId"),
    assetId: getOptionalSearchParam(searchParams, "assetId"),
    channelId: getOptionalSearchParam(searchParams, "channelId"),
    productId: getOptionalSearchParam(searchParams, "productId"),
    offerId: getOptionalSearchParam(searchParams, "offerId"),
    destination: getOptionalSearchParam(searchParams, "destination"),
    href: getOptionalSearchParam(searchParams, "href"),
    conversionEventName: getOptionalSearchParam(
      searchParams,
      "conversionEventName",
    ),
    orderId: getOptionalSearchParam(searchParams, "orderId"),
    currency: getOptionalSearchParam(searchParams, "currency"),
    matchedBy: getCampaignMetricMatchedByFilter(searchParams),
    from: getOptionalSearchParam(searchParams, "from"),
    to: getOptionalSearchParam(searchParams, "to"),
    groupBy: getCampaignMetricGroupBy(searchParams),
  };
}

function isCampaignMetricQueryMetric(
  metric: string,
): metric is CampaignMetricKind | "all" {
  return (
    metric === "all" ||
    metric === "exposure" ||
    metric === "click" ||
    metric === "conversion" ||
    metric === "revisit"
  );
}

function getCampaignMetricMatchedByFilter(searchParams: URLSearchParams) {
  const matchedBy = getOptionalSearchParam(searchParams, "matchedBy");

  return matchedBy === "session" ||
    matchedBy === "user" ||
    matchedBy === "click" ||
    matchedBy === "attribution_parameter"
    ? matchedBy
    : undefined;
}

function getOptionalSearchParam(searchParams: URLSearchParams, key: string) {
  const value = searchParams.get(key);

  return value === null || value.trim() === "" ? undefined : value;
}

function getCampaignMetricGroupBy(searchParams: URLSearchParams) {
  const groupBy = searchParams
    .getAll("groupBy")
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(isCampaignMetricQueryGroupBy);

  return groupBy.length === 0 ? undefined : groupBy;
}

function isCampaignMetricQueryGroupBy(
  value: string,
): value is NonNullable<CampaignMetricQuery["groupBy"]>[number] {
  return (
    value === "sessionId" ||
    value === "clickId" ||
    value === "pageId" ||
    value === "assetId" ||
    value === "channelId" ||
    value === "productId" ||
    value === "offerId" ||
    value === "source" ||
    value === "medium" ||
    value === "campaign" ||
    value === "surface" ||
    value === "placement" ||
    value === "destination" ||
    value === "href" ||
    value === "conversionEventName" ||
    value === "currency" ||
    value === "matchedBy"
  );
}

function metricQueryErrorResponse(
  error: {
    code: string;
    message: string;
  },
  status: number,
) {
  return Response.json(
    {
      schemaVersion: "owncanvas.campaign-metric-query-report.v1",
      error,
    },
    { status },
  );
}

function createFallbackCampaignTrackingMetricsStorage(): CampaignTrackingMetricsStorage {
  return {
    getItem(key: string) {
      return fallbackCampaignTrackingMetricsStorage.get(key) ?? null;
    },
  };
}
