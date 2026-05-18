import {
  type CampaignCanvasBlock,
  type CampaignCanvasEdge,
  type CampaignDraft,
  type CampaignWorkflowPluginConfiguration,
} from "../../creative-canvas/model/creative-canvas.ts";
import {
  INSTAGRAM_COMMENT_TRIGGER_CONFIGURATION_SCHEMA_VERSION,
  INSTAGRAM_COMMENT_TRIGGER_EVENT_SCHEMA_VERSION,
  INSTAGRAM_DM_GATE_FOLLOW_CHECK_PAYLOAD,
  INSTAGRAM_DM_ACTION_CONFIGURATION_SCHEMA_VERSION,
  INSTAGRAM_DM_ACTION_EXECUTION_SCHEMA_VERSION,
  LANDING_CONVERSION_EVENT_SCHEMA,
  LANDING_DM_REFERRAL_CONTEXT_SCHEMA,
  LANDING_FLOW_DESTINATION_MAPPING_SCHEMA_VERSION,
  LANDING_PAGE_HANDOFF_PAYLOAD_SCHEMA_VERSION,
  definePluginManifest,
  type DirectMessagePluginManifest,
  type InstagramCommentTriggerEvent,
  type InstagramDmActionConfiguration,
  type InstagramDmActionExecutionRequest,
  type InstagramDmResponseSelectionResult,
  type LandingPluginManifest,
  type LandingFlowDestinationMappingAction,
  type PluginAppliedConfiguration,
  type PluginCatalog,
  type PluginManifest,
} from "./plugin-representation.ts";

export const COMMENT_TO_DM_CAMPAIGN_ID = "campaign.comment-to-dm.fixture";
export const COMMENT_TO_DM_CAPABILITY_ID = "cap.instagram-comment-to-dm";
export const COMMENT_TO_DM_PLUGIN_ID = "plugin.instagram-comment-dm.fixture";
export const COMMENT_TO_DM_ACCOUNT_ID = "ig.account.fixture";
export const COMMENT_TO_DM_LANDING_PLUGIN_ID = "plugin.landing-page.fixture";
export const COMMENT_TO_DM_LANDING_CAPABILITY_ID = "cap.publish-landing-page";
export const COMMENT_TO_DM_LANDING_URL =
  "https://shop.example.test/drop?utm_source=instagram&utm_medium=dm&utm_campaign=campaign.comment-to-dm.fixture";
export const COMMENT_TO_DM_GATE_RESOURCE_URL =
  "https://shop.example.test/private-launch-guide.pdf";

const COMMENT_TO_DM_WORKFLOW_TIMESTAMP = "2026-05-11T00:03:00.000Z";

type CommentToDmFixturePluginMetadata = {
  trigger: {
    pluginId: string;
    capabilityId: string;
    nodeKind: "instagram.comment.trigger";
    title: string;
    schemaVersion: typeof INSTAGRAM_COMMENT_TRIGGER_CONFIGURATION_SCHEMA_VERSION;
    eventSchemaVersion: typeof INSTAGRAM_COMMENT_TRIGGER_EVENT_SCHEMA_VERSION;
    inputPorts: readonly [];
    outputPorts: readonly [{ id: "outputs.comment"; dataType: "event" }];
  };
  dmResponseAction: {
    pluginId: string;
    capabilityId: string;
    nodeKind: "instagram.dm.response";
    title: string;
    schemaVersion: typeof INSTAGRAM_DM_ACTION_CONFIGURATION_SCHEMA_VERSION;
    executionSchemaVersion: typeof INSTAGRAM_DM_ACTION_EXECUTION_SCHEMA_VERSION;
    inputPorts: readonly [{ id: "inputs.event"; dataType: "event" }];
    outputPorts: readonly [{ id: "outputs.delivery"; dataType: "event" }];
  };
  landingPageAction: {
    pluginId: string;
    capabilityId: string;
    nodeKind: "landing.page.publish-redirect";
    title: string;
    schemaVersion: typeof LANDING_PAGE_HANDOFF_PAYLOAD_SCHEMA_VERSION;
    actionSchemaVersion: typeof LANDING_FLOW_DESTINATION_MAPPING_SCHEMA_VERSION;
    inputPorts: readonly [
      { id: "inputs.creative"; dataType: "json" },
      { id: "inputs.dmReferralContext"; dataType: "json" },
    ];
    outputPorts: readonly [
      { id: "outputs.url"; dataType: "url" },
      { id: "outputs.conversionEvent"; dataType: "event" },
    ];
  };
};

