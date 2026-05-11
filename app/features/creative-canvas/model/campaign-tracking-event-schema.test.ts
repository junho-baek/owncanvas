import assert from "node:assert/strict";
import { test } from "node:test";

import {
  CAMPAIGN_CLICK_EVENT_SCHEMA,
  CAMPAIGN_CONVERSION_EVENT_SCHEMA,
  CAMPAIGN_ENGAGEMENT_EVENT_SCHEMA,
  CAMPAIGN_EXPOSURE_EVENT_SCHEMA,
  CAMPAIGN_TRACKING_EVENT_SCHEMA_VERSION,
  validateCampaignClickTrackingEvent,
  validateCampaignConversionTrackingEvent,
  validateCampaignEngagementTrackingEvent,
  validateCampaignExposureTrackingEvent,
  validateCampaignTrackingEvent,
  type CampaignClickTrackingEvent,
  type CampaignConversionTrackingEvent,
  type CampaignEngagementTrackingEvent,
  type CampaignExposureTrackingEvent,
} from "./creative-canvas.ts";

test("exposure and click schemas require attribution fields", () => {
  const requiredFields = [
    "schemaVersion",
    "id",
    "campaignId",
    "sessionId",
    "context",
    "occurredAt",
    "content",
    "utm",
    "target",
  ];

  assert.equal(
    CAMPAIGN_EXPOSURE_EVENT_SCHEMA.eventSchemaVersion,
    CAMPAIGN_TRACKING_EVENT_SCHEMA_VERSION,
  );
  assert.equal(CAMPAIGN_EXPOSURE_EVENT_SCHEMA.eventType, "exposure");
  assert.deepEqual(CAMPAIGN_EXPOSURE_EVENT_SCHEMA.required, [
    ...requiredFields,
    "exposure",
  ]);

  assert.equal(
    CAMPAIGN_CLICK_EVENT_SCHEMA.eventSchemaVersion,
    CAMPAIGN_TRACKING_EVENT_SCHEMA_VERSION,
  );
  assert.equal(CAMPAIGN_CLICK_EVENT_SCHEMA.eventType, "click");
  assert.deepEqual(CAMPAIGN_CLICK_EVENT_SCHEMA.required, [
    ...requiredFields,
    "click",
  ]);

  assert.equal(
    CAMPAIGN_CONVERSION_EVENT_SCHEMA.eventSchemaVersion,
    CAMPAIGN_TRACKING_EVENT_SCHEMA_VERSION,
  );
  assert.equal(CAMPAIGN_CONVERSION_EVENT_SCHEMA.eventType, "conversion");
  assert.deepEqual(CAMPAIGN_CONVERSION_EVENT_SCHEMA.required, [
    ...requiredFields,
    "conversion",
  ]);

  assert.equal(
    CAMPAIGN_ENGAGEMENT_EVENT_SCHEMA.eventSchemaVersion,
    CAMPAIGN_TRACKING_EVENT_SCHEMA_VERSION,
  );
  assert.equal(CAMPAIGN_ENGAGEMENT_EVENT_SCHEMA.eventType, "engagement");
  assert.deepEqual(CAMPAIGN_ENGAGEMENT_EVENT_SCHEMA.required, [
    ...requiredFields,
    "engagement",
  ]);
});

