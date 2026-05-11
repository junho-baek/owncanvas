import {
  CAMPAIGN_TRACKING_EVENT_SCHEMA_VERSION,
  identifyReturningCampaignAttribution,
  saveCampaignTrackingEvent,
  trackInboundCampaignSession,
  type CampaignClickTrackingEvent,
  type CampaignConversionTrackingEvent,
  type CampaignDraft,
  type CampaignEngagementTrackingEvent,
  type CampaignExposureTrackingEvent,
  type CampaignRevisitTrackingEvent,
  type CampaignTrackedSession,
  type CampaignTrackingEvent,
  type CampaignTrackingEventContentMetadata,
  type CampaignTrackingEventTarget,
  type CampaignUtmTracking,
} from "../model/creative-canvas.ts";

export type CampaignSurfaceTrackingStorage = Pick<
  Storage,
  "getItem" | "setItem"
>;

export type CampaignSurfaceTrackingFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export type CampaignSurfaceTrackingSessionOptions = {
  campaign: CampaignDraft;
  url: string;
  sessionStorage: CampaignSurfaceTrackingStorage;
  persistentStorage?: CampaignSurfaceTrackingStorage;
  now?: () => string;
  createId?: () => string;
};

export type CampaignSurfaceTrackingClientOptions = {
  campaign: CampaignDraft;
  url: string;
  campaignStorage: CampaignSurfaceTrackingStorage;
  sessionStorage: CampaignSurfaceTrackingStorage;
  fetch?: CampaignSurfaceTrackingFetch;
  now?: () => string;
  createId?: () => string;
  deliveryDelayMs?: number;
  deliveryMaxAttempts?: number;
};

export type CampaignSurfaceExposureInput = {
  target: CampaignTrackingEventTarget;
  content: CampaignTrackingEventContentMetadata;
  surface: string;
  placement: string;
  viewId?: string;
};

export type CampaignSurfaceClickInput = {
  target: CampaignTrackingEventTarget;
  content: CampaignTrackingEventContentMetadata;
  href: string;
  label?: string;
  destination?: string;
};

export type CampaignSurfaceEngagementInput = {
  target: CampaignTrackingEventTarget;
  content: CampaignTrackingEventContentMetadata;
  kind: "playback" | "scroll";
  action: string;
  value?: number;
  unit?: "percent" | "seconds" | "pixels" | "count";
  metadata?: Record<string, unknown>;
};

export type CampaignSurfaceConversionInput = {
  target: CampaignTrackingEventTarget;
  content: CampaignTrackingEventContentMetadata;
  eventName: string;
  value?: number;
  currency?: string;
  orderId?: string;
  quantity?: number;
  metadata?: Record<string, unknown>;
};

export type CampaignSurfaceTrackingClient = {
  readonly session: CampaignTrackedSession;
  emitExposure(input: CampaignSurfaceExposureInput): Promise<CampaignExposureTrackingEvent>;
  emitClick(input: CampaignSurfaceClickInput): Promise<CampaignClickTrackingEvent | null>;
  emitEngagement(input: CampaignSurfaceEngagementInput): Promise<CampaignEngagementTrackingEvent>;
  emitConversion(input: CampaignSurfaceConversionInput): Promise<CampaignConversionTrackingEvent>;
  emitRevisit(): CampaignRevisitTrackingEvent | null;
  flushTrackingEvents(): Promise<void>;
};

const CAMPAIGN_SURFACE_SESSION_KEY_PREFIX = "owncanvas:campaign-session:";
const CAMPAIGN_TRACKED_CLICK_SELECTOR = "a[data-campaign-track-click]";
const CAMPAIGN_TRACKING_BATCH_SCHEMA_VERSION =
  "owncanvas.campaign-tracking-batch.v1";

type CampaignSurfaceTrackedClickElement = {
  href?: string;
  dataset?: Record<string, string | undefined>;
  closest?: (selector: string) => CampaignSurfaceTrackedClickElement | null;
};

export type CampaignSurfaceTrackedClickCaptureInput = {
  campaign: CampaignDraft;
  trackingClient: CampaignSurfaceTrackingClient | null;
  event: {
    target: unknown;
    currentTarget?: unknown;
  };
};