export const commentToDmFixturePluginMetadata = {
  trigger: {
    pluginId: COMMENT_TO_DM_PLUGIN_ID,
    capabilityId: COMMENT_TO_DM_CAPABILITY_ID,
    nodeKind: "instagram.comment.trigger",
    title: "Instagram comment trigger",
    schemaVersion: INSTAGRAM_COMMENT_TRIGGER_CONFIGURATION_SCHEMA_VERSION,
    eventSchemaVersion: INSTAGRAM_COMMENT_TRIGGER_EVENT_SCHEMA_VERSION,
    inputPorts: [],
    outputPorts: [{ id: "outputs.comment", dataType: "event" }],
  },
  dmResponseAction: {
    pluginId: COMMENT_TO_DM_PLUGIN_ID,
    capabilityId: COMMENT_TO_DM_CAPABILITY_ID,
    nodeKind: "instagram.dm.response",
    title: "Instagram DM response action",
    schemaVersion: INSTAGRAM_DM_ACTION_CONFIGURATION_SCHEMA_VERSION,
    executionSchemaVersion: INSTAGRAM_DM_ACTION_EXECUTION_SCHEMA_VERSION,
    inputPorts: [{ id: "inputs.event", dataType: "event" }],
    outputPorts: [{ id: "outputs.delivery", dataType: "event" }],
  },
  landingPageAction: {
    pluginId: COMMENT_TO_DM_LANDING_PLUGIN_ID,
    capabilityId: COMMENT_TO_DM_LANDING_CAPABILITY_ID,
    nodeKind: "landing.page.publish-redirect",
    title: "Landing-page publish and redirect action",
    schemaVersion: LANDING_PAGE_HANDOFF_PAYLOAD_SCHEMA_VERSION,
    actionSchemaVersion: LANDING_FLOW_DESTINATION_MAPPING_SCHEMA_VERSION,
    inputPorts: [
      { id: "inputs.creative", dataType: "json" },
      { id: "inputs.dmReferralContext", dataType: "json" },
    ],
    outputPorts: [
      { id: "outputs.url", dataType: "url" },
      { id: "outputs.conversionEvent", dataType: "event" },
    ],
  },
} as const satisfies CommentToDmFixturePluginMetadata;

export const commentToDmPluginFixture = definePluginManifest({
  schemaVersion: "owncanvas.plugin.v1",
  id: COMMENT_TO_DM_PLUGIN_ID,
  name: "Instagram comment DM fixture",
  version: "0.1.0",
  type: "direct-message",
  lifecycle: {
    state: "active",
    updatedAt: "2026-05-11T00:00:00.000Z",
  },
  origin: {
    kind: "built-in",
    packageName: "@owncanvas/plugin-instagram-comment-dm-fixture",
  },
  metadata: {
    displayName: "Instagram comment DM fixture",
    description: "Fixture plugin for comment-to-DM dispatch tests.",
    tags: ["instagram", "dm", "fixture"],
  },
  permissions: {
    mode: "basic",
    installableBy: ["human", "agent"],
    configurableBy: ["human", "agent"],
    requiresApprovalFor: [],
  },
  directMessage: {
    channel: "instagram",
    supportedTriggers: ["comment"],
    deliveryModes: ["automated"],
    requiresComplianceReview: false,
  },
  capabilities: [
    {
      id: COMMENT_TO_DM_CAPABILITY_ID,
      kind: "channel.dm",
      title: "Instagram comment to DM",
      description: "Sends a tracked DM response after a matched comment.",
      concurrency: { supportsParallel: false, supportsBulk: true },
      inputPorts: [{ id: "event", dataType: "event", required: true }],
      outputPorts: [{ id: "delivery", dataType: "event", multiple: false }],
    },
  ],
  configuration: {
    fields: [
      {
        key: "accountId",
        label: "Instagram account ID",
        type: "string",
        required: true,
        scope: "campaign",
        directMessageConfigType: "account",
        channel: "instagram",
      },
    ],
  },
}) as DirectMessagePluginManifest;

