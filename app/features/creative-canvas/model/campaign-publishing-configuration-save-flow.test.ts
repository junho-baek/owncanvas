import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createBlankCampaignRecord,
  createCampaignDestinationUrl,
  createCampaignPublishedLink,
  createCampaignPublishingChannel,
  createCampaignTrackingConfiguration,
  generateDeterministicCampaignUtmParameters,
  getPersistedCampaignRecord,
  listCampaignPublishedLinks,
  saveCampaignPublishedLink,
  saveCampaignTrackingConfiguration,
  saveCampaignPublishingConfiguration,
  updatePersistedCampaignRecord,
} from "./creative-canvas.ts";

test("campaign create workflow persists an empty publishing configuration", () => {
  const storage = new MemoryStorage();

  const campaign = createBlankCampaignRecord(storage, {
    id: "campaign_publishing_create",
    now: () => "2026-05-11T00:00:00.000Z",
  });

  assert.deepEqual(campaign.channels, []);
  assert.deepEqual(
    getPersistedCampaignRecord(storage, "campaign_publishing_create")?.channels,
    [],
  );
});

test("campaign publishing configuration save flow persists configured channel destinations", () => {
  const storage = new MemoryStorage();

  createBlankCampaignRecord(storage, {
    id: "campaign_publishing_configuration",
    now: () => "2026-05-11T00:00:00.000Z",
  });

  const publishingChannels = [
    createCampaignPublishingChannel({
      id: "pub_instagram_dm_landing",
      type: "direct-message",
      platform: "instagram",
      label: "Instagram comment to DM",
      providerPluginId: "plugin.dm.instagram",
      account: {
        id: "ig_creator_123",
        handle: "@owncanvas",
      },
      placement: "comment-trigger",
      destinationUrl: "https://go.example.com/creator-kit",
      landingPageId: "landing_creator_kit",
      schedule: {
        mode: "scheduled",
        startsAt: "2026-05-12T15:00:00.000Z",
        timezone: "America/Los_Angeles",
      },
      tracking: {
        utmSource: "instagram",
        utmMedium: "dm",
        utmCampaign: "creator-kit-launch",
        conversionEvent: "purchase",
      },
      status: "configured",
    }),
  ];

  const savedCampaign = saveCampaignPublishingConfiguration(
    storage,
    "campaign_publishing_configuration",
    publishingChannels,
    {
      now: () => "2026-05-11T00:20:00.000Z",
    },
  );
  const retrievedCampaign = getPersistedCampaignRecord(
    storage,
    "campaign_publishing_configuration",
  );

  assert.deepEqual(savedCampaign.channels, publishingChannels);
  assert.equal(savedCampaign.updatedAt, "2026-05-11T00:20:00.000Z");
  assert.deepEqual(retrievedCampaign?.channels, publishingChannels);
});

test("campaign update workflow persists publishing configuration changes", () => {
  const storage = new MemoryStorage();
  const campaign = createBlankCampaignRecord(storage, {
    id: "campaign_publishing_update",
    now: () => "2026-05-11T00:00:00.000Z",
  });
  const publishingChannels = [
    createCampaignPublishingChannel({
      id: "pub_tiktok_launch",
      type: "social",
      platform: "tiktok",
      label: "TikTok launch post",
      providerPluginId: "plugin.social.tiktok",
      account: {
        id: "tt_creator_123",
        handle: "@owncanvas",
      },
      placement: "short-form-post",
      destinationUrl: "https://go.example.com/tiktok-launch",
      tracking: {
        utmSource: "tiktok",
        utmMedium: "social",
        utmCampaign: "creator-kit-launch",
        conversionEvent: "purchase",
      },
      status: "configured",
    }),
  ];

  const updatedCampaign = updatePersistedCampaignRecord(
    storage,
    {
      ...campaign,
      channels: publishingChannels,
    },
    {
      now: () => "2026-05-11T00:18:00.000Z",
    },
  );

  assert.deepEqual(updatedCampaign.channels, publishingChannels);
  assert.equal(updatedCampaign.updatedAt, "2026-05-11T00:18:00.000Z");
  assert.deepEqual(
    getPersistedCampaignRecord(storage, "campaign_publishing_update")?.channels,
    publishingChannels,
  );
});

