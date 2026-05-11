import assert from "node:assert/strict";
import { test } from "node:test";

import {
  captureCampaignSurfaceTrackedClick,
  createCampaignSurfaceConversionInput,
  createCampaignSurfacePlaybackEngagementInput,
  createCampaignSurfacePlaybackControlEngagementInput,
  createCampaignSurfaceScrollEngagementInput,
  createCampaignSurfaceCtaClickInput,
  createCampaignSurfaceModuleExposureInput,
  createCampaignSurfaceTrackingClient,
  getOrCreateCampaignSurfaceSession,
} from "./campaign-surface-tracking.ts";
import {
  CAMPAIGN_TRACKING_EVENT_SCHEMA_VERSION,
  createBlankCampaignRecord,
  getPersistedCampaignRecord,
  saveCampaignTrackingEvent,
  type CampaignClickTrackingEvent,
  type CampaignDraft,
} from "../model/creative-canvas.ts";

test("campaign surface tracking creates a reusable session from landing attribution params", () => {
  const sessionStorage = new MemoryStorage();
  const campaign = createTestCampaign();

  const session = getOrCreateCampaignSurfaceSession({
    campaign,
    sessionStorage,
    url:
      "https://go.example.test/campaigns/campaign_surface_tracking/landing" +
      "?oc_session_id=session_landing_1" +
      "&oc_channel_id=instagram_dm" +
      "&oc_touchpoint_id=comment_to_dm" +
      "&utm_source=instagram" +
      "&utm_medium=dm" +
      "&utm_campaign=creator-kit-launch" +
      "&utm_content=hero-short" +
      "&utm_term=creator-tools" +
      "&coupon=LAUNCH20",
    now: () => "2026-05-11T04:00:00.000Z",
  });

  assert.deepEqual(session, {
    id: "session_landing_1",
    campaignId: "campaign_surface_tracking",
    url:
      "https://go.example.test/campaigns/campaign_surface_tracking/landing" +
      "?oc_session_id=session_landing_1" +
      "&oc_channel_id=instagram_dm" +
      "&oc_touchpoint_id=comment_to_dm" +
      "&utm_source=instagram" +
      "&utm_medium=dm" +
      "&utm_campaign=creator-kit-launch" +
      "&utm_content=hero-short" +
      "&utm_term=creator-tools" +
      "&coupon=LAUNCH20",
    channelId: "instagram_dm",
    touchpointId: "comment_to_dm",
    firstSeenAt: "2026-05-11T04:00:00.000Z",
    lastSeenAt: "2026-05-11T04:00:00.000Z",
    utm: {
      source: "instagram",
      medium: "dm",
      campaign: "creator-kit-launch",
      content: "hero-short",
      term: "creator-tools",
    },
    attributionParameters: [
      {
        key: "coupon",
        value: "LAUNCH20",
        source: "url",
      },
    ],
  });
});

test("campaign surface tracking records first-time visit history without emitting a revisit", () => {
  const campaignStorage = new MemoryStorage();
  const sessionStorage = new MemoryStorage();
  const campaign = createTestCampaign(campaignStorage);

  const client = createCampaignSurfaceTrackingClient({
    campaign,
    campaignStorage,
    sessionStorage,
    url:
      "https://go.example.test/campaigns/campaign_surface_tracking/landing" +
      "?oc_session_id=session_first_visit_1" +
      "&oc_user_id=user_first_visit_1" +
      "&oc_channel_id=instagram_dm" +
      "&oc_touchpoint_id=comment_to_dm" +
      "&utm_source=instagram" +
      "&utm_medium=dm" +
      "&utm_campaign=creator-kit-launch" +
      "&utm_content=hero-short" +
      "&coupon=LAUNCH20",
    now: () => "2026-05-11T04:10:00.000Z",
    createId: () => "first_visit",
  });

  assert.equal(client.session.userId, "user_first_visit_1");
  assert.equal(client.emitRevisit(), null);
  assert.deepEqual(
    getPersistedCampaignRecord(campaignStorage, "campaign_surface_tracking")
      ?.tracking.eventLog ?? [],
    [],
  );
  assert.deepEqual(
    getPersistedCampaignRecord(campaignStorage, "campaign_surface_tracking")
      ?.tracking.sessions,
    [
      {
        id: "session_first_visit_1",
        campaignId: "campaign_surface_tracking",
        userId: "user_first_visit_1",
        url:
          "https://go.example.test/campaigns/campaign_surface_tracking/landing" +
          "?oc_session_id=session_first_visit_1" +
          "&oc_user_id=user_first_visit_1" +
          "&oc_channel_id=instagram_dm" +
          "&oc_touchpoint_id=comment_to_dm" +
          "&utm_source=instagram" +
          "&utm_medium=dm" +
          "&utm_campaign=creator-kit-launch" +
          "&utm_content=hero-short" +
          "&coupon=LAUNCH20",
        channelId: "instagram_dm",
        touchpointId: "comment_to_dm",
        firstSeenAt: "2026-05-11T04:10:00.000Z",
        lastSeenAt: "2026-05-11T04:10:00.000Z",
        utm: {
          source: "instagram",
          medium: "dm",
          campaign: "creator-kit-launch",
          content: "hero-short",
          term: "",
        },
        attributionParameters: [
          { key: "coupon", value: "LAUNCH20", source: "url" },
        ],
      },
    ],
  );
});

