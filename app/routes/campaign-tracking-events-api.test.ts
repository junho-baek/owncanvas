import assert from "node:assert/strict";
import { test } from "node:test";

import {
  CAMPAIGN_ANALYTICS_STORAGE_KEY,
  CAMPAIGN_TRACKING_EVENT_SCHEMA_VERSION,
  createCampaignAsset,
  createBlankCampaignRecord,
  createCampaignProductOffer,
  createCampaignPublishingChannel,
  createCampaignTrackingConfiguration,
  getPersistedCampaignAnalyticsEvents,
  getPersistedCampaignPurchaseConversionEvents,
  getPersistedCampaignRecord,
  saveCampaignTrackingEvent,
  saveCampaignProductOfferDetails,
  saveCampaignPublishingConfiguration,
  trackInboundCampaignSession,
  updatePersistedCampaignRecord,
  type CampaignClickTrackingEvent,
  type CampaignConversionTrackingEvent,
  type CampaignEngagementTrackingEvent,
  type CampaignExposureTrackingEvent,
  type CampaignRevisitTrackingEvent,
  type CampaignTrackingEvent,
} from "../features/creative-canvas/model/creative-canvas.ts";
import { loader as loadCampaignTrackingConversions } from "./api.campaign-tracking-conversions.ts";
import { loader as loadCampaignTrackingClicks } from "./api.campaign-tracking-clicks.ts";
import { loader as loadCampaignTrackingExposures } from "./api.campaign-tracking-exposures.ts";
import { loader as loadCampaignTrackingImmersion } from "./api.campaign-tracking-immersion.ts";
import { loader as loadCampaignTrackingRevisits } from "./api.campaign-tracking-revisits.ts";
import { action as ingestCampaignTrackingEvent } from "./api.campaign-tracking-events.ts";

async function readJson(response: Response) {
  return response.json() as Promise<Record<string, unknown>>;
}

test("POST /api/campaigns/:campaignId/tracking/exposures ingests validated exposure events with attribution metadata", async () => {
  const storage = new MemoryStorage();

  createBlankCampaignRecord(storage, {
    id: "campaign_api_exposure_ingestion",
    now: () => "2026-05-11T01:00:00.000Z",
  });

  const event: CampaignExposureTrackingEvent = {
    schemaVersion: CAMPAIGN_TRACKING_EVENT_SCHEMA_VERSION,
    type: "exposure",
    id: "event_exposure_landing_hero",
    campaignId: "campaign_api_exposure_ingestion",
    sessionId: "session_attribution_1",
    context: {
      actor: "human",
      userId: "user_123",
      permissionMode: "basic",
    },
    occurredAt: "2026-05-11T01:05:00.000Z",
    content: {
      type: "short_video",
      id: "content_hero_short",
      nodeId: "node_landing",
      channelId: "instagram_dm",
      assetId: "asset_short_video",
      productId: "product_creator_kit",
      offerId: "offer_launch_discount",
    },
    utm: {
      source: "instagram",
      medium: "dm",
      campaign: "creator-kit-launch",
      content: "hero-short",
      term: "creator-tools",
    },
    target: {
      type: "landing.module",
      id: "landing_hero_video",
      metadata: {
        nodeId: "node_landing",
        outputPortId: "outputs.exposure",
        channelId: "instagram_dm",
        assetId: "asset_short_video",
        productId: "product_creator_kit",
        offerId: "offer_launch_discount",
        url: "https://shop.example.test/creator-kit",
        label: "Hero short-form continuation",
      },
    },
    exposure: {
      surface: "landing",
      placement: "hero",
      viewId: "view_hero_video_001",
    },
  };

  const response = await ingestCampaignTrackingEvent({
    request: new Request(
      "http://localhost/api/campaigns/campaign_api_exposure_ingestion/tracking/exposures",
      {
        method: "POST",
        body: JSON.stringify(event),
        headers: { "content-type": "application/json" },
      },
    ),
    params: {
      campaignId: "campaign_api_exposure_ingestion",
    },
    storage,
    now: () => "2026-05-11T01:05:01.000Z",
  });
  const body = await readJson(response);

  assert.equal(response.status, 201);
  assert.deepEqual(body, {
    schemaVersion: "owncanvas.campaign-tracking-events.v1",
    campaignId: "campaign_api_exposure_ingestion",
    event,
    attribution: {
      campaignId: "campaign_api_exposure_ingestion",
      sessionId: "session_attribution_1",
      content: {
        type: "short_video",
        id: "content_hero_short",
        nodeId: "node_landing",
        channelId: "instagram_dm",
        assetId: "asset_short_video",
        productId: "product_creator_kit",
        offerId: "offer_launch_discount",
      },
      utm: {
        source: "instagram",
        medium: "dm",
        campaign: "creator-kit-launch",
        content: "hero-short",
        term: "creator-tools",
      },
      nodeId: "node_landing",
      outputPortId: "outputs.exposure",
      channelId: "instagram_dm",
      assetId: "asset_short_video",
      productId: "product_creator_kit",
      offerId: "offer_launch_discount",
      url: "https://shop.example.test/creator-kit",
      label: "Hero short-form continuation",
    },
    trackingEvents: [event],
  });
  assert.deepEqual(
    getPersistedCampaignRecord(storage, "campaign_api_exposure_ingestion")
      ?.tracking.eventLog,
    [event],
  );
});

test("GET /api/campaigns/:campaignId/tracking/exposures reports filtered exposure metrics by placement", async () => {
  const storage = new MemoryStorage();
  const campaignId = "campaign_api_exposure_metrics";

  createBlankCampaignRecord(storage, {
    id: campaignId,
    now: () => "2026-05-11T01:00:00.000Z",
  });

  const baseEvent = {
    schemaVersion: CAMPAIGN_TRACKING_EVENT_SCHEMA_VERSION,
    type: "exposure" as const,
    campaignId,
    context: {
      actor: "human" as const,
      userId: "user_exposure_metrics",
      permissionMode: "basic" as const,
    },
    content: {
      type: "landing_surface",
      id: "landing_exposure_metrics",
      nodeId: "node_landing",
      channelId: "instagram_dm",
      assetId: "asset_short_video",
      productId: "product_creator_kit",
      offerId: "offer_launch_discount",
    },
    utm: {
      source: "instagram",
      medium: "dm",
      campaign: "creator-kit-launch",
      content: "hero-short",
      term: "creator-tools",
    },
    target: {
      type: "landing.module",
      id: "landing_exposure_target",
      metadata: {
        nodeId: "node_landing",
        outputPortId: "outputs.exposure",
        channelId: "instagram_dm",
        pageId: "landing_page_exposure_metrics",
        assetId: "asset_short_video",
        productId: "product_creator_kit",
        offerId: "offer_launch_discount",
        url: "https://shop.example.test/creator-kit",
        label: "Creator kit landing",
      },
    },
  };
  const exposures: CampaignExposureTrackingEvent[] = [
    {
      ...baseEvent,
      id: "event_exposure_hero",
      sessionId: "session_exposure_a",
      occurredAt: "2026-05-11T01:05:00.000Z",
      exposure: {
        surface: "landing",
        placement: "hero",
        viewId: "view_hero",
      },
    },
    {
      ...baseEvent,
      id: "event_exposure_offer",
      sessionId: "session_exposure_b",
      occurredAt: "2026-05-11T01:06:00.000Z",
      exposure: {
        surface: "landing",
        placement: "offer",
        viewId: "view_offer",
      },
    },
    {
      ...baseEvent,
      id: "event_exposure_other_page",
      sessionId: "session_exposure_c",
      occurredAt: "2026-05-11T01:07:00.000Z",
      target: {
        ...baseEvent.target,
        metadata: {
          ...baseEvent.target.metadata,
          pageId: "landing_page_other",
        },
      },
      exposure: {
        surface: "landing",
        placement: "hero",
        viewId: "view_other_page",
      },
    },
  ];

  for (const event of exposures) {
    saveCampaignTrackingEvent(storage, campaignId, event, {
      now: () => "2026-05-11T01:08:00.000Z",
    });
  }

  const response = await loadCampaignTrackingExposures({
    request: new Request(
      `http://localhost/api/campaigns/${campaignId}/tracking/exposures?pageId=landing_page_exposure_metrics&groupBy=placement`,
    ),
    params: { campaignId },
    storage,
    now: () => "2026-05-11T01:10:00.000Z",
  });
  const body = await readJson(response);

  assert.equal(response.status, 200);
  assert.deepEqual(body, {
    schemaVersion: "owncanvas.campaign-metric-report.v1",
    campaignId,
    generatedAt: "2026-05-11T01:10:00.000Z",
    metric: "exposure",
    query: {
      filters: {
        campaignId,
        pageId: "landing_page_exposure_metrics",
      },
      groupBy: ["placement"],
    },
    summary: {
      count: 2,
      uniqueSessions: 2,
    },
    rows: [
      {
        key: "hero",
        group: {
          placement: "hero",
        },
        count: 1,
        uniqueSessions: 1,
      },
      {
        key: "offer",
        group: {
          placement: "offer",
        },
        count: 1,
        uniqueSessions: 1,
      },
    ],
  });
});

test("POST /api/campaigns/:campaignId/tracking/clicks ingests validated click events with click destination attribution", async () => {
  const storage = new MemoryStorage();

  createBlankCampaignRecord(storage, {
    id: "campaign_api_click_ingestion",
    now: () => "2026-05-11T02:00:00.000Z",
  });

  const event: CampaignClickTrackingEvent = {
    schemaVersion: CAMPAIGN_TRACKING_EVENT_SCHEMA_VERSION,
    type: "click",
    id: "event_click_checkout_cta",
    campaignId: "campaign_api_click_ingestion",
    sessionId: "session_attribution_2",
    context: {
      actor: "agent",
      agentId: "agent_optimizer_1",
      pluginId: "plugin.landing.optimizer",
      permissionMode: "advanced",
    },
    occurredAt: "2026-05-11T02:02:00.000Z",
    content: {
      type: "landing_cta",
      id: "content_checkout_cta",
      nodeId: "node_landing",
      channelId: "instagram_dm",
      productId: "product_creator_kit",
      offerId: "offer_launch_discount",
    },
    utm: {
      source: "instagram",
      medium: "dm",
      campaign: "creator-kit-launch",
      content: "checkout-cta",
      term: "creator-tools",
    },
    target: {
      type: "cta",
      id: "checkout_cta",
      metadata: {
        nodeId: "node_landing",
        outputPortId: "outputs.click",
        channelId: "instagram_dm",
        productId: "product_creator_kit",
        offerId: "offer_launch_discount",
        url: "https://shop.example.test/checkout",
        label: "Buy creator kit",
      },
    },
    click: {
      href: "https://shop.example.test/checkout",
      label: "Buy creator kit",
      destination: "checkout",
    },
  };

  const response = await ingestCampaignTrackingEvent({
    request: new Request(
      "http://localhost/api/campaigns/campaign_api_click_ingestion/tracking/clicks",
      {
        method: "POST",
        body: JSON.stringify(event),
        headers: { "content-type": "application/json" },
      },
    ),
    params: {
      campaignId: "campaign_api_click_ingestion",
    },
    storage,
    now: () => "2026-05-11T02:02:01.000Z",
  });
  const body = await readJson(response);

  assert.equal(response.status, 201);
  assert.deepEqual(body, {
    schemaVersion: "owncanvas.campaign-tracking-events.v1",
    campaignId: "campaign_api_click_ingestion",
    event,
    attribution: {
      campaignId: "campaign_api_click_ingestion",
      sessionId: "session_attribution_2",
      content: {
        type: "landing_cta",
        id: "content_checkout_cta",
        nodeId: "node_landing",
        channelId: "instagram_dm",
        productId: "product_creator_kit",
        offerId: "offer_launch_discount",
      },
      utm: {
        source: "instagram",
        medium: "dm",
        campaign: "creator-kit-launch",
        content: "checkout-cta",
        term: "creator-tools",
      },
      nodeId: "node_landing",
      outputPortId: "outputs.click",
      channelId: "instagram_dm",
      productId: "product_creator_kit",
      offerId: "offer_launch_discount",
      url: "https://shop.example.test/checkout",
      label: "Buy creator kit",
      href: "https://shop.example.test/checkout",
      destination: "checkout",
    },
    trackingEvents: [event],
  });
});