test("campaign publishing configuration save flow persists editable draft channels", () => {
  const storage = new MemoryStorage();

  createBlankCampaignRecord(storage, {
    id: "campaign_publishing_draft",
    now: () => "2026-05-11T00:00:00.000Z",
  });

  const publishingChannels = [
    createCampaignPublishingChannel({
      id: "pub_draft_instagram_dm",
      type: "direct-message",
      platform: "instagram",
      label: "Instagram comment to DM draft",
      placement: "comment-trigger",
      destinationUrl: "https://go.example.com/draft",
      tracking: {
        utmSource: "instagram",
        utmMedium: "dm",
        utmCampaign: "",
        conversionEvent: "",
      },
      status: "draft",
    }),
  ];

  const savedCampaign = saveCampaignPublishingConfiguration(
    storage,
    "campaign_publishing_draft",
    publishingChannels,
    {
      now: () => "2026-05-11T00:12:00.000Z",
    },
  );

  assert.deepEqual(savedCampaign.channels, publishingChannels);
  assert.equal(savedCampaign.updatedAt, "2026-05-11T00:12:00.000Z");
  assert.deepEqual(
    getPersistedCampaignRecord(storage, "campaign_publishing_draft")?.channels,
    publishingChannels,
  );
});

test("campaign publishing configuration save flow rejects invalid destination URLs without overwriting", () => {
  const storage = new MemoryStorage();
  const campaign = createBlankCampaignRecord(storage, {
    id: "campaign_publishing_invalid",
    now: () => "2026-05-11T00:00:00.000Z",
  });

  assert.throws(
    () =>
      saveCampaignPublishingConfiguration(
        storage,
        "campaign_publishing_invalid",
        [
          createCampaignPublishingChannel({
            id: "pub_invalid_destination",
            type: "landing",
            platform: "web",
            label: "Landing page",
            destinationUrl: "go.example.com/landing",
            placement: "bio-link",
            tracking: {
              utmSource: "",
              utmMedium: "landing",
              utmCampaign: "",
              conversionEvent: "",
            },
            status: "configured",
          }),
        ],
      ),
    /Invalid campaign publishing configuration: channel.provider_plugin_id_required, channel.destination_url_invalid, channel.landing_page_id_required, channel.utm_source_required, channel.utm_campaign_required, channel.conversion_event_required/,
  );

  assert.deepEqual(
    getPersistedCampaignRecord(storage, "campaign_publishing_invalid")
      ?.channels,
    campaign.channels,
  );
});

test("campaign publishing configuration save flow rejects missing campaigns", () => {
  const storage = new MemoryStorage();

  assert.throws(
    () =>
      saveCampaignPublishingConfiguration(
        storage,
        "missing_campaign",
        [
          createCampaignPublishingChannel({
            type: "social",
            platform: "tiktok",
            label: "TikTok launch post",
            destinationUrl: "https://go.example.com/tiktok",
            placement: "short-form-post",
            tracking: {
              utmSource: "tiktok",
              utmMedium: "social",
              utmCampaign: "creator-kit-launch",
              conversionEvent: "purchase",
            },
          }),
        ],
      ),
    /Campaign "missing_campaign" was not found./,
  );
});

