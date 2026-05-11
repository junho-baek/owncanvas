import {
  getPersistedCampaignRecord,
  getPriorCampaignInteractionsForConversion,
  linkPurchaseConversionEventToAttributedCampaign,
  saveCampaignTrackingEvent,
  validateCampaignClickTrackingEvent,
  validateCampaignConversionTrackingEvent,
  validateCampaignEngagementTrackingEvent,
  validateCampaignExposureTrackingEvent,
  validateCampaignRevisitTrackingEvent,
  validateCampaignTrackingEventCampaignMetadata,
  type CampaignTrackingEvent,
  type CampaignTrackingEventValidationError,
  type UpdateCampaignRecordOptions,
} from "../features/creative-canvas/model/creative-canvas.ts";

export const CAMPAIGN_TRACKING_EVENTS_SCHEMA_VERSION =
  "owncanvas.campaign-tracking-events.v1";

type CampaignTrackingEventStorage = Pick<Storage, "getItem" | "setItem">;

type CampaignTrackingEventActionArgs = {
  request: Request;
  params?: {
    campaignId?: string;
  };
  storage?: CampaignTrackingEventStorage;
  now?: UpdateCampaignRecordOptions["now"];
};

type CampaignTrackingEventApiError = {
  code: string;
  message: string;
  errors?: Array<{
    code: string;
    path: string;
    message: string;
  }>;
};

const fallbackCampaignTrackingEventStorage = new Map<string, string>();