test("GET /api/campaigns/:campaignId/tracking/exposures reports filtered exposure metrics grouped by placement", async () => {
  const storage = new MemoryStorage();
  const campaignId = "campaign_api_exposure_metric_reporting";

  createBlankCampaignRecord(storage, {
    id: campaignId,
    now: () => "2026-05-11T03:00:00.000Z",
  });

  const baseEvent = {
    schemaVersion: CAMPAIGN_TRACKING_EVENT_SCHEMA_VERSION,
    type: "exposure" as const,
    campaignId,
    context: {
      actor: "human" as const,
      userId: "user_exposure_metrics",
      permissionMode: "basic" as const,
    },
    content: {
      type: "short_video",
      id: "content_creator_kit",
      nodeId: "node_landing",
      channelId: "instagram_dm",
      assetId: "asset_hero_short",
      productId: "product_creator_kit",
      offerId: "offer_launch_discount",
    },
    utm: {
      source: "instagram",
      medium: "dm",
      campaign: "creator-kit-launch",
      content: "hero-short",
      term: "creator-tools",
    },
    target: {
      type: "landing.module",
      id: "module_creator_kit",
      metadata: {
        nodeId: "node_landing",
        outputPortId: "outputs.exposure",
        channelId: "instagram_dm",
        pageId: "landing_page_creator_kit",
        assetId: "asset_hero_short",
        productId: "product_creator_kit",
        offerId: "offer_launch_discount",
      },
    },
  };

  const events: CampaignExposureTrackingEvent[] = [
    {
      ...baseEvent,
      id: "event_exposure_hero_session_1",
      sessionId: "session_exposure_1",
      occurredAt: "2026-05-11T03:05:00.000Z",
      exposure: {
        surface: "landing",
        placement: "hero",
        viewId: "view_hero_1",
      },
    },
    {
      ...baseEvent,
      id: "event_exposure_hero_session_2",
      sessionId: "session_exposure_2",
      occurredAt: "2026-05-11T03:06:00.000Z",
      exposure: {
        surface: "landing",
        placement: "hero",
        viewId: "view_hero_2",
      },
    },
    {
      ...baseEvent,
      id: "event_exposure_offer_session_2",
      sessionId: "session_exposure_2",
      occurredAt: "2026-05-11T03:07:00.000Z",
      exposure: {
        surface: "landing",
        placement: "offer_panel",
        viewId: "view_offer_1",
      },
    },
  ];

  for (const event of events) {
    saveCampaignTrackingEvent(storage, campaignId, event, {
      now: () => event.occurredAt,
    });
  }

  const response = await loadCampaignTrackingExposures({
    request: new Request(
      `http://localhost/api/campaigns/${campaignId}/tracking/exposures?channelId=instagram_dm&groupBy=placement`,
    ),
    params: { campaignId },
    storage,
    now: () => "2026-05-11T03:10:00.000Z",
  });
  const body = await readJson(response);

  assert.equal(response.status, 200);
  assert.deepEqual(body, {
    schemaVersion: "owncanvas.campaign-metric-report.v1",
    campaignId,
    generatedAt: "2026-05-11T03:10:00.000Z",
    metric: "exposure",
    query: {
      filters: {
        campaignId,
        channelId: "instagram_dm",
      },
      groupBy: ["placement"],
    },
    summary: {
      count: 3,
      uniqueSessions: 2,
    },
    rows: [
      {
        key: "hero",
        group: {
          placement: "hero",
        },
        count: 2,
        uniqueSessions: 2,
      },
      {
        key: "offer_panel",
        group: {
          placement: "offer_panel",
        },
        count: 1,
        uniqueSessions: 1,
      },
    ],
  });
});

test("GET /api/campaigns/:campaignId/tracking/clicks reports filtered click metrics grouped by destination", async () => {
  const storage = new MemoryStorage();
  const campaignId = "campaign_api_click_metric_reporting";

  createBlankCampaignRecord(storage, {
    id: campaignId,
    now: () => "2026-05-11T03:20:00.000Z",
  });

  const baseEvent = {
    schemaVersion: CAMPAIGN_TRACKING_EVENT_SCHEMA_VERSION,
    type: "click" as const,
    campaignId,
    context: {
      actor: "human" as const,
      userId: "user_click_metrics",
      permissionMode: "basic" as const,
    },
    occurredAt: "2026-05-11T03:25:00.000Z",
    content: {
      type: "landing_cta",
      id: "content_checkout_cta",
      nodeId: "node_landing",
      channelId: "instagram_dm",
      assetId: "asset_hero_short",
      productId: "product_creator_kit",
      offerId: "offer_launch_discount",
    },
    utm: {
      source: "instagram",
      medium: "dm",
      campaign: "creator-kit-launch",
      content: "checkout-cta",
      term: "creator-tools",
    },
    target: {
      type: "landing.cta",
      id: "cta_creator_kit",
      metadata: {
        nodeId: "node_landing",
        outputPortId: "outputs.click",
        channelId: "instagram_dm",
        pageId: "landing_page_creator_kit",
        assetId: "asset_hero_short",
        productId: "product_creator_kit",
        offerId: "offer_launch_discount",
      },
    },
  };

  const events: CampaignClickTrackingEvent[] = [
    {
      ...baseEvent,
      id: "event_click_checkout_1",
      sessionId: "session_click_1",
      click: {
        id: "click_checkout_1",
        href: "https://shop.example.test/checkout",
        label: "Buy now",
        destination: "checkout",
      },
    },
    {
      ...baseEvent,
      id: "event_click_checkout_2",
      sessionId: "session_click_2",
      click: {
        id: "click_checkout_2",
        href: "https://shop.example.test/checkout",
        label: "Buy now",
        destination: "checkout",
      },
    },
    {
      ...baseEvent,
      id: "event_click_landing_1",
      sessionId: "session_click_2",
      click: {
        id: "click_landing_1",
        href: "https://shop.example.test/creator-kit",
        label: "Learn more",
        destination: "landing",
      },
    },
  ];

  for (const event of events) {
    saveCampaignTrackingEvent(storage, campaignId, event, {
      now: () => event.occurredAt,
    });
  }

  const response = await loadCampaignTrackingClicks({
    request: new Request(
      `http://localhost/api/campaigns/${campaignId}/tracking/clicks?channelId=instagram_dm&groupBy=destination,href`,
    ),
    params: { campaignId },
    storage,
    now: () => "2026-05-11T03:30:00.000Z",
  });
  const body = await readJson(response);

  assert.equal(response.status, 200);
  assert.deepEqual(body, {
    schemaVersion: "owncanvas.campaign-metric-report.v1",
    campaignId,
    generatedAt: "2026-05-11T03:30:00.000Z",
    metric: "click",
    query: {
      filters: {
        campaignId,
        channelId: "instagram_dm",
      },
      groupBy: ["destination", "href"],
    },
    summary: {
      count: 3,
      uniqueSessions: 2,
    },
    rows: [
      {
        key: "checkout:https://shop.example.test/checkout",
        group: {
          destination: "checkout",
          href: "https://shop.example.test/checkout",
        },
        count: 2,
        uniqueSessions: 2,
      },
      {
        key: "landing:https://shop.example.test/creator-kit",
        group: {
          destination: "landing",
          href: "https://shop.example.test/creator-kit",
        },
        count: 1,
        uniqueSessions: 1,
      },
    ],
  });
});

test("GET /api/campaigns/:campaignId/tracking/conversions reports filtered conversion metrics grouped by event and currency", async () => {
  const storage = new MemoryStorage();
  const campaignId = "campaign_api_conversion_metric_reporting";

  createBlankCampaignRecord(storage, {
    id: campaignId,
    now: () => "2026-05-11T03:40:00.000Z",
  });

  const baseEvent = {
    schemaVersion: CAMPAIGN_TRACKING_EVENT_SCHEMA_VERSION,
    type: "conversion" as const,
    campaignId,
    context: {
      actor: "human" as const,
      userId: "user_conversion_metrics",
      permissionMode: "basic" as const,
    },
    occurredAt: "2026-05-11T03:45:00.000Z",
    content: {
      type: "checkout",
      id: "content_checkout_success",
      nodeId: "node_landing",
      channelId: "instagram_dm",
      assetId: "asset_hero_short",
      productId: "product_creator_kit",
      offerId: "offer_launch_discount",
    },
    utm: {
      source: "instagram",
      medium: "dm",
      campaign: "creator-kit-launch",
      content: "checkout-success",
      term: "creator-tools",
    },
    target: {
      type: "checkout",
      id: "checkout_creator_kit",
      metadata: {
        nodeId: "node_landing",
        inputPortId: "inputs.purchase",
        channelId: "instagram_dm",
        pageId: "landing_page_creator_kit",
        assetId: "asset_hero_short",
        productId: "product_creator_kit",
        offerId: "offer_launch_discount",
      },
    },
  };

  const events: CampaignConversionTrackingEvent[] = [
    {
      ...baseEvent,
      id: "event_conversion_purchase_1",
      sessionId: "session_conversion_1",
      conversion: {
        eventName: "purchase",
        value: 49,
        currency: "USD",
        orderId: "order_conversion_1",
      },
    },
    {
      ...baseEvent,
      id: "event_conversion_purchase_2",
      sessionId: "session_conversion_2",
      conversion: {
        eventName: "purchase",
        value: 79,
        currency: "USD",
        orderId: "order_conversion_2",
      },
    },
    {
      ...baseEvent,
      id: "event_conversion_trial_1",
      sessionId: "session_conversion_2",
      conversion: {
        eventName: "trial_start",
        value: 0,
        currency: "USD",
        orderId: "order_conversion_trial",
      },
    },
  ];

  for (const event of events) {
    saveCampaignTrackingEvent(storage, campaignId, event, {
      now: () => event.occurredAt,
    });
  }

  const response = await loadCampaignTrackingConversions({
    request: new Request(
      `http://localhost/api/campaigns/${campaignId}/tracking/conversions?metric=conversion&conversionEventName=purchase&groupBy=conversionEventName,currency`,
    ),
    params: { campaignId },
    storage,
    now: () => "2026-05-11T03:50:00.000Z",
  });
  const body = await readJson(response);

  assert.equal(response.status, 200);
  assert.deepEqual(body, {
    schemaVersion: "owncanvas.campaign-metric-report.v1",
    campaignId,
    generatedAt: "2026-05-11T03:50:00.000Z",
    metric: "conversion",
    query: {
      filters: {
        campaignId,
        conversionEventName: "purchase",
      },
      groupBy: ["conversionEventName", "currency"],
    },
    summary: {
      count: 2,
      uniqueSessions: 2,
      totalValue: 128,
    },
    rows: [
      {
        key: "purchase|USD",
        group: {
          conversionEventName: "purchase",
          currency: "USD",
        },
        count: 2,
        uniqueSessions: 2,
        totalValue: 128,
      },
    ],
  });
});

test("GET /api/campaigns/:campaignId/tracking/revisits reports filtered revisit metrics grouped by match type", async () => {
  const storage = new MemoryStorage();
  const campaignId = "campaign_api_revisit_metric_reporting";

  createBlankCampaignRecord(storage, {
    id: campaignId,
    now: () => "2026-05-11T04:00:00.000Z",
  });

  const baseEvent = {
    schemaVersion: CAMPAIGN_TRACKING_EVENT_SCHEMA_VERSION,
    type: "revisit" as const,
    campaignId,
    context: {
      actor: "human" as const,
      userId: "user_revisit_metrics",
      permissionMode: "basic" as const,
    },
    occurredAt: "2026-05-11T04:05:00.000Z",
    content: {
      type: "landing_surface",
      id: "landing_revisit_metrics",
      nodeId: "node_landing",
      channelId: "instagram_dm",
      assetId: "asset_hero_short",
      productId: "product_creator_kit",
      offerId: "offer_launch_discount",
    },
    utm: {
      source: "instagram",
      medium: "dm",
      campaign: "creator-kit-launch",
      content: "returning-session",
      term: "creator-tools",
    },
    target: {
      type: "landing.revisit",
      id: "landing_revisit_detector",
      metadata: {
        nodeId: "node_landing",
        outputPortId: "outputs.revisit",
        channelId: "instagram_dm",
        pageId: "landing_page_creator_kit",
        assetId: "asset_hero_short",
        productId: "product_creator_kit",
        offerId: "offer_launch_discount",
      },
    },
  };

  const events: CampaignRevisitTrackingEvent[] = [
    {
      ...baseEvent,
      id: "event_revisit_session_1",
      sessionId: "session_revisit_1",
      revisit: {
        firstSeenAt: "2026-05-11T04:00:00.000Z",
        lastSeenAt: "2026-05-11T04:03:00.000Z",
        matchedBy: [
          {
            type: "session",
            identifier: "session_revisit_1",
            firstSeenAt: "2026-05-11T04:00:00.000Z",
            lastSeenAt: "2026-05-11T04:03:00.000Z",
          },
        ],
      },
    },
    {
      ...baseEvent,
      id: "event_revisit_user_1",
      sessionId: "session_revisit_2",
      revisit: {
        firstSeenAt: "2026-05-11T04:01:00.000Z",
        lastSeenAt: "2026-05-11T04:04:00.000Z",
        matchedBy: [
          {
            type: "user",
            identifier: "user_revisit_metrics",
            firstSeenAt: "2026-05-11T04:01:00.000Z",
            lastSeenAt: "2026-05-11T04:04:00.000Z",
          },
        ],
      },
    },
  ];

  for (const event of events) {
    saveCampaignTrackingEvent(storage, campaignId, event, {
      now: () => event.occurredAt,
    });
  }

  const response = await loadCampaignTrackingRevisits({
    request: new Request(
      `http://localhost/api/campaigns/${campaignId}/tracking/revisits?matchedBy=session&groupBy=matchedBy`,
    ),
    params: { campaignId },
    storage,
    now: () => "2026-05-11T04:10:00.000Z",
  });
  const body = await readJson(response);

  assert.equal(response.status, 200);
  assert.deepEqual(body, {
    schemaVersion: "owncanvas.campaign-metric-report.v1",
    campaignId,
    generatedAt: "2026-05-11T04:10:00.000Z",
    metric: "revisit",
    query: {
      filters: {
        campaignId,
        matchedBy: "session",
      },
      groupBy: ["matchedBy"],
    },
    summary: {
      count: 1,
      uniqueSessions: 1,
    },
    rows: [
      {
        key: "session",
        group: {
          matchedBy: "session",
        },
        count: 1,
        uniqueSessions: 1,
      },
    ],
  });
});