export const commentToDmLandingPluginFixture = definePluginManifest({
  schemaVersion: "owncanvas.plugin.v1",
  id: COMMENT_TO_DM_LANDING_PLUGIN_ID,
  name: "Immersive landing fixture",
  version: "0.1.0",
  type: "landing",
  lifecycle: {
    state: "active",
    installedAt: COMMENT_TO_DM_WORKFLOW_TIMESTAMP,
    configuredAt: COMMENT_TO_DM_WORKFLOW_TIMESTAMP,
    activatedAt: COMMENT_TO_DM_WORKFLOW_TIMESTAMP,
    updatedAt: COMMENT_TO_DM_WORKFLOW_TIMESTAMP,
  },
  origin: {
    kind: "built-in",
    packageName: "@owncanvas/plugin-immersive-landing-fixture",
  },
  metadata: {
    displayName: "Immersive landing fixture",
    description:
      "Example landing plugin that preserves DM referral context through checkout.",
    tags: ["landing", "content-commerce", "conversion", "fixture"],
  },
  permissions: {
    mode: "basic",
    installableBy: ["human", "agent"],
    configurableBy: ["human", "agent"],
    requiresApprovalFor: [],
  },
  landing: {
    pageTypes: ["product", "content-commerce", "offer", "custom"],
    publishTargets: ["hosted"],
    supportsCheckout: true,
    preservesImmersion: true,
    dmReferralContextSchemas: [LANDING_DM_REFERRAL_CONTEXT_SCHEMA],
    conversionEventSchemas: [LANDING_CONVERSION_EVENT_SCHEMA],
  },
  capabilities: [
    {
      id: COMMENT_TO_DM_LANDING_CAPABILITY_ID,
      kind: "landing.page",
      title: "Publish immersive landing page",
      description:
        "Publishes a content-commerce page with DM referral attribution and conversion events.",
      concurrency: { supportsParallel: false, supportsBulk: false },
      inputPorts: [
        { id: "creative", dataType: "json", required: false },
        { id: "dmReferralContext", dataType: "json", required: true },
      ],
      outputPorts: [
        { id: "url", dataType: "url", multiple: false },
        { id: "conversionEvent", dataType: "event", multiple: true },
      ],
    },
  ],
  configuration: {
    fields: [
      {
        key: "domain",
        label: "Landing domain",
        type: "string",
        required: true,
        scope: "workspace",
        landingConfigType: "domain",
        publishTarget: "hosted",
      },
      {
        key: "checkoutUrl",
        label: "Checkout URL",
        type: "string",
        required: true,
        scope: "campaign",
        landingConfigType: "checkout",
      },
    ],
  },
}) as LandingPluginManifest;

export const commentToDmTrackingPluginFixture = definePluginManifest({
  schemaVersion: "owncanvas.plugin.v1",
  id: "plugin.tracking.fixture",
  name: "Purchase tracking fixture",
  version: "0.1.0",
  type: "tracking",
  lifecycle: {
    state: "active",
    installedAt: COMMENT_TO_DM_WORKFLOW_TIMESTAMP,
    configuredAt: COMMENT_TO_DM_WORKFLOW_TIMESTAMP,
    activatedAt: COMMENT_TO_DM_WORKFLOW_TIMESTAMP,
    updatedAt: COMMENT_TO_DM_WORKFLOW_TIMESTAMP,
  },
  origin: {
    kind: "external",
    packageName: "@partner/purchase-tracking-fixture",
    registryUrl: "https://registry.example.test",
  },
  metadata: {
    displayName: "Purchase tracking fixture",
    description:
      "Example tracking plugin for final purchase conversion attribution.",
    tags: ["tracking", "purchase", "attribution", "fixture"],
  },
  permissions: {
    mode: "advanced",
    installableBy: ["human", "agent"],
    configurableBy: ["human", "agent"],
    requiresApprovalFor: ["network_access"],
  },
  capabilities: [
    {
      id: "cap.track-purchase-conversion",
      kind: "track.conversion",
      title: "Track purchase conversion",
      description:
        "Records attributed purchase conversion events from landing checkout.",
      concurrency: { supportsParallel: false, supportsBulk: true },
      inputPorts: [{ id: "inputs.event", dataType: "event", required: true }],
      outputPorts: [
        { id: "outputs.attribution", dataType: "json", multiple: false },
      ],
    },
  ],
  configuration: {
    fields: [
      {
        key: "destination",
        label: "Tracking destination",
        type: "select",
        required: true,
        scope: "workspace",
        defaultValue: "owncanvas",
        options: [{ label: "OwnCanvas", value: "owncanvas" }],
      },
      {
        key: "attributionWindowDays",
        label: "Attribution window days",
        type: "number",
        required: true,
        scope: "campaign",
        defaultValue: 7,
      },
    ],
  },
}) as PluginManifest;

export const commentToDmLandingWorkflowPluginCatalogFixture = {
  id: "catalog.comment-to-dm-landing.fixture",
  updatedAt: COMMENT_TO_DM_WORKFLOW_TIMESTAMP,
  plugins: [
    commentToDmPluginFixture,
    commentToDmLandingPluginFixture,
    commentToDmTrackingPluginFixture,
  ],
} as const satisfies PluginCatalog;

export const commentToDmAppliedConfigurationFixture: PluginAppliedConfiguration = {
  appliedAt: "2026-05-11T00:01:00.000Z",
  appliedBy: "agent",
  source: "plugin.default",
  values: {
    accountId: COMMENT_TO_DM_ACCOUNT_ID,
  },
  secretRefs: {},
  missingRequiredKeys: [],
};