export function createCampaignSurfaceTrackingClient(
  options: CampaignSurfaceTrackingClientOptions,
): CampaignSurfaceTrackingClient {
  const session = getOrCreateCampaignSurfaceSession({
    ...options,
    persistentStorage: options.campaignStorage,
  });
  const now = options.now ?? (() => new Date().toISOString());
  const createId = options.createId ?? createRandomId;
  const deliveryBuffer = createCampaignSurfaceTrackingDeliveryBuffer({
    fetcher: options.fetch,
    delayMs: options.deliveryDelayMs ?? 50,
    maxAttempts: options.deliveryMaxAttempts ?? 2,
  });
  const returningAttribution = identifyReturningCampaignAttribution(
    options.campaignStorage,
    options.campaign.id,
    {
      sessionId: session.id,
      userId: getCampaignSurfaceSessionUserId(session),
      attributionParameters: session.attributionParameters,
    },
  );
  const userId = getCampaignSurfaceSessionUserId(session);

  function emit(event: CampaignTrackingEvent) {
    saveCampaignTrackingEvent(options.campaignStorage, options.campaign.id, event);
    deliveryBuffer.enqueue(event);
  }

  function emitRevisit() {
    if (!returningAttribution.returning) {
      return null;
    }

    const firstSeenAt = returningAttribution.matches
      .map((match) => match.firstSeenAt)
      .sort((left, right) => Date.parse(left) - Date.parse(right))[0];
    const lastSeenAt = returningAttribution.matches
      .map((match) => match.lastSeenAt)
      .sort((left, right) => Date.parse(right) - Date.parse(left))[0];
    const landingNodeId = findCampaignLandingNodeId(options.campaign);
    const event: CampaignRevisitTrackingEvent = {
      schemaVersion: CAMPAIGN_TRACKING_EVENT_SCHEMA_VERSION,
      type: "revisit",
      id: `event_revisit_${createId()}`,
      campaignId: options.campaign.id,
      sessionId: session.id,
      context: {
        actor: "human",
        userId,
        permissionMode: "basic",
      },
      occurredAt: now(),
      content: normalizeCampaignSurfaceContent(
        {
          type: "landing_surface",
          id: `${options.campaign.id}:revisit`,
          nodeId: landingNodeId,
          productId: options.campaign.productOffer.product.id,
          offerId: options.campaign.productOffer.attribution.externalId,
        },
        session,
      ),
      utm: session.utm,
      target: normalizeCampaignSurfaceTarget(
        {
          type: "landing.revisit",
          id: `${options.campaign.id}:revisit`,
          metadata: {
            nodeId: landingNodeId,
            outputPortId: "outputs.revisit",
            productId: options.campaign.productOffer.product.id,
            offerId: options.campaign.productOffer.attribution.externalId,
            url: session.url,
            label: "Landing revisit",
          },
        },
        session,
      ),
      revisit: {
        firstSeenAt,
        lastSeenAt,
        matchedBy: returningAttribution.matches,
      },
    };

    emit(event);

    return event;
  }

  const client: CampaignSurfaceTrackingClient = {
    session,
    async emitExposure(input: CampaignSurfaceExposureInput) {
      const event: CampaignExposureTrackingEvent = {
        schemaVersion: CAMPAIGN_TRACKING_EVENT_SCHEMA_VERSION,
        type: "exposure",
        id: `event_exposure_${createId()}`,
        campaignId: options.campaign.id,
        sessionId: session.id,
        context: {
          actor: "human",
          userId,
          permissionMode: "basic",
        },
        occurredAt: now(),
        content: normalizeCampaignSurfaceContent(input.content, session),
        utm: session.utm,
        target: normalizeCampaignSurfaceTarget(input.target, session),
        exposure: {
          surface: input.surface,
          placement: input.placement,
          ...(input.viewId === undefined ? {} : { viewId: input.viewId }),
        },
      };

      emit(event);

      return event;
    },
    async emitClick(input: CampaignSurfaceClickInput) {
      const resolvedHref = toHttpUrl(input.href, session.url);

      if (resolvedHref === null) {
        return null;
      }

      const href = shouldPersistCampaignAttributionOnClick(input)
        ? createCampaignSurfaceAttributedUrl(resolvedHref, session)
        : resolvedHref;

      const event: CampaignClickTrackingEvent = {
        schemaVersion: CAMPAIGN_TRACKING_EVENT_SCHEMA_VERSION,
        type: "click",
        id: `event_click_${createId()}`,
        campaignId: options.campaign.id,
        sessionId: session.id,
        context: {
          actor: "human",
          userId,
          permissionMode: "basic",
        },
        occurredAt: now(),
        content: normalizeCampaignSurfaceContent(input.content, session),
        utm: session.utm,
        target: normalizeCampaignSurfaceTarget(
          {
            ...input.target,
            metadata: {
              ...input.target.metadata,
              url: href,
              ...(input.label === undefined ? {} : { label: input.label }),
            },
          },
          session,
        ),
        click: {
          id: `click_${createId()}`,
          href,
          ...(input.label === undefined ? {} : { label: input.label }),
          ...(input.destination === undefined
            ? {}
            : { destination: input.destination }),
        },
      };

      emit(event);

      return event;
    },
    async emitEngagement(input: CampaignSurfaceEngagementInput) {
      const event: CampaignEngagementTrackingEvent = {
        schemaVersion: CAMPAIGN_TRACKING_EVENT_SCHEMA_VERSION,
        type: "engagement",
        id: `event_engagement_${createId()}`,
        campaignId: options.campaign.id,
        sessionId: session.id,
        context: {
          actor: "human",
          userId,
          permissionMode: "basic",
        },
        occurredAt: now(),
        content: normalizeCampaignSurfaceContent(input.content, session),
        utm: session.utm,
        target: normalizeCampaignSurfaceTarget(input.target, session),
        engagement: {
          kind: input.kind,
          action: input.action,
          ...(input.value === undefined ? {} : { value: input.value }),
          ...(input.unit === undefined ? {} : { unit: input.unit }),
          ...(input.metadata === undefined ? {} : { metadata: input.metadata }),
        },
      };

      emit(event);

      return event;
    },
    async emitConversion(input: CampaignSurfaceConversionInput) {
      const event: CampaignConversionTrackingEvent = {
        schemaVersion: CAMPAIGN_TRACKING_EVENT_SCHEMA_VERSION,
        type: "conversion",
        id: `event_conversion_${createId()}`,
        campaignId: options.campaign.id,
        sessionId: session.id,
        context: {
          actor: "human",
          userId,
          permissionMode: "basic",
        },
        occurredAt: now(),
        content: normalizeCampaignSurfaceContent(input.content, session),
        utm: session.utm,
        target: normalizeCampaignSurfaceTarget(input.target, session),
        conversion: removeUndefinedValues({
          eventName: input.eventName,
          value: input.value,
          currency: input.currency,
          orderId: input.orderId,
          quantity: input.quantity,
          metadata: input.metadata,
        }),
      };

      emit(event);

      return event;
    },
    flushTrackingEvents() {
      return deliveryBuffer.flush();
    },
    emitRevisit,
  };

  client.emitRevisit();
  trackInboundCampaignSession(
    options.campaignStorage,
    options.campaign.id,
    createCampaignSurfaceTrackableSessionUrl(session),
    {
      now,
    },
  );

  return client;
}

