import {
  getPersistedCampaignAnalyticsEvents,
  getPersistedCampaignRecord,
  type CampaignAnalyticsEventQuery,
  type CampaignAnalyticsEventRecord,
  type CampaignClickTrackingEvent,
  type UpdateCampaignRecordOptions,
} from "../features/creative-canvas/model/creative-canvas.ts";
import { action } from "./api.campaign-tracking-events.ts";

export { action };

type CampaignTrackingClicksStorage = Pick<Storage, "getItem">;

type CampaignTrackingClicksLoaderArgs = {
  request: Request;
  params?: {
    campaignId?: string;
  };
  storage?: CampaignTrackingClicksStorage;
  now?: UpdateCampaignRecordOptions["now"];
};

type CampaignClickMetricFilters = Partial<CampaignAnalyticsEventQuery>;

const fallbackCampaignTrackingClicksStorage = new Map<string, string>();

export async function loader({
  request,
  params,
  storage,
  now,
}: CampaignTrackingClicksLoaderArgs) {
  if (request.method !== "GET") {
    return clickMetricsErrorResponse(
      {
        code: "method_not_allowed",
        message: "Campaign click metrics must use GET.",
      },
      405,
    );
  }

  const campaignId = params?.campaignId ?? "";

  if (campaignId.trim() === "") {
    return clickMetricsErrorResponse(
      {
        code: "campaign_id_required",
        message: "Campaign click metrics requests require a campaignId.",
      },
      400,
    );
  }

  const campaignStorage = storage ?? createFallbackCampaignTrackingClicksStorage();
  const campaign = getPersistedCampaignRecord(campaignStorage, campaignId);

  if (campaign === null) {
    return clickMetricsErrorResponse(
      {
        code: "campaign.not_found",
        message: `Campaign "${campaignId}" was not found.`,
      },
      404,
    );
  }

  const searchParams = new URL(request.url).searchParams;
  const filters = createCampaignClickMetricFilters(campaignId, searchParams);
  const groupBy = createCampaignMetricGroupBy(searchParams, ["destination"]);
  const records = getPersistedCampaignAnalyticsEvents(campaignStorage, {
    ...filters,
    eventType: "click",
  }).filter(
    (
      record,
    ): record is CampaignAnalyticsEventRecord & {
      event: CampaignClickTrackingEvent;
    } => record.event.type === "click",
  );

  return Response.json(
    {
      schemaVersion: "owncanvas.campaign-metric-report.v1",
      campaignId,
      generatedAt: now?.() ?? new Date().toISOString(),
      metric: "click",
      query: {
        filters,
        groupBy,
      },
      summary: {
        count: records.length,
        uniqueSessions: countUnique(records, (record) => record.event.sessionId),
      },
      rows: createCampaignClickMetricRows(records, groupBy),
    },
    { status: 200 },
  );
}

function createCampaignClickMetricFilters(
  campaignId: string,
  searchParams: URLSearchParams,
): CampaignClickMetricFilters {
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
    from: getOptionalSearchParam(searchParams, "from"),
    to: getOptionalSearchParam(searchParams, "to"),
  });
}

function createCampaignClickMetricRows(
  records: Array<
    CampaignAnalyticsEventRecord & { event: CampaignClickTrackingEvent }
  >,
  groupBy: string[],
) {
  const groups = records.reduce<Map<string, typeof records>>((grouped, record) => {
    const key = getCampaignMetricRowKey(record, groupBy);
    const existingRecords = grouped.get(key) ?? [];
    grouped.set(key, [...existingRecords, record]);

    return grouped;
  }, new Map());

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
      };
    })
    .sort((left, right) => left.key.localeCompare(right.key));
}

function createCampaignMetricGroupBy(
  searchParams: URLSearchParams,
  fallback: string[],
) {
  const groupBy = searchParams
    .getAll("groupBy")
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter((value) => value !== "");

  return groupBy.length === 0 ? fallback : groupBy;
}

function getCampaignMetricRowKey(
  record: CampaignAnalyticsEventRecord & { event: CampaignClickTrackingEvent },
  groupBy: string[],
) {
  return groupBy
    .map((dimension) => getCampaignClickMetricDimension(record, dimension))
    .join(":");
}

function createCampaignMetricRowGroup(
  record: CampaignAnalyticsEventRecord & { event: CampaignClickTrackingEvent },
  groupBy: string[],
) {
  return Object.fromEntries(
    groupBy.map((dimension) => [
      dimension,
      getCampaignClickMetricDimension(record, dimension),
    ]),
  );
}

function getCampaignClickMetricDimension(
  record: CampaignAnalyticsEventRecord & { event: CampaignClickTrackingEvent },
  dimension: string,
) {
  if (dimension === "clickId") return record.event.click.id ?? "";
  if (dimension === "destination") return record.event.click.destination;
  if (dimension === "href") return record.event.click.href;
  if (dimension === "sessionId") return record.event.sessionId;
  if (dimension === "source") return record.event.utm.source;
  if (dimension === "medium") return record.event.utm.medium;
  if (dimension === "campaign") return record.event.utm.campaign;

  const value = record.attribution[dimension as keyof typeof record.attribution];

  return typeof value === "string" ? value : "";
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

function clickMetricsErrorResponse(
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

function createFallbackCampaignTrackingClicksStorage(): CampaignTrackingClicksStorage {
  return {
    getItem(key: string) {
      return fallbackCampaignTrackingClicksStorage.get(key) ?? null;
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