test("campaign surface tracking persists attribution identifiers across browser sessions and checkout clicks", async () => {
  const campaignStorage = new MemoryStorage();
  const firstBrowserSessionStorage = new MemoryStorage();
  const secondBrowserSessionStorage = new MemoryStorage();
  const campaign = createTestCampaign(campaignStorage);

  createCampaignSurfaceTrackingClient({
    campaign,
    campaignStorage,
    sessionStorage: firstBrowserSessionStorage,
    url:
      "https://go.example.test/campaigns/campaign_surface_tracking/landing" +
      "?oc_session_id=session_persisted_checkout" +
      "&oc_user_id=user_persisted_checkout" +
      "&oc_channel_id=instagram_dm" +
      "&oc_touchpoint_id=comment_to_dm" +
      "&utm_source=instagram" +
      "&utm_medium=dm" +
      "&utm_campaign=creator-kit-launch" +
      "&utm_content=hero-short" +
      "&utm_term=creator-tools" +
      "&coupon=LAUNCH20",
    now: () => "2026-05-11T04:15:00.000Z",
    createId: () => "first_persisted",
  });

  let idCounter = 0;
  const returningClient = createCampaignSurfaceTrackingClient({
    campaign,
    campaignStorage,
    sessionStorage: secondBrowserSessionStorage,
    url: "https://go.example.test/campaigns/campaign_surface_tracking/landing",
    now: () => "2026-05-11T04:45:00.000Z",
    createId: () => `persisted_${++idCounter}`,
  });

  const click = await returningClient.emitClick(
    createCampaignSurfaceCtaClickInput({
      campaign,
      ctaId: "sticky_checkout_cta",
      ctaLabel: "Buy creator kit",
      href: "/checkout?sku=creator-kit",
      destination: "checkout",
    }),
  );
  const checkoutUrl = new URL(click?.click.href ?? "");

  assert.equal(returningClient.session.id, "session_persisted_checkout");
  assert.equal(returningClient.session.userId, "user_persisted_checkout");
  assert.equal(returningClient.session.firstSeenAt, "2026-05-11T04:15:00.000Z");
  assert.equal(returningClient.session.lastSeenAt, "2026-05-11T04:45:00.000Z");
  assert.equal(returningClient.session.channelId, "instagram_dm");
  assert.equal(returningClient.session.touchpointId, "comment_to_dm");
  assert.equal(returningClient.session.utm.content, "hero-short");
  assert.deepEqual(returningClient.session.attributionParameters, [
    { key: "coupon", value: "LAUNCH20", source: "url" },
  ]);
  assert.equal(checkoutUrl.origin, "https://go.example.test");
  assert.equal(checkoutUrl.pathname, "/checkout");
  assert.equal(checkoutUrl.searchParams.get("sku"), "creator-kit");
  assert.equal(checkoutUrl.searchParams.get("oc_campaign_id"), "campaign_surface_tracking");
  assert.equal(checkoutUrl.searchParams.get("oc_session_id"), "session_persisted_checkout");
  assert.equal(checkoutUrl.searchParams.get("oc_user_id"), "user_persisted_checkout");
  assert.equal(checkoutUrl.searchParams.get("oc_channel_id"), "instagram_dm");
  assert.equal(checkoutUrl.searchParams.get("oc_touchpoint_id"), "comment_to_dm");
  assert.equal(checkoutUrl.searchParams.get("utm_source"), "instagram");
  assert.equal(checkoutUrl.searchParams.get("utm_medium"), "dm");
  assert.equal(checkoutUrl.searchParams.get("utm_campaign"), "creator-kit-launch");
  assert.equal(checkoutUrl.searchParams.get("utm_content"), "hero-short");
  assert.equal(checkoutUrl.searchParams.get("utm_term"), "creator-tools");
  assert.equal(checkoutUrl.searchParams.get("coupon"), "LAUNCH20");
  assert.equal(click?.target.metadata.url, checkoutUrl.toString());
  assert.deepEqual(
    getPersistedCampaignRecord(campaignStorage, "campaign_surface_tracking")
      ?.tracking.sessions?.map((session) => ({
        id: session.id,
        userId: session.userId,
        firstSeenAt: session.firstSeenAt,
        lastSeenAt: session.lastSeenAt,
      })),
    [
      {
        id: "session_persisted_checkout",
        userId: "user_persisted_checkout",
        firstSeenAt: "2026-05-11T04:15:00.000Z",
        lastSeenAt: "2026-05-11T04:45:00.000Z",
      },
    ],
  );
});