export function getOrCreateCampaignSurfaceSession(
  options: CampaignSurfaceTrackingSessionOptions,
): CampaignTrackedSession {
  const key = getCampaignSurfaceSessionStorageKey(options.campaign.id);
  const currentUrl = toHttpUrl(options.url, options.url) ?? "http://localhost/";
  const url = new URL(currentUrl);
  const stored =
    readStoredCampaignSurfaceSession(options.sessionStorage, key) ??
    (options.persistentStorage === undefined
      ? null
      : readStoredCampaignSurfaceSession(options.persistentStorage, key));
  const now = options.now?.() ?? new Date().toISOString();
  const sessionId =
    readFirstSearchParam(url.searchParams, "oc_session_id", "session_id") ??
    stored?.id ??
    `session_${options.createId?.() ?? createRandomId()}`;
  const utm = createCampaignSurfaceSessionUtm(options.campaign, url, stored);

  const session: CampaignTrackedSession = {
    id: sessionId,
    campaignId: options.campaign.id,
    ...optionalStringField(
      "userId",
      readFirstSearchParam(url.searchParams, "oc_user_id", "user_id") ??
        stored?.userId ??
        "",
    ),
    url: currentUrl,
    ...optionalStringField(
      "channelId",
      readFirstSearchParam(url.searchParams, "oc_channel_id", "channel_id") ??
        stored?.channelId ??
        "",
    ),
    ...optionalStringField(
      "touchpointId",
      readFirstSearchParam(
        url.searchParams,
        "oc_touchpoint_id",
        "touchpoint_id",
      ) ??
        stored?.touchpointId ??
        "",
    ),
    firstSeenAt: stored?.firstSeenAt ?? now,
    lastSeenAt: now,
    utm,
    attributionParameters: createCampaignSurfaceAttributionParameters(
      url.searchParams,
      stored,
    ),
  };

  options.sessionStorage.setItem(key, JSON.stringify(session));
  options.persistentStorage?.setItem(key, JSON.stringify(session));

  return session;
}

