import assert from "node:assert/strict";
import { test } from "node:test";

import {
  CAMPAIGN_TRACKING_EVENT_SCHEMA_VERSION,
  createBlankCampaignRecord,
  identifyReturningCampaignAttribution,
  getPersistedCampaignRecord,
  parseInboundCampaignSessionUrl,
  saveCampaignTrackingEvent,
  trackInboundCampaignSession,
  validateInboundCampaignSession,
  type CampaignClickTrackingEvent,
} from "./creative-canvas.ts";

test("parseInboundCampaignSessionUrl extracts and validates UTM attribution from inbound session URLs", () => {
  const result = parseInboundCampaignSessionUrl(
    " https://shop.example.test/drop?utm_source=Instagram&utm_medium=DM&utm_campaign=creator-kit-launch&utm_content=comment-trigger&utm_term=send%20me%20the%20link&oc_campaign_id=campaign.creator-kit&oc_session_id=session.123&oc_channel_id=channel.instagram-dm&oc_touchpoint_id=touch.dm.1&click_id=ig-click-123&affiliate_id=impact-456 ",
  );

  assert.equal(result.ok, true);
  assert.deepEqual(result.session, {
    url: "https://shop.example.test/drop?utm_source=Instagram&utm_medium=DM&utm_campaign=creator-kit-launch&utm_content=comment-trigger&utm_term=send%20me%20the%20link&oc_campaign_id=campaign.creator-kit&oc_session_id=session.123&oc_channel_id=channel.instagram-dm&oc_touchpoint_id=touch.dm.1&click_id=ig-click-123&affiliate_id=impact-456",
    campaignId: "campaign.creator-kit",
    sessionId: "session.123",
    channelId: "channel.instagram-dm",
    touchpointId: "touch.dm.1",
    utm: {
      source: "instagram",
      medium: "dm",
      campaign: "creator-kit-launch",
      content: "comment-trigger",
      term: "send me the link",
    },
    attributionParameters: [
      { key: "click_id", value: "ig-click-123", source: "url" },
      { key: "affiliate_id", value: "impact-456", source: "url" },
    ],
  });
  assert.deepEqual(result.errors, []);
});

test("parseInboundCampaignSessionUrl treats visitor identity as campaign history metadata", () => {
  const result = parseInboundCampaignSessionUrl(
    "https://shop.example.test/drop?utm_source=instagram&utm_medium=dm&utm_campaign=creator-kit-launch&oc_campaign_id=campaign.creator-kit&oc_session_id=session.identity&oc_user_id=user.identity&user_id=ignored-user&coupon=LAUNCH20",
  );

  assert.equal(result.ok, true);
  assert.deepEqual(result.session, {
    url: "https://shop.example.test/drop?utm_source=instagram&utm_medium=dm&utm_campaign=creator-kit-launch&oc_campaign_id=campaign.creator-kit&oc_session_id=session.identity&oc_user_id=user.identity&user_id=ignored-user&coupon=LAUNCH20",
    campaignId: "campaign.creator-kit",
    sessionId: "session.identity",
    userId: "user.identity",
    utm: {
      source: "instagram",
      medium: "dm",
      campaign: "creator-kit-launch",
      content: "",
      term: "",
    },
    attributionParameters: [
      { key: "coupon", value: "LAUNCH20", source: "url" },
    ],
  });
});

test("parseInboundCampaignSessionUrl reports unsafe or incomplete inbound attribution without throwing", () => {
  const result = parseInboundCampaignSessionUrl(
    "javascript:alert(1)?utm_source=instagram&utm_medium=&utm_campaign=",
  );

  assert.equal(result.ok, false);
  assert.deepEqual(
    result.errors.map((error) => error.code),
    [
      "inbound-session.url_invalid",
      "inbound-session.utm_medium_required",
      "inbound-session.utm_campaign_required",
    ],
  );
});

test("validateInboundCampaignSession enforces campaign consistency when expected campaign id is provided", () => {
  const result = parseInboundCampaignSessionUrl(
    "https://shop.example.test/drop?utm_source=instagram&utm_medium=dm&utm_campaign=campaign.other&oc_campaign_id=campaign.other",
    { campaignId: "campaign.creator-kit" },
  );

  assert.equal(result.ok, false);
  assert.deepEqual(validateInboundCampaignSession(result.session).errors, []);
  assert.deepEqual(result.errors, [
    {
      code: "inbound-session.campaign_mismatch",
      path: "campaignId",
      message:
        "Inbound campaign session URL campaign id must match the expected campaign.",
    },
  ]);
});