export const commentToDmActionConfigurationFixture = {
  schemaVersion: INSTAGRAM_DM_ACTION_CONFIGURATION_SCHEMA_VERSION,
  campaignId: COMMENT_TO_DM_CAMPAIGN_ID,
  capabilityId: COMMENT_TO_DM_CAPABILITY_ID,
  triggerConfiguration: {
    schemaVersion: INSTAGRAM_COMMENT_TRIGGER_CONFIGURATION_SCHEMA_VERSION,
    accountId: COMMENT_TO_DM_ACCOUNT_ID,
    conditionMatchers: [
      {
        id: "condition.drop-link",
        field: "text",
        operator: "all_keywords",
        keywords: ["drop", "link"],
        caseSensitive: false,
      },
      {
        id: "condition.vip-commenter",
        field: "commenter.username",
        operator: "contains",
        value: "vip",
        caseSensitive: false,
      },
    ],
  },
  responseMappings: [
    {
      id: "mapping.drop-link",
      triggerMatcherId: "condition.drop-link",
      message: {
        templateId: "template.drop-link",
        text: "Here is your private launch link: {{landingUrl}}",
      },
      landingUrl: COMMENT_TO_DM_LANDING_URL,
      attributionTermTemplate: "{{commentText}}",
      metadata: {
        route: "public-comment-keyword",
      },
    },
    {
      id: "mapping.vip-commenter",
      triggerMatcherId: "condition.vip-commenter",
      message: {
        templateId: "template.vip",
        text: "Your VIP link is ready: {{landingUrl}}",
      },
      landingUrl:
        "https://shop.example.test/vip?utm_source=instagram&utm_medium=dm&utm_campaign=campaign.comment-to-dm.fixture",
    },
  ],
  attribution: {
    source: "instagram",
    medium: "dm",
    campaign: COMMENT_TO_DM_CAMPAIGN_ID,
    content: "ig.media.fixture",
  },
} satisfies InstagramDmActionConfiguration;

export const instagramDmGateActionConfigurationFixture = {
  schemaVersion: INSTAGRAM_DM_ACTION_CONFIGURATION_SCHEMA_VERSION,
  campaignId: COMMENT_TO_DM_CAMPAIGN_ID,
  capabilityId: COMMENT_TO_DM_CAPABILITY_ID,
  triggerConfiguration: commentToDmActionConfigurationFixture.triggerConfiguration,
  message: {
    templateId: "template.follow-prompt",
    text: "Follow @owncanvas.fixture, then tap I follow to get the private launch guide.",
  },
  resourceUrl: COMMENT_TO_DM_GATE_RESOURCE_URL,
  responseMappings: [
    {
      id: "mapping.drop-guide",
      triggerMatcherId: "condition.drop-link",
      message: {
        templateId: "template.drop-guide",
        text: "Your private launch guide is ready: {{resourceUrl}}",
      },
      resourceUrl: COMMENT_TO_DM_GATE_RESOURCE_URL,
      attributionTermTemplate: "{{commentText}}",
      metadata: {
        route: "dm-gate-private-guide",
      },
    },
  ],
  followGate: {
    enabled: true,
    checkQuickReply: {
      contentType: "text",
      title: "I follow",
      payload: INSTAGRAM_DM_GATE_FOLLOW_CHECK_PAYLOAD,
    },
    successMessage: {
      text: "You are following. Here is the guide: {{resourceUrl}}",
    },
    notFollowingMessage: {
      text: "I could not confirm it yet. Follow and tap I follow again.",
    },
    quickReplies: [
      {
        contentType: "text",
        title: "I follow",
        payload: INSTAGRAM_DM_GATE_FOLLOW_CHECK_PAYLOAD,
      },
    ],
    simulatedFollowStatus: true,
  },
  attribution: {
    source: "instagram",
    medium: "dm",
    campaign: COMMENT_TO_DM_CAMPAIGN_ID,
    content: "ig.media.fixture",
  },
  metadata: {
    campaignAction: "instagram-dm-gate",
    scope: "offline-fixture",
  },
} satisfies InstagramDmActionConfiguration;