function getCampaignSurfaceSessionStorageKey(campaignId: string) {
  return `${CAMPAIGN_SURFACE_SESSION_KEY_PREFIX}${campaignId}`;
}

export function createCampaignSurfaceModuleExposureInput(input: {
  campaign: CampaignDraft;
  moduleId: string;
  moduleLabel: string;
  pageId?: string;
  sourceContentId?: string;
  sourceAssetId?: string;
  url?: string;
  placement?: string;
}): CampaignSurfaceExposureInput {
  return {
    target: {
      type: "landing.module",
      id: input.moduleId,
      metadata: {
        nodeId: findCampaignLandingNodeId(input.campaign),
        outputPortId: "outputs.exposure",
        pageId: input.pageId ?? "landing-page",
        assetId: input.sourceAssetId,
        productId: input.campaign.productOffer.product.id,
        offerId: input.campaign.productOffer.attribution.externalId,
        url: input.url,
        label: input.moduleLabel,
      },
    },
    content: {
      type: "short_video",
      id: input.sourceContentId ?? input.moduleId,
      nodeId: findCampaignLandingNodeId(input.campaign),
      pageId: input.pageId ?? "landing-page",
      assetId: input.sourceAssetId,
      productId: input.campaign.productOffer.product.id,
      offerId: input.campaign.productOffer.attribution.externalId,
    },
    surface: "landing",
    placement: input.placement ?? "module",
    viewId: `view_${input.moduleId}`,
  };
}

export function createCampaignSurfaceCtaClickInput(input: {
  campaign: CampaignDraft;
  ctaId: string;
  ctaLabel: string;
  href: string;
  destination?: string;
}): CampaignSurfaceClickInput {
  return {
    target: {
      type: "cta",
      id: input.ctaId,
      metadata: {
        nodeId: findCampaignLandingNodeId(input.campaign),
        outputPortId: "outputs.click",
        productId: input.campaign.productOffer.product.id,
        offerId: input.campaign.productOffer.attribution.externalId,
        url: input.href,
        label: input.ctaLabel,
      },
    },
    content: {
      type: "landing_cta",
      id: input.ctaId,
      nodeId: findCampaignLandingNodeId(input.campaign),
      productId: input.campaign.productOffer.product.id,
      offerId: input.campaign.productOffer.attribution.externalId,
    },
    href: input.href,
    label: input.ctaLabel,
    destination: input.destination ?? "conversion",
  };
}

export function createCampaignSurfaceConversionInput(input: {
  campaign: CampaignDraft;
  targetId: string;
  contentId?: string;
  eventName: string;
  value?: number;
  currency?: string;
  orderId?: string;
  quantity?: number;
  url?: string;
  metadata?: Record<string, unknown>;
}): CampaignSurfaceConversionInput {
  return {
    target: {
      type: "checkout",
      id: input.targetId,
      metadata: {
        nodeId: findCampaignLandingNodeId(input.campaign),
        inputPortId: "inputs.purchase",
        productId: input.campaign.productOffer.product.id,
        offerId: input.campaign.productOffer.attribution.externalId,
        url: input.url,
        label: input.eventName,
      },
    },
    content: {
      type: "checkout",
      id: input.contentId ?? input.targetId,
      nodeId: findCampaignLandingNodeId(input.campaign),
      productId: input.campaign.productOffer.product.id,
      offerId: input.campaign.productOffer.attribution.externalId,
    },
    eventName: input.eventName,
    ...(input.value === undefined ? {} : { value: input.value }),
    ...(input.currency === undefined ? {} : { currency: input.currency }),
    ...(input.orderId === undefined ? {} : { orderId: input.orderId }),
    ...(input.quantity === undefined ? {} : { quantity: input.quantity }),
    ...(input.metadata === undefined ? {} : { metadata: input.metadata }),
  };
}

