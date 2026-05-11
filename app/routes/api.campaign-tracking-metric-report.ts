import {
  getPersistedCampaignAnalyticsEvents,
  getPersistedCampaignRecord,
  type CampaignAnalyticsEventQuery,
  type CampaignAnalyticsEventRecord,
  type CampaignClickTrackingEvent,
  type CampaignConversionTrackingEvent,
  type CampaignExposureTrackingEvent,
  type CampaignMetricKind,
  type CampaignMetricQueryGroupBy,
  type CampaignRevisitTrackingEvent,
  type UpdateCampaignRecordOptions,
} from "../features/creative-canvas/model/creative-canvas.ts";

type CampaignTrackingMetricReportStorage = Pick<Storage, "getItem">;

type CampaignTrackingMetricReportLoaderArgs = {
  request: Request;
  params?: {
    campaignId?: string;
  };
  storage?: CampaignTrackingMetricReportStorage;
  now?: UpdateCampaignRecordOptions["now"];
};

type CampaignMetricReportFilters = Partial<CampaignAnalyticsEventQuery> & {
  surface?: string;
  placement?: string;
};

type CampaignMetricReportRecord = CampaignAnalyticsEventRecord & {
  event:
    | CampaignExposureTrackingEvent
    | CampaignClickTrackingEvent
    | CampaignConversionTrackingEvent
    | CampaignRevisitTrackingEvent;
};

const fallbackCampaignTrackingMetricReportStorage = new Map<string, string>();

export function createCampaignTrackingMetricReportLoader(
  metric: CampaignMetricKind,
) {
  return async function loader({
    request,
    params,
    storage,
    now,
  }: CampaignTrackingMetricReportLoaderArgs) {
    if (request.method !== "GET") {
      return metricReportErrorResponse(
        {
          code: "method_not_allowed",
          message: `Campaign ${metric} metrics must use GET.`,
        },
        405,
      );
    }

    const campaignId = params?.campaignId ?? "";

    if (campaignId.trim() === "") {
      return metricReportErrorResponse(
        {
          code: "campaign_id_required",
          message: `Campaign ${metric} metrics requests require a campaignId.`,
        },
        400,
      );
    }

    const campaignStorage =
      storage ?? createFallbackCampaignTrackingMetricReportStorage();
    const campaign = getPersistedCampaignRecord(campaignStorage, campaignId);

    if (campaign === null) {
      return metricReportErrorResponse(
        {
          code: "campaign.not_found",
          message: `Campaign "${campaignId}" was not found.`,
        },
        404,
      );
    }

    const searchParams = new URL(request.url).searchParams;
    const filters = createCampaignMetricReportFilters(campaignId, searchParams);
    const groupBy = createCampaignMetricGroupBy(
      searchParams,
      getDefaultGroupBy(metric),
    );
    const records = getPersistedCampaignAnalyticsEvents(campaignStorage, {
      ...filters,
      eventType: metric,
    }).filter((record): record is CampaignMetricReportRecord =>
      matchesCampaignMetricReportRecord(record, metric, filters),
    );

    return Response.json(
      {
        schemaVersion: "owncanvas.campaign-metric-report.v1",
        campaignId,
        generatedAt: now?.() ?? new Date().toISOString(),
        metric,
        query: {
          filters,
          groupBy,
        },
        summary: {
          count: records.length,
          uniqueSessions: countUnique(records, (record) => record.event.sessionId),
          ...createCampaignMetricValueSummary(metric, records),
        },
        rows: createCampaignMetricRows(records, groupBy),
      },
      { status: 200 },
    );
  };
}

function createCampaignMetricReportFilters(
  campaignId: string,
  searchParams: URLSearchParams,
): CampaignMetricReportFilters {
  return withoutUndefinedProperties({
    campaignId,
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
    surface: getOptionalSearchParam(searchParams, "surface"),
    placement: getOptionalSearchParam(searchParams, "placement"),
    from: getOptionalSearchParam(searchParams, "from"),
    to: getOptionalSearchParam(searchParams, "to"),
  });
}

function matchesCampaignMetricReportRecord(
  record: CampaignAnalyticsEventRecord,
  metric: CampaignMetricKind,
  filters: CampaignMetricReportFilters,
): record is CampaignMetricReportRecord {
  if (metric === "exposure" && record.event.type === "exposure") {
    return (
      (filters.surface === undefined ||
        record.event.exposure.surface === filters.surface) &&
      (filters.placement === undefined ||
        record.event.exposure.placement === filters.placement)
    );
  }

  return record.event.type === metric;
}