test("POST /api/campaigns/:campaignId/tracking/engagement ingests playback and scroll engagement attribution", async () => {
  const storage = new MemoryStorage();

  createBlankCampaignRecord(storage, {
    id: "campaign_api_engagement_ingestion",
    now: () => "2026-05-11T02:30:00.000Z",
  });

  const event: CampaignEngagementTrackingEvent = {
    schemaVersion: CAMPAIGN_TRACKING_EVENT_SCHEMA_VERSION,
    type: "engagement",
    id: "event_engagement_source_short_depth",
    campaignId: "campaign_api_engagement_ingestion",
    sessionId: "session_attribution_engagement",
    context: {
      actor: "human",
      userId: "user_123",
      permissionMode: "basic",
    },
    occurredAt: "2026-05-11T02:31:00.000Z",
    content: {
      type: "short_video",
      id: "content_source_short",
      nodeId: "node_landing",
      assetId: "asset_short_video",
      productId: "product_creator_kit",
      offerId: "offer_launch_discount",
    },
    utm: {
      source: "instagram",
      medium: "dm",
      campaign: "creator-kit-launch",
      content: "hero-short",
      term: "creator-tools",
    },
    target: {
      type: "landing.module",
      id: "module_source_short",
      metadata: {
        nodeId: "node_landing",
        outputPortId: "outputs.engagement",
        assetId: "asset_short_video",
        productId: "product_creator_kit",
        offerId: "offer_launch_discount",
        url: "https://cdn.example.test/source-short.mp4",
        label: "Source short",
      },
    },
    engagement: {
      kind: "playback",
      action: "watch_depth",
      value: 75,
      unit: "percent",
      metadata: {
        currentTimeSeconds: 12,
        durationSeconds: 16,
      },
    },
  };

  const response = await ingestCampaignTrackingEvent({
    request: new Request(
      "http://localhost/api/campaigns/campaign_api_engagement_ingestion/tracking/engagement",
      {
        method: "POST",
        body: JSON.stringify(event),
        headers: { "content-type": "application/json" },
      },
    ),
    params: {
      campaignId: "campaign_api_engagement_ingestion",
    },
    storage,
    now: () => "2026-05-11T02:31:01.000Z",
  });
  const body = await readJson(response);

  assert.equal(response.status, 201);
  assert.deepEqual(body, {
    schemaVersion: "owncanvas.campaign-tracking-events.v1",
    campaignId: "campaign_api_engagement_ingestion",
    event,
    attribution: {
      campaignId: "campaign_api_engagement_ingestion",
      sessionId: "session_attribution_engagement",
      content: {
        type: "short_video",
        id: "content_source_short",
        nodeId: "node_landing",
        assetId: "asset_short_video",
        productId: "product_creator_kit",
        offerId: "offer_launch_discount",
      },
      utm: {
        source: "instagram",
        medium: "dm",
        campaign: "creator-kit-launch",
        content: "hero-short",
        term: "creator-tools",
      },
      nodeId: "node_landing",
      outputPortId: "outputs.engagement",
      assetId: "asset_short_video",
      productId: "product_creator_kit",
      offerId: "offer_launch_discount",
      url: "https://cdn.example.test/source-short.mp4",
      label: "Source short",
      engagementKind: "playback",
      engagementAction: "watch_depth",
      engagementValue: 75,
      engagementUnit: "percent",
    },
    trackingEvents: [event],
  });
});

test("POST /api/campaigns/:campaignId/tracking/engagement ingests buffered engagement event batches", async () => {
  const storage = new MemoryStorage();
  const campaignId = "campaign_api_engagement_batch_ingestion";

  createBlankCampaignRecord(storage, {
    id: campaignId,
    now: () => "2026-05-11T02:40:00.000Z",
  });

  const playback: CampaignEngagementTrackingEvent = {
    schemaVersion: CAMPAIGN_TRACKING_EVENT_SCHEMA_VERSION,
    type: "engagement",
    id: "event_engagement_batch_playback",
    campaignId,
    sessionId: "session_attribution_engagement_batch",
    context: {
      actor: "human",
      userId: "user_123",
      permissionMode: "basic",
    },
    occurredAt: "2026-05-11T02:41:00.000Z",
    content: {
      type: "short_video",
      id: "content_source_short",
      nodeId: "node_landing",
      assetId: "asset_short_video",
      productId: "product_creator_kit",
      offerId: "offer_launch_discount",
    },
    utm: {
      source: "instagram",
      medium: "dm",
      campaign: "creator-kit-launch",
      content: "hero-short",
      term: "creator-tools",
    },
    target: {
      type: "landing.module",
      id: "module_source_short",
      metadata: {
        nodeId: "node_landing",
        outputPortId: "outputs.engagement",
        assetId: "asset_short_video",
        productId: "product_creator_kit",
        offerId: "offer_launch_discount",
        url: "https://cdn.example.test/source-short.mp4",
        label: "Source short",
      },
    },
    engagement: {
      kind: "playback",
      action: "watch_depth",
      value: 75,
      unit: "percent",
    },
  };
  const scroll: CampaignEngagementTrackingEvent = {
    ...playback,
    id: "event_engagement_batch_scroll",
    content: {
      type: "landing_surface",
      id: "landing-page",
      nodeId: "node_landing",
      productId: "product_creator_kit",
      offerId: "offer_launch_discount",
    },
    target: {
      type: "landing.surface",
      id: "landing-page",
      metadata: {
        nodeId: "node_landing",
        outputPortId: "outputs.engagement",
        productId: "product_creator_kit",
        offerId: "offer_launch_discount",
        label: "Campaign landing",
      },
    },
    engagement: {
      kind: "scroll",
      action: "depth",
      value: 50,
      unit: "percent",
    },
  };

  const response = await ingestCampaignTrackingEvent({
    request: new Request(
      `http://localhost/api/campaigns/${campaignId}/tracking/engagement`,
      {
        method: "POST",
        body: JSON.stringify({
          schemaVersion: "owncanvas.campaign-tracking-batch.v1",
          events: [playback, scroll],
        }),
        headers: { "content-type": "application/json" },
      },
    ),
    params: { campaignId },
    storage,
    now: () => "2026-05-11T02:41:01.000Z",
  });
  const body = await readJson(response);

  assert.equal(response.status, 201);
  assert.deepEqual(body.trackingEvents, [playback, scroll]);
  assert.deepEqual(
    getPersistedCampaignRecord(storage, campaignId)?.tracking.eventLog,
    [playback, scroll],
  );
});

test("POST /api/campaigns/:campaignId/tracking/revisits ingests returning session attribution events", async () => {
  const storage = new MemoryStorage();

  createBlankCampaignRecord(storage, {
    id: "campaign_api_revisit_ingestion",
    now: () => "2026-05-11T03:00:00.000Z",
  });

  const event: CampaignRevisitTrackingEvent = {
    schemaVersion: CAMPAIGN_TRACKING_EVENT_SCHEMA_VERSION,
    type: "revisit",
    id: "event_revisit_returning_session",
    campaignId: "campaign_api_revisit_ingestion",
    sessionId: "session_returning_api",
    context: {
      actor: "human",
      userId: "anonymous:session_returning_api",
      permissionMode: "basic",
    },
    occurredAt: "2026-05-11T03:30:00.000Z",
    content: {
      type: "landing_surface",
      id: "campaign_api_revisit_ingestion:revisit",
      nodeId: "node_landing",
      channelId: "instagram_dm",
      productId: "product_creator_kit",
      offerId: "offer_launch_discount",
    },
    utm: {
      source: "instagram",
      medium: "dm",
      campaign: "creator-kit-launch",
      content: "hero-short",
      term: "creator-tools",
    },
    target: {
      type: "landing.revisit",
      id: "campaign_api_revisit_ingestion:revisit",
      metadata: {
        nodeId: "node_landing",
        outputPortId: "outputs.revisit",
        channelId: "instagram_dm",
        productId: "product_creator_kit",
        offerId: "offer_launch_discount",
        url: "https://go.example.test/campaigns/campaign_api_revisit_ingestion/landing",
        label: "Landing revisit",
      },
    },
    revisit: {
      firstSeenAt: "2026-05-11T03:00:00.000Z",
      lastSeenAt: "2026-05-11T03:05:00.000Z",
      matchedBy: [
        {
          type: "session",
          identifier: "session_returning_api",
          firstSeenAt: "2026-05-11T03:00:00.000Z",
          lastSeenAt: "2026-05-11T03:05:00.000Z",
        },
      ],
    },
  };

  const response = await ingestCampaignTrackingEvent({
    request: new Request(
      "http://localhost/api/campaigns/campaign_api_revisit_ingestion/tracking/revisits",
      {
        method: "POST",
        body: JSON.stringify(event),
        headers: { "content-type": "application/json" },
      },
    ),
    params: {
      campaignId: "campaign_api_revisit_ingestion",
    },
    storage,
    now: () => "2026-05-11T03:30:01.000Z",
  });
  const body = await readJson(response);

  assert.equal(response.status, 201);
  assert.deepEqual(body, {
    schemaVersion: "owncanvas.campaign-tracking-events.v1",
    campaignId: "campaign_api_revisit_ingestion",
    event,
    attribution: {
      campaignId: "campaign_api_revisit_ingestion",
      sessionId: "session_returning_api",
      content: {
        type: "landing_surface",
        id: "campaign_api_revisit_ingestion:revisit",
        nodeId: "node_landing",
        channelId: "instagram_dm",
        productId: "product_creator_kit",
        offerId: "offer_launch_discount",
      },
      utm: {
        source: "instagram",
        medium: "dm",
        campaign: "creator-kit-launch",
        content: "hero-short",
        term: "creator-tools",
      },
      nodeId: "node_landing",
      outputPortId: "outputs.revisit",
      channelId: "instagram_dm",
      productId: "product_creator_kit",
      offerId: "offer_launch_discount",
      url: "https://go.example.test/campaigns/campaign_api_revisit_ingestion/landing",
      label: "Landing revisit",
      firstSeenAt: "2026-05-11T03:00:00.000Z",
      lastSeenAt: "2026-05-11T03:05:00.000Z",
      matchedBy: [
        {
          type: "session",
          identifier: "session_returning_api",
          firstSeenAt: "2026-05-11T03:00:00.000Z",
          lastSeenAt: "2026-05-11T03:05:00.000Z",
        },
      ],
    },
    trackingEvents: [event],
  });
  const persistedCampaign = getPersistedCampaignRecord(
    storage,
    "campaign_api_revisit_ingestion",
  );

  assert.deepEqual(persistedCampaign?.tracking.eventLog, [event]);
  assert.deepEqual(persistedCampaign?.tracking.revisitRecords, [
    {
      schemaVersion: "owncanvas.campaign-revisit-record.v1",
      id: "revisit_event_revisit_returning_session",
      eventId: "event_revisit_returning_session",
      campaignId: "campaign_api_revisit_ingestion",
      sessionId: "session_returning_api",
      occurredAt: "2026-05-11T03:30:00.000Z",
      persistedAt: "2026-05-11T03:30:01.000Z",
      actor: "human",
      userId: "anonymous:session_returning_api",
      permissionMode: "basic",
      firstSeenAt: "2026-05-11T03:00:00.000Z",
      lastSeenAt: "2026-05-11T03:05:00.000Z",
      matchedBy: [
        {
          type: "session",
          identifier: "session_returning_api",
          firstSeenAt: "2026-05-11T03:00:00.000Z",
          lastSeenAt: "2026-05-11T03:05:00.000Z",
        },
      ],
      content: event.content,
      utm: event.utm,
      target: event.target,
      attribution: {
        campaignId: "campaign_api_revisit_ingestion",
        sessionId: "session_returning_api",
        eventId: "event_revisit_returning_session",
        eventType: "revisit",
        occurredAt: "2026-05-11T03:30:00.000Z",
        source: "instagram",
        medium: "dm",
        campaign: "creator-kit-launch",
        content: "hero-short",
        term: "creator-tools",
        nodeId: "node_landing",
        outputPortId: "outputs.revisit",
        channelId: "instagram_dm",
        productId: "product_creator_kit",
        offerId: "offer_launch_discount",
        targetType: "landing.revisit",
        targetId: "campaign_api_revisit_ingestion:revisit",
        surface: "landing",
        placement: "revisit",
        revisitFirstSeenAt: "2026-05-11T03:00:00.000Z",
        revisitLastSeenAt: "2026-05-11T03:05:00.000Z",
        revisitMatchedBy: [
          {
            type: "session",
            identifier: "session_returning_api",
            firstSeenAt: "2026-05-11T03:00:00.000Z",
            lastSeenAt: "2026-05-11T03:05:00.000Z",
          },
        ],
      },
    },
  ]);
  assert.deepEqual(
    getPersistedCampaignAnalyticsEvents(storage, {
      campaignId: "campaign_api_revisit_ingestion",
      sessionId: "session_returning_api",
      eventType: "revisit",
    }).map((record) => ({
      persistedAt: record.persistedAt,
      attribution: record.attribution,
    })),
    [
      {
        persistedAt: "2026-05-11T03:30:01.000Z",
        attribution: persistedCampaign?.tracking.revisitRecords?.[0].attribution,
      },
    ],
  );
});