export function createCampaignSurfacePlaybackEngagementInput(input: {
  campaign: CampaignDraft;
  moduleId: string;
  moduleLabel: string;
  pageId?: string;
  sourceContentId?: string;
  sourceAssetId?: string;
  url?: string;
  action: string;
  value?: number;
  unit?: CampaignSurfaceEngagementInput["unit"];
  metadata?: Record<string, unknown>;
}): CampaignSurfaceEngagementInput {
  return {
    target: {
      type: "landing.module",
      id: input.moduleId,
      metadata: {
        nodeId: findCampaignLandingNodeId(input.campaign),
        outputPortId: "outputs.engagement",
        pageId: input.pageId ?? "landing-page",
        assetId: input.sourceAssetId,
        productId: input.campaign.productOffer.product.id,
        offerId: input.campaign.productOffer.attribution.externalId,
        url: input.url,
        label: input.moduleLabel,
      },
    },
    content: {
      type: "short_video",
      id: input.sourceContentId ?? input.moduleId,
      nodeId: findCampaignLandingNodeId(input.campaign),
      pageId: input.pageId ?? "landing-page",
      assetId: input.sourceAssetId,
      productId: input.campaign.productOffer.product.id,
      offerId: input.campaign.productOffer.attribution.externalId,
    },
    kind: "playback",
    action: input.action,
    ...(input.value === undefined ? {} : { value: input.value }),
    ...(input.unit === undefined ? {} : { unit: input.unit }),
    ...(input.metadata === undefined ? {} : { metadata: input.metadata }),
  };
}

export function createCampaignSurfacePlaybackControlEngagementInput(input: {
  campaign: CampaignDraft;
  moduleId: string;
  moduleLabel: string;
  pageId?: string;
  sourceContentId?: string;
  sourceAssetId?: string;
  url?: string;
  control: string;
  currentTimeSeconds?: number;
  durationSeconds?: number;
  metadata?: Record<string, unknown>;
}): CampaignSurfaceEngagementInput {
  return createCampaignSurfacePlaybackEngagementInput({
    campaign: input.campaign,
    moduleId: input.moduleId,
    moduleLabel: input.moduleLabel,
    pageId: input.pageId,
    sourceContentId: input.sourceContentId,
    sourceAssetId: input.sourceAssetId,
    url: input.url,
    action: `control:${input.control}`,
    value: 1,
    unit: "count",
    metadata: removeUndefinedValues({
      control: input.control,
      currentTimeSeconds: input.currentTimeSeconds,
      durationSeconds: input.durationSeconds,
      ...input.metadata,
    }),
  });
}

export function createCampaignSurfaceScrollEngagementInput(input: {
  campaign: CampaignDraft;
  surfaceId: string;
  surfaceLabel: string;
  pageId?: string;
  action: string;
  value?: number;
  unit?: CampaignSurfaceEngagementInput["unit"];
  metadata?: Record<string, unknown>;
}): CampaignSurfaceEngagementInput {
  return {
    target: {
      type: "landing.surface",
      id: input.surfaceId,
      metadata: {
        nodeId: findCampaignLandingNodeId(input.campaign),
        outputPortId: "outputs.engagement",
        pageId: input.pageId ?? input.surfaceId,
        productId: input.campaign.productOffer.product.id,
        offerId: input.campaign.productOffer.attribution.externalId,
        label: input.surfaceLabel,
      },
    },
    content: {
      type: "landing_surface",
      id: input.surfaceId,
      nodeId: findCampaignLandingNodeId(input.campaign),
      pageId: input.pageId ?? input.surfaceId,
      productId: input.campaign.productOffer.product.id,
      offerId: input.campaign.productOffer.attribution.externalId,
    },
    kind: "scroll",
    action: input.action,
    ...(input.value === undefined ? {} : { value: input.value }),
    ...(input.unit === undefined ? {} : { unit: input.unit }),
    ...(input.metadata === undefined ? {} : { metadata: input.metadata }),
  };
}