function createCampaignMetricRows(
  records: CampaignMetricReportRecord[],
  groupBy: CampaignMetricQueryGroupBy[],
) {
  const groups = records.reduce<Map<string, CampaignMetricReportRecord[]>>(
    (grouped, record) => {
      const key = getCampaignMetricRowKey(record, groupBy);
      const existingRecords = grouped.get(key) ?? [];
      grouped.set(key, [...existingRecords, record]);

      return grouped;
    },
    new Map(),
  );

  return [...groups.values()]
    .map((groupRecords) => {
      const [firstRecord] = groupRecords;

      return {
        key: getCampaignMetricRowKey(firstRecord, groupBy),
        group: createCampaignMetricRowGroup(firstRecord, groupBy),
        count: groupRecords.length,
        uniqueSessions: countUnique(
          groupRecords,
          (record) => record.event.sessionId,
        ),
        ...createCampaignMetricValueSummary(firstRecord.event.type, groupRecords),
      };
    })
    .sort((left, right) => left.key.localeCompare(right.key));
}

function createCampaignMetricGroupBy(
  searchParams: URLSearchParams,
  fallback: CampaignMetricQueryGroupBy[],
) {
  const groupBy = searchParams
    .getAll("groupBy")
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(isCampaignMetricQueryGroupBy);

  return groupBy.length === 0 ? fallback : groupBy;
}

function getDefaultGroupBy(metric: CampaignMetricKind): CampaignMetricQueryGroupBy[] {
  if (metric === "exposure") return ["surface", "placement"];
  if (metric === "click") return ["destination"];
  if (metric === "conversion") return ["conversionEventName"];

  return ["matchedBy"];
}

function getCampaignMetricRowKey(
  record: CampaignMetricReportRecord,
  groupBy: CampaignMetricQueryGroupBy[],
) {
  return groupBy
    .map((dimension) => getCampaignMetricDimension(record, dimension))
    .join("|");
}

function createCampaignMetricRowGroup(
  record: CampaignMetricReportRecord,
  groupBy: CampaignMetricQueryGroupBy[],
) {
  return Object.fromEntries(
    groupBy.map((dimension) => [
      dimension,
      getCampaignMetricDimension(record, dimension),
    ]),
  );
}

function getCampaignMetricDimension(
  record: CampaignMetricReportRecord,
  dimension: CampaignMetricQueryGroupBy,
) {
  if (dimension === "sessionId") return record.event.sessionId;
  if (dimension === "source") return record.event.utm.source;
  if (dimension === "medium") return record.event.utm.medium;
  if (dimension === "campaign") return record.event.utm.campaign;

  if (record.event.type === "exposure") {
    if (dimension === "surface") return record.event.exposure.surface;
    if (dimension === "placement") return record.event.exposure.placement;
  }

  if (record.event.type === "click") {
    if (dimension === "clickId") return record.event.click.id ?? "";
    if (dimension === "destination") return record.event.click.destination;
    if (dimension === "href") return record.event.click.href;
  }

  if (record.event.type === "conversion") {
    if (dimension === "conversionEventName") {
      return record.event.conversion.eventName;
    }
    if (dimension === "currency") return record.event.conversion.currency ?? "";
  }

  if (record.event.type === "revisit" && dimension === "matchedBy") {
    return record.event.revisit.matchedBy.map((match) => match.type).join(",");
  }

  const value = record.attribution[dimension as keyof typeof record.attribution];

  return typeof value === "string" ? value : "";
}

function createCampaignMetricValueSummary(
  metric: CampaignMetricKind,
  records: CampaignMetricReportRecord[],
) {
  if (metric !== "conversion") return {};

  return {
    totalValue: records.reduce(
      (sum, record) =>
        record.event.type === "conversion"
          ? sum + (record.event.conversion.value ?? 0)
          : sum,
      0,
    ),
  };
}

function countUnique<TRecord>(
  records: TRecord[],
  getValue: (record: TRecord) => string | undefined,
) {
  return new Set(
    records
      .map((record) => getValue(record))
      .filter((value): value is string => value !== undefined && value !== ""),
  ).size;
}

function getOptionalSearchParam(searchParams: URLSearchParams, key: string) {
  const value = searchParams.get(key);

  return value === null || value.trim() === "" ? undefined : value;
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

function isCampaignMetricQueryGroupBy(
  value: string,
): value is CampaignMetricQueryGroupBy {
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

function metricReportErrorResponse(
  error: {
    code: string;
    message: string;
  },
  status: number,
) {
  return Response.json(
    {
      schemaVersion: "owncanvas.campaign-metric-report.v1",
      error,
    },
    { status },
  );
}

function createFallbackCampaignTrackingMetricReportStorage(): CampaignTrackingMetricReportStorage {
  return {
    getItem(key: string) {
      return fallbackCampaignTrackingMetricReportStorage.get(key) ?? null;
    },
  };
}

function withoutUndefinedProperties<TValue extends Record<string, unknown>>(
  value: TValue,
) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined),
  ) as TValue;
}