const commentToDmLandingWorkflowNodes = [
  {
    id: "node.instagram-comment",
    kind: "dm",
    type: "dm",
    label: "Instagram comment trigger",
    title: "Instagram comment trigger",
    subtitle: "Keyword listener",
    description: "Listens for launch keywords on the campaign media.",
    tone: "blue",
    status: "READY",
    position: { x: 120, y: 180 },
    contracts: [
      {
        label: "Output",
        value: "outputs.comment:event",
        state: "READY",
      },
    ],
    properties: {
      pluginId: COMMENT_TO_DM_PLUGIN_ID,
      capabilityId: COMMENT_TO_DM_CAPABILITY_ID,
      nodeKind: commentToDmFixturePluginMetadata.trigger.nodeKind,
      configuration: commentToDmActionConfigurationFixture.triggerConfiguration,
      outputPorts: commentToDmFixturePluginMetadata.trigger.outputPorts,
    },
  },
  {
    id: "node.instagram-dm",
    kind: "dm",
    type: "dm",
    label: "Instagram DM response",
    title: "Instagram DM response",
    subtitle: "Private tracked link",
    description: "Selects a response template and sends the matched landing URL.",
    tone: "violet",
    status: "READY",
    position: { x: 480, y: 180 },
    contracts: [
      {
        label: "Input",
        value: "inputs.event:event",
        state: "READY",
      },
      {
        label: "Output",
        value: "outputs.delivery:event",
        state: "READY",
      },
    ],
    properties: {
      pluginId: COMMENT_TO_DM_PLUGIN_ID,
      capabilityId: COMMENT_TO_DM_CAPABILITY_ID,
      nodeKind: commentToDmFixturePluginMetadata.dmResponseAction.nodeKind,
      configuration: commentToDmActionConfigurationFixture,
      inputPorts: commentToDmFixturePluginMetadata.dmResponseAction.inputPorts,
      outputPorts: commentToDmFixturePluginMetadata.dmResponseAction.outputPorts,
    },
  },
  {
    id: "node.landing-page",
    kind: "landing",
    type: "landing",
    label: "Immersive landing page",
    title: "Immersive landing page",
    subtitle: "Content-commerce destination",
    description: "Maps delivered DM referrals to a preserved landing experience.",
    tone: "green",
    status: "READY",
    position: { x: 840, y: 180 },
    contracts: [
      {
        label: "Input",
        value: "inputs.dmReferralContext:json",
        state: "READY",
      },
      {
        label: "Output",
        value: "outputs.conversionEvent:event",
        state: "READY",
      },
    ],
    properties: {
      pluginId: COMMENT_TO_DM_LANDING_PLUGIN_ID,
      capabilityId: COMMENT_TO_DM_LANDING_CAPABILITY_ID,
      nodeKind: commentToDmFixturePluginMetadata.landingPageAction.nodeKind,
      landingPageId: "landing.fixture.drop",
      destinationUrl: COMMENT_TO_DM_LANDING_URL,
      checkoutUrl: "https://shop.example.test/checkout/drop",
      preserveImmersion: true,
      inputPorts: commentToDmFixturePluginMetadata.landingPageAction.inputPorts,
      outputPorts: commentToDmFixturePluginMetadata.landingPageAction.outputPorts,
    },
  },
  {
    id: "node.conversion-tracking",
    kind: "custom",
    type: "custom",
    label: "Purchase conversion tracking",
    title: "Purchase conversion tracking",
    subtitle: "Attribution sink",
    description: "Records purchase conversion events for campaign improvement.",
    tone: "ink",
    status: "READY",
    position: { x: 1200, y: 180 },
    contracts: [
      {
        label: "Input",
        value: "inputs.event:event",
        state: "READY",
      },
    ],
    properties: {
      pluginId: "plugin.tracking.fixture",
      capabilityId: "cap.track-purchase-conversion",
      nodeKind: "tracking.conversion.record",
      conversionEvent: "purchase",
      attributionModel: "multi-touch",
      inputPorts: [{ id: "inputs.event", dataType: "event" }],
      outputPorts: [],
    },
  },
] as const satisfies readonly CampaignCanvasBlock[];

const commentToDmLandingWorkflowEdges = [
  {
    id: "edge.comment-to-dm",
    source: "node.instagram-comment",
    sourcePort: "outputs.comment",
    target: "node.instagram-dm",
    targetPort: "inputs.event",
    type: "event",
    label: "matching comment",
    properties: {
      eventType: "instagram.comment.created",
    },
  },
  {
    id: "edge.dm-to-landing",
    source: "node.instagram-dm",
    sourcePort: "outputs.delivery",
    target: "node.landing-page",
    targetPort: "inputs.dmReferralContext",
    type: "handoff",
    label: "delivered DM referral",
    properties: {
      payloadSchemaVersion: LANDING_PAGE_HANDOFF_PAYLOAD_SCHEMA_VERSION,
    },
  },
  {
    id: "edge.landing-to-conversion",
    source: "node.landing-page",
    sourcePort: "outputs.conversionEvent",
    target: "node.conversion-tracking",
    targetPort: "inputs.event",
    type: "tracking",
    label: "purchase event",
    properties: {
      conversionEvent: "purchase",
    },
  },
] as const satisfies readonly CampaignCanvasEdge[];