export async function captureCampaignSurfaceTrackedClick({
  campaign,
  trackingClient,
  event,
}: CampaignSurfaceTrackedClickCaptureInput): Promise<CampaignClickTrackingEvent | null> {
  if (trackingClient === null) {
    return null;
  }

  const anchor =
    findCampaignTrackedClickAnchor(event.target) ??
    findCampaignTrackedClickAnchor(event.currentTarget);

  if (anchor === null || anchor.href === undefined || anchor.href.trim() === "") {
    return null;
  }

  const dataset = anchor.dataset ?? {};
  const targetId = readDatasetValue(dataset, "trackingTargetId") ?? "campaign_cta";
  const label = readDatasetValue(dataset, "trackingLabel");
  const nodeId =
    readDatasetValue(dataset, "trackingNodeId") ?? findCampaignLandingNodeId(campaign);
  const productId =
    readDatasetValue(dataset, "trackingProductId") ??
    campaign.productOffer.product.id;
  const offerId =
    readDatasetValue(dataset, "trackingOfferId") ??
    campaign.productOffer.attribution.externalId;

  return trackingClient.emitClick({
    target: {
      type: readDatasetValue(dataset, "trackingTargetType") ?? "cta",
      id: targetId,
      metadata: {
        nodeId,
        outputPortId:
          readDatasetValue(dataset, "trackingOutputPortId") ?? "outputs.click",
        productId,
        offerId,
        url: anchor.href,
        ...(label === undefined ? {} : { label }),
      },
    },
    content: {
      type: readDatasetValue(dataset, "trackingContentType") ?? "landing_cta",
      id: readDatasetValue(dataset, "trackingContentId") ?? targetId,
      nodeId,
      productId,
      offerId,
    },
    href: anchor.href,
    ...(label === undefined ? {} : { label }),
    destination: readDatasetValue(dataset, "trackingDestination") ?? "conversion",
  });
}

async function postCampaignSurfaceTrackingEvent(
  fetcher: CampaignSurfaceTrackingFetch,
  events: CampaignTrackingEvent[],
  maxAttempts: number,
) {
  if (events.length === 0) {
    return;
  }

  const [event] = events;
  const endpoint = getCampaignSurfaceTrackingEventEndpoint(event);
  const body = JSON.stringify(
    events.length === 1
      ? event
      : {
          schemaVersion: CAMPAIGN_TRACKING_BATCH_SCHEMA_VERSION,
          events,
        },
  );

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetcher(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
        keepalive: true,
      });

      if (!response.ok) {
        throw new Error(`Tracking delivery failed with HTTP ${response.status}`);
      }

      return;
    } catch {
      if (attempt === maxAttempts) {
        // Local persistence above is the source of truth for the OSS preview.
        return;
      }
    }
  }
}

function createCampaignSurfaceTrackingDeliveryBuffer(options: {
  fetcher: CampaignSurfaceTrackingFetch | undefined;
  delayMs: number;
  maxAttempts: number;
}) {
  const pending: CampaignTrackingEvent[] = [];
  let flushTimer: ReturnType<typeof setTimeout> | null = null;
  let inFlight: Promise<void> | null = null;

  function scheduleFlush() {
    if (options.fetcher === undefined || flushTimer !== null) {
      return;
    }

    flushTimer = setTimeout(() => {
      flushTimer = null;
      void flush();
    }, options.delayMs);
  }

  async function flush() {
    if (flushTimer !== null) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }

    if (inFlight !== null) {
      await inFlight;
    }

    if (options.fetcher === undefined || pending.length === 0) {
      return;
    }

    const batch = pending.splice(0, pending.length);
    inFlight = Promise.all(
      groupCampaignSurfaceTrackingEventsByEndpoint(batch).map((events) =>
        postCampaignSurfaceTrackingEvent(
          options.fetcher!,
          events,
          normalizeCampaignSurfaceTrackingDeliveryMaxAttempts(
            options.maxAttempts,
          ),
        ),
      ),
    ).then(() => undefined);

    try {
      await inFlight;
    } finally {
      inFlight = null;

      if (pending.length > 0) {
        scheduleFlush();
      }
    }
  }

  return {
    enqueue(event: CampaignTrackingEvent) {
      if (options.fetcher === undefined) {
        return;
      }

      pending.push(event);
      scheduleFlush();
    },
    flush,
  };
}