test("campaign surface tracking emits a revisit event when an attributed session returns", async () => {
  const campaignStorage = new MemoryStorage();
  const sessionStorage = new MemoryStorage();
  const campaign = createTestCampaign(campaignStorage);
  const requests: Array<{ url: string; body: unknown }> = [];

  createCampaignSurfaceTrackingClient({
    campaign,
    campaignStorage,
    sessionStorage,
    url:
      "https://go.example.test/campaigns/campaign_surface_tracking/landing" +
      "?oc_session_id=session_returning_1" +
      "&oc_channel_id=instagram_dm" +
      "&utm_source=instagram" +
      "&utm_medium=dm" +
      "&utm_campaign=creator-kit-launch" +
      "&coupon=LAUNCH20",
    now: () => "2026-05-11T04:00:00.000Z",
    createId: () => "first",
  });

  const secondReturningClient = createCampaignSurfaceTrackingClient({
    campaign,
    campaignStorage,
    sessionStorage,
    url:
      "https://go.example.test/campaigns/campaign_surface_tracking/landing" +
      "?oc_session_id=session_returning_1" +
      "&oc_channel_id=instagram_dm" +
      "&utm_source=instagram" +
      "&utm_medium=dm" +
      "&utm_campaign=creator-kit-launch" +
      "&coupon=LAUNCH20",
    now: () => "2026-05-11T04:30:00.000Z",
    createId: () => "returning",
    fetch: async (url, init) => {
      requests.push({
        url: String(url),
        body: JSON.parse(String(init?.body)),
      });

      return new Response(null, { status: 201 });
    },
  });

  assert.deepEqual(
    getPersistedCampaignRecord(campaignStorage, "campaign_surface_tracking")
      ?.tracking.eventLog,
    [
      {
        schemaVersion: "owncanvas.tracking-event.v1",
        type: "revisit",
        id: "event_revisit_returning",
        campaignId: "campaign_surface_tracking",
        sessionId: "session_returning_1",
        context: {
          actor: "human",
          userId: "anonymous:session_returning_1",
          permissionMode: "basic",
        },
        occurredAt: "2026-05-11T04:30:00.000Z",
        content: {
          type: "landing_surface",
          id: "campaign_surface_tracking:revisit",
          nodeId: "landing",
          channelId: "instagram_dm",
          productId: "product_creator_kit",
          offerId: "offer_launch_discount",
        },
        utm: {
          source: "instagram",
          medium: "dm",
          campaign: "creator-kit-launch",
          content: "",
          term: "",
        },
        target: {
          type: "landing.revisit",
          id: "campaign_surface_tracking:revisit",
          metadata: {
            nodeId: "landing",
            outputPortId: "outputs.revisit",
            channelId: "instagram_dm",
            productId: "product_creator_kit",
            offerId: "offer_launch_discount",
            url:
              "https://go.example.test/campaigns/campaign_surface_tracking/landing" +
              "?oc_session_id=session_returning_1" +
              "&oc_channel_id=instagram_dm" +
              "&utm_source=instagram" +
              "&utm_medium=dm" +
              "&utm_campaign=creator-kit-launch" +
              "&coupon=LAUNCH20",
            label: "Landing revisit",
          },
        },
        revisit: {
          firstSeenAt: "2026-05-11T04:00:00.000Z",
          lastSeenAt: "2026-05-11T04:00:00.000Z",
          matchedBy: [
            {
              type: "session",
              identifier: "session_returning_1",
              firstSeenAt: "2026-05-11T04:00:00.000Z",
              lastSeenAt: "2026-05-11T04:00:00.000Z",
            },
            {
              type: "attribution_parameter",
              key: "coupon",
              identifier: "LAUNCH20",
              firstSeenAt: "2026-05-11T04:00:00.000Z",
              lastSeenAt: "2026-05-11T04:00:00.000Z",
            },
          ],
        },
      },
    ],
  );
  await secondReturningClient.flushTrackingEvents();
  assert.deepEqual(requests.map((request) => request.url), [
    "/api/campaigns/campaign_surface_tracking/tracking/revisits",
  ]);
});

test("campaign surface tracking emits a revisit event when a matched returning user re-enters", async () => {
  const campaignStorage = new MemoryStorage();
  const sessionStorage = new MemoryStorage();
  const campaign = createTestCampaign(campaignStorage);
  const firstTouch: CampaignClickTrackingEvent = {
    schemaVersion: CAMPAIGN_TRACKING_EVENT_SCHEMA_VERSION,
    type: "click",
    id: "event_click_known_user",
    campaignId: "campaign_surface_tracking",
    sessionId: "session_first_touch",
    context: {
      actor: "human",
      userId: "user_returning_1",
      permissionMode: "basic",
    },
    occurredAt: "2026-05-11T03:45:00.000Z",
    content: {
      type: "landing_cta",
      id: "content_first_touch",
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
      type: "cta",
      id: "first_touch_cta",
      metadata: {
        productId: "product_creator_kit",
        offerId: "offer_launch_discount",
      },
    },
    click: {
      id: "click_known_user",
      href: "https://shop.example.test/creator-kit",
      destination: "landing",
    },
  };

  saveCampaignTrackingEvent(
    campaignStorage,
    "campaign_surface_tracking",
    firstTouch,
    { now: () => "2026-05-11T03:45:01.000Z" },
  );

  const client = createCampaignSurfaceTrackingClient({
    campaign,
    campaignStorage,
    sessionStorage,
    url:
      "https://go.example.test/campaigns/campaign_surface_tracking/landing" +
      "?oc_session_id=session_second_touch" +
      "&oc_user_id=user_returning_1" +
      "&oc_channel_id=instagram_dm" +
      "&utm_source=instagram" +
      "&utm_medium=dm" +
      "&utm_campaign=creator-kit-launch",
    now: () => "2026-05-11T04:45:00.000Z",
    createId: () => "known_user",
  });

  assert.equal(client.session.userId, "user_returning_1");
  assert.deepEqual(
    getPersistedCampaignRecord(campaignStorage, "campaign_surface_tracking")
      ?.tracking.eventLog?.map((event) => ({
        type: event.type,
        id: event.id,
        sessionId: event.sessionId,
        userId: event.context.userId,
        matchedBy: event.type === "revisit" ? event.revisit.matchedBy : [],
      })),
    [
      {
        type: "click",
        id: "event_click_known_user",
        sessionId: "session_first_touch",
        userId: "user_returning_1",
        matchedBy: [],
      },
      {
        type: "revisit",
        id: "event_revisit_known_user",
        sessionId: "session_second_touch",
        userId: "user_returning_1",
        matchedBy: [
          {
            type: "user",
            identifier: "user_returning_1",
            firstSeenAt: "2026-05-11T03:45:00.000Z",
            lastSeenAt: "2026-05-11T03:45:00.000Z",
          },
        ],
      },
    ],
  );
  assert.deepEqual(
    getPersistedCampaignRecord(campaignStorage, "campaign_surface_tracking")
      ?.tracking.sessions,
    [
      {
        id: "session_second_touch",
        campaignId: "campaign_surface_tracking",
        userId: "user_returning_1",
        url:
          "https://go.example.test/campaigns/campaign_surface_tracking/landing" +
          "?oc_session_id=session_second_touch" +
          "&oc_user_id=user_returning_1" +
          "&oc_channel_id=instagram_dm" +
          "&utm_source=instagram" +
          "&utm_medium=dm" +
          "&utm_campaign=creator-kit-launch",
        channelId: "instagram_dm",
        firstSeenAt: "2026-05-11T04:45:00.000Z",
        lastSeenAt: "2026-05-11T04:45:00.000Z",
        utm: {
          source: "instagram",
          medium: "dm",
          campaign: "creator-kit-launch",
          content: "",
          term: "",
        },
        attributionParameters: [],
      },
    ],
  );
});