test("tracking event ingestion persists analytics storage queryable by campaign, session, and click attribution identifiers", async () => {
  const storage = new MemoryStorage();

  createBlankCampaignRecord(storage, {
    id: "campaign_api_analytics_storage",
    now: () => "2026-05-11T04:00:00.000Z",
  });

  const event: CampaignClickTrackingEvent = {
    schemaVersion: CAMPAIGN_TRACKING_EVENT_SCHEMA_VERSION,
    type: "click",
    id: "event_click_offer_card",
    campaignId: "campaign_api_analytics_storage",
    sessionId: "session_attribution_indexed",
    context: {
      actor: "human",
      userId: "user_analytics_1",
      permissionMode: "basic",
    },
    occurredAt: "2026-05-11T04:05:00.000Z",
    content: {
      type: "offer_card",
      id: "content_offer_card",
      nodeId: "node_landing",
      channelId: "instagram_dm",
      productId: "product_creator_kit",
      offerId: "offer_launch_discount",
    },
    utm: {
      source: "instagram",
      medium: "dm",
      campaign: "creator-kit-launch",
      content: "offer-card",
      term: "creator-tools",
    },
    target: {
      type: "landing.offer",
      id: "offer_card",
      metadata: {
        nodeId: "node_landing",
        outputPortId: "outputs.click",
        channelId: "instagram_dm",
        productId: "product_creator_kit",
        offerId: "offer_launch_discount",
        url: "https://shop.example.test/creator-kit?variant=offer-card",
        label: "Creator kit launch offer",
      },
    },
    click: {
      id: "click_offer_card_001",
      href: "https://shop.example.test/creator-kit?variant=offer-card",
      label: "Creator kit launch offer",
      destination: "landing",
    },
  };

  await ingestCampaignTrackingEvent({
    request: new Request(
      "http://localhost/api/campaigns/campaign_api_analytics_storage/tracking/clicks",
      {
        method: "POST",
        body: JSON.stringify(event),
        headers: { "content-type": "application/json" },
      },
    ),
    params: {
      campaignId: "campaign_api_analytics_storage",
    },
    storage,
    now: () => "2026-05-11T04:05:01.000Z",
  });

  assert.deepEqual(
    JSON.parse(storage.getItem(CAMPAIGN_ANALYTICS_STORAGE_KEY) ?? "{}")
      .indexes,
    {
      byCampaignId: {
        campaign_api_analytics_storage: [
          "campaign_api_analytics_storage:session_attribution_indexed:event_click_offer_card",
        ],
      },
      bySessionId: {
        session_attribution_indexed: [
          "campaign_api_analytics_storage:session_attribution_indexed:event_click_offer_card",
        ],
      },
      byCampaignSession: {
        "campaign_api_analytics_storage:session_attribution_indexed": [
          "campaign_api_analytics_storage:session_attribution_indexed:event_click_offer_card",
        ],
      },
      byClickId: {
        click_offer_card_001: [
          "campaign_api_analytics_storage:session_attribution_indexed:event_click_offer_card",
        ],
      },
      byPageId: {},
      byAssetId: {},
      byCampaignPage: {},
      byCampaignAsset: {},
    },
  );
  assert.deepEqual(
    getPersistedCampaignAnalyticsEvents(storage, {
      campaignId: "campaign_api_analytics_storage",
      sessionId: "session_attribution_indexed",
    }),
    [
      {
        event,
        persistedAt: "2026-05-11T04:05:01.000Z",
        attribution: {
          campaignId: "campaign_api_analytics_storage",
          sessionId: "session_attribution_indexed",
          eventId: "event_click_offer_card",
          eventType: "click",
          occurredAt: "2026-05-11T04:05:00.000Z",
          source: "instagram",
          medium: "dm",
          campaign: "creator-kit-launch",
          content: "offer-card",
          term: "creator-tools",
          nodeId: "node_landing",
          outputPortId: "outputs.click",
          channelId: "instagram_dm",
          productId: "product_creator_kit",
          offerId: "offer_launch_discount",
          targetType: "landing.offer",
          targetId: "offer_card",
          clickId: "click_offer_card_001",
          destination: "landing",
          href: "https://shop.example.test/creator-kit?variant=offer-card",
        },
      },
    ],
  );
  assert.deepEqual(
    getPersistedCampaignAnalyticsEvents(storage, {
      campaignId: "campaign_api_analytics_storage",
      clickId: "click_offer_card_001",
    }).map((record) => record.event.id),
    ["event_click_offer_card"],
  );
});

test("POST /api/campaigns/:campaignId/tracking/engagement persists normalized short-form immersion analytics identifiers", async () => {
  const storage = new MemoryStorage();
  const campaignId = "campaign_api_short_form_immersion";

  createBlankCampaignRecord(storage, {
    id: campaignId,
    now: () => "2026-05-11T04:20:00.000Z",
  });

  const event: CampaignEngagementTrackingEvent = {
    schemaVersion: CAMPAIGN_TRACKING_EVENT_SCHEMA_VERSION,
    type: "engagement",
    id: "event_immersion_watch_depth_75",
    campaignId,
    sessionId: "session_immersion_1",
    context: {
      actor: "human",
      userId: "user_immersion_1",
      permissionMode: "basic",
    },
    occurredAt: "2026-05-11T04:21:00.000Z",
    content: {
      type: "short_video",
      id: "content_source_short",
      nodeId: "node_landing",
      pageId: "landing-page",
      assetId: "asset_source_short",
      productId: "product_creator_kit",
      offerId: "offer_launch_discount",
    },
    utm: {
      source: "instagram",
      medium: "dm",
      campaign: "creator-kit-launch",
      content: "hero-short",
      term: "creator-tools",
    },
    target: {
      type: "landing.module",
      id: "module_source_short",
      metadata: {
        nodeId: "node_landing",
        outputPortId: "outputs.engagement",
        pageId: "landing-page",
        assetId: "asset_source_short",
        productId: "product_creator_kit",
        offerId: "offer_launch_discount",
        url: "https://cdn.example.test/source-short.mp4",
        label: "Source short",
      },
    },
    engagement: {
      kind: "playback",
      action: "watch_depth",
      value: 75,
      unit: "percent",
      metadata: {
        currentTimeSeconds: 9,
        durationSeconds: 12,
      },
    },
  };

  const response = await ingestCampaignTrackingEvent({
    request: new Request(
      `http://localhost/api/campaigns/${campaignId}/tracking/engagement`,
      {
        method: "POST",
        body: JSON.stringify(event),
        headers: { "content-type": "application/json" },
      },
    ),
    params: { campaignId },
    storage,
    now: () => "2026-05-11T04:21:01.000Z",
  });

  assert.equal(response.status, 201);
  assert.deepEqual(
    JSON.parse(storage.getItem(CAMPAIGN_ANALYTICS_STORAGE_KEY) ?? "{}")
      .indexes,
    {
      byCampaignId: {
        [campaignId]: [
          `${campaignId}:session_immersion_1:event_immersion_watch_depth_75`,
        ],
      },
      bySessionId: {
        session_immersion_1: [
          `${campaignId}:session_immersion_1:event_immersion_watch_depth_75`,
        ],
      },
      byCampaignSession: {
        [`${campaignId}:session_immersion_1`]: [
          `${campaignId}:session_immersion_1:event_immersion_watch_depth_75`,
        ],
      },
      byClickId: {},
      byPageId: {
        "landing-page": [
          `${campaignId}:session_immersion_1:event_immersion_watch_depth_75`,
        ],
      },
      byAssetId: {
        asset_source_short: [
          `${campaignId}:session_immersion_1:event_immersion_watch_depth_75`,
        ],
      },
      byCampaignPage: {
        [`${campaignId}:landing-page`]: [
          `${campaignId}:session_immersion_1:event_immersion_watch_depth_75`,
        ],
      },
      byCampaignAsset: {
        [`${campaignId}:asset_source_short`]: [
          `${campaignId}:session_immersion_1:event_immersion_watch_depth_75`,
        ],
      },
    },
  );
  assert.deepEqual(
    getPersistedCampaignAnalyticsEvents(storage, {
      campaignId,
      pageId: "landing-page",
      assetId: "asset_source_short",
      sessionId: "session_immersion_1",
      eventType: "engagement",
    }),
    [
      {
        event,
        persistedAt: "2026-05-11T04:21:01.000Z",
        attribution: {
          campaignId,
          sessionId: "session_immersion_1",
          eventId: "event_immersion_watch_depth_75",
          eventType: "engagement",
          occurredAt: "2026-05-11T04:21:00.000Z",
          source: "instagram",
          medium: "dm",
          campaign: "creator-kit-launch",
          content: "hero-short",
          term: "creator-tools",
          nodeId: "node_landing",
          outputPortId: "outputs.engagement",
          pageId: "landing-page",
          assetId: "asset_source_short",
          productId: "product_creator_kit",
          offerId: "offer_launch_discount",
          targetType: "landing.module",
          targetId: "module_source_short",
          engagementKind: "playback",
          engagementAction: "watch_depth",
          engagementValue: 75,
          engagementUnit: "percent",
          immersion: {
            type: "short-form",
            pageId: "landing-page",
            assetId: "asset_source_short",
            sessionId: "session_immersion_1",
            action: "watch_depth",
            value: 75,
            unit: "percent",
          },
        },
      },
    ],
  );
});

test("GET /api/campaigns/:campaignId/tracking/immersion exposes aggregated landing page immersion metrics", async () => {
  const storage = new MemoryStorage();
  const campaignId = "campaign_api_landing_immersion_analytics";
  const baseEvent = {
    schemaVersion: CAMPAIGN_TRACKING_EVENT_SCHEMA_VERSION,
    type: "engagement" as const,
    campaignId,
    context: {
      actor: "human" as const,
      userId: "user_immersion_analytics",
      permissionMode: "basic" as const,
    },
    content: {
      type: "short_video",
      id: "content_source_short",
      nodeId: "node_landing",
      pageId: "landing-page",
      assetId: "asset_source_short",
      productId: "product_creator_kit",
      offerId: "offer_launch_discount",
    },
    utm: {
      source: "instagram",
      medium: "dm",
      campaign: "creator-kit-launch",
      content: "hero-short",
      term: "creator-tools",
    },
    target: {
      type: "landing.module",
      id: "module_source_short",
      metadata: {
        nodeId: "node_landing",
        outputPortId: "outputs.engagement",
        pageId: "landing-page",
        assetId: "asset_source_short",
        productId: "product_creator_kit",
        offerId: "offer_launch_discount",
        url: "https://cdn.example.test/source-short.mp4",
        label: "Source short",
      },
    },
  } satisfies Omit<
    CampaignEngagementTrackingEvent,
    "id" | "sessionId" | "occurredAt" | "engagement"
  >;

  createBlankCampaignRecord(storage, {
    id: campaignId,
    now: () => "2026-05-11T04:30:00.000Z",
  });

  const events: CampaignEngagementTrackingEvent[] = [
    {
      ...baseEvent,
      id: "event_watch_depth_session_1",
      sessionId: "session_1",
      occurredAt: "2026-05-11T04:31:00.000Z",
      engagement: {
        kind: "playback",
        action: "watch_depth",
        value: 50,
        unit: "percent",
      },
    },
    {
      ...baseEvent,
      id: "event_complete_session_1",
      sessionId: "session_1",
      occurredAt: "2026-05-11T04:31:10.000Z",
      engagement: {
        kind: "playback",
        action: "complete",
        value: 100,
        unit: "percent",
      },
    },
    {
      ...baseEvent,
      id: "event_replay_session_1",
      sessionId: "session_1",
      occurredAt: "2026-05-11T04:31:20.000Z",
      engagement: {
        kind: "playback",
        action: "replay",
        value: 1,
        unit: "count",
      },
    },
    {
      ...baseEvent,
      id: "event_control_play_session_1",
      sessionId: "session_1",
      occurredAt: "2026-05-11T04:31:25.000Z",
      engagement: {
        kind: "playback",
        action: "control:play",
        value: 1,
        unit: "count",
      },
    },
    {
      ...baseEvent,
      id: "event_watch_depth_session_2",
      sessionId: "session_2",
      occurredAt: "2026-05-11T04:32:00.000Z",
      engagement: {
        kind: "playback",
        action: "watch_depth",
        value: 80,
        unit: "percent",
      },
    },
    {
      ...baseEvent,
      id: "event_scroll_depth_session_2",
      sessionId: "session_2",
      occurredAt: "2026-05-11T04:32:10.000Z",
      engagement: {
        kind: "scroll",
        action: "depth",
        value: 60,
        unit: "percent",
      },
    },
  ];

  for (const event of events) {
    const response = await ingestTrackingEvent(storage, event);
    assert.equal(response.status, 201);
  }

  const response = await loadCampaignTrackingImmersion({
    request: new Request(
      `http://localhost/api/campaigns/${campaignId}/tracking/immersion`,
    ),
    params: { campaignId },
    storage,
    now: () => "2026-05-11T04:35:00.000Z",
  });
  const body = await readJson(response);

  assert.equal(response.status, 200);
  assert.deepEqual(body, {
    schemaVersion: "owncanvas.campaign-landing-immersion-analytics.v1",
    campaignId,
    generatedAt: "2026-05-11T04:35:00.000Z",
    summary: {
      pages: 1,
      sessions: 2,
      eventCount: 6,
      averageWatchDepthPercent: 65,
      maxWatchDepthPercent: 80,
      completionRate: 0.5,
      replayRate: 0.5,
      interactionCount: 6,
      interactionCounts: {
        "watch_depth": 2,
        complete: 1,
        replay: 1,
        "control:play": 1,
        depth: 1,
      },
    },
    pages: [
      {
        pageId: "landing-page",
        sessions: 2,
        eventCount: 6,
        watchDepth: {
          samples: 2,
          averagePercent: 65,
          maxPercent: 80,
        },
        completionRate: 0.5,
        completedSessions: 1,
        replayRate: 0.5,
        replaySessions: 1,
        replayCount: 1,
        interactionCount: 6,
        interactionCounts: {
          "watch_depth": 2,
          complete: 1,
          replay: 1,
          "control:play": 1,
          depth: 1,
        },
        playbackInteractionCount: 5,
        scrollInteractionCount: 1,
        assets: [
          {
            assetId: "asset_source_short",
            sessions: 2,
            eventCount: 6,
            watchDepth: {
              samples: 2,
              averagePercent: 65,
              maxPercent: 80,
            },
            completion: {
              sessions: 1,
              rate: 0.5,
            },
            replay: {
              sessions: 1,
              rate: 0.5,
              count: 1,
            },
            interactionCount: 6,
            interactionCounts: {
              "watch_depth": 2,
              complete: 1,
              replay: 1,
              "control:play": 1,
              depth: 1,
            },
          },
        ],
      },
    ],
  });
});