function normalizeCampaignSurfaceTrackingDeliveryMaxAttempts(
  maxAttempts: number,
) {
  return Number.isFinite(maxAttempts) ? Math.max(1, Math.floor(maxAttempts)) : 1;
}

function groupCampaignSurfaceTrackingEventsByEndpoint(
  events: CampaignTrackingEvent[],
) {
  const groups = new Map<string, CampaignTrackingEvent[]>();

  for (const event of events) {
    const endpoint = getCampaignSurfaceTrackingEventEndpoint(event);
    const group = groups.get(endpoint);

    if (group === undefined) {
      groups.set(endpoint, [event]);
    } else {
      group.push(event);
    }
  }

  return [...groups.values()];
}

function getCampaignSurfaceTrackingEventEndpoint(event: CampaignTrackingEvent) {
  return event.type === "exposure"
    ? `/api/campaigns/${encodeURIComponent(event.campaignId)}/tracking/exposures`
    : event.type === "engagement"
      ? `/api/campaigns/${encodeURIComponent(event.campaignId)}/tracking/engagement`
    : event.type === "conversion"
      ? `/api/campaigns/${encodeURIComponent(event.campaignId)}/tracking/conversions`
    : event.type === "revisit"
      ? `/api/campaigns/${encodeURIComponent(event.campaignId)}/tracking/revisits`
    : `/api/campaigns/${encodeURIComponent(event.campaignId)}/tracking/clicks`;
}

function shouldPersistCampaignAttributionOnClick(input: CampaignSurfaceClickInput) {
  const destination = input.destination?.trim().toLowerCase();
  const targetType = input.target.type.trim().toLowerCase();

  return (
    destination === "checkout" ||
    destination === "conversion" ||
    targetType === "checkout"
  );
}

function createCampaignSurfaceAttributedUrl(
  href: string,
  session: CampaignTrackedSession,
) {
  const url = new URL(href);

  setNonEmptySearchParam(url.searchParams, "oc_campaign_id", session.campaignId);
  setNonEmptySearchParam(url.searchParams, "oc_session_id", session.id);
  setNonEmptySearchParam(url.searchParams, "oc_user_id", session.userId);
  setNonEmptySearchParam(url.searchParams, "oc_channel_id", session.channelId);
  setNonEmptySearchParam(
    url.searchParams,
    "oc_touchpoint_id",
    session.touchpointId,
  );
  setNonEmptySearchParam(url.searchParams, "utm_source", session.utm.source);
  setNonEmptySearchParam(url.searchParams, "utm_medium", session.utm.medium);
  setNonEmptySearchParam(url.searchParams, "utm_campaign", session.utm.campaign);
  setNonEmptySearchParam(url.searchParams, "utm_content", session.utm.content);
  setNonEmptySearchParam(url.searchParams, "utm_term", session.utm.term);

  for (const parameter of session.attributionParameters) {
    setNonEmptySearchParam(
      url.searchParams,
      parameter.key.trim(),
      parameter.value,
      { preserveExisting: true },
    );
  }

  return url.toString();
}

function createCampaignSurfaceTrackableSessionUrl(session: CampaignTrackedSession) {
  const url = new URL(session.url);

  if (
    readFirstSearchParam(url.searchParams, "utm_source") !== null &&
    readFirstSearchParam(url.searchParams, "utm_medium") !== null &&
    readFirstSearchParam(url.searchParams, "utm_campaign") !== null
  ) {
    return session.url;
  }

  return createCampaignSurfaceAttributedUrl(session.url, session);
}

function setNonEmptySearchParam(
  searchParams: URLSearchParams,
  key: string,
  value: string | undefined,
  options: { preserveExisting?: boolean } = {},
) {
  const normalizedKey = key.trim();
  const normalizedValue = value?.trim() ?? "";

  if (
    normalizedKey === "" ||
    normalizedValue === "" ||
    (options.preserveExisting === true && searchParams.has(normalizedKey))
  ) {
    return;
  }

  searchParams.set(normalizedKey, normalizedValue);
}

function normalizeCampaignSurfaceTarget(
  target: CampaignTrackingEventTarget,
  session: CampaignTrackedSession,
): CampaignTrackingEventTarget {
  return {
    type: target.type,
    id: target.id,
    metadata: removeUndefinedValues({
      ...target.metadata,
      channelId: target.metadata.channelId ?? session.channelId,
    }),
  };
}