test("campaign surface tracking emits exposure and click events with session attribution", async () => {
  const campaignStorage = new MemoryStorage();
  const sessionStorage = new MemoryStorage();
  const campaign = createTestCampaign(campaignStorage);
  const requests: Array<{ url: string; body: unknown }> = [];
  const client = createCampaignSurfaceTrackingClient({
    campaign,
    campaignStorage,
    sessionStorage,
    url:
      "https://go.example.test/campaigns/campaign_surface_tracking/landing" +
      "?oc_session_id=session_landing_2" +
      "&oc_channel_id=instagram_dm" +
      "&utm_source=instagram" +
      "&utm_medium=dm" +
      "&utm_campaign=creator-kit-launch",
    now: () => "2026-05-11T04:05:00.000Z",
    createId: () => "fixed",
    fetch: async (url, init) => {
      requests.push({
        url: String(url),
        body: JSON.parse(String(init?.body)),
      });

      return new Response(null, { status: 201 });
    },
  });

  const exposure = await client.emitExposure(
    createCampaignSurfaceModuleExposureInput({
      campaign,
      moduleId: "module_source_short",
      moduleLabel: "Source short",
      sourceContentId: "asset_source_short",
      sourceAssetId: "asset_source_short",
      url: "https://cdn.example.test/source-short.mp4",
      placement: "source-short",
    }),
  );
  const click = await client.emitClick(
    createCampaignSurfaceCtaClickInput({
      campaign,
      ctaId: "module_continuation:cta",
      ctaLabel: "Buy creator kit",
      href: "/checkout",
      destination: "checkout",
    }),
  );

  assert.equal(exposure.sessionId, "session_landing_2");
  assert.equal(exposure.context.userId, "anonymous:session_landing_2");
  assert.equal(exposure.utm.source, "instagram");
  assert.equal(exposure.target.metadata.channelId, "instagram_dm");
  assert.equal(click?.click.id, "click_fixed");
  const checkoutUrl = new URL(click?.click.href ?? "");
  assert.equal(checkoutUrl.origin, "https://go.example.test");
  assert.equal(checkoutUrl.pathname, "/checkout");
  assert.equal(checkoutUrl.searchParams.get("oc_campaign_id"), "campaign_surface_tracking");
  assert.equal(checkoutUrl.searchParams.get("oc_session_id"), "session_landing_2");
  assert.equal(checkoutUrl.searchParams.get("oc_channel_id"), "instagram_dm");
  assert.equal(checkoutUrl.searchParams.get("utm_source"), "instagram");
  assert.equal(checkoutUrl.searchParams.get("utm_medium"), "dm");
  assert.equal(checkoutUrl.searchParams.get("utm_campaign"), "creator-kit-launch");
  await client.flushTrackingEvents();
  assert.deepEqual(
    requests.map((request) => request.url),
    [
      "/api/campaigns/campaign_surface_tracking/tracking/exposures",
      "/api/campaigns/campaign_surface_tracking/tracking/clicks",
    ],
  );
  assert.deepEqual(
    getPersistedCampaignRecord(campaignStorage, "campaign_surface_tracking")
      ?.tracking.eventLog,
    [exposure, click],
  );
});