test("campaign destination URL generation adds campaign channel responder and message tracking parameters", () => {
  const storage = new MemoryStorage();

  createBlankCampaignRecord(storage, {
    id: "campaign_destination_url",
    now: () => "2026-05-11T00:00:00.000Z",
  });

  saveCampaignTrackingConfiguration(
    storage,
    "campaign_destination_url",
    createCampaignTrackingConfiguration({
      utm: {
        source: "campaign-default",
        medium: "campaign-medium",
        campaign: "creator-kit-launch",
        content: "campaign-content",
        term: "creator-tools",
      },
      attributionParameters: [
        {
          key: "affiliate_id",
          value: "impact_creator_123",
          source: "impact",
        },
      ],
    }),
  );

  const [channel] = [
    createCampaignPublishingChannel({
      id: "pub_instagram_dm_landing",
      type: "direct-message",
      platform: "instagram",
      label: "Instagram comment to DM",
      providerPluginId: "plugin.dm.instagram",
      account: {
        id: "ig_creator_123",
        handle: "@owncanvas",
      },
      placement: "comment-trigger",
      destinationUrl: "https://go.example.com/creator-kit?existing=1",
      landingPageId: "landing_creator_kit",
      tracking: {
        utmSource: "instagram",
        utmMedium: "dm",
        utmCampaign: "creator-kit-launch",
        utmContent: "comment-trigger",
        conversionEvent: "purchase",
      },
      status: "configured",
    }),
  ];

  saveCampaignPublishingConfiguration(
    storage,
    "campaign_destination_url",
    [channel],
  );

  const campaign = getPersistedCampaignRecord(storage, "campaign_destination_url");

  assert.ok(campaign);

  const destinationUrl = createCampaignDestinationUrl(campaign, channel.id, {
    responderId: "agent_dm_responder",
    messageId: "msg welcome 01",
  });

  assert.equal(
    destinationUrl,
    "https://go.example.com/creator-kit?existing=1&utm_source=instagram&utm_medium=dm&utm_campaign=creator-kit-launch&utm_content=comment-trigger&utm_term=creator-tools&oc_campaign_id=campaign_destination_url&oc_channel_id=pub_instagram_dm_landing&oc_responder_id=agent_dm_responder&oc_message_id=msg+welcome+01&oc_conversion_event=purchase&affiliate_id=impact_creator_123",
  );
});

test("campaign UTM generation derives deterministic parameters from campaign and publish context", () => {
  const campaign = {
    ...createBlankCampaignRecord(new MemoryStorage(), {
      id: "campaign.spring-drop-2026",
      now: () => "2026-05-11T00:00:00.000Z",
    }),
    title: "Spring Drop Launch!",
    objective: "Drive purchase conversion",
  };
  const channel = createCampaignPublishingChannel({
    id: "pub_instagram_dm_landing",
    type: "direct-message",
    platform: "Instagram",
    label: "Instagram comment to DM",
    placement: "Comment Trigger",
    destinationUrl: "https://go.example.com/spring-drop",
    tracking: {
      utmSource: "",
      utmMedium: "",
      utmCampaign: "",
      conversionEvent: "",
    },
    status: "draft",
  });

  const utm = generateDeterministicCampaignUtmParameters(campaign, channel, {
    responderId: "Agent DM Responder",
    messageId: "Msg Welcome 01",
  });

  assert.deepEqual(utm, {
    source: "instagram",
    medium: "direct-message",
    campaign: "spring-drop-launch",
    content:
      "comment-trigger-pub-instagram-dm-landing-agent-dm-responder-msg-welcome-01",
    term: "drive-purchase-conversion",
  });
  assert.deepEqual(
    generateDeterministicCampaignUtmParameters(campaign, channel, {
      responderId: "Agent DM Responder",
      messageId: "Msg Welcome 01",
    }),
    utm,
  );
});