test("POST /api/campaigns/:campaignId/tracking/conversions retrieves prior user and session interactions within attribution window", async () => {
  const storage = new MemoryStorage();
  const campaignId = "campaign_api_conversion_prior_interactions";

  createBlankCampaignRecord(storage, {
    id: campaignId,
    now: () => "2026-05-11T05:00:00.000Z",
  });

  const baseClick: CampaignClickTrackingEvent = {
    schemaVersion: CAMPAIGN_TRACKING_EVENT_SCHEMA_VERSION,
    type: "click",
    id: "event_click_base",
    campaignId,
    sessionId: "session_conversion_path",
    context: {
      actor: "human",
      userId: "user_conversion_path",
      permissionMode: "basic",
    },
    occurredAt: "2026-05-10T05:00:00.000Z",
    content: {
      type: "landing_cta",
      id: "content_checkout_cta",
      nodeId: "node_landing",
      channelId: "instagram_dm",
      productId: "product_creator_kit",
      offerId: "offer_launch_discount",
    },
    utm: {
      source: "instagram",
      medium: "dm",
      campaign: "creator-kit-launch",
      content: "checkout-cta",
      term: "creator-tools",
    },
    target: {
      type: "landing.cta",
      id: "checkout_cta",
      metadata: {
        nodeId: "node_landing",
        outputPortId: "outputs.click",
        channelId: "instagram_dm",
        productId: "product_creator_kit",
        offerId: "offer_launch_discount",
        url: "https://shop.example.test/creator-kit",
        label: "Checkout CTA",
      },
    },
    click: {
      href: "https://shop.example.test/creator-kit",
      label: "Checkout CTA",
      destination: "landing",
    },
  };

  const withinSessionClick: CampaignClickTrackingEvent = {
    ...baseClick,
    id: "event_click_same_session_inside_window",
    occurredAt: "2026-05-10T05:00:00.000Z",
  };
  const withinUserClick: CampaignClickTrackingEvent = {
    ...baseClick,
    id: "event_click_same_user_inside_window",
    sessionId: "session_previous_visit",
    occurredAt: "2026-05-11T04:00:00.000Z",
  };
  const outsideWindowClick: CampaignClickTrackingEvent = {
    ...baseClick,
    id: "event_click_outside_window",
    occurredAt: "2026-05-08T04:59:59.000Z",
  };
  const otherUserClick: CampaignClickTrackingEvent = {
    ...baseClick,
    id: "event_click_other_user",
    sessionId: "session_other_user",
    context: {
      actor: "human",
      userId: "user_other",
      permissionMode: "basic",
    },
    occurredAt: "2026-05-10T06:00:00.000Z",
  };

  for (const event of [
    outsideWindowClick,
    withinSessionClick,
    otherUserClick,
    withinUserClick,
  ]) {
    await ingestTrackingEvent(storage, event);
  }

  const conversionEvent: CampaignConversionTrackingEvent = {
    schemaVersion: CAMPAIGN_TRACKING_EVENT_SCHEMA_VERSION,
    type: "conversion",
    id: "event_conversion_purchase_with_history",
    campaignId,
    sessionId: "session_conversion_path",
    context: {
      actor: "human",
      userId: "user_conversion_path",
      permissionMode: "basic",
    },
    occurredAt: "2026-05-11T05:00:00.000Z",
    content: {
      type: "checkout",
      id: "content_checkout_purchase",
      nodeId: "node_landing",
      channelId: "instagram_dm",
      productId: "product_creator_kit",
      offerId: "offer_launch_discount",
    },
    utm: {
      source: "instagram",
      medium: "dm",
      campaign: "creator-kit-launch",
      content: "checkout-cta",
      term: "creator-tools",
    },
    target: {
      type: "checkout",
      id: "checkout_success",
      metadata: {
        nodeId: "node_landing",
        inputPortId: "inputs.purchase",
        channelId: "instagram_dm",
        productId: "product_creator_kit",
        offerId: "offer_launch_discount",
      },
    },
    conversion: {
      eventName: "purchase",
      value: 12900,
      currency: "USD",
      orderId: "order_history_001",
      metadata: {
        attributionWindowDays: 3,
      },
    },
  };

  const response = await ingestTrackingEvent(storage, conversionEvent);
  const body = await readJson(response);

  assert.equal(response.status, 201);
  assert.deepEqual(body.attributionWindow, {
    days: 3,
    startsAt: "2026-05-08T05:00:00.000Z",
    endsAt: "2026-05-11T05:00:00.000Z",
  });
  assert.deepEqual(
    (body.priorInteractions as Array<{ event: CampaignTrackingEvent }>).map(
      (interaction) => interaction.event.id,
    ),
    [
      "event_click_same_session_inside_window",
      "event_click_same_user_inside_window",
    ],
  );
});

test("POST /api/campaigns/:campaignId/tracking/conversions associates the conversion with one deterministic prior interaction", async () => {
  const storage = new MemoryStorage();
  const campaignId = "campaign_api_conversion_attribution_match";

  createBlankCampaignRecord(storage, {
    id: campaignId,
    now: () => "2026-05-11T05:00:00.000Z",
  });

  const baseInteraction: CampaignClickTrackingEvent = {
    schemaVersion: CAMPAIGN_TRACKING_EVENT_SCHEMA_VERSION,
    type: "click",
    id: "event_click_base_attribution",
    campaignId,
    sessionId: "session_checkout",
    context: {
      actor: "human",
      userId: "user_checkout",
      permissionMode: "basic",
    },
    occurredAt: "2026-05-11T04:30:00.000Z",
    content: {
      type: "landing_cta",
      id: "content_checkout_cta",
      nodeId: "node_landing",
      channelId: "instagram_dm",
      productId: "product_creator_kit",
      offerId: "offer_launch_discount",
    },
    utm: {
      source: "instagram",
      medium: "dm",
      campaign: "creator-kit-launch",
      content: "checkout-cta",
      term: "creator-tools",
    },
    target: {
      type: "landing.cta",
      id: "checkout_cta",
      metadata: {
        nodeId: "node_landing",
        outputPortId: "outputs.click",
        channelId: "instagram_dm",
        productId: "product_creator_kit",
        offerId: "offer_launch_discount",
        url: "https://shop.example.test/creator-kit",
        label: "Checkout CTA",
      },
    },
    click: {
      href: "https://shop.example.test/creator-kit",
      label: "Checkout CTA",
      destination: "landing",
    },
  };
  const sameUserLaterClick: CampaignClickTrackingEvent = {
    ...baseInteraction,
    id: "event_click_same_user_later",
    sessionId: "session_previous_visit",
    occurredAt: "2026-05-11T04:50:00.000Z",
  };
  const sameSessionOfferClick: CampaignClickTrackingEvent = {
    ...baseInteraction,
    id: "event_click_same_session_offer",
    occurredAt: "2026-05-11T04:40:00.000Z",
  };
  const sameSessionExposure: CampaignExposureTrackingEvent = {
    schemaVersion: baseInteraction.schemaVersion,
    type: "exposure",
    id: "event_exposure_same_session_later",
    campaignId,
    sessionId: baseInteraction.sessionId,
    context: baseInteraction.context,
    occurredAt: "2026-05-11T04:55:00.000Z",
    content: baseInteraction.content,
    utm: baseInteraction.utm,
    target: baseInteraction.target,
    exposure: {
      surface: "landing",
      placement: "hero",
      viewId: "view_checkout_hero",
    },
  };

  for (const event of [
    baseInteraction,
    sameUserLaterClick,
    sameSessionOfferClick,
    sameSessionExposure,
  ]) {
    await ingestTrackingEvent(storage, event);
  }

  const conversionEvent: CampaignConversionTrackingEvent = {
    schemaVersion: CAMPAIGN_TRACKING_EVENT_SCHEMA_VERSION,
    type: "conversion",
    id: "event_conversion_purchase_attributed",
    campaignId,
    sessionId: "session_checkout",
    context: {
      actor: "human",
      userId: "user_checkout",
      permissionMode: "basic",
    },
    occurredAt: "2026-05-11T05:00:00.000Z",
    content: {
      type: "checkout",
      id: "content_checkout_purchase",
      nodeId: "node_landing",
      channelId: "instagram_dm",
      productId: "product_creator_kit",
      offerId: "offer_launch_discount",
    },
    utm: {
      source: "instagram",
      medium: "dm",
      campaign: "creator-kit-launch",
      content: "checkout-cta",
      term: "creator-tools",
    },
    target: {
      type: "checkout",
      id: "checkout_success",
      metadata: {
        nodeId: "node_landing",
        inputPortId: "inputs.purchase",
        channelId: "instagram_dm",
        productId: "product_creator_kit",
        offerId: "offer_launch_discount",
      },
    },
    conversion: {
      eventName: "purchase",
      value: 12900,
      currency: "USD",
      orderId: "order_attributed_001",
      metadata: {
        attributionWindowDays: 1,
      },
    },
  };

  const response = await ingestTrackingEvent(storage, conversionEvent);
  const body = await readJson(response);

  assert.equal(response.status, 201);
  assert.deepEqual(body.attributionMatch, {
    conversionEventId: "event_conversion_purchase_attributed",
    interactionEventId: "event_click_same_session_offer",
    rule: "last-click-same-session-offer",
    matchedAt: "2026-05-11T05:00:00.000Z",
    interactionOccurredAt: "2026-05-11T04:40:00.000Z",
    attributionWindowDays: 1,
    reason:
      "Matched the latest prior click in the same session for the same offer.",
  });
  assert.deepEqual(
    getPersistedCampaignRecord(storage, campaignId)?.tracking.conversionRecords?.[0]
      .attributionMatch,
    body.attributionMatch,
  );
});

test("POST /api/campaigns/:campaignId/tracking/conversions links purchase events to the campaign selected by attribution rules", async () => {
  const storage = new MemoryStorage();
  const attributedCampaignId = "campaign_api_purchase_correct_attribution";
  const routedCampaignId = "campaign_api_purchase_wrong_route";

  createBlankCampaignRecord(storage, {
    id: attributedCampaignId,
    now: () => "2026-05-11T05:30:00.000Z",
  });
  createBlankCampaignRecord(storage, {
    id: routedCampaignId,
    now: () => "2026-05-11T05:30:00.000Z",
  });

  const clickEvent: CampaignClickTrackingEvent = {
    schemaVersion: CAMPAIGN_TRACKING_EVENT_SCHEMA_VERSION,
    type: "click",
    id: "event_click_correct_campaign_cta",
    campaignId: attributedCampaignId,
    sessionId: "session_cross_campaign_checkout",
    context: {
      actor: "human",
      userId: "user_cross_campaign_checkout",
      permissionMode: "basic",
    },
    occurredAt: "2026-05-11T05:35:00.000Z",
    content: {
      type: "landing_cta",
      id: "content_cross_campaign_cta",
      nodeId: "node_landing",
      channelId: "instagram_dm",
      productId: "product_creator_kit",
      offerId: "offer_launch_discount",
    },
    utm: {
      source: "instagram",
      medium: "dm",
      campaign: "creator-kit-launch",
      content: "checkout-cta",
      term: "creator-tools",
    },
    target: {
      type: "landing.cta",
      id: "checkout_cta",
      metadata: {
        nodeId: "node_landing",
        outputPortId: "outputs.click",
        channelId: "instagram_dm",
        productId: "product_creator_kit",
        offerId: "offer_launch_discount",
        url: "https://shop.example.test/creator-kit",
        label: "Checkout CTA",
      },
    },
    click: {
      id: "click_correct_campaign_cta",
      href: "https://shop.example.test/creator-kit",
      label: "Checkout CTA",
      destination: "checkout",
    },
  };

  await ingestTrackingEvent(storage, clickEvent);

  const conversionEvent: CampaignConversionTrackingEvent = {
    schemaVersion: CAMPAIGN_TRACKING_EVENT_SCHEMA_VERSION,
    type: "conversion",
    id: "event_conversion_purchase_cross_campaign",
    campaignId: routedCampaignId,
    sessionId: "session_cross_campaign_checkout",
    context: {
      actor: "human",
      userId: "user_cross_campaign_checkout",
      permissionMode: "basic",
    },
    occurredAt: "2026-05-11T05:40:00.000Z",
    content: {
      type: "checkout",
      id: "content_cross_campaign_purchase",
      nodeId: "node_landing",
      channelId: "instagram_dm",
      productId: "product_creator_kit",
      offerId: "offer_launch_discount",
    },
    utm: {
      source: "instagram",
      medium: "dm",
      campaign: "creator-kit-launch",
      content: "checkout-cta",
      term: "creator-tools",
    },
    target: {
      type: "checkout",
      id: "checkout_cross_campaign_success",
      metadata: {
        nodeId: "node_landing",
        inputPortId: "inputs.purchase",
        channelId: "instagram_dm",
        productId: "product_creator_kit",
        offerId: "offer_launch_discount",
      },
    },
    conversion: {
      eventName: "purchase",
      value: 12900,
      currency: "USD",
      orderId: "order_cross_campaign_001",
      metadata: {
        attributionWindowDays: 1,
      },
    },
  };

  const response = await ingestCampaignTrackingEvent({
    request: new Request(
      `http://localhost/api/campaigns/${routedCampaignId}/tracking/conversions`,
      {
        method: "POST",
        body: JSON.stringify(conversionEvent),
        headers: { "content-type": "application/json" },
      },
    ),
    params: { campaignId: routedCampaignId },
    storage,
    now: () => "2026-05-11T05:40:01.000Z",
  });
  const body = await readJson(response);

  assert.equal(response.status, 201);
  assert.equal(body.campaignId, attributedCampaignId);
  assert.equal(
    getPersistedCampaignRecord(storage, routedCampaignId)?.tracking
      .conversionRecords,
    undefined,
  );
  assert.deepEqual(
    getPersistedCampaignRecord(storage, attributedCampaignId)?.tracking
      .conversionRecords?.[0].attributionMatch,
    {
      conversionEventId: "event_conversion_purchase_cross_campaign",
      interactionEventId: "event_click_correct_campaign_cta",
      rule: "last-click-same-session-offer",
      matchedAt: "2026-05-11T05:40:00.000Z",
      interactionOccurredAt: "2026-05-11T05:35:00.000Z",
      attributionWindowDays: 1,
      reason:
        "Matched the latest prior click in the same session for the same offer.",
    },
  );
  assert.deepEqual(
    getPersistedCampaignPurchaseConversionEvents(storage, {
      campaignId: attributedCampaignId,
      orderId: "order_cross_campaign_001",
    }).map((record) => ({
      campaignId: record.campaignId,
      eventCampaignId: record.attribution.campaignId,
      attributionRule: record.attributionMatch?.rule,
    })),
    [
      {
        campaignId: attributedCampaignId,
        eventCampaignId: attributedCampaignId,
        attributionRule: "last-click-same-session-offer",
      },
    ],
  );
});