test("campaign surface tracking emits playback and scroll engagement events with session attribution", async () => {
  const campaignStorage = new MemoryStorage();
  const sessionStorage = new MemoryStorage();
  const campaign = createTestCampaign(campaignStorage);
  const requests: Array<{ url: string; body: unknown }> = [];
  let idCounter = 0;
  const client = createCampaignSurfaceTrackingClient({
    campaign,
    campaignStorage,
    sessionStorage,
    url:
      "https://go.example.test/campaigns/campaign_surface_tracking/landing" +
      "?oc_session_id=session_landing_engagement" +
      "&oc_channel_id=instagram_dm" +
      "&utm_source=instagram" +
      "&utm_medium=dm" +
      "&utm_campaign=creator-kit-launch",
    now: () => "2026-05-11T05:00:00.000Z",
    createId: () => `engaged_${++idCounter}`,
    fetch: async (url, init) => {
      requests.push({
        url: String(url),
        body: JSON.parse(String(init?.body)),
      });

      return new Response(null, { status: 201 });
    },
  });

  const playback = await client.emitEngagement(
    createCampaignSurfacePlaybackEngagementInput({
      campaign,
      moduleId: "module_source_short",
      moduleLabel: "Source short",
      sourceContentId: "asset_source_short",
      sourceAssetId: "asset_source_short",
      url: "https://cdn.example.test/source-short.mp4",
      action: "progress",
      value: 25,
      unit: "percent",
      metadata: { currentTimeSeconds: 4 },
    }),
  );
  const scroll = await client.emitEngagement(
    createCampaignSurfaceScrollEngagementInput({
      campaign,
      surfaceId: "landing-page",
      surfaceLabel: "Campaign landing",
      action: "depth",
      value: 50,
      unit: "percent",
    }),
  );

  assert.equal(playback.type, "engagement");
  assert.equal(playback.engagement.kind, "playback");
  assert.equal(playback.engagement.action, "progress");
  assert.equal(playback.engagement.value, 25);
  assert.equal(playback.target.metadata.outputPortId, "outputs.engagement");
  assert.equal(playback.content.assetId, "asset_source_short");
  assert.equal(scroll.engagement.kind, "scroll");
  assert.equal(scroll.engagement.value, 50);
  assert.equal(scroll.target.id, "landing-page");
  await client.flushTrackingEvents();
  assert.deepEqual(
    requests.map((request) => request.url),
    [
      "/api/campaigns/campaign_surface_tracking/tracking/engagement",
    ],
  );
  assert.deepEqual(requests[0]?.body, {
    schemaVersion: "owncanvas.campaign-tracking-batch.v1",
    events: [playback, scroll],
  });
  assert.deepEqual(
    getPersistedCampaignRecord(campaignStorage, "campaign_surface_tracking")
      ?.tracking.eventLog,
    [playback, scroll],
  );
});

test("campaign surface tracking emits short-form watch depth, completion, and replay events", async () => {
  const campaignStorage = new MemoryStorage();
  const sessionStorage = new MemoryStorage();
  const campaign = createTestCampaign(campaignStorage);
  const requests: Array<{ url: string; body: unknown }> = [];
  let idCounter = 0;
  const client = createCampaignSurfaceTrackingClient({
    campaign,
    campaignStorage,
    sessionStorage,
    url:
      "https://go.example.test/campaigns/campaign_surface_tracking/landing" +
      "?oc_session_id=session_landing_media" +
      "&oc_channel_id=instagram_dm" +
      "&utm_source=instagram" +
      "&utm_medium=dm" +
      "&utm_campaign=creator-kit-launch",
    now: () => "2026-05-11T05:20:00.000Z",
    createId: () => `media_${++idCounter}`,
    fetch: async (url, init) => {
      requests.push({
        url: String(url),
        body: JSON.parse(String(init?.body)),
      });

      return new Response(null, { status: 201 });
    },
  });

  const watchDepth = await client.emitEngagement(
    createCampaignSurfacePlaybackEngagementInput({
      campaign,
      moduleId: "module_source_short",
      moduleLabel: "Source short",
      sourceContentId: "asset_source_short",
      sourceAssetId: "asset_source_short",
      url: "https://cdn.example.test/source-short.mp4",
      action: "watch_depth",
      value: 75,
      unit: "percent",
      metadata: { currentTimeSeconds: 9, durationSeconds: 12 },
    }),
  );
  const completion = await client.emitEngagement(
    createCampaignSurfacePlaybackEngagementInput({
      campaign,
      moduleId: "module_source_short",
      moduleLabel: "Source short",
      sourceContentId: "asset_source_short",
      sourceAssetId: "asset_source_short",
      url: "https://cdn.example.test/source-short.mp4",
      action: "complete",
      value: 100,
      unit: "percent",
      metadata: { currentTimeSeconds: 12, durationSeconds: 12 },
    }),
  );
  const replay = await client.emitEngagement(
    createCampaignSurfacePlaybackEngagementInput({
      campaign,
      moduleId: "module_source_short",
      moduleLabel: "Source short",
      sourceContentId: "asset_source_short",
      sourceAssetId: "asset_source_short",
      url: "https://cdn.example.test/source-short.mp4",
      action: "replay",
      value: 1,
      unit: "count",
      metadata: { previousTimeSeconds: 11.8, currentTimeSeconds: 0.1 },
    }),
  );

  assert.equal(watchDepth.engagement.action, "watch_depth");
  assert.equal(watchDepth.engagement.value, 75);
  assert.equal(completion.engagement.action, "complete");
  assert.equal(completion.engagement.value, 100);
  assert.equal(replay.engagement.action, "replay");
  assert.equal(replay.engagement.unit, "count");
  assert.equal(replay.target.metadata.outputPortId, "outputs.engagement");
  assert.equal(replay.target.metadata.assetId, "asset_source_short");
  await client.flushTrackingEvents();
  assert.deepEqual(
    requests.map((request) => request.url),
    [
      "/api/campaigns/campaign_surface_tracking/tracking/engagement",
    ],
  );
  assert.deepEqual(requests[0]?.body, {
    schemaVersion: "owncanvas.campaign-tracking-batch.v1",
    events: [watchDepth, completion, replay],
  });
  assert.deepEqual(
    getPersistedCampaignRecord(campaignStorage, "campaign_surface_tracking")
      ?.tracking.eventLog,
    [watchDepth, completion, replay],
  );
});