const commentToDmLandingWorkflowPlugins = [
  {
    pluginId: COMMENT_TO_DM_PLUGIN_ID,
    type: "direct-message",
    lifecycleState: "active",
    permissionMode: "basic",
    capabilityIds: [COMMENT_TO_DM_CAPABILITY_ID],
    configuration: {
      values: commentToDmAppliedConfigurationFixture.values,
      secretRefs: {},
      updatedAt: COMMENT_TO_DM_WORKFLOW_TIMESTAMP,
    },
    installedBy: "agent",
    configuredBy: "agent",
    activatedBy: "agent",
    installedAt: COMMENT_TO_DM_WORKFLOW_TIMESTAMP,
    configuredAt: COMMENT_TO_DM_WORKFLOW_TIMESTAMP,
    activatedAt: COMMENT_TO_DM_WORKFLOW_TIMESTAMP,
    updatedAt: COMMENT_TO_DM_WORKFLOW_TIMESTAMP,
  },
  {
    pluginId: COMMENT_TO_DM_LANDING_PLUGIN_ID,
    type: "landing",
    lifecycleState: "active",
    permissionMode: "basic",
    capabilityIds: [COMMENT_TO_DM_LANDING_CAPABILITY_ID],
    configuration: {
      values: {
        landingPageId: "landing.fixture.drop",
        checkoutUrl: "https://shop.example.test/checkout/drop",
        preserveImmersion: true,
      },
      secretRefs: {},
      updatedAt: COMMENT_TO_DM_WORKFLOW_TIMESTAMP,
    },
    installedBy: "human",
    configuredBy: "agent",
    activatedBy: "agent",
    installedAt: COMMENT_TO_DM_WORKFLOW_TIMESTAMP,
    configuredAt: COMMENT_TO_DM_WORKFLOW_TIMESTAMP,
    activatedAt: COMMENT_TO_DM_WORKFLOW_TIMESTAMP,
    updatedAt: COMMENT_TO_DM_WORKFLOW_TIMESTAMP,
  },
  {
    pluginId: "plugin.tracking.fixture",
    type: "tracking",
    lifecycleState: "active",
    permissionMode: "advanced",
    capabilityIds: ["cap.track-purchase-conversion"],
    configuration: {
      values: {
        destination: "owncanvas",
        conversionKpi: "purchase_conversion_rate",
        attributionWindowDays: 7,
      },
      secretRefs: {},
      updatedAt: COMMENT_TO_DM_WORKFLOW_TIMESTAMP,
    },
    installedBy: "agent",
    configuredBy: "agent",
    activatedBy: "agent",
    installedAt: COMMENT_TO_DM_WORKFLOW_TIMESTAMP,
    configuredAt: COMMENT_TO_DM_WORKFLOW_TIMESTAMP,
    activatedAt: COMMENT_TO_DM_WORKFLOW_TIMESTAMP,
    updatedAt: COMMENT_TO_DM_WORKFLOW_TIMESTAMP,
  },
] as const satisfies readonly CampaignWorkflowPluginConfiguration[];