test("POST /api/campaigns/:campaignId/tracking/conversions attributes a conversion to its prior campaign session when no click exists", async () => {
  const storage = new MemoryStorage();
  const campaignId = "campaign_api_conversion_session_attribution";

  createBlankCampaignRecord(storage, {
    id: campaignId,
    now: () => "2026-05-11T08:00:00.000Z",
  });
  trackInboundCampaignSession(
    storage,
    campaignId,
    "https://shop.example.test/creator-kit?utm_source=instagram&utm_medium=dm&utm_campaign=creator-kit-launch&utm_content=comment-trigger&utm_term=creator-tools&oc_campaign_id=campaign_api_conversion_session_attribution&oc_session_id=session_session_only&oc_channel_id=instagram_dm&oc_touchpoint_id=dm_welcome",
    {
      now: () => "2026-05-11T08:05:00.000Z",
    },
  );

  const conversionEvent: CampaignConversionTrackingEvent = {
    schemaVersion: CAMPAIGN_TRACKING_EVENT_SCHEMA_VERSION,
    type: "conversion",
    id: "event_conversion_session_only_purchase",
    campaignId,
    sessionId: "session_session_only",
    context: {
      actor: "human",
      userId: "user_session_only",
      permissionMode: "basic",
    },
    occurredAt: "2026-05-11T08:20:00.000Z",
    content: {
      type: "checkout",
      id: "content_session_only_checkout",
      nodeId: "node_landing",
      channelId: "instagram_dm",
      productId: "product_creator_kit",
      offerId: "offer_launch_discount",
    },
    utm: {
      source: "instagram",
      medium: "dm",
      campaign: "creator-kit-launch",
      content: "comment-trigger",
      term: "creator-tools",
    },
    target: {
      type: "checkout",
      id: "checkout_session_only_success",
      metadata: {
        nodeId: "node_landing",
        inputPortId: "inputs.purchase",
        channelId: "instagram_dm",
        productId: "product_creator_kit",
        offerId: "offer_launch_discount",
      },
    },
    conversion: {
      eventName: "purchase",
      value: 9900,
      currency: "USD",
      orderId: "order_session_only_001",
      metadata: {
        attributionWindowDays: 1,
      },
    },
  };

  const response = await ingestTrackingEvent(storage, conversionEvent);
  const body = await readJson(response);

  assert.equal(response.status, 201);
  assert.deepEqual(body.attributionMatch, {
    conversionEventId: "event_conversion_session_only_purchase",
    interactionEventId: "session_session_only",
    rule: "last-session-same-session",
    matchedAt: "2026-05-11T08:20:00.000Z",
    interactionOccurredAt: "2026-05-11T08:05:00.000Z",
    attributionWindowDays: 1,
    reason: "Matched the prior tracked campaign session.",
  });
  assert.deepEqual(
    getPersistedCampaignRecord(storage, campaignId)?.tracking.conversionRecords?.[0]
      .attributionMatch,
    body.attributionMatch,
  );
});

test("GET /api/campaigns/:campaignId/tracking/conversions exposes attributed conversion rows for reporting", async () => {
  const storage = new MemoryStorage();
  const campaignId = "campaign_api_conversion_reporting";

  createBlankCampaignRecord(storage, {
    id: campaignId,
    now: () => "2026-05-11T07:00:00.000Z",
  });

  const clickEvent: CampaignClickTrackingEvent = {
    schemaVersion: CAMPAIGN_TRACKING_EVENT_SCHEMA_VERSION,
    type: "click",
    id: "event_click_reporting_cta",
    campaignId,
    sessionId: "session_reporting",
    context: {
      actor: "human",
      userId: "user_reporting",
      permissionMode: "basic",
    },
    occurredAt: "2026-05-11T07:10:00.000Z",
    content: {
      type: "landing_cta",
      id: "content_reporting_cta",
      nodeId: "node_landing",
      channelId: "instagram_dm",
      productId: "product_creator_kit",
      offerId: "offer_launch_discount",
    },
    utm: {
      source: "instagram",
      medium: "dm",
      campaign: "creator-kit-launch",
      content: "reporting-cta",
      term: "creator-tools",
    },
    target: {
      type: "landing.cta",
      id: "reporting_cta",
      metadata: {
        nodeId: "node_landing",
        outputPortId: "outputs.click",
        channelId: "instagram_dm",
        productId: "product_creator_kit",
        offerId: "offer_launch_discount",
        url: "https://shop.example.test/creator-kit",
        label: "Shop reporting offer",
      },
    },
    click: {
      id: "click_reporting_cta_001",
      href: "https://shop.example.test/creator-kit",
      label: "Shop reporting offer",
      destination: "checkout",
    },
  };

  await ingestTrackingEvent(storage, clickEvent);

  const conversionEvent: CampaignConversionTrackingEvent = {
    schemaVersion: CAMPAIGN_TRACKING_EVENT_SCHEMA_VERSION,
    type: "conversion",
    id: "event_conversion_reporting_purchase",
    campaignId,
    sessionId: "session_reporting",
    context: {
      actor: "human",
      userId: "user_reporting",
      permissionMode: "basic",
    },
    occurredAt: "2026-05-11T07:20:00.000Z",
    content: {
      type: "checkout",
      id: "content_reporting_checkout",
      nodeId: "node_landing",
      channelId: "instagram_dm",
      productId: "product_creator_kit",
      offerId: "offer_launch_discount",
    },
    utm: {
      source: "instagram",
      medium: "dm",
      campaign: "creator-kit-launch",
      content: "reporting-cta",
      term: "creator-tools",
    },
    target: {
      type: "checkout",
      id: "checkout_reporting_success",
      metadata: {
        nodeId: "node_landing",
        inputPortId: "inputs.purchase",
        channelId: "instagram_dm",
        productId: "product_creator_kit",
        offerId: "offer_launch_discount",
      },
    },
    conversion: {
      eventName: "purchase",
      value: 12900,
      currency: "USD",
      orderId: "order_reporting_001",
      quantity: 1,
      metadata: {
        attributionWindowDays: 1,
      },
    },
  };

  await ingestTrackingEvent(storage, conversionEvent);

  const response = await loadCampaignTrackingConversions({
    request: new Request(
      `http://localhost/api/campaigns/${campaignId}/tracking/conversions`,
    ),
    params: { campaignId },
    storage,
    now: () => "2026-05-11T07:21:00.000Z",
  });
  const body = await readJson(response);
  const { export: downstreamExport, ...reportingBody } = body;

  assert.equal(response.status, 200);
  assert.equal(
    (downstreamExport as { schemaVersion?: string } | undefined)?.schemaVersion,
    "owncanvas.attributed-conversion-export.v1",
  );
  assert.deepEqual(reportingBody, {
    schemaVersion: "owncanvas.campaign-conversion-analytics.v1",
    campaignId,
    generatedAt: "2026-05-11T07:21:00.000Z",
    summary: {
      totalConversions: 1,
      attributedConversions: 1,
      unattributedConversions: 0,
      totalValue: 12900,
      currencyBreakdown: {
        USD: 12900,
      },
      eventNames: {
        purchase: 1,
      },
    },
    rows: [
      {
        conversionEventId: "event_conversion_reporting_purchase",
        conversionRecordId: "conversion_event_conversion_reporting_purchase",
        sessionId: "session_reporting",
        occurredAt: "2026-05-11T07:20:00.000Z",
        eventName: "purchase",
        value: 12900,
        currency: "USD",
        orderId: "order_reporting_001",
        source: "instagram",
        medium: "dm",
        utmCampaign: "creator-kit-launch",
        utmContent: "reporting-cta",
        utmTerm: "creator-tools",
        nodeId: "node_landing",
        inputPortId: "inputs.purchase",
        channelId: "instagram_dm",
        productId: "product_creator_kit",
        offerId: "offer_launch_discount",
        targetType: "checkout",
        targetId: "checkout_reporting_success",
        attributionRule: "last-click-same-session-offer",
        attributedInteractionEventId: "event_click_reporting_cta",
        attributedInteractionType: "click",
        attributedInteractionOccurredAt: "2026-05-11T07:10:00.000Z",
        attributionWindowDays: 1,
        origin: {
          campaignId,
          contentId: "content_reporting_checkout",
          contentType: "checkout",
          nodeId: "node_landing",
          inputPortId: "inputs.purchase",
          channelId: "instagram_dm",
          productId: "product_creator_kit",
          offerId: "offer_launch_discount",
          sourceEventId: "event_conversion_reporting_purchase",
          attributedInteractionEventId: "event_click_reporting_cta",
        },
      },
    ],
    conversions: [
      {
        record: getPersistedCampaignRecord(storage, campaignId)?.tracking
          .conversionRecords?.[0],
        event: conversionEvent,
        attributionMatch: {
          conversionEventId: "event_conversion_reporting_purchase",
          interactionEventId: "event_click_reporting_cta",
          rule: "last-click-same-session-offer",
          matchedAt: "2026-05-11T07:20:00.000Z",
          interactionOccurredAt: "2026-05-11T07:10:00.000Z",
          attributionWindowDays: 1,
          reason:
            "Matched the latest prior click in the same session for the same offer.",
        },
        attributedInteraction: {
          event: clickEvent,
          persistedAt: "2026-05-11T07:10:00.000Z",
          attribution: {
            campaignId,
            sessionId: "session_reporting",
            eventId: "event_click_reporting_cta",
            eventType: "click",
            occurredAt: "2026-05-11T07:10:00.000Z",
            source: "instagram",
            medium: "dm",
            campaign: "creator-kit-launch",
            content: "reporting-cta",
            term: "creator-tools",
            nodeId: "node_landing",
            outputPortId: "outputs.click",
            channelId: "instagram_dm",
            productId: "product_creator_kit",
            offerId: "offer_launch_discount",
            targetType: "landing.cta",
            targetId: "reporting_cta",
            clickId: "click_reporting_cta_001",
            destination: "checkout",
            href: "https://shop.example.test/creator-kit",
          },
        },
      },
    ],
  });
});