test("campaign surface tracking emits short-form immersive control interaction events", async () => {
  const campaignStorage = new MemoryStorage();
  const sessionStorage = new MemoryStorage();
  const campaign = createTestCampaign(campaignStorage);
  const requests: Array<{ url: string; body: unknown }> = [];
  let idCounter = 0;
  const client = createCampaignSurfaceTrackingClient({
    campaign,
    campaignStorage,
    sessionStorage,
    url:
      "https://go.example.test/campaigns/campaign_surface_tracking/landing" +
      "?oc_session_id=session_landing_controls" +
      "&oc_channel_id=instagram_dm" +
      "&utm_source=instagram" +
      "&utm_medium=dm" +
      "&utm_campaign=creator-kit-launch",
    now: () => "2026-05-11T05:30:00.000Z",
    createId: () => `control_${++idCounter}`,
    fetch: async (url, init) => {
      requests.push({
        url: String(url),
        body: JSON.parse(String(init?.body)),
      });

      return new Response(null, { status: 201 });
    },
  });

  const play = await client.emitEngagement(
    createCampaignSurfacePlaybackControlEngagementInput({
      campaign,
      moduleId: "module_source_short",
      moduleLabel: "Source short",
      sourceContentId: "asset_source_short",
      sourceAssetId: "asset_source_short",
      url: "https://cdn.example.test/source-short.mp4",
      control: "play",
      currentTimeSeconds: 1.2,
      durationSeconds: 12,
    }),
  );
  const mute = await client.emitEngagement(
    createCampaignSurfacePlaybackControlEngagementInput({
      campaign,
      moduleId: "module_source_short",
      moduleLabel: "Source short",
      sourceContentId: "asset_source_short",
      sourceAssetId: "asset_source_short",
      url: "https://cdn.example.test/source-short.mp4",
      control: "mute",
      currentTimeSeconds: 4,
      durationSeconds: 12,
      metadata: { volume: 0 },
    }),
  );

  assert.equal(play.engagement.kind, "playback");
  assert.equal(play.engagement.action, "control:play");
  assert.equal(play.engagement.unit, "count");
  assert.equal(play.engagement.value, 1);
  assert.deepEqual(play.engagement.metadata, {
    control: "play",
    currentTimeSeconds: 1.2,
    durationSeconds: 12,
  });
  assert.equal(play.target.metadata.outputPortId, "outputs.engagement");
  assert.equal(play.content.type, "short_video");
  assert.equal(mute.engagement.action, "control:mute");
  assert.deepEqual(mute.engagement.metadata, {
    control: "mute",
    currentTimeSeconds: 4,
    durationSeconds: 12,
    volume: 0,
  });
  await client.flushTrackingEvents();
  assert.deepEqual(
    requests.map((request) => request.url),
    [
      "/api/campaigns/campaign_surface_tracking/tracking/engagement",
    ],
  );
  assert.deepEqual(requests[0]?.body, {
    schemaVersion: "owncanvas.campaign-tracking-batch.v1",
    events: [play, mute],
  });
  assert.deepEqual(
    getPersistedCampaignRecord(campaignStorage, "campaign_surface_tracking")
      ?.tracking.eventLog,
    [play, mute],
  );
});

test("campaign surface tracking emits conversion events with campaign and content attribution", async () => {
  const campaignStorage = new MemoryStorage();
  const sessionStorage = new MemoryStorage();
  const campaign = createTestCampaign(campaignStorage);
  const requests: Array<{ url: string; body: unknown }> = [];
  const client = createCampaignSurfaceTrackingClient({
    campaign,
    campaignStorage,
    sessionStorage,
    url:
      "https://go.example.test/campaigns/campaign_surface_tracking/landing" +
      "?oc_session_id=session_landing_conversion" +
      "&oc_channel_id=instagram_dm" +
      "&utm_source=instagram" +
      "&utm_medium=dm" +
      "&utm_campaign=creator-kit-launch" +
      "&utm_content=checkout-cta" +
      "&utm_term=creator-tools",
    now: () => "2026-05-11T05:35:00.000Z",
    createId: () => "conversion",
    fetch: async (url, init) => {
      requests.push({
        url: String(url),
        body: JSON.parse(String(init?.body)),
      });

      return new Response(null, { status: 201 });
    },
  });

  const conversion = await client.emitConversion(
    createCampaignSurfaceConversionInput({
      campaign,
      targetId: "checkout_success",
      contentId: "content_checkout_success",
      eventName: "purchase",
      value: 9900,
      currency: "USD",
      orderId: "order_surface_001",
      quantity: 1,
      url: "https://shop.example.test/checkout/success",
      metadata: {
        checkoutProvider: "stripe",
      },
    }),
  );

  assert.equal(conversion.type, "conversion");
  assert.equal(conversion.sessionId, "session_landing_conversion");
  assert.equal(conversion.utm.content, "checkout-cta");
  assert.equal(conversion.content.type, "checkout");
  assert.equal(conversion.content.nodeId, "landing");
  assert.equal(conversion.content.channelId, "instagram_dm");
  assert.equal(conversion.content.productId, "product_creator_kit");
  assert.equal(conversion.content.offerId, "offer_launch_discount");
  assert.equal(conversion.target.metadata.inputPortId, "inputs.purchase");
  assert.equal(conversion.target.metadata.channelId, "instagram_dm");
  assert.equal(conversion.target.metadata.url, "https://shop.example.test/checkout/success");
  assert.deepEqual(conversion.conversion, {
    eventName: "purchase",
    value: 9900,
    currency: "USD",
    orderId: "order_surface_001",
    quantity: 1,
    metadata: {
      checkoutProvider: "stripe",
    },
  });
  await client.flushTrackingEvents();
  assert.deepEqual(requests, [
    {
      url: "/api/campaigns/campaign_surface_tracking/tracking/conversions",
      body: conversion,
    },
  ]);
  assert.deepEqual(
    getPersistedCampaignRecord(campaignStorage, "campaign_surface_tracking")
      ?.tracking.eventLog,
    [conversion],
  );
  assert.deepEqual(
    getPersistedCampaignRecord(campaignStorage, "campaign_surface_tracking")
      ?.tracking.conversionRecords?.map((record) => ({
        eventId: record.eventId,
        content: record.content,
        utm: record.utm,
        target: record.target,
        attribution: record.attribution,
      })),
    [
      {
        eventId: "event_conversion_conversion",
        content: conversion.content,
        utm: conversion.utm,
        target: conversion.target,
        attribution: {
          campaignId: "campaign_surface_tracking",
          sessionId: "session_landing_conversion",
          eventId: "event_conversion_conversion",
          eventType: "conversion",
          occurredAt: "2026-05-11T05:35:00.000Z",
          source: "instagram",
          medium: "dm",
          campaign: "creator-kit-launch",
          content: "checkout-cta",
          term: "creator-tools",
          nodeId: "landing",
          inputPortId: "inputs.purchase",
          channelId: "instagram_dm",
          productId: "product_creator_kit",
          offerId: "offer_launch_discount",
          targetType: "checkout",
          targetId: "checkout_success",
          conversionEventName: "purchase",
          conversionValue: 9900,
          conversionCurrency: "USD",
          orderId: "order_surface_001",
          quantity: 1,
        },
      },
    ],
  );
});