test("campaign destination URL generation uses deterministic UTM fallbacks when tracking fields are blank", () => {
  const storage = new MemoryStorage();

  const campaign = {
    ...createBlankCampaignRecord(storage, {
      id: "campaign.spring-drop-2026",
      now: () => "2026-05-11T00:00:00.000Z",
    }),
    title: "Spring Drop Launch!",
    objective: "Drive purchase conversion",
  };
  const channel = createCampaignPublishingChannel({
    id: "pub_instagram_dm_landing",
    type: "direct-message",
    platform: "Instagram",
    label: "Instagram comment to DM",
    placement: "Comment Trigger",
    destinationUrl: "https://go.example.com/spring-drop",
    tracking: {
      utmSource: "",
      utmMedium: "",
      utmCampaign: "",
      conversionEvent: "",
    },
    status: "draft",
  });

  const destinationUrl = createCampaignDestinationUrl(
    {
      ...campaign,
      channels: [channel],
    },
    channel.id,
    {
      responderId: "Agent DM Responder",
      messageId: "Msg Welcome 01",
    },
  );

  assert.equal(
    destinationUrl,
    "https://go.example.com/spring-drop?utm_source=instagram&utm_medium=direct-message&utm_campaign=spring-drop-launch&utm_content=comment-trigger-pub-instagram-dm-landing-agent-dm-responder-msg-welcome-01&utm_term=drive-purchase-conversion&oc_campaign_id=campaign.spring-drop-2026&oc_channel_id=pub_instagram_dm_landing&oc_responder_id=Agent+DM+Responder&oc_message_id=Msg+Welcome+01",
  );
});

test("campaign publishing configuration save flow persists published link UTM fields", () => {
  const storage = new MemoryStorage();

  createBlankCampaignRecord(storage, {
    id: "campaign_published_link_utm",
    now: () => "2026-05-11T00:00:00.000Z",
  });

  saveCampaignTrackingConfiguration(
    storage,
    "campaign_published_link_utm",
    createCampaignTrackingConfiguration({
      utm: {
        source: "campaign-default",
        medium: "campaign-medium",
        campaign: "creator-kit-launch",
        content: "campaign-content",
        term: "creator-tools",
      },
      attributionParameters: [
        {
          key: "affiliate_id",
          value: "impact_creator_123",
          source: "impact",
        },
      ],
    }),
  );

  const campaign = getPersistedCampaignRecord(
    storage,
    "campaign_published_link_utm",
  );

  assert.ok(campaign);

  const channelWithoutPublishedLinks = createCampaignPublishingChannel({
    id: "pub_instagram_dm_landing",
    type: "direct-message",
    platform: "instagram",
    label: "Instagram comment to DM",
    providerPluginId: "plugin.dm.instagram",
    account: {
      id: "ig_creator_123",
      handle: "@owncanvas",
    },
    placement: "comment-trigger",
    destinationUrl: "https://go.example.com/creator-kit",
    landingPageId: "landing_creator_kit",
    tracking: {
      utmSource: "instagram",
      utmMedium: "dm",
      utmCampaign: "creator-kit-launch",
      utmContent: "comment-trigger",
      conversionEvent: "purchase",
    },
    status: "published",
  });
  const channel = {
    ...channelWithoutPublishedLinks,
    publishedLinks: [
      createCampaignPublishedLink(
        {
          ...campaign,
          channels: [channelWithoutPublishedLinks],
        },
        "pub_instagram_dm_landing",
        {
          responderId: "agent_dm_responder",
          messageId: "msg welcome 01",
          id: "published_link_ig_dm_001",
          publishedAt: "2026-05-11T00:42:00.000Z",
        },
      ),
    ],
  };

  const savedCampaign = saveCampaignPublishingConfiguration(
    storage,
    "campaign_published_link_utm",
    [channel],
    {
      now: () => "2026-05-11T00:45:00.000Z",
    },
  );

  assert.deepEqual(savedCampaign.channels[0]?.publishedLinks, [
    {
      id: "published_link_ig_dm_001",
      channelId: "pub_instagram_dm_landing",
      destinationUrl: "https://go.example.com/creator-kit",
      publishedUrl:
        "https://go.example.com/creator-kit?utm_source=instagram&utm_medium=dm&utm_campaign=creator-kit-launch&utm_content=comment-trigger&utm_term=creator-tools&oc_campaign_id=campaign_published_link_utm&oc_channel_id=pub_instagram_dm_landing&oc_responder_id=agent_dm_responder&oc_message_id=msg+welcome+01&oc_conversion_event=purchase&affiliate_id=impact_creator_123",
      utm: {
        source: "instagram",
        medium: "dm",
        campaign: "creator-kit-launch",
        content: "comment-trigger",
        term: "creator-tools",
      },
      owncanvasParameters: {
        campaignId: "campaign_published_link_utm",
        channelId: "pub_instagram_dm_landing",
        responderId: "agent_dm_responder",
        messageId: "msg welcome 01",
        conversionEvent: "purchase",
      },
      attributionParameters: [
        {
          key: "affiliate_id",
          value: "impact_creator_123",
          source: "impact",
        },
      ],
      publishedAt: "2026-05-11T00:42:00.000Z",
    },
  ]);
  assert.deepEqual(
    getPersistedCampaignRecord(storage, "campaign_published_link_utm")
      ?.channels[0]?.publishedLinks,
    savedCampaign.channels[0]?.publishedLinks,
  );
});

