import {
  CAMPAIGN_TRACKING_EVENT_SCHEMA_VERSION,
  createBlankCampaignRecord,
  saveCampaignTrackingEvent,
  type CampaignClickTrackingEvent,
  type CampaignConversionTrackingEvent,
  type CampaignExposureTrackingEvent,
  type CampaignRevisitTrackingEvent,
  type CampaignTrackingEvent,
} from "../features/creative-canvas/model/creative-canvas.ts";

export const metricQueryFixtureCampaignId = "campaign_metric_query_fixture";
export const metricQueryFixtureNoiseCampaignId =
  "campaign_metric_query_fixture_noise";

export class MemoryStorage implements Pick<Storage, "getItem" | "setItem"> {
  private readonly values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

export function seedMetricQueryFixture() {
  const storage = new MemoryStorage();

  for (const campaignId of [
    metricQueryFixtureCampaignId,
    metricQueryFixtureNoiseCampaignId,
  ]) {
    createBlankCampaignRecord(storage, {
      id: campaignId,
      now: () => "2026-05-11T04:00:00.000Z",
    });
  }

  const events: CampaignTrackingEvent[] = [
    createExposureEvent({
      id: "event_metric_fixture_exposure_hero_1",
      sessionId: "session_alpha",
      occurredAt: "2026-05-11T04:05:00.000Z",
      placement: "hero",
    }),
    createExposureEvent({
      id: "event_metric_fixture_exposure_hero_2",
      sessionId: "session_alpha",
      occurredAt: "2026-05-11T04:06:00.000Z",
      placement: "hero",
    }),
    createExposureEvent({
      id: "event_metric_fixture_exposure_other_channel",
      sessionId: "session_beta",
      occurredAt: "2026-05-11T04:07:00.000Z",
      channelId: "tiktok_bio",
      pageId: "landing_page_fixture_tiktok",
      placement: "bio",
    }),
    createClickEvent({
      id: "event_metric_fixture_click_checkout_1",
      clickId: "click_checkout_alpha",
      sessionId: "session_alpha",
      occurredAt: "2026-05-11T04:08:00.000Z",
      destination: "checkout",
      href: "https://shop.example.test/checkout",
    }),
    createClickEvent({
      id: "event_metric_fixture_click_checkout_2",
      clickId: "click_checkout_beta",
      sessionId: "session_beta",
      occurredAt: "2026-05-11T04:12:00.000Z",
      destination: "checkout",
      href: "https://shop.example.test/checkout",
    }),
    createClickEvent({
      id: "event_metric_fixture_click_details",
      clickId: "click_details_gamma",
      sessionId: "session_gamma",
      occurredAt: "2026-05-11T04:16:00.000Z",
      destination: "details",
      href: "https://shop.example.test/creator-kit/details",
      offerId: "offer_bundle",
    }),
    createConversionEvent({
      id: "event_metric_fixture_conversion_purchase_alpha",
      sessionId: "session_alpha",
      occurredAt: "2026-05-11T04:10:00.000Z",
      orderId: "order_alpha",
      value: 99,
      currency: "USD",
    }),
    createConversionEvent({
      id: "event_metric_fixture_conversion_purchase_beta",
      sessionId: "session_beta",
      occurredAt: "2026-05-11T04:20:00.000Z",
      orderId: "order_beta",
      value: 149,
      currency: "USD",
    }),
    createConversionEvent({
      id: "event_metric_fixture_conversion_trial",
      sessionId: "session_gamma",
      occurredAt: "2026-05-11T04:25:00.000Z",
      eventName: "trial_start",
      orderId: "order_trial",
      value: 0,
      currency: "USD",
      offerId: "offer_bundle",
    }),
    createConversionEvent({
      id: "event_metric_fixture_conversion_eur",
      sessionId: "session_delta",
      occurredAt: "2026-05-11T04:30:00.000Z",
      orderId: "order_eur",
      value: 120,
      currency: "EUR",
      channelId: "affiliate_blog",
      pageId: "landing_page_fixture_affiliate",
    }),
    createRevisitEvent({
      id: "event_metric_fixture_revisit_session",
      sessionId: "session_alpha",
      occurredAt: "2026-05-11T04:14:00.000Z",
      matchedBy: "session",
    }),
    createRevisitEvent({
      id: "event_metric_fixture_revisit_user",
      sessionId: "session_beta",
      occurredAt: "2026-05-11T04:18:00.000Z",
      matchedBy: "user",
    }),
    createExposureEvent({
      id: "event_metric_fixture_noise_exposure",
      campaignId: metricQueryFixtureNoiseCampaignId,
      sessionId: "session_noise",
      occurredAt: "2026-05-11T04:05:00.000Z",
      placement: "hero",
    }),
  ];

  for (const event of events) {
    saveCampaignTrackingEvent(storage, event.campaignId, event, {
      now: () => event.occurredAt,
    });
  }

  return {
    storage,
    campaignId: metricQueryFixtureCampaignId,
    noiseCampaignId: metricQueryFixtureNoiseCampaignId,
  };
}

function createBaseEvent(input: {
  campaignId?: string;
  id: string;
  sessionId: string;
  occurredAt: string;
  channelId?: string;
  pageId?: string;
  assetId?: string;
  productId?: string;
  offerId?: string;
}) {
  const campaignId = input.campaignId ?? metricQueryFixtureCampaignId;
  const channelId = input.channelId ?? "instagram_dm";
  const pageId = input.pageId ?? "landing_page_fixture";
  const assetId = input.assetId ?? "asset_hero_short";
  const productId = input.productId ?? "product_creator_kit";
  const offerId = input.offerId ?? "offer_launch_discount";

  return {
    schemaVersion: CAMPAIGN_TRACKING_EVENT_SCHEMA_VERSION,
    id: input.id,
    campaignId,
    sessionId: input.sessionId,
    context: {
      actor: "human" as const,
      userId: `user_${input.sessionId}`,
      permissionMode: "basic" as const,
    },
    occurredAt: input.occurredAt,
    content: {
      type: "landing_surface",
      id: `content_${input.id}`,
      nodeId: "node_landing",
      channelId,
      assetId,
      productId,
      offerId,
    },
    utm: {
      source: channelId === "instagram_dm" ? "instagram" : channelId,
      medium: channelId === "instagram_dm" ? "dm" : "referral",
      campaign: "creator-kit-launch",
      content: "hero-short",
      term: "creator-tools",
    },
    target: {
      type: "landing.module",
      id: `target_${input.id}`,
      metadata: {
        nodeId: "node_landing",
        outputPortId: "outputs.metric",
        channelId,
        pageId,
        assetId,
        productId,
        offerId,
        url: "https://shop.example.test/creator-kit",
        label: "Creator kit landing",
      },
    },
  };
}

function createExposureEvent(input: {
  campaignId?: string;
  id: string;
  sessionId: string;
  occurredAt: string;
  channelId?: string;
  pageId?: string;
  placement: string;
}): CampaignExposureTrackingEvent {
  return {
    ...createBaseEvent(input),
    type: "exposure",
    exposure: {
      surface: "landing",
      placement: input.placement,
      viewId: `view_${input.id}`,
    },
  };
}

function createClickEvent(input: {
  id: string;
  clickId: string;
  sessionId: string;
  occurredAt: string;
  destination: string;
  href: string;
  offerId?: string;
}): CampaignClickTrackingEvent {
  return {
    ...createBaseEvent(input),
    type: "click",
    click: {
      id: input.clickId,
      href: input.href,
      label: input.destination,
      destination: input.destination,
    },
  };
}

function createConversionEvent(input: {
  id: string;
  sessionId: string;
  occurredAt: string;
  eventName?: string;
  orderId: string;
  value: number;
  currency: string;
  channelId?: string;
  pageId?: string;
  offerId?: string;
}): CampaignConversionTrackingEvent {
  return {
    ...createBaseEvent(input),
    type: "conversion",
    conversion: {
      eventName: input.eventName ?? "purchase",
      value: input.value,
      currency: input.currency,
      orderId: input.orderId,
      quantity: 1,
    },
  };
}

function createRevisitEvent(input: {
  id: string;
  sessionId: string;
  occurredAt: string;
  matchedBy: "session" | "user";
}): CampaignRevisitTrackingEvent {
  return {
    ...createBaseEvent(input),
    type: "revisit",
    revisit: {
      firstSeenAt: "2026-05-11T04:00:00.000Z",
      lastSeenAt: input.occurredAt,
      matchedBy: [
        {
          type: input.matchedBy,
          identifier:
            input.matchedBy === "session"
              ? input.sessionId
              : `user_${input.sessionId}`,
          firstSeenAt: "2026-05-11T04:00:00.000Z",
          lastSeenAt: input.occurredAt,
        },
      ],
    },
  };
}
