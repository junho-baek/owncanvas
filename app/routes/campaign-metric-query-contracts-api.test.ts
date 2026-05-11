import assert from "node:assert/strict";
import { test } from "node:test";

import {
  CAMPAIGN_TRACKING_EVENT_SCHEMA_VERSION,
  createBlankCampaignRecord,
  saveCampaignTrackingEvent,
  type CampaignClickTrackingEvent,
  type CampaignConversionTrackingEvent,
  type CampaignExposureTrackingEvent,
  type CampaignRevisitTrackingEvent,
} from "../features/creative-canvas/model/creative-canvas.ts";
import {
  MemoryStorage,
  seedMetricQueryFixture,
} from "./campaign-metric-query.fixtures.ts";
import { loader as loadCampaignMetricQueries } from "./api.campaign-tracking-metrics.ts";

test("GET /api/campaigns/:campaignId/tracking/metrics reports metric query contracts and current metric counts", async () => {
  const storage = new MemoryStorage();
  const campaignId = "campaign_metric_query_contracts";

  createBlankCampaignRecord(storage, {
    id: campaignId,
    now: () => "2026-05-11T04:00:00.000Z",
  });

  const baseEvent = {
    schemaVersion: CAMPAIGN_TRACKING_EVENT_SCHEMA_VERSION,
    campaignId,
    sessionId: "session_metric_contract",
    context: {
      actor: "human" as const,
      userId: "user_metric_contract",
      permissionMode: "basic" as const,
    },
    occurredAt: "2026-05-11T04:05:00.000Z",
    content: {
      type: "landing_surface",
      id: "landing_metric_contract",
      nodeId: "node_landing",
      channelId: "instagram_dm",
      assetId: "asset_short",
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
      id: "module_metric_contract",
      metadata: {
        nodeId: "node_landing",
        outputPortId: "outputs.metric",
        channelId: "instagram_dm",
        pageId: "landing_page_metric_contract",
        assetId: "asset_short",
        productId: "product_creator_kit",
        offerId: "offer_launch_discount",
        url: "https://shop.example.test/creator-kit",
        label: "Creator kit landing",
      },
    },
  };

  const exposure: CampaignExposureTrackingEvent = {
    ...baseEvent,
    type: "exposure",
    id: "event_metric_exposure",
    exposure: {
      surface: "landing",
      placement: "hero",
      viewId: "view_hero_1",
    },
  };
  const click: CampaignClickTrackingEvent = {
    ...baseEvent,
    type: "click",
    id: "event_metric_click",
    click: {
      id: "click_checkout_1",
      href: "https://shop.example.test/checkout",
      label: "Buy now",
      destination: "checkout",
    },
  };
  const conversion: CampaignConversionTrackingEvent = {
    ...baseEvent,
    type: "conversion",
    id: "event_metric_conversion",
    conversion: {
      eventName: "purchase",
      value: 49,
      currency: "USD",
      orderId: "order_123",
      quantity: 1,
    },
  };
  const revisit: CampaignRevisitTrackingEvent = {
    ...baseEvent,
    type: "revisit",
    id: "event_metric_revisit",
    revisit: {
      firstSeenAt: "2026-05-11T04:00:00.000Z",
      lastSeenAt: "2026-05-11T04:03:00.000Z",
      matchedBy: [
        {
          type: "session",
          identifier: "session_metric_contract",
          firstSeenAt: "2026-05-11T04:00:00.000Z",
          lastSeenAt: "2026-05-11T04:03:00.000Z",
        },
      ],
    },
  };

  for (const event of [exposure, click, conversion, revisit]) {
    saveCampaignTrackingEvent(storage, campaignId, event, {
      now: () => "2026-05-11T04:06:00.000Z",
    });
  }

  const response = await loadCampaignMetricQueries({
    request: new Request(
      `http://localhost/api/campaigns/${campaignId}/tracking/metrics?metric=all&pageId=landing_page_metric_contract`,
    ),
    params: { campaignId },
    storage,
    now: () => "2026-05-11T04:10:00.000Z",
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body, {
    schemaVersion: "owncanvas.campaign-metric-query-report.v1",
    campaignId,
    generatedAt: "2026-05-11T04:10:00.000Z",
    query: {
      metric: "all",
      filters: {
        campaignId,
        pageId: "landing_page_metric_contract",
      },
    },
    contracts: [
      {
        schemaVersion: "owncanvas.campaign-metric-query-contract.v1",
        metric: "exposure",
        eventType: "exposure",
        endpoint: "/api/campaigns/:campaignId/tracking/exposures",
        method: "GET",
        requiredFilters: ["campaignId"],
        supportedFilters: [
          "campaignId",
          "sessionId",
          "pageId",
          "assetId",
          "channelId",
          "productId",
          "offerId",
          "from",
          "to",
        ],
        supportedGroupBy: [
          "sessionId",
          "pageId",
          "assetId",
          "channelId",
          "productId",
          "offerId",
          "source",
          "medium",
          "campaign",
          "surface",
          "placement",
        ],
        measures: ["count", "uniqueSessions"],
      },
      {
        schemaVersion: "owncanvas.campaign-metric-query-contract.v1",
        metric: "click",
        eventType: "click",
        endpoint: "/api/campaigns/:campaignId/tracking/clicks",
        method: "GET",
        requiredFilters: ["campaignId"],
        supportedFilters: [
          "campaignId",
          "sessionId",
          "clickId",
          "pageId",
          "assetId",
          "channelId",
          "productId",
          "offerId",
          "destination",
          "href",
          "from",
          "to",
        ],
        supportedGroupBy: [
          "sessionId",
          "clickId",
          "pageId",
          "assetId",
          "channelId",
          "productId",
          "offerId",
          "source",
          "medium",
          "campaign",
          "destination",
          "href",
        ],
        measures: ["count", "uniqueSessions"],
      },
      {
        schemaVersion: "owncanvas.campaign-metric-query-contract.v1",
        metric: "conversion",
        eventType: "conversion",
        endpoint: "/api/campaigns/:campaignId/tracking/conversions",
        method: "GET",
        requiredFilters: ["campaignId"],
        supportedFilters: [
          "campaignId",
          "sessionId",
          "pageId",
          "assetId",
          "channelId",
          "productId",
          "offerId",
          "conversionEventName",
          "orderId",
          "currency",
          "from",
          "to",
        ],
        supportedGroupBy: [
          "sessionId",
          "pageId",
          "assetId",
          "channelId",
          "productId",
          "offerId",
          "source",
          "medium",
          "campaign",
          "conversionEventName",
          "currency",
        ],
        measures: ["count", "uniqueSessions", "totalValue"],
      },
      {
        schemaVersion: "owncanvas.campaign-metric-query-contract.v1",
        metric: "revisit",
        eventType: "revisit",
        endpoint: "/api/campaigns/:campaignId/tracking/revisits",
        method: "GET",
        requiredFilters: ["campaignId"],
        supportedFilters: [
          "campaignId",
          "sessionId",
          "pageId",
          "assetId",
          "channelId",
          "productId",
          "offerId",
          "matchedBy",
          "from",
          "to",
        ],
        supportedGroupBy: [
          "sessionId",
          "pageId",
          "assetId",
          "channelId",
          "productId",
          "offerId",
          "source",
          "medium",
          "campaign",
          "matchedBy",
        ],
        measures: ["count", "uniqueSessions"],
      },
    ],
    rows: [
      {
        metric: "exposure",
        eventType: "exposure",
        count: 1,
        uniqueSessions: 1,
      },
      {
        metric: "click",
        eventType: "click",
        count: 1,
        uniqueSessions: 1,
      },
      {
        metric: "conversion",
        eventType: "conversion",
        count: 1,
        uniqueSessions: 1,
        totalValue: 49,
      },
      {
        metric: "revisit",
        eventType: "revisit",
        count: 1,
        uniqueSessions: 1,
      },
    ],
    conversionMetrics: {
      schemaVersion: "owncanvas.campaign-conversion-metrics.v1",
      campaignId,
      generatedAt: "2026-05-11T04:10:00.000Z",
      query: {
        filters: {
          campaignId,
          pageId: "landing_page_metric_contract",
        },
      },
      funnel: {
        exposures: 1,
        exposureSessions: 1,
        clicks: 1,
        clickSessions: 1,
        conversions: 1,
        conversionSessions: 1,
        purchaseConversions: 1,
        purchaseConversionSessions: 1,
      },
      rates: {
        clickThroughRate: 1,
        sessionClickThroughRate: 1,
        purchaseConversionRate: 1,
        sessionPurchaseConversionRate: 1,
      },
      reportableMetrics: [
        {
          key: "purchase_conversion_rate",
          label: "Purchase conversion rate",
          source: "rates.purchaseConversionRate",
          unit: "percent",
          numerator: "funnel.purchaseConversions",
          denominator: "funnel.clicks",
        },
        {
          key: "purchase_conversions",
          label: "Purchase conversions",
          source: "funnel.purchaseConversions",
          unit: "count",
        },
      ],
      successScore: {
        score: 100,
        primaryMetric: "purchase_conversion_rate",
        value: 1,
        unit: "percent",
        purchaseConversions: 1,
        purchaseConversionRate: 1,
        denominator: "clicks",
      },
      value: {
        totalValue: 49,
        averageOrderValue: 49,
        revenuePerClick: 49,
        revenuePerClickSession: 49,
        currencyBreakdown: {
          USD: 49,
        },
      },
    },
  });
});

test("GET /api/campaigns/:campaignId/tracking/metrics exposes conversion reporting metrics", async () => {
  const storage = new MemoryStorage();
  const campaignId = "campaign_metric_query_conversion_reporting";

  createBlankCampaignRecord(storage, {
    id: campaignId,
    now: () => "2026-05-11T05:00:00.000Z",
  });

  const baseEvent = {
    schemaVersion: CAMPAIGN_TRACKING_EVENT_SCHEMA_VERSION,
    campaignId,
    context: {
      actor: "human" as const,
      userId: "user_conversion_reporting",
      permissionMode: "basic" as const,
    },
    content: {
      type: "landing_surface",
      id: "landing_conversion_reporting",
      nodeId: "node_landing",
      channelId: "instagram_dm",
      assetId: "asset_conversion_short",
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
      id: "module_conversion_reporting",
      metadata: {
        nodeId: "node_landing",
        channelId: "instagram_dm",
        pageId: "landing_page_conversion_reporting",
        assetId: "asset_conversion_short",
        productId: "product_creator_kit",
        offerId: "offer_launch_discount",
      },
    },
  };

  const events: Array<
    | CampaignExposureTrackingEvent
    | CampaignClickTrackingEvent
    | CampaignConversionTrackingEvent
  > = [
    {
      ...baseEvent,
      type: "exposure",
      id: "event_conversion_reporting_exposure_1",
      sessionId: "session_conversion_reporting_1",
      occurredAt: "2026-05-11T05:01:00.000Z",
      exposure: {
        surface: "landing",
        placement: "hero",
        viewId: "view_conversion_reporting_1",
      },
    },
    {
      ...baseEvent,
      type: "exposure",
      id: "event_conversion_reporting_exposure_2",
      sessionId: "session_conversion_reporting_2",
      occurredAt: "2026-05-11T05:02:00.000Z",
      exposure: {
        surface: "landing",
        placement: "hero",
        viewId: "view_conversion_reporting_2",
      },
    },
    {
      ...baseEvent,
      type: "click",
      id: "event_conversion_reporting_click_1",
      sessionId: "session_conversion_reporting_1",
      occurredAt: "2026-05-11T05:03:00.000Z",
      click: {
        id: "click_conversion_reporting_1",
        href: "https://shop.example.test/checkout",
        label: "Buy now",
        destination: "checkout",
      },
    },
    {
      ...baseEvent,
      type: "click",
      id: "event_conversion_reporting_click_2",
      sessionId: "session_conversion_reporting_2",
      occurredAt: "2026-05-11T05:04:00.000Z",
      click: {
        id: "click_conversion_reporting_2",
        href: "https://shop.example.test/checkout",
        label: "Buy now",
        destination: "checkout",
      },
    },
    {
      ...baseEvent,
      type: "conversion",
      id: "event_conversion_reporting_purchase",
      sessionId: "session_conversion_reporting_1",
      occurredAt: "2026-05-11T05:05:00.000Z",
      target: {
        ...baseEvent.target,
        type: "checkout",
        id: "checkout_conversion_reporting_success",
        metadata: {
          ...baseEvent.target.metadata,
          inputPortId: "inputs.purchase",
        },
      },
      conversion: {
        eventName: "purchase",
        value: 120,
        currency: "USD",
        orderId: "order_conversion_reporting_purchase",
        quantity: 1,
      },
    },
    {
      ...baseEvent,
      type: "conversion",
      id: "event_conversion_reporting_trial",
      sessionId: "session_conversion_reporting_2",
      occurredAt: "2026-05-11T05:06:00.000Z",
      target: {
        ...baseEvent.target,
        type: "signup",
        id: "signup_conversion_reporting_success",
      },
      conversion: {
        eventName: "trial_start",
        value: 0,
        currency: "USD",
        orderId: "order_conversion_reporting_trial",
        quantity: 1,
      },
    },
  ];

  for (const event of events) {
    saveCampaignTrackingEvent(storage, campaignId, event, {
      now: () => event.occurredAt,
    });
  }

  const response = await loadCampaignMetricQueries({
    request: new Request(
      `http://localhost/api/campaigns/${campaignId}/tracking/metrics?metric=all&pageId=landing_page_conversion_reporting`,
    ),
    params: { campaignId },
    storage,
    now: () => "2026-05-11T05:10:00.000Z",
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body.conversionMetrics, {
    schemaVersion: "owncanvas.campaign-conversion-metrics.v1",
    campaignId,
    generatedAt: "2026-05-11T05:10:00.000Z",
    query: {
      filters: {
        campaignId,
        pageId: "landing_page_conversion_reporting",
      },
    },
    funnel: {
      exposures: 2,
      exposureSessions: 2,
      clicks: 2,
      clickSessions: 2,
      conversions: 2,
      conversionSessions: 2,
      purchaseConversions: 1,
      purchaseConversionSessions: 1,
    },
    rates: {
      clickThroughRate: 1,
      sessionClickThroughRate: 1,
      purchaseConversionRate: 0.5,
      sessionPurchaseConversionRate: 0.5,
    },
    reportableMetrics: [
      {
        key: "purchase_conversion_rate",
        label: "Purchase conversion rate",
        source: "rates.purchaseConversionRate",
        unit: "percent",
        numerator: "funnel.purchaseConversions",
        denominator: "funnel.clicks",
      },
      {
        key: "purchase_conversions",
        label: "Purchase conversions",
        source: "funnel.purchaseConversions",
        unit: "count",
      },
    ],
    successScore: {
      score: 50,
      primaryMetric: "purchase_conversion_rate",
      value: 0.5,
      unit: "percent",
      purchaseConversions: 1,
      purchaseConversionRate: 0.5,
      denominator: "clicks",
    },
    value: {
      totalValue: 120,
      averageOrderValue: 120,
      revenuePerClick: 60,
      revenuePerClickSession: 60,
      currencyBreakdown: {
        USD: 120,
      },
    },
  });
});

test("GET /api/campaigns/:campaignId/tracking/metrics scores campaign success from purchase conversion rate first", async () => {
  const storage = new MemoryStorage();
  const campaignId = "campaign_metric_query_success_score";

  createBlankCampaignRecord(storage, {
    id: campaignId,
    now: () => "2026-05-11T06:00:00.000Z",
  });

  const baseEvent = {
    schemaVersion: CAMPAIGN_TRACKING_EVENT_SCHEMA_VERSION,
    campaignId,
    context: {
      actor: "human" as const,
      userId: "user_success_score",
      permissionMode: "basic" as const,
    },
    occurredAt: "2026-05-11T06:05:00.000Z",
    content: {
      type: "landing_surface",
      id: "landing_success_score",
      nodeId: "node_landing",
      channelId: "instagram_dm",
      assetId: "asset_success_short",
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
      id: "module_success_score",
      metadata: {
        nodeId: "node_landing",
        channelId: "instagram_dm",
        pageId: "landing_page_success_score",
        assetId: "asset_success_short",
        productId: "product_creator_kit",
        offerId: "offer_launch_discount",
      },
    },
  };

  const events: Array<CampaignClickTrackingEvent | CampaignConversionTrackingEvent> =
    [
      {
        ...baseEvent,
        type: "click",
        id: "event_success_score_click_1",
        sessionId: "session_success_score_1",
        click: {
          id: "click_success_score_1",
          href: "https://shop.example.test/checkout",
          label: "Buy now",
          destination: "checkout",
        },
      },
      {
        ...baseEvent,
        type: "click",
        id: "event_success_score_click_2",
        sessionId: "session_success_score_2",
        click: {
          id: "click_success_score_2",
          href: "https://shop.example.test/checkout",
          label: "Buy now",
          destination: "checkout",
        },
      },
      {
        ...baseEvent,
        type: "conversion",
        id: "event_success_score_purchase",
        sessionId: "session_success_score_1",
        target: {
          ...baseEvent.target,
          type: "checkout",
          id: "checkout_success_score",
          metadata: {
            ...baseEvent.target.metadata,
            inputPortId: "inputs.purchase",
          },
        },
        conversion: {
          eventName: "purchase",
          value: 88,
          currency: "USD",
          orderId: "order_success_score_purchase",
          quantity: 1,
        },
      },
    ];

  for (const event of events) {
    saveCampaignTrackingEvent(storage, campaignId, event, {
      now: () => event.occurredAt,
    });
  }

  const response = await loadCampaignMetricQueries({
    request: new Request(
      `http://localhost/api/campaigns/${campaignId}/tracking/metrics?metric=all&pageId=landing_page_success_score`,
    ),
    params: { campaignId },
    storage,
    now: () => "2026-05-11T06:10:00.000Z",
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body.conversionMetrics.successScore, {
    score: 50,
    primaryMetric: "purchase_conversion_rate",
    value: 0.5,
    unit: "percent",
    purchaseConversions: 1,
    purchaseConversionRate: 0.5,
    denominator: "clicks",
  });
});

test("GET /api/campaigns/:campaignId/tracking/metrics falls back to purchase count for success score without clicks", async () => {
  const storage = new MemoryStorage();
  const campaignId = "campaign_metric_query_success_count";

  createBlankCampaignRecord(storage, {
    id: campaignId,
    now: () => "2026-05-11T06:30:00.000Z",
  });

  saveCampaignTrackingEvent(
    storage,
    campaignId,
    {
      schemaVersion: CAMPAIGN_TRACKING_EVENT_SCHEMA_VERSION,
      type: "conversion",
      id: "event_success_count_purchase",
      campaignId,
      sessionId: "session_success_count_1",
      context: {
        actor: "human",
        userId: "user_success_count",
        permissionMode: "basic",
      },
      occurredAt: "2026-05-11T06:35:00.000Z",
      content: {
        type: "landing_surface",
        id: "landing_success_count",
        nodeId: "node_landing",
        channelId: "instagram_dm",
        assetId: "asset_success_count_short",
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
        type: "checkout",
        id: "checkout_success_count",
        metadata: {
          nodeId: "node_landing",
          inputPortId: "inputs.purchase",
          channelId: "instagram_dm",
          pageId: "landing_page_success_count",
          assetId: "asset_success_count_short",
          productId: "product_creator_kit",
          offerId: "offer_launch_discount",
        },
      },
      conversion: {
        eventName: "purchase",
        value: 99,
        currency: "USD",
        orderId: "order_success_count_purchase",
        quantity: 1,
      },
    },
    {
      now: () => "2026-05-11T06:35:00.000Z",
    },
  );

  const response = await loadCampaignMetricQueries({
    request: new Request(
      `http://localhost/api/campaigns/${campaignId}/tracking/metrics?metric=all&pageId=landing_page_success_count`,
    ),
    params: { campaignId },
    storage,
    now: () => "2026-05-11T06:40:00.000Z",
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body.conversionMetrics.successScore, {
    score: 1,
    primaryMetric: "purchase_conversion_count",
    value: 1,
    unit: "count",
    purchaseConversions: 1,
    purchaseConversionRate: 0,
    denominator: "none",
  });
});

test("GET /api/campaigns/:campaignId/tracking/metrics provides grouped revisit reporting output", async () => {
  const storage = new MemoryStorage();
  const campaignId = "campaign_metric_query_revisit_reporting";

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
      userId: "user_revisit_query",
      permissionMode: "basic" as const,
    },
    occurredAt: "2026-05-11T04:05:00.000Z",
    content: {
      type: "landing_surface",
      id: "landing_revisit_query",
      nodeId: "node_landing",
      channelId: "instagram_dm",
      assetId: "asset_revisit_short",
      productId: "product_creator_kit",
      offerId: "offer_launch_discount",
    },
    utm: {
      source: "instagram",
      medium: "dm",
      campaign: "creator-kit-launch",
      content: "returning-visitor",
      term: "creator-tools",
    },
    target: {
      type: "landing.revisit",
      id: "landing_revisit_detector",
      metadata: {
        nodeId: "node_landing",
        outputPortId: "outputs.revisit",
        channelId: "instagram_dm",
        pageId: "landing_page_revisit_query",
        assetId: "asset_revisit_short",
        productId: "product_creator_kit",
        offerId: "offer_launch_discount",
      },
    },
  };

  const events: CampaignRevisitTrackingEvent[] = [
    {
      ...baseEvent,
      id: "event_revisit_query_session_1",
      sessionId: "session_revisit_query_1",
      revisit: {
        firstSeenAt: "2026-05-11T04:00:00.000Z",
        lastSeenAt: "2026-05-11T04:03:00.000Z",
        matchedBy: [
          {
            type: "session",
            identifier: "session_revisit_query_1",
            firstSeenAt: "2026-05-11T04:00:00.000Z",
            lastSeenAt: "2026-05-11T04:03:00.000Z",
          },
        ],
      },
    },
    {
      ...baseEvent,
      id: "event_revisit_query_user_1",
      sessionId: "session_revisit_query_2",
      revisit: {
        firstSeenAt: "2026-05-11T04:01:00.000Z",
        lastSeenAt: "2026-05-11T04:04:00.000Z",
        matchedBy: [
          {
            type: "user",
            identifier: "user_revisit_query",
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

  const response = await loadCampaignMetricQueries({
    request: new Request(
      `http://localhost/api/campaigns/${campaignId}/tracking/metrics?metric=revisit&pageId=landing_page_revisit_query&groupBy=matchedBy`,
    ),
    params: { campaignId },
    storage,
    now: () => "2026-05-11T04:10:00.000Z",
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body.report, {
    schemaVersion: "owncanvas.campaign-metric-report.v1",
    campaignId,
    generatedAt: "2026-05-11T04:10:00.000Z",
    metric: "revisit",
    query: {
      filters: {
        campaignId,
        pageId: "landing_page_revisit_query",
      },
      groupBy: ["matchedBy"],
    },
    summary: {
      count: 2,
      uniqueSessions: 2,
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
      {
        key: "user",
        group: {
          matchedBy: "user",
        },
        count: 1,
        uniqueSessions: 1,
      },
    ],
  });
});

test("GET /api/campaigns/:campaignId/tracking/metrics filters mixed metrics by attribution and time range", async () => {
  const { storage, campaignId } = seedMetricQueryFixture();

  const response = await loadCampaignMetricQueries({
    request: new Request(
      `http://localhost/api/campaigns/${campaignId}/tracking/metrics?metric=all&channelId=instagram_dm&productId=product_creator_kit&offerId=offer_launch_discount&from=2026-05-11T04:08:00.000Z&to=2026-05-11T04:18:00.000Z`,
    ),
    params: { campaignId },
    storage,
    now: () => "2026-05-11T04:40:00.000Z",
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body.query, {
    metric: "all",
    filters: {
      campaignId,
      channelId: "instagram_dm",
      productId: "product_creator_kit",
      offerId: "offer_launch_discount",
      from: "2026-05-11T04:08:00.000Z",
      to: "2026-05-11T04:18:00.000Z",
    },
  });
  assert.deepEqual(body.rows, [
    {
      metric: "exposure",
      eventType: "exposure",
      count: 0,
      uniqueSessions: 0,
    },
    {
      metric: "click",
      eventType: "click",
      count: 2,
      uniqueSessions: 2,
    },
    {
      metric: "conversion",
      eventType: "conversion",
      count: 1,
      uniqueSessions: 1,
      totalValue: 99,
    },
    {
      metric: "revisit",
      eventType: "revisit",
      count: 2,
      uniqueSessions: 2,
    },
  ]);
});

test("GET /api/campaigns/:campaignId/tracking/metrics aggregates conversion filters without leaking other campaigns", async () => {
  const { storage, campaignId } = seedMetricQueryFixture();

  const response = await loadCampaignMetricQueries({
    request: new Request(
      `http://localhost/api/campaigns/${campaignId}/tracking/metrics?metric=conversion&conversionEventName=purchase&currency=USD`,
    ),
    params: { campaignId },
    storage,
    now: () => "2026-05-11T04:41:00.000Z",
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.campaignId, campaignId);
  assert.equal(body.generatedAt, "2026-05-11T04:41:00.000Z");
  assert.deepEqual(body.query, {
    metric: "conversion",
    filters: {
      campaignId,
      conversionEventName: "purchase",
      currency: "USD",
    },
  });
  assert.deepEqual(body.rows, [
    {
      metric: "conversion",
      eventType: "conversion",
      count: 2,
      uniqueSessions: 2,
      totalValue: 248,
    },
  ]);
});

test("GET /api/campaigns/:campaignId/tracking/metrics supports precise click and revisit edge filters", async () => {
  const { storage, campaignId } = seedMetricQueryFixture();

  const clickResponse = await loadCampaignMetricQueries({
    request: new Request(
      `http://localhost/api/campaigns/${campaignId}/tracking/metrics?metric=click&clickId=click_details_gamma&destination=details&href=https%3A%2F%2Fshop.example.test%2Fcreator-kit%2Fdetails`,
    ),
    params: { campaignId },
    storage,
    now: () => "2026-05-11T04:42:00.000Z",
  });
  const clickBody = await clickResponse.json();

  assert.equal(clickResponse.status, 200);
  assert.deepEqual(clickBody.rows, [
    {
      metric: "click",
      eventType: "click",
      count: 1,
      uniqueSessions: 1,
    },
  ]);

  const revisitResponse = await loadCampaignMetricQueries({
    request: new Request(
      `http://localhost/api/campaigns/${campaignId}/tracking/metrics?metric=revisit&matchedBy=session`,
    ),
    params: { campaignId },
    storage,
    now: () => "2026-05-11T04:43:00.000Z",
  });
  const revisitBody = await revisitResponse.json();

  assert.equal(revisitResponse.status, 200);
  assert.deepEqual(revisitBody.rows, [
    {
      metric: "revisit",
      eventType: "revisit",
      count: 1,
      uniqueSessions: 1,
    },
  ]);
});

test("GET /api/campaigns/:campaignId/tracking/metrics returns zero aggregates for no-match filters", async () => {
  const { storage, campaignId } = seedMetricQueryFixture();

  const response = await loadCampaignMetricQueries({
    request: new Request(
      `http://localhost/api/campaigns/${campaignId}/tracking/metrics?metric=conversion&orderId=missing_order`,
    ),
    params: { campaignId },
    storage,
    now: () => "2026-05-11T04:44:00.000Z",
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body.rows, [
    {
      metric: "conversion",
      eventType: "conversion",
      count: 0,
      uniqueSessions: 0,
      totalValue: 0,
    },
  ]);
});

test("GET /api/campaigns/:campaignId/tracking/metrics rejects unsupported metrics", async () => {
  const { storage, campaignId } = seedMetricQueryFixture();

  const response = await loadCampaignMetricQueries({
    request: new Request(
      `http://localhost/api/campaigns/${campaignId}/tracking/metrics?metric=engagement`,
    ),
    params: { campaignId },
    storage,
    now: () => "2026-05-11T04:45:00.000Z",
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.deepEqual(body, {
    schemaVersion: "owncanvas.campaign-metric-query-report.v1",
    error: {
      code: "metric_query.metric_unsupported",
      message:
        "Campaign metric query metric must be one of all, exposure, click, conversion, or revisit.",
    },
  });
});
