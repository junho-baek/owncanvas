import {
  createCampaignBlock,
  createCampaignMeasurementGoal,
  createCampaignProductOffer,
  createCampaignPublishingChannel,
  createCampaignTargetAudience,
  createCampaignTrackingConfiguration,
  createCampaignWorkflowPluginConfiguration,
  type CampaignCanvasBlock,
  type CampaignCanvasEdge,
  type CampaignDraft,
} from "../../creative-canvas/model/creative-canvas.ts";
import {
  DM_AUTOMATION_CONFIGURATION_SCHEMA_VERSION,
  LANDING_CONVERSION_EVENT_SCHEMA_VERSION,
  LANDING_DM_REFERRAL_CONTEXT_SCHEMA_VERSION,
  LANDING_FLOW_DESTINATION_MAPPING_SCHEMA_VERSION,
  getPluginKindDefinition,
  type DmAutomationConfiguration,
  type DmAutomationReplyAttribution,
  type DmAutomationReplyVariableValue,
  type LandingConversionEventFromFlowInput,
  type LandingDmReferralContextParseInput,
  type LandingFlowDestinationMappingAction,
  type PluginKindDefinition,
} from "./plugin-representation.ts";

const DIRECT_MESSAGE_PLUGIN_KIND = getRequiredPluginKind("direct-message");
const LANDING_PLUGIN_KIND = getRequiredPluginKind("landing");
const TRACKING_PLUGIN_KIND = getRequiredPluginKind("tracking");

export const COMMENT_TO_DM_PLUGIN_REGISTRATION_FIXTURES = [
  DIRECT_MESSAGE_PLUGIN_KIND,
  LANDING_PLUGIN_KIND,
  TRACKING_PLUGIN_KIND,
] as const satisfies readonly PluginKindDefinition[];

export const COMMENT_TO_DM_TEMPLATE_ROUTING_FIXTURE = {
  configuration: {
    schemaVersion: DM_AUTOMATION_CONFIGURATION_SCHEMA_VERSION,
    channel: "instagram",
    trigger: "comment",
    campaignId: "campaign.creator-kit",
    templates: [
      {
        id: "template.comment-drop-link",
        name: "Comment drop link",
        body: "Hi {{firstName}}, your {{offerName}} link is {{landingUrl}}",
        requiredVariables: ["firstName", "offerName", "landingUrl"],
      },
    ],
    personalizationVariables: [
      {
        key: "firstName",
        source: "profile",
        path: "commenter.username",
        fallback: "there",
        required: false,
      },
      {
        key: "offerName",
        source: "product-offer",
        path: "offer.name",
        required: true,
      },
      {
        key: "segment",
        source: "trigger-event",
        path: "comment.keyword",
        required: false,
      },
      {
        key: "landingUrl",
        source: "landing-route",
        path: "routes.selected.url",
        required: true,
      },
    ],
    landingUrlRoutes: [
      {
        id: "route.creator-kit",
        label: "Creator kit landing",
        urlTemplate:
          "https://shop.example.test/creator-kit?campaign={{campaignId}}&offer={{offerName}}",
        routeWhen: {
          variable: "segment",
          operator: "equals",
          value: "creator-kit",
        },
        appendAttribution: true,
      },
      {
        id: "route.default",
        label: "Default campaign landing",
        urlTemplate: "https://shop.example.test/drop?campaign={{campaignId}}",
        appendAttribution: true,
      },
    ],
    defaultTemplateId: "template.comment-drop-link",
    defaultLandingRouteId: "route.default",
  } satisfies DmAutomationConfiguration,
  variables: {
    firstName: "creativebuyer",
    offerName: "Creator Kit",
    segment: "creator-kit",
  } satisfies Record<string, DmAutomationReplyVariableValue>,
  attribution: {
    source: "instagram",
    medium: "dm",
    campaign: "campaign.creator-kit",
    content: "ig.media.42",
    term: "send kit",
  } satisfies DmAutomationReplyAttribution,
} as const;