test("trackInboundCampaignSession associates captured UTM parameters with the tracked campaign session record", () => {
  const storage = new MemoryStorage();

  createBlankCampaignRecord(storage, {
    id: "campaign.creator-kit",
    now: () => "2026-05-11T00:00:00.000Z",
  });

  const savedCampaign = trackInboundCampaignSession(
    storage,
    "campaign.creator-kit",
    "https://shop.example.test/drop?utm_source=Instagram&utm_medium=DM&utm_campaign=creator-kit-launch&utm_content=comment-trigger&utm_term=send%20me%20the%20link&oc_campaign_id=campaign.creator-kit&oc_session_id=session.123&oc_channel_id=channel.instagram-dm&oc_touchpoint_id=touch.dm.1&click_id=ig-click-123",
    {
      now: () => "2026-05-11T00:05:00.000Z",
    },
  );
  const trackedSession = savedCampaign.tracking.sessions?.[0];

  assert.deepEqual(trackedSession, {
    id: "session.123",
    campaignId: "campaign.creator-kit",
    url: "https://shop.example.test/drop?utm_source=Instagram&utm_medium=DM&utm_campaign=creator-kit-launch&utm_content=comment-trigger&utm_term=send%20me%20the%20link&oc_campaign_id=campaign.creator-kit&oc_session_id=session.123&oc_channel_id=channel.instagram-dm&oc_touchpoint_id=touch.dm.1&click_id=ig-click-123",
    channelId: "channel.instagram-dm",
    touchpointId: "touch.dm.1",
    firstSeenAt: "2026-05-11T00:05:00.000Z",
    lastSeenAt: "2026-05-11T00:05:00.000Z",
    utm: {
      source: "instagram",
      medium: "dm",
      campaign: "creator-kit-launch",
      content: "comment-trigger",
      term: "send me the link",
    },
    attributionParameters: [
      { key: "click_id", value: "ig-click-123", source: "url" },
    ],
  });
  assert.deepEqual(
    getPersistedCampaignRecord(storage, "campaign.creator-kit")?.tracking
      .sessions,
    [trackedSession],
  );
});

test("trackInboundCampaignSession refreshes persisted UTM attribution for returning campaign sessions", () => {
  const storage = new MemoryStorage();

  createBlankCampaignRecord(storage, {
    id: "campaign.returning-session",
    now: () => "2026-05-11T00:00:00.000Z",
  });

  trackInboundCampaignSession(
    storage,
    "campaign.returning-session",
    "https://shop.example.test/drop?utm_source=instagram&utm_medium=dm&utm_campaign=launch-a&utm_content=comment-a&utm_term=creator-tools&oc_campaign_id=campaign.returning-session&oc_session_id=session.returning&oc_channel_id=channel.instagram-dm&click_id=click-a",
    {
      now: () => "2026-05-11T00:05:00.000Z",
    },
  );

  trackInboundCampaignSession(
    storage,
    "campaign.returning-session",
    "https://shop.example.test/drop?utm_source=tiktok&utm_medium=social&utm_campaign=launch-b&utm_content=short-b&utm_term=content-commerce&oc_campaign_id=campaign.returning-session&oc_session_id=session.returning&oc_touchpoint_id=touch.landing.2&click_id=click-b",
    {
      now: () => "2026-05-11T00:20:00.000Z",
    },
  );

  assert.deepEqual(
    getPersistedCampaignRecord(storage, "campaign.returning-session")?.tracking
      .sessions,
    [
      {
        id: "session.returning",
        campaignId: "campaign.returning-session",
        url: "https://shop.example.test/drop?utm_source=tiktok&utm_medium=social&utm_campaign=launch-b&utm_content=short-b&utm_term=content-commerce&oc_campaign_id=campaign.returning-session&oc_session_id=session.returning&oc_touchpoint_id=touch.landing.2&click_id=click-b",
        touchpointId: "touch.landing.2",
        firstSeenAt: "2026-05-11T00:05:00.000Z",
        lastSeenAt: "2026-05-11T00:20:00.000Z",
        utm: {
          source: "tiktok",
          medium: "social",
          campaign: "launch-b",
          content: "short-b",
          term: "content-commerce",
        },
        attributionParameters: [
          { key: "click_id", value: "click-b", source: "url" },
        ],
      },
    ],
  );
});