test("exposure tracking events validate human context and target metadata", () => {
  const event: CampaignExposureTrackingEvent = {
    schemaVersion: CAMPAIGN_TRACKING_EVENT_SCHEMA_VERSION,
    type: "exposure",
    id: "event_exposure_landing_hero",
    campaignId: "campaign_content_commerce",
    sessionId: "session_01HZ6AGENT",
    context: {
      actor: "human",
      userId: "user_123",
      permissionMode: "basic",
    },
    occurredAt: "2026-05-11T01:00:00.000Z",
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

  const validation = validateCampaignExposureTrackingEvent(event);

  assert.equal(validation.valid, true);
  assert.deepEqual(validation.event, event);
});

test("click tracking events validate agent context and click destination", () => {
  const event: CampaignClickTrackingEvent = {
    schemaVersion: CAMPAIGN_TRACKING_EVENT_SCHEMA_VERSION,
    type: "click",
    id: "event_click_checkout_cta",
    campaignId: "campaign_content_commerce",
    sessionId: "session_01HZ6AGENT",
    context: {
      actor: "agent",
      agentId: "agent_optimizer_1",
      pluginId: "plugin.landing.optimizer",
      permissionMode: "advanced",
    },
    occurredAt: "2026-05-11T01:02:00.000Z",
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

  const validation = validateCampaignClickTrackingEvent(event);

  assert.equal(validation.valid, true);
  assert.deepEqual(validation.event, event);
});

test("conversion tracking events validate conversion metadata and user/session attribution", () => {
  const event: CampaignConversionTrackingEvent = {
    schemaVersion: CAMPAIGN_TRACKING_EVENT_SCHEMA_VERSION,
    type: "conversion",
    id: "event_conversion_purchase",
    campaignId: "campaign_content_commerce",
    sessionId: "session_01HZ6AGENT",
    context: {
      actor: "human",
      userId: "user_123",
      permissionMode: "basic",
    },
    occurredAt: "2026-05-11T01:04:00.000Z",
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
      id: "checkout_purchase",
      metadata: {
        nodeId: "node_landing",
        inputPortId: "inputs.purchase",
        channelId: "instagram_dm",
        productId: "product_creator_kit",
        offerId: "offer_launch_discount",
        url: "https://shop.example.test/checkout/success",
        label: "Creator kit purchase",
        metadata: {
          orderId: "order_123",
        },
      },
    },
    conversion: {
      eventName: "purchase",
      value: 12900,
      currency: "USD",
      orderId: "order_123",
      quantity: 1,
      metadata: {
        checkoutProvider: "stripe",
      },
    },
  };

  const validation = validateCampaignConversionTrackingEvent(event);

  assert.equal(validation.valid, true);
  assert.deepEqual(validation.event, event);
});

test("purchase conversion tracking events require campaign attribution identifiers", () => {
  const validation = validateCampaignConversionTrackingEvent({
    schemaVersion: CAMPAIGN_TRACKING_EVENT_SCHEMA_VERSION,
    type: "conversion",
    id: "event_conversion_purchase_missing_attribution",
    campaignId: "campaign_content_commerce",
    sessionId: "session_01HZ6AGENT",
    context: {
      actor: "human",
      userId: "user_123",
      permissionMode: "basic",
    },
    occurredAt: "2026-05-11T01:04:00.000Z",
    content: {
      type: "checkout",
      id: "content_checkout_purchase",
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
      id: "checkout_purchase",
      metadata: {},
    },
    conversion: {
      eventName: "purchase",
      value: 12900,
      currency: "USD",
      orderId: "order_123",
      quantity: 1,
    },
  });

  assert.equal(validation.valid, false);
  assert.deepEqual(
    validation.errors.map((error) => error.code),
    [
      "tracking_event.purchase_node_id_required",
      "tracking_event.purchase_input_port_id_required",
      "tracking_event.purchase_channel_id_required",
      "tracking_event.purchase_product_id_required",
      "tracking_event.purchase_offer_id_required",
    ],
  );
});

test("purchase conversion tracking events require order, user, session, and timestamp metadata", () => {
  const validation = validateCampaignConversionTrackingEvent({
    schemaVersion: CAMPAIGN_TRACKING_EVENT_SCHEMA_VERSION,
    type: "conversion",
    id: "event_conversion_purchase_missing_required_metadata",
    campaignId: "campaign_content_commerce",
    sessionId: "",
    context: {
      actor: "agent",
      agentId: "agent_checkout_webhook",
      permissionMode: "advanced",
    },
    occurredAt: "",
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
      id: "checkout_purchase",
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
    },
  });

  assert.equal(validation.valid, false);
  assert.deepEqual(
    validation.errors.map((error) => error.code),
    [
      "tracking_event.session_id_required",
      "tracking_event.occurred_at_invalid",
      "tracking_event.purchase_user_id_required",
      "tracking_event.purchase_order_id_required",
    ],
  );
});

test("engagement tracking events validate playback and scroll metadata", () => {
  const event: CampaignEngagementTrackingEvent = {
    schemaVersion: CAMPAIGN_TRACKING_EVENT_SCHEMA_VERSION,
    type: "engagement",
    id: "event_engagement_watch_depth",
    campaignId: "campaign_content_commerce",
    sessionId: "session_01HZ6AGENT",
    context: {
      actor: "human",
      userId: "user_123",
      permissionMode: "basic",
    },
    occurredAt: "2026-05-11T01:03:00.000Z",
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
        outputPortId: "outputs.engagement",
        channelId: "instagram_dm",
        assetId: "asset_short_video",
        productId: "product_creator_kit",
        offerId: "offer_launch_discount",
        url: "https://cdn.example.test/hero-short.mp4",
        label: "Hero short-form continuation",
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

  const validation = validateCampaignEngagementTrackingEvent(event);

  assert.equal(validation.valid, true);
  assert.deepEqual(validation.event, event);
});

test("tracking event validation rejects missing attribution-critical fields", () => {
  const validation = validateCampaignTrackingEvent({
    schemaVersion: "old",
    type: "conversion",
    id: "",
    campaignId: "",
    sessionId: "",
    context: {
      actor: "agent",
    },
    occurredAt: "not-a-date",
    content: {
      type: "",
      id: "",
    },
    utm: {
      source: "",
      medium: "",
      campaign: "",
    },
    target: {
      type: "",
      id: "",
      metadata: {
        url: "ftp://invalid.example.test/file",
      },
    },
    conversion: {
      eventName: "",
      value: -1,
      currency: "usd",
    },
  });

  assert.equal(validation.valid, false);
  assert.deepEqual(
    validation.errors.map((error) => error.code),
    [
      "tracking_event.schema_version_invalid",
      "tracking_event.id_required",
      "tracking_event.campaign_id_required",
      "tracking_event.session_id_required",
      "tracking_event.context_agent_id_required",
      "tracking_event.occurred_at_invalid",
      "tracking_event.content_type_required",
      "tracking_event.content_id_required",
      "tracking_event.utm_source_required",
      "tracking_event.utm_medium_required",
      "tracking_event.utm_campaign_required",
      "tracking_event.target_type_required",
      "tracking_event.target_id_required",
      "tracking_event.target_url_invalid",
      "tracking_event.conversion_event_name_required",
      "tracking_event.conversion_value_invalid",
      "tracking_event.conversion_currency_invalid",
    ],
  );
});