const COMMENT_TO_DM_REFERRAL_LANDING_URL =
  "https://shop.example.test/creator-kit?utm_source=instagram&utm_medium=dm&utm_campaign=campaign.creator-kit&utm_content=ig.media.42&utm_term=send+kit&oc_dm_plugin_id=plugin.instagram-comment-dm&oc_dm_capability_id=cap.comment-to-dm&oc_dm_delivery_event_id=exec.instagram-dm.42&oc_dm_trigger_event_id=evt.instagram-comment.42&oc_platform_user_id=ig.user.42&oc_username=creativebuyer&oc_touchpoint_id=touch.instagram-dm.42&oc_product_id=product.creator-kit&oc_offer_id=offer.creator-kit";

const COMMENT_TO_DM_LANDING_MAPPING = {
  schemaVersion: LANDING_FLOW_DESTINATION_MAPPING_SCHEMA_VERSION,
  id: "landing-flow.creator-kit.42",
  campaignId: "campaign.creator-kit",
  requestedAt: "2026-05-11T00:04:00.000Z",
  requestedBy: "agent",
  sourceDmResponse: {
    pluginId: "plugin.instagram-comment-dm",
    capabilityId: "cap.comment-to-dm",
    responseEventId: "exec.instagram-dm.42",
    channel: "instagram",
    status: "delivered",
    messageId: "ig.dm.42",
  },
  landingDestination: {
    landingPageId: "landing.creator-kit",
    pageType: "content-commerce",
    url: COMMENT_TO_DM_REFERRAL_LANDING_URL,
    checkoutUrl: "https://shop.example.test/checkout/creator-kit",
    preserveImmersion: true,
  },
  attribution: {
    source: "instagram",
    medium: "dm",
    campaign: "campaign.creator-kit",
    content: "ig.media.42",
    term: "send kit",
    touchpointId: "touch.instagram-dm.42",
  },
  visitor: {
    platformUserId: "ig.user.42",
  },
  offer: {
    productId: "product.creator-kit",
    offerId: "offer.creator-kit",
  },
} as const satisfies LandingFlowDestinationMappingAction;

const COMMENT_TO_DM_CONVERSION_EVENT_INPUT = {
  mapping: COMMENT_TO_DM_LANDING_MAPPING,
  landingPluginId: "plugin.landing.creator-kit",
  landingCapabilityId: "cap.publish-dm-referral-landing",
  conversion: {
    eventName: "purchase",
    value: 129,
    currency: "USD",
    orderId: "order.creator-kit.42",
  },
  measurement: {
    conversionKpi: "purchase_conversion_rate",
    attributionWindowDays: 7,
    trackingPluginId: "plugin.tracking.active-conversion",
    destination: "owncanvas",
  },
  occurredAt: "2026-05-11T00:08:00.000Z",
} as const satisfies LandingConversionEventFromFlowInput;