test("campaign surface tracking buffers playback and scroll analytics so network delivery does not block interaction handlers", async () => {
  const campaignStorage = new MemoryStorage();
  const sessionStorage = new MemoryStorage();
  const campaign = createTestCampaign(campaignStorage);
  const requests: Array<{ url: string; body: unknown }> = [];
  let idCounter = 0;
  let resolveDelivery: (() => void) | undefined;
  const client = createCampaignSurfaceTrackingClient({
    campaign,
    campaignStorage,
    sessionStorage,
    url:
      "https://go.example.test/campaigns/campaign_surface_tracking/landing" +
      "?oc_session_id=session_landing_buffered" +
      "&oc_channel_id=instagram_dm" +
      "&utm_source=instagram" +
      "&utm_medium=dm" +
      "&utm_campaign=creator-kit-launch",
    now: () => "2026-05-11T05:40:00.000Z",
    createId: () => `buffered_${++idCounter}`,
    fetch: async (url, init) => {
      requests.push({
        url: String(url),
        body: JSON.parse(String(init?.body)),
      });

      await new Promise<void>((resolve) => {
        resolveDelivery = resolve;
      });

      return new Response(null, { status: 201 });
    },
  });

  const playbackPromise = client.emitEngagement(
    createCampaignSurfacePlaybackEngagementInput({
      campaign,
      moduleId: "module_source_short",
      moduleLabel: "Source short",
      sourceContentId: "asset_source_short",
      sourceAssetId: "asset_source_short",
      url: "https://cdn.example.test/source-short.mp4",
      action: "watch_depth",
      value: 50,
      unit: "percent",
    }),
  );
  const scrollPromise = client.emitEngagement(
    createCampaignSurfaceScrollEngagementInput({
      campaign,
      surfaceId: "landing-page",
      surfaceLabel: "Campaign landing",
      action: "depth",
      value: 75,
      unit: "percent",
    }),
  );

  const emittedBeforeNetworkSettled = await Promise.race([
    Promise.all([playbackPromise, scrollPromise]).then(() => true),
    new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 0)),
  ]);

  assert.equal(emittedBeforeNetworkSettled, true);

  const [playback, scroll] = await Promise.all([playbackPromise, scrollPromise]);

  assert.deepEqual(
    getPersistedCampaignRecord(campaignStorage, "campaign_surface_tracking")
      ?.tracking.eventLog,
    [playback, scroll],
  );
  assert.deepEqual(requests, []);

  const flushPromise = client.flushTrackingEvents();

  await waitFor(() => requests.length === 1);

  resolveDelivery?.();
  await flushPromise;

  assert.deepEqual(requests, [
    {
      url: "/api/campaigns/campaign_surface_tracking/tracking/engagement",
      body: {
        schemaVersion: "owncanvas.campaign-tracking-batch.v1",
        events: [playback, scroll],
      },
    },
  ]);
});

test("campaign surface tracking retries failed conversion delivery without interrupting the user flow", async () => {
  const campaignStorage = new MemoryStorage();
  const sessionStorage = new MemoryStorage();
  const campaign = createTestCampaign(campaignStorage);
  const requests: Array<{ url: string; body: unknown }> = [];
  let attempt = 0;
  const client = createCampaignSurfaceTrackingClient({
    campaign,
    campaignStorage,
    sessionStorage,
    url:
      "https://go.example.test/campaigns/campaign_surface_tracking/landing" +
      "?oc_session_id=session_landing_retry" +
      "&oc_channel_id=instagram_dm" +
      "&utm_source=instagram" +
      "&utm_medium=dm" +
      "&utm_campaign=creator-kit-launch",
    now: () => "2026-05-11T05:45:00.000Z",
    createId: () => "retry",
    deliveryDelayMs: 0,
    fetch: async (url, init) => {
      attempt += 1;
      requests.push({
        url: String(url),
        body: JSON.parse(String(init?.body)),
      });

      if (attempt === 1) {
        throw new Error("Network went offline");
      }

      return new Response(null, { status: 201 });
    },
  });

  const conversionPromise = client.emitConversion(
    createCampaignSurfaceConversionInput({
      campaign,
      targetId: "checkout_success_retry",
      contentId: "content_checkout_success_retry",
      eventName: "purchase",
      value: 4900,
      currency: "USD",
      orderId: "order_surface_retry",
      quantity: 1,
      url: "https://shop.example.test/checkout/retry-success",
    }),
  );
  const emittedBeforeDeliverySettled = await Promise.race([
    conversionPromise.then(() => true),
    new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 0)),
  ]);

  assert.equal(emittedBeforeDeliverySettled, true);

  const conversion = await conversionPromise;

  assert.deepEqual(
    getPersistedCampaignRecord(campaignStorage, "campaign_surface_tracking")
      ?.tracking.eventLog,
    [conversion],
  );

  await client.flushTrackingEvents();

  assert.equal(attempt, 2);
  assert.deepEqual(requests, [
    {
      url: "/api/campaigns/campaign_surface_tracking/tracking/conversions",
      body: conversion,
    },
    {
      url: "/api/campaigns/campaign_surface_tracking/tracking/conversions",
      body: conversion,
    },
  ]);
});