test("campaign publishing configuration save flow appends generated UTM parameters to published link URLs", () => {
  const storage = new MemoryStorage();

  createBlankCampaignRecord(storage, {
    id: "campaign_published_link_url_utm",
    now: () => "2026-05-11T00:00:00.000Z",
  });

  saveCampaignTrackingConfiguration(
    storage,
    "campaign_published_link_url_utm",
    createCampaignTrackingConfiguration({
      utm: {
        source: "campaign-default",
        medium: "campaign-medium",
        campaign: "creator-kit-launch",
        content: "campaign-content",
        term: "creator-tools",
      },
      attributionParameters: [
        {
          key: "affiliate_id",
          value: "impact_creator_123",
          source: "impact",
        },
      ],
    }),
  );

  const campaign = getPersistedCampaignRecord(
    storage,
    "campaign_published_link_url_utm",
  );

  assert.ok(campaign);

  const channel = createCampaignPublishingChannel({
    id: "pub_instagram_dm_landing",
    type: "direct-message",
    platform: "instagram",
    label: "Instagram comment to DM",
    providerPluginId: "plugin.dm.instagram",
    account: {
      id: "ig_creator_123",
      handle: "@owncanvas",
    },
    placement: "comment-trigger",
    destinationUrl: "https://go.example.com/creator-kit?existing=1",
    landingPageId: "landing_creator_kit",
    tracking: {
      utmSource: "instagram",
      utmMedium: "dm",
      utmCampaign: "creator-kit-launch",
      utmContent: "comment-trigger",
      conversionEvent: "purchase",
    },
    status: "published",
  });
  const generatedLink = createCampaignPublishedLink(
    {
      ...campaign,
      channels: [channel],
    },
    channel.id,
    {
      responderId: "agent_dm_responder",
      messageId: "msg welcome 01",
      id: "published_link_ig_dm_001",
      publishedAt: "2026-05-11T00:42:00.000Z",
    },
  );

  const savedCampaign = saveCampaignPublishingConfiguration(
    storage,
    "campaign_published_link_url_utm",
    [
      {
        ...channel,
        publishedLinks: [
          {
            ...generatedLink,
            publishedUrl: "https://go.example.com/creator-kit?existing=1",
          },
        ],
      },
    ],
    {
      now: () => "2026-05-11T00:45:00.000Z",
    },
  );

  assert.equal(
    savedCampaign.channels[0]?.publishedLinks[0]?.publishedUrl,
    "https://go.example.com/creator-kit?existing=1&utm_source=instagram&utm_medium=dm&utm_campaign=creator-kit-launch&utm_content=comment-trigger&utm_term=creator-tools&oc_campaign_id=campaign_published_link_url_utm&oc_channel_id=pub_instagram_dm_landing&oc_responder_id=agent_dm_responder&oc_message_id=msg+welcome+01&oc_conversion_event=purchase&affiliate_id=impact_creator_123",
  );
  assert.deepEqual(
    getPersistedCampaignRecord(storage, "campaign_published_link_url_utm")
      ?.channels[0]?.publishedLinks,
    savedCampaign.channels[0]?.publishedLinks,
  );
});