export const COMMENT_TO_DM_REFERRAL_CONVERSION_FIXTURE = {
  pluginRegistration: {
    kinds: COMMENT_TO_DM_PLUGIN_REGISTRATION_FIXTURES,
  },
  referral: {
    parseInput: {
      landingUrl: COMMENT_TO_DM_REFERRAL_LANDING_URL,
      channel: "instagram",
      campaignId: "campaign.creator-kit",
    } satisfies LandingDmReferralContextParseInput,
  },
  conversion: {
    mapping: COMMENT_TO_DM_LANDING_MAPPING,
    eventInput: COMMENT_TO_DM_CONVERSION_EVENT_INPUT,
  },
  expected: {
    registeredPluginTypes: ["direct-message", "landing", "tracking"],
    referralContext: {
      schemaVersion: LANDING_DM_REFERRAL_CONTEXT_SCHEMA_VERSION,
      campaignId: "campaign.creator-kit",
      channel: "instagram",
      sourceDm: {
        pluginId: "plugin.instagram-comment-dm",
        capabilityId: "cap.comment-to-dm",
        deliveryEventId: "exec.instagram-dm.42",
        triggerEventId: "evt.instagram-comment.42",
      },
      visitor: {
        platformUserId: "ig.user.42",
        username: "creativebuyer",
      },
      landingUrl: COMMENT_TO_DM_REFERRAL_LANDING_URL,
      attribution: {
        source: "instagram",
        medium: "dm",
        campaign: "campaign.creator-kit",
        content: "ig.media.42",
        term: "send kit",
        touchpointId: "touch.instagram-dm.42",
      },
      offer: {
        productId: "product.creator-kit",
        offerId: "offer.creator-kit",
      },
    },
    conversionEvent: {
      schemaVersion: LANDING_CONVERSION_EVENT_SCHEMA_VERSION,
      id: "landing-conversion:landing-flow.creator-kit.42:purchase",
      campaignId: "campaign.creator-kit",
      occurredAt: "2026-05-11T00:08:00.000Z",
      landing: {
        pluginId: "plugin.landing.creator-kit",
        capabilityId: "cap.publish-dm-referral-landing",
        landingPageId: "landing.creator-kit",
        url: COMMENT_TO_DM_REFERRAL_LANDING_URL,
        checkoutUrl: "https://shop.example.test/checkout/creator-kit",
        mappingActionId: "landing-flow.creator-kit.42",
      },
      conversion: {
        eventName: "purchase",
        value: 129,
        currency: "USD",
        orderId: "order.creator-kit.42",
        productId: "product.creator-kit",
        offerId: "offer.creator-kit",
      },
      attribution: {
        source: "instagram",
        medium: "dm",
        campaign: "campaign.creator-kit",
        content: "ig.media.42",
        term: "send kit",
        touchpointId: "touch.instagram-dm.42",
      },
      measurement: {
        conversionKpi: "purchase_conversion_rate",
        attributionWindowDays: 7,
        trackingPluginId: "plugin.tracking.active-conversion",
        destination: "owncanvas",
      },
      visitor: {
        platformUserId: "ig.user.42",
      },
    },
  },
} as const;