export const commentToDmLandingWorkflowConfigurationFixture = {
  schemaVersion: "owncanvas.campaign.v1",
  id: COMMENT_TO_DM_CAMPAIGN_ID,
  title: "Instagram comment-to-DM landing workflow",
  objective:
    "Convert launch-post commenters into purchases through tracked Instagram DMs and an immersive landing page.",
  targetAudience: {
    age: "24-38",
    gender: "all",
    interests: "creator tools, commerce automation, AI content workflows",
    behavior: "comments on launch posts to request private product links",
    region: "US",
    platform: "Instagram",
  },
  productOffer: {
    product: {
      id: "product.fixture",
      title: "Creator Commerce Kit",
      brand: "OwnCanvas",
      category: "digital toolkit",
      description: "A reusable kit for building content-commerce launch flows.",
      tags: ["creator", "commerce", "campaign"],
      canonicalUrl: "https://shop.example.test/products/creator-commerce-kit",
      media: [
        {
          id: "asset.product.hero",
          type: "image",
          url: "https://shop.example.test/assets/creator-kit-hero.png",
          altText: "Creator Commerce Kit product hero",
          role: "primary",
        },
      ],
      variants: [
        {
          id: "variant.fixture.standard",
          title: "Standard",
          sku: "OCK-STANDARD",
          attributes: {
            license: "single-seat",
          },
          price: {
            amount: 129,
            currency: "USD",
            display: "$129",
          },
          availability: "in-stock",
        },
      ],
    },
    offer: {
      headline: "Private launch access",
      summary: "DM-only launch link for qualified Instagram commenters.",
      price: {
        amount: 129,
        currency: "USD",
        display: "$129",
      },
      discount: "Launch bonus included",
      terms: "Available during the launch window.",
      destinationUrl: COMMENT_TO_DM_LANDING_URL,
      callToAction: "Open private launch link",
    },
    attribution: {
      source: "fixture",
      externalId: "offer.fixture",
      affiliateNetwork: "owncanvas",
      commissionRate: 0.2,
      trackingUrl: COMMENT_TO_DM_LANDING_URL,
    },
  },
  campaignSpec: {
    nodes: [...commentToDmLandingWorkflowNodes],
    edges: [...commentToDmLandingWorkflowEdges],
    assetGenerationJobs: [],
  },
  canvasState: {
    nodes: [...commentToDmLandingWorkflowNodes],
    edges: [...commentToDmLandingWorkflowEdges],
  },
  plugins: [...commentToDmLandingWorkflowPlugins],
  assets: [],
  channels: [
    {
      id: "channel.instagram-dm.fixture",
      type: "direct-message",
      platform: "instagram",
      label: "Instagram DM launch route",
      providerPluginId: COMMENT_TO_DM_PLUGIN_ID,
      account: {
        id: COMMENT_TO_DM_ACCOUNT_ID,
        handle: "@owncanvas.fixture",
      },
      placement: "post-comment-dm",
      destinationUrl: COMMENT_TO_DM_LANDING_URL,
      landingPageId: "landing.fixture.drop",
      schedule: {
        mode: "manual",
        startsAt: COMMENT_TO_DM_WORKFLOW_TIMESTAMP,
        timezone: "UTC",
      },
      tracking: {
        utmSource: "instagram",
        utmMedium: "dm",
        utmCampaign: COMMENT_TO_DM_CAMPAIGN_ID,
        utmContent: "ig.media.fixture",
        conversionEvent: "purchase",
      },
      publishedLinks: [],
      status: "configured",
    },
  ],
  tracking: {
    utm: {
      source: "instagram",
      medium: "dm",
      campaign: COMMENT_TO_DM_CAMPAIGN_ID,
      content: "ig.media.fixture",
      term: "comment_keyword",
    },
    attributionParameters: [
      {
        key: "oc_dm_delivery_event_id",
        value: "exec.instagram-dm.fixture",
        source: "dm.delivery",
      },
      {
        key: "oc_touchpoint_id",
        value: "touch.instagram-dm.fixture",
        source: "landing.referral",
      },
    ],
    pixelEvents: [
      {
        id: "pixel.purchase.fixture",
        provider: "owncanvas",
        pixelId: "pixel.fixture",
        eventName: "purchase",
        conversion: true,
      },
    ],
    analyticsDestinations: [
      {
        id: "analytics.owncanvas.fixture",
        provider: "owncanvas",
        destinationId: "dataset.comment-to-dm.fixture",
        label: "OwnCanvas campaign attribution",
        enabled: true,
      },
    ],
    analytics: ["owncanvas"],
    events: [
      "instagram.comment.created",
      "instagram.dm.delivered",
      "landing.viewed",
      "purchase",
    ],
    conversions: ["purchase"],
    evaluation: {
      schemaVersion: "owncanvas.campaign-evaluation.v1",
      primarySuccessMetric: {
        id: "metric.purchase_conversion.fixture",
        metric: "purchase_conversion_rate",
        eventName: "purchase",
        unit: "percent",
        priority: "primary",
        optimizationDirection: "increase",
        attributionRole: "final_conversion",
        description:
          "Purchase conversion is the primary campaign success metric for the comment-to-DM landing flow.",
      },
      secondaryMetrics: [],
    },
    measurementGoals: [
      {
        id: "goal.purchase-conversion.fixture",
        name: "Purchase conversion",
        target: 0.08,
        unit: "rate",
        successCriteria:
          "Purchases divided by delivered tracked Instagram DMs reaches 8%.",
        reportingTimeframe: {
          startsAt: "2026-05-11T00:00:00.000Z",
          endsAt: "2026-05-18T00:00:00.000Z",
          timezone: "UTC",
        },
      },
    ],
    metrics: [
      {
        id: "metric.purchase-rate.fixture",
        metric: "purchase_conversion_rate",
        value: 0,
        unit: "rate",
        source: "plugin.tracking.fixture",
        attributionTouchpoint: "checkout.purchase",
        observedAt: COMMENT_TO_DM_WORKFLOW_TIMESTAMP,
      },
    ],
    attribution: {
      model: "linear",
      touchpoints: [
        "instagram.comment",
        "instagram.dm",
        "landing.page",
        "checkout.purchase",
      ],
    },
  },
  logs: [
    "Fixture workflow defines Instagram comment trigger to DM response to landing conversion orchestration.",
  ],
  versions: ["fixture.comment-to-dm-landing.v1"],
  status: "draft",
} satisfies CampaignDraft;

export const matchingCommentEventFixture = {
  schemaVersion: INSTAGRAM_COMMENT_TRIGGER_EVENT_SCHEMA_VERSION,
  id: "evt.instagram-comment.matching",
  campaignId: COMMENT_TO_DM_CAMPAIGN_ID,
  occurredAt: "2026-05-11T00:00:00.000Z",
  channel: "instagram",
  trigger: "comment",
  accountId: COMMENT_TO_DM_ACCOUNT_ID,
  mediaId: "ig.media.fixture",
  commentId: "ig.comment.matching",
  commenter: {
    id: "ig.user.fixture",
    platform: "instagram",
    platformUserId: "17841400000000000",
    username: "creativebuyer",
    identityLinkage: {
      normalizedIdentityId: "identity.instagram.creativebuyer",
      namespace: "instagram-commenters",
      linkSource: "instagram-comment-webhook",
      linkConfidence: 0.91,
      linkedAt: "2026-05-11T00:00:01.000Z",
    },
  },
  text: "Please send the DROP link",
  permalink: "https://www.instagram.com/p/DROP001/c/ig.comment.matching/",
  attribution: {
    source: "instagram",
    medium: "comment",
    campaign: COMMENT_TO_DM_CAMPAIGN_ID,
    content: "ig.media.fixture",
    term: "Please send the DROP link",
  },
  metadata: {
    sourceNodeId: "node.instagram-comment",
    productOfferId: "offer.fixture",
  },
} satisfies InstagramCommentTriggerEvent;