test("campaign surface tracking captures tracked CTA link clicks from element metadata", async () => {
  const campaignStorage = new MemoryStorage();
  const sessionStorage = new MemoryStorage();
  const campaign = createTestCampaign(campaignStorage);
  const client = createCampaignSurfaceTrackingClient({
    campaign,
    campaignStorage,
    sessionStorage,
    url:
      "https://go.example.test/campaigns/campaign_surface_tracking/landing" +
      "?oc_session_id=session_landing_click_capture" +
      "&oc_channel_id=instagram_dm" +
      "&utm_source=instagram" +
      "&utm_medium=dm" +
      "&utm_campaign=creator-kit-launch",
    now: () => "2026-05-11T05:10:00.000Z",
    createId: () => "captured",
  });
  const anchor = new TrackedAnchor({
    href: "/checkout?sku=creator-kit",
    dataset: {
      campaignTrackClick: "true",
      trackingTargetType: "cta",
      trackingTargetId: "sticky_checkout_cta",
      trackingLabel: "Buy creator kit",
      trackingDestination: "checkout",
      trackingContentType: "landing_cta",
      trackingContentId: "sticky_checkout_cta_content",
      trackingNodeId: "landing",
      trackingOutputPortId: "outputs.click",
    },
  });

  const captured = await captureCampaignSurfaceTrackedClick({
    campaign,
    trackingClient: client,
    event: {
      target: anchor,
      currentTarget: { baseURI: "https://go.example.test/campaigns/campaign_surface_tracking/landing" },
    },
  });

  const checkoutUrl = new URL(captured?.click.href ?? "");
  assert.equal(checkoutUrl.origin, "https://go.example.test");
  assert.equal(checkoutUrl.pathname, "/checkout");
  assert.equal(checkoutUrl.searchParams.get("sku"), "creator-kit");
  assert.equal(checkoutUrl.searchParams.get("oc_campaign_id"), "campaign_surface_tracking");
  assert.equal(checkoutUrl.searchParams.get("oc_session_id"), "session_landing_click_capture");
  assert.equal(checkoutUrl.searchParams.get("oc_channel_id"), "instagram_dm");
  assert.equal(checkoutUrl.searchParams.get("utm_source"), "instagram");
  assert.equal(checkoutUrl.searchParams.get("utm_medium"), "dm");
  assert.equal(checkoutUrl.searchParams.get("utm_campaign"), "creator-kit-launch");
  assert.equal(captured?.target.type, "cta");
  assert.equal(captured?.target.id, "sticky_checkout_cta");
  assert.equal(captured?.target.metadata.label, "Buy creator kit");
  assert.equal(captured?.target.metadata.nodeId, "landing");
  assert.equal(captured?.target.metadata.outputPortId, "outputs.click");
  assert.equal(captured?.content.type, "landing_cta");
  assert.equal(captured?.content.id, "sticky_checkout_cta_content");
  assert.equal(captured?.click.destination, "checkout");
  assert.deepEqual(
    getPersistedCampaignRecord(campaignStorage, "campaign_surface_tracking")
      ?.tracking.eventLog,
    [captured],
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

class TrackedAnchor {
  readonly href: string;
  readonly dataset: Record<string, string>;

  constructor(input: { href: string; dataset: Record<string, string> }) {
    this.href = input.href;
    this.dataset = input.dataset;
  }

  closest(selector: string) {
    return selector === "a[data-campaign-track-click]" ? this : null;
  }
}

async function waitFor(predicate: () => boolean) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    if (predicate()) {
      return;
    }

    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }

  assert.fail("Timed out waiting for condition.");
}

function createTestCampaign(storage = new MemoryStorage()): CampaignDraft {
  return {
    ...createBlankCampaignRecord(storage, {
      id: "campaign_surface_tracking",
      now: () => "2026-05-11T04:00:00.000Z",
    }),
    title: "Creator kit launch",
    productOffer: {
      product: {
        id: "product_creator_kit",
        title: "Creator Kit",
        brand: "OwnCanvas",
        category: "software",
        description: "Campaign tooling for creators.",
        tags: ["creator", "commerce"],
        canonicalUrl: "https://shop.example.test/creator-kit",
        media: [],
        variants: [],
      },
      offer: {
        headline: "Launch discount",
        summary: "Save on the creator kit.",
        price: {
          amount: 99,
          currency: "USD",
          display: "$99",
        },
        discount: "20%",
        terms: "Limited launch offer.",
        destinationUrl: "https://shop.example.test/checkout",
        callToAction: "Buy creator kit",
      },
      attribution: {
        source: "affiliate",
        externalId: "offer_launch_discount",
        affiliateNetwork: "owncanvas",
        commissionRate: 0.2,
        trackingUrl: "https://shop.example.test/checkout",
      },
    },
  };
}