test("GET /api/campaigns/:campaignId/tracking/conversions exposes downstream attributed conversion export events", async () => {
  const storage = new MemoryStorage();
  const campaignId = "campaign_api_conversion_downstream_export";

  const campaign = createBlankCampaignRecord(storage, {
    id: campaignId,
    now: () => "2026-05-11T09:00:00.000Z",
  });
  updatePersistedCampaignRecord(
    storage,
    {
      ...campaign,
      tracking: createCampaignTrackingConfiguration({
        ...campaign.tracking,
        measurementGoals: [
          {
            id: "goal_purchase_conversion_rate",
            name: "purchase_conversion_rate",
            target: 4,
            unit: "percent",
            successCriteria:
              "Purchase conversion reaches the tracked checkout threshold.",
            reportingTimeframe: {
              startsAt: "2026-05-11T00:00:00.000Z",
              endsAt: "2026-05-18T00:00:00.000Z",
              timezone: "UTC",
            },
          },
        ],
        analyticsDestinations: [
          {
            id: "destination_dashboard",
            provider: "owncanvas-dashboard",
            destinationId: "dashboard_conversion_report",
            label: "Conversion dashboard",
            enabled: true,
          },
          {
            id: "destination_disabled",
            provider: "warehouse",
            destinationId: "warehouse_disabled",
            label: "Disabled export",
            enabled: false,
          },
        ],
      }),
    },
    { now: () => "2026-05-11T09:00:01.000Z" },
  );

  const clickEvent: CampaignClickTrackingEvent = {
    schemaVersion: CAMPAIGN_TRACKING_EVENT_SCHEMA_VERSION,
    type: "click",
    id: "event_click_downstream_cta",
    campaignId,
    sessionId: "session_downstream",
    context: {
      actor: "agent",
      agentId: "agent_reporter",
      pluginId: "plugin.dashboard.conversion-reporter",
      permissionMode: "advanced",
    },
    occurredAt: "2026-05-11T09:10:00.000Z",
    content: {
      type: "landing_cta",
      id: "content_downstream_cta",
      nodeId: "node_landing",
      channelId: "instagram_dm",
      productId: "product_creator_kit",
      offerId: "offer_launch_discount",
    },
    utm: {
      source: "instagram",
      medium: "dm",
      campaign: "creator-kit-launch",
      content: "downstream-cta",
      term: "creator-tools",
    },
    target: {
      type: "landing.cta",
      id: "downstream_cta",
      metadata: {
        nodeId: "node_landing",
        outputPortId: "outputs.click",
        channelId: "instagram_dm",
        productId: "product_creator_kit",
        offerId: "offer_launch_discount",
        url: "https://shop.example.test/creator-kit",
        label: "Shop downstream offer",
      },
    },
    click: {
      id: "click_downstream_cta_001",
      href: "https://shop.example.test/creator-kit",
      label: "Shop downstream offer",
      destination: "checkout",
    },
  };
  const conversionEvent: CampaignConversionTrackingEvent = {
    schemaVersion: CAMPAIGN_TRACKING_EVENT_SCHEMA_VERSION,
    type: "conversion",
    id: "event_conversion_downstream_purchase",
    campaignId,
    sessionId: "session_downstream",
    context: {
      actor: "human",
      userId: "user_downstream",
      permissionMode: "basic",
    },
    occurredAt: "2026-05-11T09:15:00.000Z",
    content: {
      type: "checkout",
      id: "content_downstream_checkout",
      nodeId: "node_landing",
      channelId: "instagram_dm",
      productId: "product_creator_kit",
      offerId: "offer_launch_discount",
    },
    utm: {
      source: "instagram",
      medium: "dm",
      campaign: "creator-kit-launch",
      content: "downstream-cta",
      term: "creator-tools",
    },
    target: {
      type: "checkout",
      id: "checkout_downstream_success",
      metadata: {
        nodeId: "node_landing",
        inputPortId: "inputs.purchase",
        channelId: "instagram_dm",
        productId: "product_creator_kit",
        offerId: "offer_launch_discount",
      },
    },
    conversion: {
      eventName: "purchase",
      value: 9900,
      currency: "USD",
      orderId: "order_downstream_001",
      quantity: 1,
      metadata: {
        attributionWindowDays: 1,
      },
    },
  };

  await ingestTrackingEvent(storage, clickEvent);
  await ingestTrackingEvent(storage, conversionEvent);

  const response = await loadCampaignTrackingConversions({
    request: new Request(
      `http://localhost/api/campaigns/${campaignId}/tracking/conversions`,
    ),
    params: { campaignId },
    storage,
    now: () => "2026-05-11T09:16:00.000Z",
  });
  const body = await readJson(response);

  assert.equal(response.status, 200);
  assert.deepEqual(body.export, {
    schemaVersion: "owncanvas.attributed-conversion-export.v1",
    campaignId,
    generatedAt: "2026-05-11T09:16:00.000Z",
    analyticsDestinations: [
      {
        id: "destination_dashboard",
        provider: "owncanvas-dashboard",
        destinationId: "dashboard_conversion_report",
        label: "Conversion dashboard",
      },
    ],
    measurementGoals: [
      {
        id: "goal_purchase_conversion_rate",
        name: "purchase_conversion_rate",
        target: 4,
        unit: "percent",
        successCriteria:
          "Purchase conversion reaches the tracked checkout threshold.",
        reportingTimeframe: {
          startsAt: "2026-05-11T00:00:00.000Z",
          endsAt: "2026-05-18T00:00:00.000Z",
          timezone: "UTC",
        },
      },
    ],
    events: [
      {
        id: "attributed_event_conversion_downstream_purchase",
        conversionEventId: "event_conversion_downstream_purchase",
        conversionRecordId: "conversion_event_conversion_downstream_purchase",
        campaignId,
        sessionId: "session_downstream",
        occurredAt: "2026-05-11T09:15:00.000Z",
        eventName: "purchase",
        value: 9900,
        currency: "USD",
        orderId: "order_downstream_001",
        quantity: 1,
        source: "instagram",
        medium: "dm",
        utmCampaign: "creator-kit-launch",
        utmContent: "downstream-cta",
        utmTerm: "creator-tools",
        nodeId: "node_landing",
        inputPortId: "inputs.purchase",
        channelId: "instagram_dm",
        productId: "product_creator_kit",
        offerId: "offer_launch_discount",
        targetType: "checkout",
        targetId: "checkout_downstream_success",
        attributionRule: "last-click-same-session-offer",
        attributedInteractionEventId: "event_click_downstream_cta",
        attributedInteractionType: "click",
        attributedInteractionOccurredAt: "2026-05-11T09:10:00.000Z",
        attributionWindowDays: 1,
        origin: {
          campaignId,
          contentId: "content_downstream_checkout",
          contentType: "checkout",
          nodeId: "node_landing",
          inputPortId: "inputs.purchase",
          channelId: "instagram_dm",
          productId: "product_creator_kit",
          offerId: "offer_launch_discount",
          sourceEventId: "event_conversion_downstream_purchase",
          attributedInteractionEventId: "event_click_downstream_cta",
        },
        attributedClickId: "click_downstream_cta_001",
        attributedSource: "instagram",
        attributedMedium: "dm",
        attributedCampaign: "creator-kit-launch",
        attributedContent: "downstream-cta",
        attributedTerm: "creator-tools",
        attributedNodeId: "node_landing",
        attributedOutputPortId: "outputs.click",
        attributedChannelId: "instagram_dm",
        attributedProductId: "product_creator_kit",
        attributedOfferId: "offer_launch_discount",
        attributedTargetType: "landing.cta",
        attributedTargetId: "downstream_cta",
        attributedHref: "https://shop.example.test/creator-kit",
        attributedDestination: "checkout",
      },
    ],
  });
});

test("GET /api/campaigns/:campaignId/tracking/conversions resolves purchase conversion origin to campaign workflow and content variant", async () => {
  const storage = new MemoryStorage();
  const campaignId = "campaign_api_purchase_origin_resolution";

  createBlankCampaignRecord(storage, {
    id: campaignId,
    now: () => "2026-05-11T10:00:00.000Z",
  });

  const clickEvent: CampaignClickTrackingEvent = {
    schemaVersion: CAMPAIGN_TRACKING_EVENT_SCHEMA_VERSION,
    type: "click",
    id: "event_click_origin_variant",
    campaignId,
    sessionId: "session_origin_resolution",
    context: {
      actor: "human",
      userId: "user_origin_resolution",
      permissionMode: "basic",
    },
    occurredAt: "2026-05-11T10:05:00.000Z",
    content: {
      type: "short_video",
      id: "content_variant_reel_a",
      nodeId: "node_short_video_variant_a",
      channelId: "instagram_dm",
      pageId: "page_immersive_landing",
      assetId: "asset_reel_variant_a",
      productId: "product_creator_kit",
      offerId: "offer_launch_discount",
      metadata: {
        workflowId: "workflow_comment_dm_landing",
        contentVariantId: "variant_reel_a",
      },
    },
    utm: {
      source: "instagram",
      medium: "dm",
      campaign: "creator-kit-launch",
      content: "variant-reel-a",
      term: "creator-tools",
    },
    target: {
      type: "landing.cta",
      id: "origin_variant_cta",
      metadata: {
        nodeId: "node_landing",
        outputPortId: "outputs.click",
        channelId: "instagram_dm",
        pageId: "page_immersive_landing",
        assetId: "asset_reel_variant_a",
        productId: "product_creator_kit",
        offerId: "offer_launch_discount",
        url: "https://shop.example.test/creator-kit?variant=variant_reel_a",
        metadata: {
          workflowId: "workflow_comment_dm_landing",
          contentVariantId: "variant_reel_a",
        },
      },
    },
    click: {
      id: "click_origin_variant",
      href: "https://shop.example.test/creator-kit?variant=variant_reel_a",
      label: "Shop variant A",
      destination: "checkout",
    },
  };
  const conversionEvent: CampaignConversionTrackingEvent = {
    schemaVersion: CAMPAIGN_TRACKING_EVENT_SCHEMA_VERSION,
    type: "conversion",
    id: "event_conversion_origin_purchase",
    campaignId,
    sessionId: "session_origin_resolution",
    context: {
      actor: "human",
      userId: "user_origin_resolution",
      permissionMode: "basic",
    },
    occurredAt: "2026-05-11T10:10:00.000Z",
    content: {
      type: "checkout",
      id: "content_checkout_origin",
      nodeId: "node_checkout",
      channelId: "instagram_dm",
      pageId: "page_immersive_landing",
      assetId: "asset_reel_variant_a",
      productId: "product_creator_kit",
      offerId: "offer_launch_discount",
      metadata: {
        workflowId: "workflow_comment_dm_landing",
        contentVariantId: "variant_reel_a",
      },
    },
    utm: {
      source: "instagram",
      medium: "dm",
      campaign: "creator-kit-launch",
      content: "variant-reel-a",
      term: "creator-tools",
    },
    target: {
      type: "checkout",
      id: "checkout_origin_success",
      metadata: {
        nodeId: "node_checkout",
        inputPortId: "inputs.purchase",
        channelId: "instagram_dm",
        pageId: "page_immersive_landing",
        assetId: "asset_reel_variant_a",
        productId: "product_creator_kit",
        offerId: "offer_launch_discount",
        metadata: {
          workflowId: "workflow_comment_dm_landing",
          contentVariantId: "variant_reel_a",
        },
      },
    },
    conversion: {
      eventName: "purchase",
      value: 12900,
      currency: "USD",
      orderId: "order_origin_001",
      quantity: 1,
      metadata: {
        attributionWindowDays: 1,
      },
    },
  };

  await ingestTrackingEvent(storage, clickEvent);
  await ingestTrackingEvent(storage, conversionEvent);

  const response = await loadCampaignTrackingConversions({
    request: new Request(
      `http://localhost/api/campaigns/${campaignId}/tracking/conversions`,
    ),
    params: { campaignId },
    storage,
    now: () => "2026-05-11T10:11:00.000Z",
  });
  const body = await readJson(response);

  assert.equal(response.status, 200);
  assert.deepEqual(
    (body.rows as Array<{ origin?: unknown }>)[0]?.origin,
    {
      campaignId,
      workflowId: "workflow_comment_dm_landing",
      contentId: "content_checkout_origin",
      contentType: "checkout",
      contentVariantId: "variant_reel_a",
      nodeId: "node_checkout",
      inputPortId: "inputs.purchase",
      channelId: "instagram_dm",
      pageId: "page_immersive_landing",
      assetId: "asset_reel_variant_a",
      productId: "product_creator_kit",
      offerId: "offer_launch_discount",
      sourceEventId: "event_conversion_origin_purchase",
      attributedInteractionEventId: "event_click_origin_variant",
    },
  );
  assert.deepEqual(
    (
      body.export as {
        events?: Array<{ origin?: unknown }>;
      }
    ).events?.[0]?.origin,
    (body.rows as Array<{ origin?: unknown }>)[0]?.origin,
  );
});