export const nonMatchingCommentEventFixture = {
  ...matchingCommentEventFixture,
  id: "evt.instagram-comment.no-match",
  commentId: "ig.comment.no-match",
  text: "Looks interesting",
  attribution: {
    ...matchingCommentEventFixture.attribution,
    term: "Looks interesting",
  },
} satisfies InstagramCommentTriggerEvent;

export type CommentToDmLandingSampleIoFixture = {
  input: {
    instagramCommentEvent: InstagramCommentTriggerEvent;
  };
  output: {
    generatedDmPayload: InstagramDmActionExecutionRequest;
    landingPageDestinationState: LandingFlowDestinationMappingAction;
  };
};

export function createDmExecutionRequestFromSelectionFixture(
  selection: Extract<InstagramDmResponseSelectionResult, { matched: true }>,
): InstagramDmActionExecutionRequest {
  return {
    schemaVersion: INSTAGRAM_DM_ACTION_EXECUTION_SCHEMA_VERSION,
    id: "exec.instagram-dm.fixture",
    campaignId: COMMENT_TO_DM_CAMPAIGN_ID,
    capabilityId: COMMENT_TO_DM_CAPABILITY_ID,
    requestedAt: "2026-05-11T00:02:00.000Z",
    requestedBy: "agent",
    triggerEvent: matchingCommentEventFixture,
    recipient: {
      instagramUserId: matchingCommentEventFixture.commenter.id,
      username: matchingCommentEventFixture.commenter.username,
    },
    message: {
      templateId: selection.message.templateId,
      text: selection.message.text.replace("{{landingUrl}}", selection.landingUrl),
    },
    landingUrl: selection.landingUrl,
    attribution: selection.attribution,
    metadata: {
      matcherId: selection.matcherId,
      mappingId: selection.mappingId,
    },
  };
}

export const commentToDmLandingSampleIoFixture = {
  input: {
    instagramCommentEvent: matchingCommentEventFixture,
  },
  output: {
    generatedDmPayload: {
      schemaVersion: INSTAGRAM_DM_ACTION_EXECUTION_SCHEMA_VERSION,
      id: "exec.instagram-dm.fixture",
      campaignId: COMMENT_TO_DM_CAMPAIGN_ID,
      capabilityId: COMMENT_TO_DM_CAPABILITY_ID,
      requestedAt: "2026-05-11T00:02:00.000Z",
      requestedBy: "agent",
      triggerEvent: matchingCommentEventFixture,
      recipient: {
        instagramUserId: "ig.user.fixture",
        username: "creativebuyer",
      },
      message: {
        templateId: "template.drop-link",
        text: `Here is your private launch link: ${COMMENT_TO_DM_LANDING_URL}`,
      },
      landingUrl: COMMENT_TO_DM_LANDING_URL,
      attribution: {
        source: "instagram",
        medium: "dm",
        campaign: COMMENT_TO_DM_CAMPAIGN_ID,
        content: "ig.media.fixture",
        term: "Please send the DROP link",
      },
      metadata: {
        matcherId: "condition.drop-link",
        mappingId: "mapping.drop-link",
      },
    },
    landingPageDestinationState: {
      schemaVersion: LANDING_FLOW_DESTINATION_MAPPING_SCHEMA_VERSION,
      id: "landing-flow.map.fixture",
      campaignId: COMMENT_TO_DM_CAMPAIGN_ID,
      requestedAt: "2026-05-11T00:02:02.000Z",
      requestedBy: "agent",
      sourceDmResponse: {
        pluginId: COMMENT_TO_DM_PLUGIN_ID,
        capabilityId: COMMENT_TO_DM_CAPABILITY_ID,
        responseEventId: "exec.instagram-dm.fixture",
        channel: "instagram",
        status: "delivered",
        messageId: "ig.dm.fixture",
      },
      landingDestination: {
        landingPageId: "landing.fixture.drop",
        pageType: "content-commerce",
        url: COMMENT_TO_DM_LANDING_URL,
        checkoutUrl: "https://shop.example.test/checkout/drop",
        preserveImmersion: true,
      },
      attribution: {
        source: "instagram",
        medium: "dm",
        campaign: COMMENT_TO_DM_CAMPAIGN_ID,
        content: "ig.media.fixture",
        term: "Please send the DROP link",
      },
      visitor: {
        anonymousId: "anon.instagram.fixture",
        platformUserId: "17841400000000000",
      },
      offer: {
        productId: "product.fixture",
        offerId: "offer.fixture",
        sku: "OCK-STANDARD",
      },
      metadata: {
        sourceNodeId: "node.landing-page",
        preservesImmersion: true,
      },
    },
  },
} satisfies CommentToDmLandingSampleIoFixture;