const COMMENT_TO_DM_WORKFLOW_NODES = [
  {
    ...createCampaignBlock("dm", 0, { x: 120, y: 180 }),
    id: "node.instagram-comment-trigger",
    title: "Instagram Comment Trigger",
    subtitle: "keyword comment event",
    description: "Starts the campaign when a shopper comments on the launch post.",
    status: "READY",
    properties: {
      pluginId: "plugin.instagram-comment-dm",
      capabilityId: "cap.comment-to-dm",
      nodeKind: "instagram.comment.trigger",
      outputPorts: [{ id: "outputs.comment", dataType: "event" }],
      trigger: COMMENT_TO_DM_TEMPLATE_ROUTING_FIXTURE.configuration.trigger,
      channel: COMMENT_TO_DM_TEMPLATE_ROUTING_FIXTURE.configuration.channel,
    },
  },
  {
    ...createCampaignBlock("dm", 1, { x: 480, y: 180 }),
    id: "node.instagram-dm-reply",
    title: "Instagram DM Reply",
    subtitle: "personalized tracked message",
    description: "Renders the matched DM template with a tracked landing URL.",
    status: "READY",
    properties: {
      pluginId: "plugin.instagram-comment-dm",
      capabilityId: "cap.comment-to-dm",
      nodeKind: "instagram.dm.response",
      inputPorts: [{ id: "inputs.event", dataType: "event" }],
      outputPorts: [{ id: "outputs.delivery", dataType: "event" }],
      templateId:
        COMMENT_TO_DM_TEMPLATE_ROUTING_FIXTURE.configuration.defaultTemplateId,
      landingRouteId: "route.creator-kit",
      configuration: COMMENT_TO_DM_TEMPLATE_ROUTING_FIXTURE.configuration,
    },
  },
  {
    ...createCampaignBlock("landing", 2, { x: 840, y: 180 }),
    id: "node.creator-kit-landing",
    title: "Creator Kit Landing",
    subtitle: "immersive commerce page",
    description: "Preserves DM referral context through landing and checkout.",
    status: "READY",
    properties: {
      pluginId: "plugin.landing.creator-kit",
      capabilityId: "cap.publish-dm-referral-landing",
      nodeKind: "landing.page.publish-redirect",
      inputPorts: [
        { id: "inputs.creative", dataType: "json" },
        { id: "inputs.dmReferralContext", dataType: "json" },
      ],
      outputPorts: [
        { id: "outputs.url", dataType: "url" },
        { id: "outputs.conversionEvent", dataType: "event" },
      ],
      mapping: COMMENT_TO_DM_LANDING_MAPPING,
    },
  },
  {
    ...createCampaignBlock("custom", 3, { x: 1200, y: 180 }),
    id: "node.conversion-tracking",
    title: "Conversion Tracking",
    subtitle: "purchase attribution",
    description: "Records the final purchase KPI and attribution touchpoint.",
    status: "READY",
    properties: {
      pluginId: "plugin.tracking.active-conversion",
      capabilityId: "cap.track-purchase-conversion",
      nodeKind: "tracking.conversion.emit",
      inputPorts: [{ id: "inputs.event", dataType: "event" }],
      outputPorts: [{ id: "outputs.attribution", dataType: "json" }],
      conversionEvent: COMMENT_TO_DM_CONVERSION_EVENT_INPUT.conversion,
      measurement: COMMENT_TO_DM_CONVERSION_EVENT_INPUT.measurement,
    },
  },
] satisfies CampaignCanvasBlock[];

const COMMENT_TO_DM_WORKFLOW_EDGES = [
  {
    id: "edge.comment-to-dm",
    source: "node.instagram-comment-trigger",
    sourcePort: "outputs.comment",
    target: "node.instagram-dm-reply",
    targetPort: "inputs.event",
    label: "matched comment",
  },
  {
    id: "edge.dm-to-landing",
    source: "node.instagram-dm-reply",
    sourcePort: "outputs.delivery",
    target: "node.creator-kit-landing",
    targetPort: "inputs.dmReferralContext",
    label: "dm referral",
  },
  {
    id: "edge.landing-to-tracking",
    source: "node.creator-kit-landing",
    sourcePort: "outputs.conversionEvent",
    target: "node.conversion-tracking",
    targetPort: "inputs.event",
    label: "purchase conversion",
  },
] satisfies CampaignCanvasEdge[];