function normalizeCampaignSurfaceContent(
  content: CampaignTrackingEventContentMetadata,
  session: CampaignTrackedSession,
): CampaignTrackingEventContentMetadata {
  return removeUndefinedValues({
    ...content,
    channelId: content.channelId ?? session.channelId,
  });
}

function createCampaignSurfaceSessionUtm(
  campaign: CampaignDraft,
  url: URL,
  stored: CampaignTrackedSession | null,
): CampaignUtmTracking {
  return {
    source:
      readFirstSearchParam(url.searchParams, "utm_source") ??
      stored?.utm.source ??
      campaign.tracking.utm.source ??
      "direct",
    medium:
      readFirstSearchParam(url.searchParams, "utm_medium") ??
      stored?.utm.medium ??
      campaign.tracking.utm.medium ??
      "landing",
    campaign:
      readFirstSearchParam(url.searchParams, "utm_campaign") ??
      stored?.utm.campaign ??
      campaign.tracking.utm.campaign ??
      campaign.id,
    content:
      readFirstSearchParam(url.searchParams, "utm_content") ??
      stored?.utm.content ??
      campaign.tracking.utm.content ??
      "",
    term:
      readFirstSearchParam(url.searchParams, "utm_term") ??
      stored?.utm.term ??
      campaign.tracking.utm.term ??
      "",
  };
}

function createCampaignSurfaceAttributionParameters(
  searchParams: URLSearchParams,
  stored: CampaignTrackedSession | null,
) {
  const reserved = new Set([
    "oc_campaign_id",
    "campaign_id",
    "oc_session_id",
    "session_id",
    "oc_user_id",
    "user_id",
    "oc_channel_id",
    "channel_id",
    "oc_touchpoint_id",
    "touchpoint_id",
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
    "utm_term",
  ]);
  const parameters = [...(stored?.attributionParameters ?? [])];

  searchParams.forEach((value, key) => {
    if (reserved.has(key) || value.trim() === "") {
      return;
    }

    parameters.push({ key, value: value.trim(), source: "url" });
  });

  return parameters;
}

function getCampaignSurfaceSessionUserId(session: CampaignTrackedSession) {
  return session.userId?.trim() || `anonymous:${session.id}`;
}

function findCampaignLandingNodeId(campaign: CampaignDraft) {
  return (
    campaign.canvasState.nodes.find((node) => node.kind === "landing")?.id ??
    "landing"
  );
}

function findCampaignTrackedClickAnchor(
  target: unknown,
): CampaignSurfaceTrackedClickElement | null {
  if (!isTrackedClickElement(target)) {
    return null;
  }

  if (target.dataset?.campaignTrackClick !== undefined) {
    return target;
  }

  return typeof target.closest === "function"
    ? target.closest(CAMPAIGN_TRACKED_CLICK_SELECTOR)
    : null;
}

function isTrackedClickElement(
  value: unknown,
): value is CampaignSurfaceTrackedClickElement {
  return typeof value === "object" && value !== null;
}

function readDatasetValue(
  dataset: Record<string, string | undefined>,
  key: string,
) {
  const value = dataset[key];

  return value === undefined || value.trim() === "" ? undefined : value.trim();
}

function readStoredCampaignSurfaceSession(
  storage: CampaignSurfaceTrackingStorage,
  key: string,
) {
  try {
    const value = storage.getItem(key);
    return value === null ? null : (JSON.parse(value) as CampaignTrackedSession);
  } catch {
    return null;
  }
}

function readFirstSearchParam(searchParams: URLSearchParams, ...keys: string[]) {
  for (const key of keys) {
    const value = searchParams.get(key);

    if (value !== null && value.trim() !== "") {
      return value.trim();
    }
  }

  return null;
}

function toHttpUrl(value: string, base: string) {
  try {
    const url = new URL(value, base);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

function optionalStringField<Key extends string>(key: Key, value: string) {
  return value.trim() === "" ? {} : { [key]: value.trim() };
}

function removeUndefinedValues<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as T;
}

function createRandomId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replace(/-/g, "");
  }

  return `${Date.now()}_${Math.random().toString(36).slice(2)}`;
}