test("POST /api/campaigns/:campaignId/tracking/conversions captures and persists conversion metadata", async () => {
  const storage = new MemoryStorage();

  createBlankCampaignRecord(storage, {
    id: "campaign_api_conversion_ingestion",
    now: () => "2026-05-11T05:00:00.000Z",
  });

  const event: CampaignConversionTrackingEvent = {
    schemaVersion: CAMPAIGN_TRACKING_EVENT_SCHEMA_VERSION,
    type: "conversion",
    id: "event_conversion_purchase_001",
    campaignId: "campaign_api_conversion_ingestion",
    sessionId: "session_conversion_1",
    context: {
      actor: "human",
      userId: "user_conversion_1",
      permissionMode: "basic",
    },
    occurredAt: "2026-05-11T05:04:00.000Z",
    content: {
      type: "checkout",
      id: "content_checkout_purchase",
      nodeId: "node_landing",
      channelId: "instagram_dm",
      productId: "product_creator_kit",
      offerId: "offer_launch_discount",
    },
    utm: {
      source: "instagram",
      medium: "dm",
      campaign: "creator-kit-launch",
      content: "checkout-cta",
      term: "creator-tools",
    },
    target: {
      type: "checkout",
      id: "checkout_success",
      metadata: {
        nodeId: "node_landing",
        inputPortId: "inputs.purchase",
        channelId: "instagram_dm",
        productId: "product_creator_kit",
        offerId: "offer_launch_discount",
        url: "https://shop.example.test/checkout/success",
        label: "Creator kit purchase",
        metadata: {
          orderId: "order_001",
        },
      },
    },
    conversion: {
      eventName: "purchase",
      value: 12900,
      currency: "USD",
      orderId: "order_001",
      quantity: 1,
      metadata: {
        checkoutProvider: "stripe",
      },
    },
  };

  const response = await ingestCampaignTrackingEvent({
    request: new Request(
      "http://localhost/api/campaigns/campaign_api_conversion_ingestion/tracking/conversions",
      {
        method: "POST",
        body: JSON.stringify(event),
        headers: { "content-type": "application/json" },
      },
    ),
    params: {
      campaignId: "campaign_api_conversion_ingestion",
    },
    storage,
    now: () => "2026-05-11T05:04:01.000Z",
  });

  assert.equal(response.status, 201);
  assert.deepEqual(
    getPersistedCampaignRecord(storage, "campaign_api_conversion_ingestion")
      ?.tracking.eventLog,
    [event],
  );
  assert.deepEqual(
    getPersistedCampaignRecord(storage, "campaign_api_conversion_ingestion")
      ?.tracking.conversionRecords,
    [
      {
        schemaVersion: "owncanvas.campaign-conversion-record.v1",
        id: "conversion_event_conversion_purchase_001",
        eventId: "event_conversion_purchase_001",
        campaignId: "campaign_api_conversion_ingestion",
        sessionId: "session_conversion_1",
        occurredAt: "2026-05-11T05:04:00.000Z",
        persistedAt: "2026-05-11T05:04:01.000Z",
        actor: "human",
        userId: "user_conversion_1",
        permissionMode: "basic",
        eventName: "purchase",
        value: 12900,
        currency: "USD",
        orderId: "order_001",
        quantity: 1,
        content: event.content,
        utm: event.utm,
        target: event.target,
        attribution: {
          campaignId: "campaign_api_conversion_ingestion",
          sessionId: "session_conversion_1",
          eventId: "event_conversion_purchase_001",
          eventType: "conversion",
          occurredAt: "2026-05-11T05:04:00.000Z",
          source: "instagram",
          medium: "dm",
          campaign: "creator-kit-launch",
          content: "checkout-cta",
          term: "creator-tools",
          nodeId: "node_landing",
          inputPortId: "inputs.purchase",
          channelId: "instagram_dm",
          productId: "product_creator_kit",
          offerId: "offer_launch_discount",
          targetType: "checkout",
          targetId: "checkout_success",
          conversionEventName: "purchase",
          conversionValue: 12900,
          conversionCurrency: "USD",
          orderId: "order_001",
          quantity: 1,
        },
      },
    ],
  );
  assert.deepEqual(
    getPersistedCampaignAnalyticsEvents(storage, {
      campaignId: "campaign_api_conversion_ingestion",
      sessionId: "session_conversion_1",
      eventType: "conversion",
    }),
    [
      {
        event,
        persistedAt: "2026-05-11T05:04:01.000Z",
        attribution: {
          campaignId: "campaign_api_conversion_ingestion",
          sessionId: "session_conversion_1",
          eventId: "event_conversion_purchase_001",
          eventType: "conversion",
          occurredAt: "2026-05-11T05:04:00.000Z",
          source: "instagram",
          medium: "dm",
          campaign: "creator-kit-launch",
          content: "checkout-cta",
          term: "creator-tools",
          nodeId: "node_landing",
          inputPortId: "inputs.purchase",
          channelId: "instagram_dm",
          productId: "product_creator_kit",
          offerId: "offer_launch_discount",
          targetType: "checkout",
          targetId: "checkout_success",
          conversionEventName: "purchase",
          conversionValue: 12900,
          conversionCurrency: "USD",
          orderId: "order_001",
          quantity: 1,
        },
      },
    ],
  );
  assert.deepEqual(
    getPersistedCampaignPurchaseConversionEvents(storage, {
      campaignId: "campaign_api_conversion_ingestion",
      orderId: "order_001",
      conversionEventName: "purchase",
    }),
    [
      {
        schemaVersion: "owncanvas.campaign-purchase-conversion-event.v1",
        id: "purchase_event_conversion_purchase_001",
        eventId: "event_conversion_purchase_001",
        campaignId: "campaign_api_conversion_ingestion",
        sessionId: "session_conversion_1",
        occurredAt: "2026-05-11T05:04:00.000Z",
        persistedAt: "2026-05-11T05:04:01.000Z",
        actor: "human",
        userId: "user_conversion_1",
        permissionMode: "basic",
        eventName: "purchase",
        orderId: "order_001",
        value: 12900,
        currency: "USD",
        quantity: 1,
        content: event.content,
        utm: event.utm,
        target: event.target,
        attribution: {
          campaignId: "campaign_api_conversion_ingestion",
          sessionId: "session_conversion_1",
          eventId: "event_conversion_purchase_001",
          eventType: "conversion",
          occurredAt: "2026-05-11T05:04:00.000Z",
          source: "instagram",
          medium: "dm",
          campaign: "creator-kit-launch",
          content: "checkout-cta",
          term: "creator-tools",
          nodeId: "node_landing",
          inputPortId: "inputs.purchase",
          channelId: "instagram_dm",
          productId: "product_creator_kit",
          offerId: "offer_launch_discount",
          targetType: "checkout",
          targetId: "checkout_success",
          conversionEventName: "purchase",
          conversionValue: 12900,
          conversionCurrency: "USD",
          orderId: "order_001",
          quantity: 1,
        },
        attributionMetadata: {
          source: "instagram",
          medium: "dm",
          campaign: "creator-kit-launch",
          content: "checkout-cta",
          term: "creator-tools",
          nodeId: "node_landing",
          inputPortId: "inputs.purchase",
          channelId: "instagram_dm",
          productId: "product_creator_kit",
          offerId: "offer_launch_discount",
          targetType: "checkout",
          targetId: "checkout_success",
          url: "https://shop.example.test/checkout/success",
          label: "Creator kit purchase",
          conversionMetadata: {
            checkoutProvider: "stripe",
          },
          targetMetadata: {
            orderId: "order_001",
          },
        },
      },
    ],
  );
});

test("tracking event ingestion validates event content and UTM metadata against the persisted campaign before storing", async () => {
  const storage = new MemoryStorage();

  const campaign = createBlankCampaignRecord(storage, {
    id: "campaign_api_contextual_event_validation",
    now: () => "2026-05-11T06:00:00.000Z",
  });
  saveCampaignProductOfferDetails(
    storage,
    campaign.id,
    createCampaignProductOffer({
      product: {
        id: "product_creator_kit",
        title: "Creator Starter Kit",
      },
      offer: {
        headline: "Creator kit launch offer",
        destinationUrl: "https://shop.example.test/creator-kit",
        callToAction: "Shop the kit",
      },
      attribution: {
        externalId: "offer_launch_discount",
      },
    }),
  );
  saveCampaignPublishingConfiguration(storage, campaign.id, [
    createCampaignPublishingChannel({
      id: "instagram_dm",
      type: "direct-message",
      platform: "instagram",
      label: "Instagram DM",
      placement: "dm",
      destinationUrl: "https://shop.example.test/creator-kit",
      tracking: {
        utmSource: "instagram",
        utmMedium: "dm",
        utmCampaign: "creator-kit-launch",
        utmContent: "checkout-cta",
        conversionEvent: "purchase",
      },
    }),
  ]);
  const configuredCampaign = getPersistedCampaignRecord(storage, campaign.id);

  assert.notEqual(configuredCampaign, null);
  updatePersistedCampaignRecord(storage, {
    ...configuredCampaign!,
    assets: [
      createCampaignAsset(
        {
          id: "asset_short_video",
          source: "link",
          mediaType: "video",
          title: "Creator kit short video",
          uri: "https://cdn.example.test/creator-kit-short.mp4",
          usage: "landing",
          status: "ready",
          rights: {
            owner: "OwnCanvas",
            license: "owned",
          },
          createdBy: "human",
        },
        { now: () => "2026-05-11T06:01:00.000Z" },
      ),
    ],
  });

  const event: CampaignClickTrackingEvent = {
    schemaVersion: CAMPAIGN_TRACKING_EVENT_SCHEMA_VERSION,
    type: "click",
    id: "event_click_untrusted_metadata",
    campaignId: campaign.id,
    sessionId: "session_contextual_validation",
    context: {
      actor: "human",
      userId: "user_contextual_validation",
      permissionMode: "basic",
    },
    occurredAt: "2026-05-11T06:05:00.000Z",
    content: {
      type: "landing_cta",
      id: "content_checkout_cta",
      nodeId: "node_landing",
      channelId: "unknown_channel",
      assetId: "unknown_asset",
      productId: "unknown_product",
      offerId: "unknown_offer",
    },
    utm: {
      source: "tiktok",
      medium: "dm",
      campaign: "creator-kit-launch",
      content: "checkout-cta",
      term: "creator-tools",
    },
    target: {
      type: "cta",
      id: "checkout_cta",
      metadata: {
        outputPortId: "outputs.click",
      },
    },
    click: {
      href: "https://shop.example.test/creator-kit",
      label: "Shop the kit",
      destination: "checkout",
    },
  };

  const response = await ingestCampaignTrackingEvent({
    request: new Request(
      "http://localhost/api/campaigns/campaign_api_contextual_event_validation/tracking/clicks",
      {
        method: "POST",
        body: JSON.stringify(event),
        headers: { "content-type": "application/json" },
      },
    ),
    params: {
      campaignId: campaign.id,
    },
    storage,
    now: () => "2026-05-11T06:05:01.000Z",
  });
  const body = await readJson(response);

  assert.equal(response.status, 400);
  assert.deepEqual(body, {
    schemaVersion: "owncanvas.campaign-tracking-events.v1",
    error: {
      code: "campaign_tracking_event.validation_failed",
      message: "Campaign tracking event is invalid.",
      errors: [
        {
          code: "tracking_event.content_channel_unknown",
          path: "content.channelId",
          message:
            "Tracking event content channel id must reference a campaign channel.",
        },
        {
          code: "tracking_event.content_asset_unknown",
          path: "content.assetId",
          message:
            "Tracking event content asset id must reference a campaign asset.",
        },
        {
          code: "tracking_event.content_product_mismatch",
          path: "content.productId",
          message:
            "Tracking event content product id must match the campaign product.",
        },
        {
          code: "tracking_event.content_offer_mismatch",
          path: "content.offerId",
          message:
            "Tracking event content offer id must match the campaign offer attribution id.",
        },
        {
          code: "tracking_event.utm_source_mismatch",
          path: "utm.source",
          message:
            "Tracking event UTM source must match campaign or channel tracking metadata.",
        },
      ],
    },
  });
  assert.deepEqual(
    getPersistedCampaignRecord(storage, campaign.id)?.tracking.eventLog,
    undefined,
  );
  assert.deepEqual(getPersistedCampaignAnalyticsEvents(storage), []);
});

test("tracking event ingestion rejects invalid payloads without mutating campaign tracking", async () => {
  const storage = new MemoryStorage();
  const campaign = createBlankCampaignRecord(storage, {
    id: "campaign_api_invalid_tracking_event",
    now: () => "2026-05-11T03:00:00.000Z",
  });

  const response = await ingestCampaignTrackingEvent({
    request: new Request(
      "http://localhost/api/campaigns/campaign_api_invalid_tracking_event/tracking/clicks",
      {
        method: "POST",
        body: JSON.stringify({
          schemaVersion: "old",
          type: "exposure",
          id: "",
          campaignId: "other_campaign",
          sessionId: "",
          occurredAt: "not-a-date",
          context: { actor: "agent" },
          target: {
            type: "",
            id: "",
            metadata: {
              url: "ftp://invalid.example.test/file",
            },
          },
        }),
        headers: { "content-type": "application/json" },
      },
    ),
    params: {
      campaignId: "campaign_api_invalid_tracking_event",
    },
    storage,
  });
  const body = await readJson(response);

  assert.equal(response.status, 400);
  assert.deepEqual(body, {
    schemaVersion: "owncanvas.campaign-tracking-events.v1",
    error: {
      code: "campaign_tracking_event.validation_failed",
      message: "Campaign tracking event is invalid.",
      errors: [
        {
          code: "tracking_event.schema_version_invalid",
          path: "schemaVersion",
          message: "Tracking events must use the current schema version.",
        },
        {
          code: "tracking_event.id_required",
          path: "id",
          message: "Tracking events require an id.",
        },
        {
          code: "tracking_event.session_id_required",
          path: "sessionId",
          message: "Tracking events require a session id.",
        },
        {
          code: "tracking_event.context_agent_id_required",
          path: "context.agentId",
          message: "Agent tracking event context requires an agent id.",
        },
        {
          code: "tracking_event.occurred_at_invalid",
          path: "occurredAt",
          message: "Tracking events require a valid occurredAt timestamp.",
        },
        {
          code: "tracking_event.content_required",
          path: "content",
          message: "Tracking events require content metadata.",
        },
        {
          code: "tracking_event.utm_required",
          path: "utm",
          message: "Tracking events require UTM metadata.",
        },
        {
          code: "tracking_event.target_type_required",
          path: "target.type",
          message: "Tracking event target type is required.",
        },
        {
          code: "tracking_event.target_id_required",
          path: "target.id",
          message: "Tracking event target id is required.",
        },
        {
          code: "tracking_event.target_url_invalid",
          path: "target.metadata.url",
          message: "Tracking event target URLs must use http or https.",
        },
        {
          code: "tracking_event.exposure_required",
          path: "exposure",
          message: "Exposure tracking events require exposure details.",
        },
        {
          code: "tracking_event.campaign_id_mismatch",
          path: "campaignId",
          message: "Tracking event campaign id must match the route campaign id.",
        },
        {
          code: "tracking_event.type_unsupported",
          path: "type",
          message: "This endpoint only accepts click tracking events.",
        },
      ],
    },
  });
  assert.deepEqual(
    getPersistedCampaignRecord(storage, "campaign_api_invalid_tracking_event")
      ?.tracking,
    campaign.tracking,
  );
});

function getTrackingEventEndpoint(event: CampaignTrackingEvent) {
  return event.type === "exposure"
    ? "exposures"
    : event.type === "conversion"
      ? "conversions"
      : event.type === "engagement"
        ? "engagement"
        : event.type === "revisit"
          ? "revisits"
          : "clicks";
}

async function ingestTrackingEvent(
  storage: MemoryStorage,
  event: CampaignTrackingEvent,
) {
  return ingestCampaignTrackingEvent({
    request: new Request(
      `http://localhost/api/campaigns/${event.campaignId}/tracking/${getTrackingEventEndpoint(
        event,
      )}`,
      {
        method: "POST",
        body: JSON.stringify(event),
        headers: { "content-type": "application/json" },
      },
    ),
    params: {
      campaignId: event.campaignId,
    },
    storage,
    now: () => event.occurredAt,
  });
}

class MemoryStorage implements Pick<Storage, "getItem" | "setItem"> {
  private readonly values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}