export const COMMENT_TO_DM_FULL_CAMPAIGN_WORKFLOW_FIXTURE = {
  campaign: {
    schemaVersion: "owncanvas.campaign.v1",
    id: "campaign.creator-kit",
    title: "Creator Kit Comment-to-DM Campaign",
    objective: "Convert Instagram launch comments into tracked creator-kit purchases.",
    targetAudience: createCampaignTargetAudience({
      age: "24-38",
      gender: "all",
      interests: "creator tools, short-form video, ecommerce education",
      behavior: "comments on launch posts to request private purchase links",
      region: "US",
      platform: "Instagram",
    }),
    productOffer: createCampaignProductOffer({
      product: {
        id: "product.creator-kit",
        title: "Creator Kit",
        brand: "OwnCanvas",
        category: "digital-commerce-kit",
        description: "A reusable creator commerce launch kit.",
        tags: ["creator", "commerce", "campaign"],
        canonicalUrl: "https://shop.example.test/products/creator-kit",
      },
      offer: {
        headline: "Creator Kit launch offer",
        summary: "Private DM-only launch bundle for creator commerce workflows.",
        price: {
          amount: 129,
          currency: "USD",
          display: "$129",
        },
        discount: "Launch bundle",
        terms: "Available during the Instagram drop window.",
        destinationUrl: COMMENT_TO_DM_REFERRAL_LANDING_URL,
        callToAction: "Claim the creator kit",
      },
      attribution: {
        source: "affiliate-fixture",
        externalId: "offer.creator-kit",
        affiliateNetwork: "owncanvas-fixture",
        commissionRate: 0.2,
        trackingUrl: COMMENT_TO_DM_REFERRAL_LANDING_URL,
      },
    }),
    campaignSpec: {
      nodes: [...COMMENT_TO_DM_WORKFLOW_NODES],
      edges: [...COMMENT_TO_DM_WORKFLOW_EDGES],
      assetGenerationJobs: [],
    },
    canvasState: {
      nodes: [...COMMENT_TO_DM_WORKFLOW_NODES],
      edges: [...COMMENT_TO_DM_WORKFLOW_EDGES],
    },
    plugins: [
      createCampaignWorkflowPluginConfiguration(
        {
          pluginId: "plugin.instagram-comment-dm",
          type: "direct-message",
          lifecycleState: "active",
          permissionMode: "advanced",
          capabilityIds: ["cap.comment-to-dm"],
          configuration: {
            values: {
              channel: "instagram",
              accountId: "ig.account.creator-kit",
              automation: COMMENT_TO_DM_TEMPLATE_ROUTING_FIXTURE.configuration,
            },
          },
          installedBy: "human",
          configuredBy: "agent",
          activatedBy: "agent",
        },
        { now: () => "2026-05-11T00:00:00.000Z" },
      ),
      createCampaignWorkflowPluginConfiguration(
        {
          pluginId: "plugin.landing.creator-kit",
          type: "landing",
          lifecycleState: "active",
          permissionMode: "advanced",
          capabilityIds: ["cap.publish-dm-referral-landing"],
          configuration: {
            values: {
              landingPageId: "landing.creator-kit",
              preserveImmersion: true,
            },
          },
          installedBy: "human",
          configuredBy: "agent",
          activatedBy: "agent",
        },
        { now: () => "2026-05-11T00:00:00.000Z" },
      ),
      createCampaignWorkflowPluginConfiguration(
        {
          pluginId: "plugin.tracking.active-conversion",
          type: "tracking",
          lifecycleState: "active",
          permissionMode: "basic",
          capabilityIds: ["cap.track-purchase-conversion"],
          configuration: {
            values: {
              destination: "owncanvas",
              conversionKpi: "purchase_conversion_rate",
            },
          },
          installedBy: "agent",
          configuredBy: "agent",
          activatedBy: "agent",
        },
        { now: () => "2026-05-11T00:00:00.000Z" },
      ),
    ],
    assets: [],
    channels: [
      createCampaignPublishingChannel({
        id: "channel.instagram-comment-dm",
        type: "direct-message",
        platform: "instagram",
        label: "Instagram comment DM",
        providerPluginId: "plugin.instagram-comment-dm",
        account: {
          id: "ig.account.creator-kit",
          handle: "owncanvas",
        },
        placement: "comment-to-dm",
        destinationUrl: COMMENT_TO_DM_REFERRAL_LANDING_URL,
        landingPageId: "landing.creator-kit",
        schedule: {
          mode: "manual",
          startsAt: "2026-05-11T00:00:00.000Z",
          timezone: "UTC",
        },
        tracking: {
          utmSource: "instagram",
          utmMedium: "dm",
          utmCampaign: "campaign.creator-kit",
          utmContent: "ig.media.42",
          conversionEvent: "purchase",
        },
        status: "configured",
      }),
    ],
    tracking: createCampaignTrackingConfiguration({
      utm: {
        source: "instagram",
        medium: "dm",
        campaign: "campaign.creator-kit",
        content: "ig.media.42",
        term: "send kit",
      },
      attributionParameters: [
        {
          key: "oc_touchpoint_id",
          value: "touch.instagram-dm.42",
          source: "dm-referral",
        },
        {
          key: "oc_offer_id",
          value: "offer.creator-kit",
          source: "landing-referral",
        },
      ],
      analyticsDestinations: [
        {
          id: "analytics.owncanvas",
          provider: "owncanvas",
          destinationId: "campaign.creator-kit",
          label: "OwnCanvas attribution",
          enabled: true,
        },
      ],
      events: ["instagram.comment.created", "instagram.dm.delivered"],
      conversions: ["purchase"],
      measurementGoals: [
        createCampaignMeasurementGoal({
          id: "goal.purchase-conversion-rate",
          name: "Purchase conversion rate",
          target: 0.08,
          unit: "rate",
          successCriteria: "DM recipients complete a creator-kit purchase.",
          reportingTimeframe: {
            startsAt: "2026-05-11T00:00:00.000Z",
            endsAt: "2026-05-18T00:00:00.000Z",
            timezone: "UTC",
          },
        }),
      ],
      attribution: {
        model: "last-touch",
        touchpoints: ["instagram.comment", "instagram.dm", "landing.purchase"],
      },
    }),
    logs: [
      "2026-05-11T00:00:00.000Z workflow.fixture.created:comment-to-dm-to-landing",
    ],
    versions: ["2026-05-11T00:00:00.000Z fixture.v1"],
    status: "draft",
  } satisfies CampaignDraft,
  expected: {
    nodes: [
      {
        id: "node.instagram-comment-trigger",
        kind: "dm",
        pluginId: "plugin.instagram-comment-dm",
        capabilityId: "cap.comment-to-dm",
      },
      {
        id: "node.instagram-dm-reply",
        kind: "dm",
        pluginId: "plugin.instagram-comment-dm",
        capabilityId: "cap.comment-to-dm",
      },
      {
        id: "node.creator-kit-landing",
        kind: "landing",
        pluginId: "plugin.landing.creator-kit",
        capabilityId: "cap.publish-dm-referral-landing",
      },
      {
        id: "node.conversion-tracking",
        kind: "custom",
        pluginId: "plugin.tracking.active-conversion",
        capabilityId: "cap.track-purchase-conversion",
      },
    ],
    edges: [
      {
        id: "edge.comment-to-dm",
        source: "node.instagram-comment-trigger",
        sourcePort: "outputs.comment",
        target: "node.instagram-dm-reply",
        targetPort: "inputs.event",
      },
      {
        id: "edge.dm-to-landing",
        source: "node.instagram-dm-reply",
        sourcePort: "outputs.delivery",
        target: "node.creator-kit-landing",
        targetPort: "inputs.dmReferralContext",
      },
      {
        id: "edge.landing-to-tracking",
        source: "node.creator-kit-landing",
        sourcePort: "outputs.conversionEvent",
        target: "node.conversion-tracking",
        targetPort: "inputs.event",
      },
    ],
    plugins: [
      {
        pluginId: "plugin.instagram-comment-dm",
        type: "direct-message",
        lifecycleState: "active",
        permissionMode: "advanced",
        capabilityIds: ["cap.comment-to-dm"],
      },
      {
        pluginId: "plugin.landing.creator-kit",
        type: "landing",
        lifecycleState: "active",
        permissionMode: "advanced",
        capabilityIds: ["cap.publish-dm-referral-landing"],
      },
      {
        pluginId: "plugin.tracking.active-conversion",
        type: "tracking",
        lifecycleState: "active",
        permissionMode: "basic",
        capabilityIds: ["cap.track-purchase-conversion"],
      },
    ],
  },
} as const;

function getRequiredPluginKind(type: PluginKindDefinition["type"]) {
  const definition = getPluginKindDefinition(type);

  if (definition === undefined) {
    throw new Error(`Expected plugin kind "${type}" to be registered.`);
  }

  return definition;
}