export async function action({
  request,
  params,
  storage,
  now,
}: CampaignTrackingEventActionArgs) {
  if (request.method !== "POST") {
    return trackingEventErrorResponse(
      {
        code: "method_not_allowed",
        message: "Campaign tracking event ingestion must use POST.",
      },
      405,
    );
  }

  const campaignId = params?.campaignId ?? "";

  if (campaignId.trim() === "") {
    return trackingEventErrorResponse(
      {
        code: "campaign_id_required",
        message: "Campaign tracking event requests require a campaignId.",
      },
      400,
    );
  }

  const campaignStorage = storage ?? createFallbackCampaignTrackingEventStorage();
  const campaign = getPersistedCampaignRecord(campaignStorage, campaignId);

  if (campaign === null) {
    return trackingEventErrorResponse(
      {
        code: "campaign.not_found",
        message: `Campaign "${campaignId}" was not found.`,
      },
      404,
    );
  }

  const body = await readCampaignTrackingEventBody(request);

  if (body === null) {
    return trackingEventErrorResponse(
      {
        code: "campaign_tracking_event.invalid_json",
        message: "Campaign tracking event requests require valid JSON.",
      },
      400,
    );
  }

  const expectedType = getExpectedTrackingEventType(request);

  if (isCampaignTrackingEventBatchBody(body)) {
    const validationResults = body.events.map((event) => {
      const validation =
        expectedType === "exposure"
          ? validateCampaignExposureTrackingEvent(event)
          : expectedType === "click"
          ? validateCampaignClickTrackingEvent(event)
          : expectedType === "conversion"
            ? validateCampaignConversionTrackingEvent(event)
            : expectedType === "revisit"
              ? validateCampaignRevisitTrackingEvent(event)
              : validateCampaignEngagementTrackingEvent(event);
      const errors = [
        ...validation.errors,
        ...validateRouteCampaignAndEventType(event, campaignId, expectedType),
        ...(validation.valid
          ? validateCampaignTrackingEventCampaignMetadata(
              campaign,
              validation.event,
            )
          : []),
      ];

      return {
        validation,
        errors,
      };
    });
    const errors = validationResults.flatMap((result) => result.errors);

    if (
      body.events.length === 0 ||
      errors.length > 0 ||
      validationResults.some((result) => !result.validation.valid)
    ) {
      return trackingEventErrorResponse(
        {
          code: "campaign_tracking_event.validation_failed",
          message: "Campaign tracking event is invalid.",
          errors:
            body.events.length === 0
              ? [
                  {
                    code: "tracking_event.batch_empty",
                    path: "events",
                    message: "Campaign tracking event batches require events.",
                  },
                ]
              : errors,
        },
        400,
      );
    }

    const events = validationResults.map(
      (result) => result.validation.event,
    ) as CampaignTrackingEvent[];
    let updatedCampaign = campaign;

    for (const event of events) {
      updatedCampaign = saveCampaignTrackingEvent(
        campaignStorage,
        campaignId,
        event,
        { now },
      );
    }

    return Response.json(
      {
        schemaVersion: CAMPAIGN_TRACKING_EVENTS_SCHEMA_VERSION,
        campaignId,
        events,
        trackingEvents: updatedCampaign.tracking.eventLog ?? [],
      },
      { status: 201 },
    );
  }

  const validation =
    expectedType === "exposure"
      ? validateCampaignExposureTrackingEvent(body)
      : expectedType === "click"
        ? validateCampaignClickTrackingEvent(body)
        : expectedType === "conversion"
          ? validateCampaignConversionTrackingEvent(body)
          : expectedType === "revisit"
            ? validateCampaignRevisitTrackingEvent(body)
            : validateCampaignEngagementTrackingEvent(body);
  const event =
    validation.valid && validation.event.type === "conversion"
      ? linkPurchaseConversionEventToAttributedCampaign(
          campaignStorage,
          validation.event,
        )
      : validation.event;
  const eventCampaignId = event === null ? campaignId : event.campaignId;
  const eventCampaign =
    event === null || eventCampaignId === campaignId
      ? campaign
      : getPersistedCampaignRecord(campaignStorage, eventCampaignId);
  const allowsPurchaseCampaignReroute =
    validation.valid &&
    validation.event.type === "conversion" &&
    validation.event.conversion.eventName === "purchase" &&
    event !== null &&
    event.campaignId !== validation.event.campaignId;
  const errors = [
    ...validation.errors,
    ...validateRouteCampaignAndEventType(body, campaignId, expectedType, {
      allowCampaignIdMismatch: allowsPurchaseCampaignReroute,
    }),
    ...(validation.valid && event !== null && eventCampaign !== null
      ? validateCampaignTrackingEventCampaignMetadata(eventCampaign, event)
      : []),
    ...(validation.valid && eventCampaign === null
      ? [
          {
            code: "tracking_event.campaign_id_mismatch" as const,
            path: "campaignId",
            message: `Attributed campaign "${eventCampaignId}" was not found.`,
          },
        ]
      : []),
  ];

  if (errors.length > 0 || !validation.valid || event === null) {
    return trackingEventErrorResponse(
      {
        code: "campaign_tracking_event.validation_failed",
        message: "Campaign tracking event is invalid.",
        errors,
      },
      400,
    );
  }

  const updatedCampaign = saveCampaignTrackingEvent(
    campaignStorage,
    eventCampaignId,
    event,
    { now },
  );
  const priorInteractions =
    event.type === "conversion"
      ? getPriorCampaignInteractionsForConversion(campaignStorage, event, {
          attributionWindowDays: getConversionAttributionWindowDays(event),
        })
      : null;

  return Response.json(
    {
      schemaVersion: CAMPAIGN_TRACKING_EVENTS_SCHEMA_VERSION,
      campaignId: eventCampaignId,
      event,
      attribution: createCampaignTrackingEventAttribution(event),
      ...(priorInteractions === null
        ? {}
        : {
            attributionWindow: {
              days: priorInteractions.attributionWindowDays,
              startsAt: priorInteractions.windowStartsAt,
              endsAt: priorInteractions.conversionOccurredAt,
            },
            priorInteractions: priorInteractions.interactions,
            ...(priorInteractions.attributionMatch === undefined
              ? {}
              : { attributionMatch: priorInteractions.attributionMatch }),
          }),
      trackingEvents: updatedCampaign.tracking.eventLog ?? [],
    },
    { status: 201 },
  );
}

function isCampaignTrackingEventBatchBody(
  body: Record<string, unknown>,
): body is {
  schemaVersion?: string;
  events: Record<string, unknown>[];
} {
  return Array.isArray(body.events);
}

function getExpectedTrackingEventType(request: Request) {
  const pathname = new URL(request.url).pathname;

  if (pathname.endsWith("/tracking/exposures")) return "exposure";
  if (pathname.endsWith("/tracking/conversions")) return "conversion";
  if (pathname.endsWith("/tracking/engagement")) return "engagement";
  if (pathname.endsWith("/tracking/revisits")) return "revisit";

  return "click";
}