test("identifyReturningCampaignAttribution finds returning sessions and attribution identifiers", () => {
  const storage = new MemoryStorage();

  createBlankCampaignRecord(storage, {
    id: "campaign.returning-attribution",
    now: () => "2026-05-11T00:00:00.000Z",
  });

  trackInboundCampaignSession(
    storage,
    "campaign.returning-attribution",
    "https://shop.example.test/drop?utm_source=instagram&utm_medium=dm&utm_campaign=launch-a&oc_campaign_id=campaign.returning-attribution&oc_session_id=session.returning&click_id=click-returning",
    {
      now: () => "2026-05-11T00:05:00.000Z",
    },
  );

  assert.deepEqual(
    identifyReturningCampaignAttribution(storage, "campaign.returning-attribution", {
      sessionId: "session.returning",
      attributionParameters: [
        { key: "click_id", value: "click-returning", source: "url" },
      ],
    }),
    {
      campaignId: "campaign.returning-attribution",
      returning: true,
      matches: [
        {
          type: "session",
          identifier: "session.returning",
          firstSeenAt: "2026-05-11T00:05:00.000Z",
          lastSeenAt: "2026-05-11T00:05:00.000Z",
        },
        {
          type: "attribution_parameter",
          key: "click_id",
          identifier: "click-returning",
          firstSeenAt: "2026-05-11T00:05:00.000Z",
          lastSeenAt: "2026-05-11T00:05:00.000Z",
        },
      ],
    },
  );
});

test("identifyReturningCampaignAttribution finds returning users from existing tracking events", () => {
  const storage = new MemoryStorage();

  createBlankCampaignRecord(storage, {
    id: "campaign.returning-user",
    now: () => "2026-05-11T00:00:00.000Z",
  });

  const clickEvent: CampaignClickTrackingEvent = {
    schemaVersion: CAMPAIGN_TRACKING_EVENT_SCHEMA_VERSION,
    type: "click",
    id: "event_click_returning_user",
    campaignId: "campaign.returning-user",
    sessionId: "session.first-touch",
    context: {
      actor: "human",
      userId: "user.returning",
      permissionMode: "basic",
    },
    occurredAt: "2026-05-11T00:10:00.000Z",
    content: {
      type: "landing_cta",
      id: "content_offer",
      productId: "product_creator_kit",
      offerId: "offer_launch",
    },
    utm: {
      source: "instagram",
      medium: "dm",
      campaign: "creator-kit-launch",
      content: "offer",
      term: "creator-tools",
    },
    target: {
      type: "cta",
      id: "offer_cta",
      metadata: {
        productId: "product_creator_kit",
        offerId: "offer_launch",
      },
    },
    click: {
      id: "click_returning_user",
      href: "https://shop.example.test/creator-kit",
      destination: "landing",
    },
  };

  saveCampaignTrackingEvent(
    storage,
    "campaign.returning-user",
    clickEvent,
    {
      now: () => "2026-05-11T00:11:00.000Z",
    },
  );

  assert.deepEqual(
    identifyReturningCampaignAttribution(storage, "campaign.returning-user", {
      userId: "user.returning",
      clickId: "click_returning_user",
    }),
    {
      campaignId: "campaign.returning-user",
      returning: true,
      matches: [
        {
          type: "user",
          identifier: "user.returning",
          firstSeenAt: "2026-05-11T00:10:00.000Z",
          lastSeenAt: "2026-05-11T00:10:00.000Z",
        },
        {
          type: "click",
          identifier: "click_returning_user",
          firstSeenAt: "2026-05-11T00:10:00.000Z",
          lastSeenAt: "2026-05-11T00:10:00.000Z",
        },
      ],
    },
  );
});

class MemoryStorage implements Pick<Storage, "getItem" | "setItem"> {
  private readonly values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}