test("campaign published link save flow persists and retrieves UTM-enriched links", () => {
  const storage = new MemoryStorage();

  createBlankCampaignRecord(storage, {
    id: "campaign_published_link_save_retrieve",
    now: () => "2026-05-11T00:00:00.000Z",
  });

  saveCampaignTrackingConfiguration(
    storage,
    "campaign_published_link_save_retrieve",
    createCampaignTrackingConfiguration({
      utm: {
        source: "campaign-default",
        medium: "campaign-medium",
        campaign: "creator-kit-launch",
        content: "campaign-content",
        term: "creator-tools",
      },
      attributionParameters: [
        {
          key: "affiliate_id",
          value: "impact_creator_123",
          source: "impact",
        },
      ],
    }),
  );

  saveCampaignPublishingConfiguration(
    storage,
    "campaign_published_link_save_retrieve",
    [
      createCampaignPublishingChannel({
        id: "pub_instagram_dm_landing",
        type: "direct-message",
        platform: "instagram",
        label: "Instagram comment to DM",
        providerPluginId: "plugin.dm.instagram",
        account: {
          id: "ig_creator_123",
          handle: "@owncanvas",
        },
        placement: "comment-trigger",
        destinationUrl: "https://go.example.com/creator-kit?existing=1",
        landingPageId: "landing_creator_kit",
        tracking: {
          utmSource: "instagram",
          utmMedium: "dm",
          utmCampaign: "creator-kit-launch",
          utmContent: "comment-trigger",
          conversionEvent: "purchase",
        },
        status: "configured",
      }),
    ],
  );

  const savedCampaign = saveCampaignPublishedLink(
    storage,
    "campaign_published_link_save_retrieve",
    "pub_instagram_dm_landing",
    {
      responderId: "agent_dm_responder",
      messageId: "msg welcome 01",
      id: "published_link_ig_dm_001",
      publishedAt: "2026-05-11T00:42:00.000Z",
    },
    {
      now: () => "2026-05-11T00:45:00.000Z",
    },
  );
  const links = listCampaignPublishedLinks(
    savedCampaign,
    "pub_instagram_dm_landing",
  );

  assert.equal(savedCampaign.channels[0]?.status, "published");
  assert.deepEqual(links, [
    {
      id: "published_link_ig_dm_001",
      channelId: "pub_instagram_dm_landing",
      destinationUrl: "https://go.example.com/creator-kit?existing=1",
      publishedUrl:
        "https://go.example.com/creator-kit?existing=1&utm_source=instagram&utm_medium=dm&utm_campaign=creator-kit-launch&utm_content=comment-trigger&utm_term=creator-tools&oc_campaign_id=campaign_published_link_save_retrieve&oc_channel_id=pub_instagram_dm_landing&oc_responder_id=agent_dm_responder&oc_message_id=msg+welcome+01&oc_conversion_event=purchase&affiliate_id=impact_creator_123",
      utm: {
        source: "instagram",
        medium: "dm",
        campaign: "creator-kit-launch",
        content: "comment-trigger",
        term: "creator-tools",
      },
      owncanvasParameters: {
        campaignId: "campaign_published_link_save_retrieve",
        channelId: "pub_instagram_dm_landing",
        responderId: "agent_dm_responder",
        messageId: "msg welcome 01",
        conversionEvent: "purchase",
      },
      attributionParameters: [
        {
          key: "affiliate_id",
          value: "impact_creator_123",
          source: "impact",
        },
      ],
      publishedAt: "2026-05-11T00:42:00.000Z",
    },
  ]);
  assert.deepEqual(
    listCampaignPublishedLinks(
      getPersistedCampaignRecord(
        storage,
        "campaign_published_link_save_retrieve",
      ),
      "pub_instagram_dm_landing",
    ),
    links,
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