function validateRouteCampaignAndEventType(
  body: Record<string, unknown>,
  campaignId: string,
  expectedType: CampaignTrackingEvent["type"],
  options: {
    allowCampaignIdMismatch?: boolean;
  } = {},
) {
  const errors: Array<CampaignTrackingEventValidationError | RouteValidationError> = [];

  if (
    !options.allowCampaignIdMismatch &&
    typeof body.campaignId === "string" &&
    body.campaignId !== campaignId
  ) {
    errors.push({
      code: "tracking_event.campaign_id_mismatch",
      path: "campaignId",
      message: "Tracking event campaign id must match the route campaign id.",
    });
  }

  if (body.type !== undefined && body.type !== expectedType) {
    errors.push({
      code: "tracking_event.type_unsupported",
      path: "type",
      message: `This endpoint only accepts ${expectedType} tracking events.`,
    });
  }

  return errors;
}

type RouteValidationError = {
  code: "tracking_event.campaign_id_mismatch" | "tracking_event.type_unsupported";
  path: string;
  message: string;
};

function createCampaignTrackingEventAttribution(event: CampaignTrackingEvent) {
  const metadata = event.target.metadata;

  return {
    campaignId: event.campaignId,
    sessionId: event.sessionId,
    content: event.content,
    utm: event.utm,
    ...(metadata.nodeId === undefined ? {} : { nodeId: metadata.nodeId }),
    ...(metadata.inputPortId === undefined
      ? {}
      : { inputPortId: metadata.inputPortId }),
    ...(metadata.outputPortId === undefined
      ? {}
      : { outputPortId: metadata.outputPortId }),
    ...(metadata.channelId === undefined
      ? {}
      : { channelId: metadata.channelId }),
    ...(metadata.assetId === undefined ? {} : { assetId: metadata.assetId }),
    ...(metadata.productId === undefined
      ? {}
      : { productId: metadata.productId }),
    ...(metadata.offerId === undefined ? {} : { offerId: metadata.offerId }),
    ...(metadata.url === undefined ? {} : { url: metadata.url }),
    ...(metadata.label === undefined ? {} : { label: metadata.label }),
    ...(event.type === "click"
      ? {
          ...(event.click.id === undefined ? {} : { clickId: event.click.id }),
          href: event.click.href,
        }
      : {}),
    ...(event.type === "click" && event.click.destination !== undefined
      ? { destination: event.click.destination }
      : {}),
    ...(event.type === "conversion"
      ? {
          conversionEventName: event.conversion.eventName,
          ...(event.conversion.value === undefined
            ? {}
            : { conversionValue: event.conversion.value }),
          ...(event.conversion.currency === undefined
            ? {}
            : { conversionCurrency: event.conversion.currency }),
          ...(event.conversion.orderId === undefined
            ? {}
            : { orderId: event.conversion.orderId }),
          ...(event.conversion.quantity === undefined
            ? {}
            : { quantity: event.conversion.quantity }),
        }
      : {}),
    ...(event.type === "engagement"
      ? {
          engagementKind: event.engagement.kind,
          engagementAction: event.engagement.action,
          ...(event.engagement.value === undefined
            ? {}
            : { engagementValue: event.engagement.value }),
          ...(event.engagement.unit === undefined
            ? {}
              : { engagementUnit: event.engagement.unit }),
        }
      : {}),
    ...(event.type === "revisit"
      ? {
          firstSeenAt: event.revisit.firstSeenAt,
          lastSeenAt: event.revisit.lastSeenAt,
          matchedBy: event.revisit.matchedBy,
        }
      : {}),
  };
}

function getConversionAttributionWindowDays(event: CampaignTrackingEvent) {
  if (event.type !== "conversion" || !isRecord(event.conversion.metadata)) {
    return undefined;
  }

  const attributionWindowDays = event.conversion.metadata.attributionWindowDays;

  return typeof attributionWindowDays === "number"
    ? attributionWindowDays
    : undefined;
}

async function readCampaignTrackingEventBody(request: Request) {
  try {
    const body = (await request.json()) as unknown;
    return isRecord(body) ? body : null;
  } catch {
    return null;
  }
}

function trackingEventErrorResponse(
  error: CampaignTrackingEventApiError,
  status: number,
) {
  return Response.json(
    {
      schemaVersion: CAMPAIGN_TRACKING_EVENTS_SCHEMA_VERSION,
      error,
    },
    { status },
  );
}

function createFallbackCampaignTrackingEventStorage(): CampaignTrackingEventStorage {
  return {
    getItem(key: string) {
      return fallbackCampaignTrackingEventStorage.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      fallbackCampaignTrackingEventStorage.set(key, value);
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
