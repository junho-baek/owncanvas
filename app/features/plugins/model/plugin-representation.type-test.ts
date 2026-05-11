import {
  ALL_PLUGIN_TYPES,
  DEFAULT_PLUGIN_KIND_REGISTRY,
  DM_AUTOMATION_CONFIGURATION_SCHEMA,
  DM_AUTOMATION_CONFIGURATION_SCHEMA_VERSION,
  INSTAGRAM_COMMENT_TRIGGER_CONFIGURATION_SCHEMA,
  INSTAGRAM_COMMENT_TRIGGER_CONFIGURATION_SCHEMA_VERSION,
  INSTAGRAM_COMMENT_TRIGGER_EVENT_SCHEMA,
  INSTAGRAM_COMMENT_TRIGGER_EVENT_SCHEMA_VERSION,
  INSTAGRAM_COMMENT_TRIGGER_SUPPORTED_OPERATORS,
  INSTAGRAM_DM_ACTION_CONFIGURATION_SCHEMA,
  INSTAGRAM_DM_ACTION_CONFIGURATION_SCHEMA_VERSION,
  INSTAGRAM_DM_ACTION_EXECUTION_SCHEMA,
  INSTAGRAM_DM_ACTION_EXECUTION_SCHEMA_VERSION,
  LANDING_PAGE_HANDOFF_CONFIGURATION_SCHEMA,
  LANDING_PAGE_HANDOFF_CONFIGURATION_SCHEMA_VERSION,
  LANDING_PAGE_HANDOFF_PAYLOAD_SCHEMA,
  LANDING_PAGE_HANDOFF_PAYLOAD_SCHEMA_VERSION,
  LANDING_PAGE_HANDOFF_TRACKING_METADATA_SCHEMA,
  LANDING_PAGE_HANDOFF_TRACKING_METADATA_SCHEMA_VERSION,
  PLUGIN_LIFECYCLE_TRANSITIONS,
  createPluginDefaultConfigurationSchema,
  definePluginManifest,
  getPluginKindDefinition,
  isPluginLifecycleTransitionAllowed,
  isSupportedPluginType,
  listPluginKindDefinitions,
  type AgentConfigurationField,
  type AgentPluginCapability,
  type AgentPluginManifest,
  type BuiltInProviderConfigurationField,
  type CommissionConfigurationField,
  type CommissionPluginManifest,
  type CommissionPluginCapability,
  type DashboardConfigurationField,
  type DashboardPluginCapability,
  type DashboardPluginManifest,
  type DirectMessageConfigurationField,
  type DmAutomationConfiguration,
  type DirectMessagePluginCapability,
  type DirectMessagePluginManifest,
  type InstagramCommenterIdentityReference,
  type InstagramCommentTriggerConfiguration,
  type InstagramCommentTriggerEvent,
  type InstagramDmActionConfiguration,
  type InstagramDmActionExecutionRequest,
  type InstagramDmActionExecutionResponse,
  type InstagramDmActionExecutor,
  type ExternalProviderConfigurationField,
  type LandingConfigurationField,
  type LandingPageHandoffConfiguration,
  type LandingPageHandoffPayload,
  type LandingPageHandoffTrackingMetadata,
  type LandingPluginCapability,
  type LandingPluginManifest,
  type PluginLifecycle,
  type PluginLifecycleState,
  type PluginDefaultConfigurationSchema,
  type PluginManifest,
  type CompletePluginKindRegistry,
  type PluginKindDefinition,
  type PluginType,
  type ProviderPluginManifest,
} from "~/features/plugins/model/plugin-representation";

const allCampaignPluginTypes = [
  "provider",
  "commission",
  "agent",
  "dashboard",
  "direct-message",
  "landing",
  "tracking",
  "custom",
] as const satisfies readonly PluginType[];

ALL_PLUGIN_TYPES satisfies typeof allCampaignPluginTypes;
DEFAULT_PLUGIN_KIND_REGISTRY satisfies CompletePluginKindRegistry;
DEFAULT_PLUGIN_KIND_REGISTRY.provider satisfies PluginKindDefinition;
DEFAULT_PLUGIN_KIND_REGISTRY.provider.capabilityKinds[0] satisfies string;
DEFAULT_PLUGIN_KIND_REGISTRY["direct-message"].requiredDetailKey satisfies string | undefined;
listPluginKindDefinitions()[0] satisfies PluginKindDefinition;
getPluginKindDefinition("tracking")?.type satisfies "tracking" | undefined;
isSupportedPluginType("custom") satisfies boolean;

const pluginLifecycle = {
  state: "available",
  installedAt: undefined,
  configuredAt: undefined,
  activatedAt: undefined,
  deactivatedAt: undefined,
  error: undefined,
  updatedAt: "2026-05-11T00:00:00.000Z",
} satisfies PluginLifecycle;

pluginLifecycle.state satisfies PluginLifecycleState;
PLUGIN_LIFECYCLE_TRANSITIONS.available satisfies readonly ["installed"];
isPluginLifecycleTransitionAllowed("available", "installed") satisfies true;
isPluginLifecycleTransitionAllowed("available", "active") satisfies false;

const mediaProviderPlugin = definePluginManifest({
  schemaVersion: "owncanvas.plugin.v1",
  id: "plugin.openai.media",
  name: "OpenAI Media",
  version: "0.1.0",
  type: "provider",
  lifecycle: {
    state: "available",
    updatedAt: "2026-05-11T00:00:00.000Z",
  },
  origin: {
    kind: "built-in",
    packageName: "@owncanvas/provider-openai",
  },
  metadata: {
    displayName: "OpenAI Media",
    description: "Generates campaign image and video variants.",
    homepageUrl: "https://owncanvas.local/plugins/openai-media",
    tags: ["image", "video", "provider"],
  },
  permissions: {
    mode: "advanced",
    installableBy: ["human", "agent"],
    configurableBy: ["human", "agent"],
    requiresApprovalFor: ["external_publish"],
  },
  provider: {
    providerKind: "built-in",
    mediaTypes: ["image", "video"],
    execution: "hosted",
    advanced: false,
  },
  capabilities: [
    {
      id: "cap.image.bulk",
      kind: "generate.image",
      title: "Bulk image generation",
      description: "Generate image variants for a campaign in parallel.",
      concurrency: {
        supportsParallel: true,
        maxParallel: 8,
        supportsBulk: true,
      },
      inputPorts: [{ id: "prompt", dataType: "text", required: true }],
      outputPorts: [{ id: "images", dataType: "image", multiple: true }],
    },
    {
      id: "cap.video.bulk",
      kind: "generate.video",
      title: "Bulk video generation",
      description: "Generate short-form video variants in parallel.",
      concurrency: {
        supportsParallel: true,
        maxParallel: 4,
        supportsBulk: true,
      },
      inputPorts: [{ id: "storyboard", dataType: "json", required: true }],
      outputPorts: [{ id: "videos", dataType: "video", multiple: true }],
    },
  ],
  configuration: {
    fields: [
      {
        key: "apiKey",
        label: "API key",
        type: "secret",
        required: true,
        scope: "user",
        providerConfigType: "credential",
        secretRef: "openai.apiKey",
      },
      {
        key: "defaultModel",
        label: "Default model",
        type: "string",
        required: false,
        scope: "campaign",
        providerConfigType: "model",
        mediaType: "image",
        modelIds: ["image-standard", "video-standard"],
      },
    ],
  },
});

const externalAttributionPlugin = {
  schemaVersion: "owncanvas.plugin.v1",
  id: "plugin.partner.attribution",
  name: "Partner Attribution",
  version: "1.2.0",
  type: "tracking",
  lifecycle: {
    state: "installed",
    installedAt: "2026-05-11T00:00:00.000Z",
    updatedAt: "2026-05-11T00:00:00.000Z",
  },
  origin: {
    kind: "external",
    packageName: "@partner/attribution",
    registryUrl: "https://registry.example.test",
  },
  metadata: {
    displayName: "Partner Attribution",
    description: "Tracks full-funnel campaign conversion events.",
    tags: ["tracking", "conversion"],
  },
  permissions: {
    mode: "basic",
    installableBy: ["human"],
    configurableBy: ["human", "agent"],
    requiresApprovalFor: ["network_access"],
  },
  capabilities: [
    {
      id: "cap.track.conversion",
      kind: "track.conversion",
      title: "Conversion tracking",
      description: "Collects attribution events through purchase conversion.",
      concurrency: {
        supportsParallel: false,
        supportsBulk: false,
      },
      inputPorts: [{ id: "event", dataType: "event", required: true }],
      outputPorts: [{ id: "attribution", dataType: "json", multiple: false }],
    },
  ],
  configuration: {
    fields: [
      {
        key: "pixelId",
        label: "Pixel ID",
        type: "string",
        required: true,
        scope: "workspace",
      },
    ],
  },
} satisfies PluginManifest;

mediaProviderPlugin.capabilities[0].outputPorts[0].dataType satisfies "image";
externalAttributionPlugin.permissions.mode satisfies "basic";

mediaProviderPlugin.provider.providerKind satisfies "built-in";
mediaProviderPlugin.provider.mediaTypes satisfies readonly ["image", "video"];
mediaProviderPlugin.configuration.fields[0] satisfies BuiltInProviderConfigurationField;

const providerWithoutGenerationCapability = {
  schemaVersion: "owncanvas.plugin.v1",
  id: "plugin.invalid.empty-provider",
  name: "Invalid Empty Provider",
  version: "0.1.0",
  type: "provider",
  lifecycle: {
    state: "available",
    updatedAt: "2026-05-11T00:00:00.000Z",
  },
  origin: {
    kind: "built-in",
    packageName: "@owncanvas/provider-empty",
  },
  metadata: {
    displayName: "Invalid Empty Provider",
    description: "Missing generation capabilities.",
    tags: ["provider"],
  },
  permissions: {
    mode: "basic",
    installableBy: ["human", "agent"],
    configurableBy: ["human", "agent"],
    requiresApprovalFor: [],
  },
  provider: {
    providerKind: "built-in",
    mediaTypes: ["image"],
    execution: "hosted",
    advanced: false,
  },
  capabilities: [],
  configuration: {
    fields: [
      {
        key: "apiKey",
        label: "API key",
        type: "secret",
        required: true,
        scope: "user",
        providerConfigType: "credential",
      },
    ],
  },
} as const;

// @ts-expect-error provider plugins require at least one generation capability.
providerWithoutGenerationCapability satisfies ProviderPluginManifest;

const builtInProviderWithExternalEndpointField = {
  ...providerWithoutGenerationCapability,
  id: "plugin.invalid.builtin-endpoint",
  capabilities: mediaProviderPlugin.capabilities,
  configuration: {
    fields: [
      {
        key: "baseUrl",
        label: "Base URL",
        type: "string",
        required: true,
        scope: "workspace",
        providerConfigType: "endpoint",
      },
    ],
  },
} as const;

// @ts-expect-error built-in provider configuration excludes external endpoint fields.
builtInProviderWithExternalEndpointField satisfies ProviderPluginManifest;

const advancedExternalProviderPlugin = definePluginManifest({
  schemaVersion: "owncanvas.plugin.v1",
  id: "plugin.runway.video",
  name: "Runway Video",
  version: "0.1.0",
  type: "provider",
  lifecycle: {
    state: "available",
    updatedAt: "2026-05-11T00:00:00.000Z",
  },
  origin: {
    kind: "external",
    packageName: "@owncanvas/provider-runway",
    registryUrl: "https://registry.example.test",
  },
  metadata: {
    displayName: "Runway Video",
    description: "Connects advanced external video generation models.",
    documentationUrl: "https://docs.example.test/runway",
    tags: ["video", "provider", "external"],
  },
  permissions: {
    mode: "advanced",
    installableBy: ["human", "agent"],
    configurableBy: ["human", "agent"],
    requiresApprovalFor: ["network_access", "secret_access", "spend_budget"],
  },
  provider: {
    providerKind: "external",
    mediaTypes: ["video"],
    execution: "remote",
    advanced: true,
  },
  capabilities: [
    {
      id: "cap.video.remote",
      kind: "generate.video",
      title: "Remote video generation",
      description: "Generates paid video variants through an external provider.",
      concurrency: {
        supportsParallel: true,
        supportsBulk: true,
        maxParallel: 3,
      },
      inputPorts: [{ id: "storyboard", dataType: "json", required: true }],
      outputPorts: [{ id: "videos", dataType: "video", multiple: true }],
    },
  ],
  configuration: {
    fields: [
      {
        key: "apiKey",
        label: "API key",
        type: "secret",
        required: true,
        scope: "user",
        providerConfigType: "credential",
        secretRef: "runway.apiKey",
      },
      {
        key: "baseUrl",
        label: "Base URL",
        type: "string",
        required: true,
        scope: "workspace",
        providerConfigType: "endpoint",
        defaultValue: "https://api.example.test",
      },
      {
        key: "monthlyBudgetCents",
        label: "Monthly budget",
        type: "number",
        required: true,
        scope: "workspace",
        providerConfigType: "budget",
        defaultValue: 10000,
      },
    ],
  },
});

advancedExternalProviderPlugin satisfies ProviderPluginManifest;
advancedExternalProviderPlugin.provider.providerKind satisfies "external";
advancedExternalProviderPlugin.configuration.fields[0] satisfies ExternalProviderConfigurationField;

const advancedExternalProviderDefaultConfigurationSchema =
  createPluginDefaultConfigurationSchema(advancedExternalProviderPlugin);

advancedExternalProviderDefaultConfigurationSchema satisfies PluginDefaultConfigurationSchema;
advancedExternalProviderDefaultConfigurationSchema.pluginType satisfies "provider";
advancedExternalProviderDefaultConfigurationSchema.defaults.values satisfies Record<string, unknown>;
advancedExternalProviderDefaultConfigurationSchema.defaults.secretRefs satisfies Record<string, string>;
advancedExternalProviderDefaultConfigurationSchema.fields[0].sensitive satisfies boolean;

const affiliateCommissionPlugin = definePluginManifest({
  schemaVersion: "owncanvas.plugin.v1",
  id: "plugin.partnerstack.commission",
  name: "PartnerStack Commission",
  version: "0.1.0",
  type: "commission",
  lifecycle: {
    state: "available",
    updatedAt: "2026-05-11T00:00:00.000Z",
  },
  origin: {
    kind: "external",
    packageName: "@owncanvas/commission-partnerstack",
    registryUrl: "https://registry.example.test",
  },
  metadata: {
    displayName: "PartnerStack Commission",
    description: "Resolves affiliate offers and tracked payout rules.",
    tags: ["commission", "affiliate", "conversion"],
  },
  permissions: {
    mode: "advanced",
    installableBy: ["human", "agent"],
    configurableBy: ["human", "agent"],
    requiresApprovalFor: ["network_access", "secret_access", "external_publish"],
  },
  commission: {
    model: "affiliate",
    supportedOfferSources: ["catalog", "manual"],
    payoutCurrencies: ["USD"],
    requiresAttribution: true,
  },
  capabilities: [
    {
      id: "cap.offer.resolve",
      kind: "commission.offer",
      title: "Resolve tracked offer",
      description: "Selects a product offer and returns a tracked referral URL.",
      concurrency: {
        supportsParallel: true,
        supportsBulk: true,
        maxParallel: 50,
      },
      inputPorts: [
        { id: "audience", dataType: "audience", required: true },
        { id: "product", dataType: "product", required: true },
      ],
      outputPorts: [
        { id: "offer", dataType: "product", multiple: false },
        { id: "trackingUrl", dataType: "url", multiple: false },
      ],
    },
  ],
  configuration: {
    fields: [
      {
        key: "networkAccountId",
        label: "Network account ID",
        type: "string",
        required: true,
        scope: "workspace",
        commissionConfigType: "network",
        networkKind: "affiliate",
      },
      {
        key: "defaultCommissionRate",
        label: "Default commission rate",
        type: "number",
        required: true,
        scope: "campaign",
        commissionConfigType: "payout",
        payoutModel: "percentage",
        defaultValue: 20,
      },
      {
        key: "cookieWindowDays",
        label: "Cookie window",
        type: "number",
        required: true,
        scope: "campaign",
        commissionConfigType: "attribution-window",
        windowUnit: "day",
        defaultValue: 30,
      },
    ],
  },
});

affiliateCommissionPlugin satisfies CommissionPluginManifest;
affiliateCommissionPlugin.commission.model satisfies "affiliate";
affiliateCommissionPlugin.configuration.fields[0] satisfies CommissionConfigurationField;
affiliateCommissionPlugin.capabilities[0] satisfies CommissionPluginCapability;

const canvasOperatorAgentPlugin = definePluginManifest({
  schemaVersion: "owncanvas.plugin.v1",
  id: "plugin.agent.canvas-operator",
  name: "Canvas Operator Agent",
  version: "0.1.0",
  type: "agent",
  lifecycle: {
    state: "configured",
    installedAt: "2026-05-11T00:00:00.000Z",
    configuredAt: "2026-05-11T00:01:00.000Z",
    updatedAt: "2026-05-11T00:01:00.000Z",
  },
  origin: {
    kind: "built-in",
    packageName: "@owncanvas/agent-canvas-operator",
  },
  metadata: {
    displayName: "Canvas Operator Agent",
    description: "Uses explicit canvas actions to create, edit, and connect campaign nodes.",
    tags: ["agent", "canvas"],
  },
  permissions: {
    mode: "advanced",
    installableBy: ["human", "agent"],
    configurableBy: ["human", "agent"],
    requiresApprovalFor: ["agent_execution"],
  },
  agent: {
    autonomy: "supervised",
    supportedActions: [
      "canvas.node.create",
      "canvas.node.update",
      "canvas.edge.connect",
      "campaign.landing.behavior.set",
    ],
    safetyMode: "advanced",
    requiresHumanApproval: true,
  },
  capabilities: [
    {
      id: "cap.canvas.action",
      kind: "agent.action",
      title: "Canvas action",
      description: "Performs the same explicit canvas actions available to humans.",
      concurrency: {
        supportsParallel: false,
        supportsBulk: false,
      },
      inputPorts: [{ id: "action", dataType: "json", required: true }],
      outputPorts: [{ id: "result", dataType: "event", multiple: false }],
    },
  ],
  configuration: {
    fields: [
      {
        key: "instructionProfile",
        label: "Instruction profile",
        type: "json",
        required: true,
        scope: "workspace",
        agentConfigType: "instruction",
      },
    ],
  },
});

canvasOperatorAgentPlugin satisfies AgentPluginManifest;
canvasOperatorAgentPlugin.agent.supportedActions[0] satisfies "canvas.node.create";
canvasOperatorAgentPlugin.capabilities[0] satisfies AgentPluginCapability;
canvasOperatorAgentPlugin.configuration.fields[0] satisfies AgentConfigurationField;

const conversionDashboardPlugin = definePluginManifest({
  schemaVersion: "owncanvas.plugin.v1",
  id: "plugin.dashboard.conversion",
  name: "Conversion Dashboard",
  version: "0.1.0",
  type: "dashboard",
  lifecycle: {
    state: "configured",
    installedAt: "2026-05-11T00:00:00.000Z",
    configuredAt: "2026-05-11T00:01:00.000Z",
    updatedAt: "2026-05-11T00:01:00.000Z",
  },
  origin: {
    kind: "built-in",
    packageName: "@owncanvas/dashboard-conversion",
  },
  metadata: {
    displayName: "Conversion Dashboard",
    description: "Reports campaign funnel attribution through conversion.",
    tags: ["dashboard", "conversion"],
  },
  permissions: {
    mode: "basic",
    installableBy: ["human", "agent"],
    configurableBy: ["human", "agent"],
    requiresApprovalFor: [],
  },
  dashboard: {
    reportTypes: ["funnel", "conversion", "attribution"],
    supportedVisualizations: ["table", "line", "funnel"],
    realtime: true,
    exportable: true,
  },
  capabilities: [
    {
      id: "cap.conversion.report",
      kind: "dashboard.report",
      title: "Conversion report",
      description: "Builds a conversion-first attribution report.",
      concurrency: {
        supportsParallel: true,
        supportsBulk: false,
        maxParallel: 4,
      },
      inputPorts: [{ id: "events", dataType: "event", required: true, multiple: true }],
      outputPorts: [{ id: "report", dataType: "json", multiple: false }],
    },
  ],
  configuration: {
    fields: [
      {
        key: "primaryMetric",
        label: "Primary metric",
        type: "select",
        required: true,
        scope: "campaign",
        dashboardConfigType: "metric",
        metricKind: "conversion",
      },
      {
        key: "defaultVisualization",
        label: "Default visualization",
        type: "select",
        required: true,
        scope: "workspace",
        dashboardConfigType: "visualization",
        visualization: "funnel",
      },
    ],
  },
});

conversionDashboardPlugin satisfies DashboardPluginManifest;
conversionDashboardPlugin.dashboard.reportTypes[0] satisfies "funnel";
conversionDashboardPlugin.capabilities[0] satisfies DashboardPluginCapability;
conversionDashboardPlugin.configuration.fields[0] satisfies DashboardConfigurationField;

const instagramDirectMessagePlugin = definePluginManifest({
  schemaVersion: "owncanvas.plugin.v1",
  id: "plugin.instagram.dm",
  name: "Instagram DM",
  version: "0.1.0",
  type: "direct-message",
  lifecycle: {
    state: "configured",
    installedAt: "2026-05-11T00:00:00.000Z",
    configuredAt: "2026-05-11T00:01:00.000Z",
    updatedAt: "2026-05-11T00:01:00.000Z",
  },
  origin: {
    kind: "external",
    packageName: "@owncanvas/plugin-instagram-dm",
    registryUrl: "https://registry.example.test",
  },
  metadata: {
    displayName: "Instagram DM",
    description: "Turns campaign comments into compliant direct-message flows.",
    tags: ["instagram", "dm", "conversion"],
  },
  permissions: {
    mode: "advanced",
    installableBy: ["human", "agent"],
    configurableBy: ["human", "agent"],
    requiresApprovalFor: ["network_access", "external_publish"],
  },
  directMessage: {
    channel: "instagram",
    supportedTriggers: ["comment", "keyword"],
    deliveryModes: ["one-to-one", "bulk"],
    requiresComplianceReview: true,
    automationConfigurationSchemas: [DM_AUTOMATION_CONFIGURATION_SCHEMA],
    actionConfigurationSchemas: [INSTAGRAM_DM_ACTION_CONFIGURATION_SCHEMA],
    triggerConfigurationSchemas: [INSTAGRAM_COMMENT_TRIGGER_CONFIGURATION_SCHEMA],
    triggerEventSchemas: [INSTAGRAM_COMMENT_TRIGGER_EVENT_SCHEMA],
  },
  capabilities: [
    {
      id: "cap.comment-to-dm",
      kind: "channel.dm",
      title: "Comment to DM",
      description: "Sends a tracked landing link after an eligible comment.",
      concurrency: {
        supportsParallel: true,
        supportsBulk: true,
        maxParallel: 20,
      },
      inputPorts: [{ id: "trigger", dataType: "event", required: true }],
      outputPorts: [{ id: "delivery", dataType: "event", multiple: false }],
    },
  ],
  configuration: {
    fields: [
      {
        key: "accountId",
        label: "Account ID",
        type: "string",
        required: true,
        scope: "workspace",
        directMessageConfigType: "account",
        channel: "instagram",
      },
      {
        key: "messageTemplate",
        label: "Message template",
        type: "string",
        required: true,
        scope: "campaign",
        directMessageConfigType: "template",
      },
    ],
  },
});

instagramDirectMessagePlugin satisfies DirectMessagePluginManifest;
instagramDirectMessagePlugin.directMessage.channel satisfies "instagram";
instagramDirectMessagePlugin.directMessage.automationConfigurationSchemas[0].configurationSchemaVersion satisfies typeof DM_AUTOMATION_CONFIGURATION_SCHEMA_VERSION;
instagramDirectMessagePlugin.directMessage.actionConfigurationSchemas[0].configurationSchemaVersion satisfies typeof INSTAGRAM_DM_ACTION_CONFIGURATION_SCHEMA_VERSION;
instagramDirectMessagePlugin.directMessage.triggerConfigurationSchemas[0].schemaVersion satisfies typeof INSTAGRAM_COMMENT_TRIGGER_CONFIGURATION_SCHEMA_VERSION;
instagramDirectMessagePlugin.directMessage.triggerEventSchemas[0].eventSchemaVersion satisfies typeof INSTAGRAM_COMMENT_TRIGGER_EVENT_SCHEMA_VERSION;
instagramDirectMessagePlugin.capabilities[0] satisfies DirectMessagePluginCapability;
instagramDirectMessagePlugin.configuration.fields[0] satisfies DirectMessageConfigurationField;

const dmAutomationConfiguration = {
  schemaVersion: DM_AUTOMATION_CONFIGURATION_SCHEMA_VERSION,
  channel: "instagram",
  trigger: "comment",
  campaignId: "campaign.launch-1",
  templates: [
    {
      id: "template.drop-link",
      name: "Drop link reply",
      body: "Hi {{firstName}}, here is your private link: {{landingUrl}}",
      requiredVariables: ["firstName", "landingUrl"],
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
      key: "landingUrl",
      source: "landing-route",
      path: "routes.default.url",
      required: true,
    },
  ],
  landingUrlRoutes: [
    {
      id: "route.default",
      label: "Default product landing",
      urlTemplate:
        "https://shop.example.test/drop?utm_source=instagram&utm_medium=dm&utm_campaign={{campaignId}}",
      appendAttribution: true,
    },
  ],
  defaultTemplateId: "template.drop-link",
  defaultLandingRouteId: "route.default",
} satisfies DmAutomationConfiguration;

dmAutomationConfiguration.templates[0].requiredVariables[0] satisfies string;
dmAutomationConfiguration.personalizationVariables[0].source satisfies "profile";
DM_AUTOMATION_CONFIGURATION_SCHEMA.routingFields[0] satisfies "landingUrlRoutes.id";

const instagramCommentTriggerConfiguration = {
  schemaVersion: INSTAGRAM_COMMENT_TRIGGER_CONFIGURATION_SCHEMA_VERSION,
  accountId: "ig.account.1",
  mediaIds: ["ig.media.1"],
  conditionMatchers: [
    {
      id: "condition.any-keyword",
      field: "text",
      operator: "any_keyword",
      keywords: ["send me the link", "drop"],
    },
    {
      id: "condition.mention",
      field: "mentions",
      operator: "contains",
      mentions: ["@owncanvas"],
    },
    {
      id: "condition.metadata",
      field: "metadata",
      metadataField: "sourceNodeId",
      operator: "equals",
      value: "node.instagram-comment",
    },
  ],
  keywordMatchers: [
    {
      id: "matcher.send-link",
      matchType: "contains",
      value: "send me the link",
    },
  ],
  attribution: {
    campaign: "campaign.launch-1",
    contentTemplate: "{{mediaId}}",
    termTemplate: "{{commentText}}",
  },
} satisfies InstagramCommentTriggerConfiguration;

instagramCommentTriggerConfiguration.conditionMatchers[0].operator satisfies "any_keyword";
instagramCommentTriggerConfiguration.keywordMatchers[0].matchType satisfies "contains";
INSTAGRAM_COMMENT_TRIGGER_SUPPORTED_OPERATORS[0] satisfies "equals";
INSTAGRAM_COMMENT_TRIGGER_CONFIGURATION_SCHEMA.conditionFields[0] satisfies "text";
INSTAGRAM_COMMENT_TRIGGER_CONFIGURATION_SCHEMA.metadataFields[0] satisfies "sourceNodeId";

const instagramDmActionConfiguration = {
  schemaVersion: INSTAGRAM_DM_ACTION_CONFIGURATION_SCHEMA_VERSION,
  campaignId: "campaign.launch-1",
  capabilityId: "cap.comment-to-dm",
  triggerConfiguration: instagramCommentTriggerConfiguration,
  message: {
    templateId: "template.drop-link",
    text: "Here is your private launch link: {{landingUrl}}",
    variables: {
      landingUrl: "https://shop.example.test/drop?utm_source=instagram",
    },
  },
  landingUrl: "https://shop.example.test/drop?utm_source=instagram&utm_medium=dm",
  attribution: {
    source: "instagram",
    medium: "dm",
    campaign: "campaign.launch-1",
    content: "ig.media.1",
  },
} satisfies InstagramDmActionConfiguration;

instagramDmActionConfiguration.attribution.medium satisfies "dm";
INSTAGRAM_DM_ACTION_CONFIGURATION_SCHEMA.configurationSchemaVersion satisfies typeof INSTAGRAM_DM_ACTION_CONFIGURATION_SCHEMA_VERSION;

const instagramCommentTriggerEvent = {
  schemaVersion: INSTAGRAM_COMMENT_TRIGGER_EVENT_SCHEMA_VERSION,
  id: "evt.instagram-comment.1",
  campaignId: "campaign.launch-1",
  occurredAt: "2026-05-11T00:00:00.000Z",
  channel: "instagram",
  trigger: "comment",
  accountId: "ig.account.1",
  mediaId: "ig.media.1",
  commentId: "ig.comment.1",
  commenter: {
    id: "ig.user.1",
    platform: "instagram",
    platformUserId: "17841400000000000",
    username: "creativebuyer",
    profile: {
      profileUrl: "https://www.instagram.com/creativebuyer/",
      profilePictureUrl: "https://cdn.example.test/creativebuyer.jpg",
    },
    identityLinkage: {
      normalizedIdentityId: "identity.instagram.creativebuyer",
      namespace: "instagram-commenters",
      externalUserId: "crm.user.42",
      anonymousId: "anon.instagram.42",
      emailHash: "sha256:emailhash",
      phoneHash: "sha256:phonehash",
      linkSource: "comment-to-dm",
      linkConfidence: 0.94,
      linkedAt: "2026-05-11T00:00:01.000Z",
    },
  },
  text: "send me the link",
  attribution: {
    source: "instagram",
    medium: "comment",
    campaign: "campaign.launch-1",
    content: "ig.media.1",
  },
} satisfies InstagramCommentTriggerEvent;

instagramCommentTriggerEvent.channel satisfies "instagram";
instagramCommentTriggerEvent.trigger satisfies "comment";
instagramCommentTriggerEvent.commenter satisfies InstagramCommenterIdentityReference;
instagramCommentTriggerEvent.commenter.platformUserId satisfies string;
instagramCommentTriggerEvent.commenter.identityLinkage.normalizedIdentityId satisfies string;

const instagramDmActionExecutionRequest = {
  schemaVersion: INSTAGRAM_DM_ACTION_EXECUTION_SCHEMA_VERSION,
  id: "exec.instagram-dm.1",
  campaignId: "campaign.launch-1",
  capabilityId: "cap.comment-to-dm",
  requestedAt: "2026-05-11T00:02:00.000Z",
  requestedBy: "agent",
  triggerEvent: instagramCommentTriggerEvent,
  recipient: {
    instagramUserId: "ig.user.1",
    username: "creativebuyer",
  },
  message: {
    templateId: "template.drop-link",
    text: "Here is the tracked link for the launch.",
    variables: {
      firstName: "Creative Buyer",
    },
  },
  landingUrl: "https://shop.example.test/drop?utm_source=instagram",
  attribution: {
    source: "instagram",
    medium: "dm",
    campaign: "campaign.launch-1",
    content: "ig.media.1",
  },
} satisfies InstagramDmActionExecutionRequest;

instagramDmActionExecutionRequest.requestedBy satisfies "agent";
instagramDmActionExecutionRequest.attribution.medium satisfies "dm";
INSTAGRAM_DM_ACTION_EXECUTION_SCHEMA.executionSchemaVersion satisfies typeof INSTAGRAM_DM_ACTION_EXECUTION_SCHEMA_VERSION;

const instagramDmActionExecutionResponse = {
  schemaVersion: INSTAGRAM_DM_ACTION_EXECUTION_SCHEMA_VERSION,
  requestId: "exec.instagram-dm.1",
  campaignId: "campaign.launch-1",
  capabilityId: "cap.comment-to-dm",
  status: "queued",
  occurredAt: "2026-05-11T00:02:01.000Z",
  delivery: {
    channel: "instagram",
    recipientId: "ig.user.1",
    landingUrl: "https://shop.example.test/drop?utm_source=instagram",
  },
  attribution: {
    source: "instagram",
    medium: "dm",
    campaign: "campaign.launch-1",
  },
} satisfies InstagramDmActionExecutionResponse;

instagramDmActionExecutionResponse.delivery.channel satisfies "instagram";

const instagramDmActionExecutor = {
  async execute(request, context) {
    return {
      schemaVersion: INSTAGRAM_DM_ACTION_EXECUTION_SCHEMA_VERSION,
      requestId: request.id,
      campaignId: request.campaignId,
      capabilityId: request.capabilityId,
      status: "queued",
      occurredAt: context.now?.() ?? request.requestedAt,
      delivery: {
        channel: "instagram",
        recipientId: request.recipient.instagramUserId,
        landingUrl: request.landingUrl,
      },
      attribution: request.attribution,
    };
  },
} satisfies InstagramDmActionExecutor;

instagramDmActionExecutor.execute satisfies InstagramDmActionExecutor["execute"];

const immersiveLandingPlugin = definePluginManifest({
  schemaVersion: "owncanvas.plugin.v1",
  id: "plugin.landing.immersive",
  name: "Immersive Landing",
  version: "0.1.0",
  type: "landing",
  lifecycle: {
    state: "configured",
    installedAt: "2026-05-11T00:00:00.000Z",
    configuredAt: "2026-05-11T00:01:00.000Z",
    updatedAt: "2026-05-11T00:01:00.000Z",
  },
  origin: {
    kind: "built-in",
    packageName: "@owncanvas/landing-immersive",
  },
  metadata: {
    displayName: "Immersive Landing",
    description: "Publishes content-commerce landing destinations.",
    tags: ["landing", "conversion"],
  },
  permissions: {
    mode: "advanced",
    installableBy: ["human", "agent"],
    configurableBy: ["human", "agent"],
    requiresApprovalFor: ["external_publish"],
  },
  landing: {
    pageTypes: ["product", "content-commerce"],
    publishTargets: ["hosted", "custom-domain"],
    supportsCheckout: true,
    preservesImmersion: true,
    handoffConfigurationSchemas: [LANDING_PAGE_HANDOFF_CONFIGURATION_SCHEMA],
    handoffPayloadSchemas: [LANDING_PAGE_HANDOFF_PAYLOAD_SCHEMA],
    trackingMetadataSchemas: [LANDING_PAGE_HANDOFF_TRACKING_METADATA_SCHEMA],
  },
  capabilities: [
    {
      id: "cap.publish-landing",
      kind: "landing.page",
      title: "Publish landing page",
      description: "Builds an immersive landing page with tracked conversion links.",
      concurrency: {
        supportsParallel: true,
        supportsBulk: false,
        maxParallel: 3,
      },
      inputPorts: [{ id: "creative", dataType: "json", required: true }],
      outputPorts: [{ id: "url", dataType: "url", multiple: false }],
    },
  ],
  configuration: {
    fields: [
      {
        key: "domain",
        label: "Domain",
        type: "string",
        required: true,
        scope: "workspace",
        landingConfigType: "domain",
        publishTarget: "custom-domain",
      },
      {
        key: "pageTemplate",
        label: "Page template",
        type: "select",
        required: true,
        scope: "campaign",
        landingConfigType: "template",
        pageType: "content-commerce",
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
});

immersiveLandingPlugin satisfies LandingPluginManifest;
immersiveLandingPlugin.landing.preservesImmersion satisfies true;
immersiveLandingPlugin.landing.handoffConfigurationSchemas[0].schemaVersion satisfies typeof LANDING_PAGE_HANDOFF_CONFIGURATION_SCHEMA_VERSION;
immersiveLandingPlugin.landing.handoffPayloadSchemas[0].schemaVersion satisfies typeof LANDING_PAGE_HANDOFF_PAYLOAD_SCHEMA_VERSION;
immersiveLandingPlugin.landing.trackingMetadataSchemas[0].schemaVersion satisfies typeof LANDING_PAGE_HANDOFF_TRACKING_METADATA_SCHEMA_VERSION;
immersiveLandingPlugin.capabilities[0] satisfies LandingPluginCapability;
immersiveLandingPlugin.configuration.fields[0] satisfies LandingConfigurationField;

const landingHandoffConfiguration = {
  schemaVersion: LANDING_PAGE_HANDOFF_CONFIGURATION_SCHEMA_VERSION,
  landingPageId: "landing.drop-1",
  pageType: "content-commerce",
  destinationUrl: "https://shop.example.test/drop",
  checkoutUrl: "https://shop.example.test/checkout/drop-1",
  preserveImmersion: true,
} satisfies LandingPageHandoffConfiguration;

const landingHandoffTrackingMetadata = {
  schemaVersion: LANDING_PAGE_HANDOFF_TRACKING_METADATA_SCHEMA_VERSION,
  attribution: {
    source: "instagram",
    medium: "dm",
    campaign: "campaign.launch-1",
  },
  events: [
    {
      name: "purchase_conversion",
      destination: "owncanvas",
      required: true,
      conversion: true,
    },
  ],
  conversion: {
    eventName: "purchase_conversion",
    attributionWindowDays: 7,
  },
} satisfies LandingPageHandoffTrackingMetadata;

const landingHandoffPayload = {
  schemaVersion: LANDING_PAGE_HANDOFF_PAYLOAD_SCHEMA_VERSION,
  id: "handoff.payload.1",
  campaignId: "campaign.launch-1",
  requestedAt: "2026-05-11T00:04:00.000Z",
  requestedBy: "agent",
  configuration: landingHandoffConfiguration,
  payload: {
    creative: {
      headline: "Spring drop",
    },
    productOffer: {
      productId: "product.drop-1",
      offerId: "offer.spring-drop",
      checkoutUrl: "https://shop.example.test/checkout/drop-1",
    },
  },
  tracking: landingHandoffTrackingMetadata,
} satisfies LandingPageHandoffPayload;

landingHandoffPayload.requestedBy satisfies "agent";
landingHandoffPayload.tracking.conversion.eventName satisfies string;

const dashboardWithoutReportCapability = {
  ...conversionDashboardPlugin,
  id: "plugin.invalid.dashboard-capability",
  capabilities: [
    {
      id: "cap.track.only",
      kind: "track.conversion",
      title: "Track only",
      description: "Tracks conversion without reporting on it.",
      concurrency: {
        supportsParallel: false,
        supportsBulk: false,
      },
      inputPorts: [{ id: "event", dataType: "event", required: true }],
      outputPorts: [{ id: "result", dataType: "json", multiple: false }],
    },
  ],
} as const;

// @ts-expect-error dashboard plugins require dashboard.report capabilities.
dashboardWithoutReportCapability satisfies DashboardPluginManifest;

const dashboardWithoutConfiguration = {
  ...conversionDashboardPlugin,
  id: "plugin.invalid.dashboard-config",
  configuration: {
    fields: [],
  },
} as const;

// @ts-expect-error dashboard plugins require at least one typed configuration field.
dashboardWithoutConfiguration satisfies DashboardPluginManifest;

const directMessageWithoutDmCapability = {
  ...instagramDirectMessagePlugin,
  id: "plugin.invalid.dm-capability",
  capabilities: [
    {
      id: "cap.publish",
      kind: "channel.publish",
      title: "Publish",
      description: "Publishes without private-message delivery.",
      concurrency: {
        supportsParallel: false,
        supportsBulk: false,
      },
      inputPorts: [{ id: "event", dataType: "event", required: true }],
      outputPorts: [{ id: "result", dataType: "json", multiple: false }],
    },
  ],
} as const;

// @ts-expect-error direct-message plugins require channel.dm capabilities.
directMessageWithoutDmCapability satisfies DirectMessagePluginManifest;

const directMessageWithoutConfiguration = {
  ...instagramDirectMessagePlugin,
  id: "plugin.invalid.dm-config",
  configuration: {
    fields: [],
  },
} as const;

// @ts-expect-error direct-message plugins require at least one typed configuration field.
directMessageWithoutConfiguration satisfies DirectMessagePluginManifest;

const landingWithoutPageCapability = {
  ...immersiveLandingPlugin,
  id: "plugin.invalid.landing-capability",
  capabilities: [
    {
      id: "cap.publish",
      kind: "channel.publish",
      title: "Publish",
      description: "Publishes without landing page creation.",
      concurrency: {
        supportsParallel: false,
        supportsBulk: false,
      },
      inputPorts: [{ id: "event", dataType: "event", required: true }],
      outputPorts: [{ id: "result", dataType: "json", multiple: false }],
    },
  ],
} as const;

// @ts-expect-error landing plugins require landing.page capabilities.
landingWithoutPageCapability satisfies LandingPluginManifest;

const landingWithoutConfiguration = {
  ...immersiveLandingPlugin,
  id: "plugin.invalid.landing-config",
  configuration: {
    fields: [],
  },
} as const;

// @ts-expect-error landing plugins require at least one typed configuration field.
landingWithoutConfiguration satisfies LandingPluginManifest;

const agentWithoutActionCapability = {
  ...canvasOperatorAgentPlugin,
  id: "plugin.invalid.agent-capability",
  capabilities: [
    {
      id: "cap.report",
      kind: "dashboard.report",
      title: "Report",
      description: "Reports without acting on the canvas.",
      concurrency: {
        supportsParallel: false,
        supportsBulk: false,
      },
      inputPorts: [{ id: "event", dataType: "event", required: true }],
      outputPorts: [{ id: "report", dataType: "json", multiple: false }],
    },
  ],
} as const;

// @ts-expect-error agent plugins require agent.action capabilities.
agentWithoutActionCapability satisfies AgentPluginManifest;

const agentWithoutConfiguration = {
  ...canvasOperatorAgentPlugin,
  id: "plugin.invalid.agent-config",
  configuration: {
    fields: [],
  },
} as const;

// @ts-expect-error agent plugins require at least one typed configuration field.
agentWithoutConfiguration satisfies AgentPluginManifest;

const commissionWithoutOfferCapability = {
  ...affiliateCommissionPlugin,
  id: "plugin.invalid.commission-capability",
  capabilities: [
    {
      id: "cap.track.only",
      kind: "track.conversion",
      title: "Track only",
      description: "Tracks conversion without resolving an offer.",
      concurrency: {
        supportsParallel: false,
        supportsBulk: false,
      },
      inputPorts: [{ id: "event", dataType: "event", required: true }],
      outputPorts: [{ id: "report", dataType: "json", multiple: false }],
    },
  ],
} as const;

// @ts-expect-error commission plugins require commission.offer capabilities.
commissionWithoutOfferCapability satisfies CommissionPluginManifest;

const commissionWithoutConfiguration = {
  ...affiliateCommissionPlugin,
  id: "plugin.invalid.commission-config",
  configuration: {
    fields: [],
  },
} as const;

// @ts-expect-error commission plugins require at least one typed configuration field.
commissionWithoutConfiguration satisfies CommissionPluginManifest;

const pluginTypeLifecycleCoverage = {
  provider: {
    state: "available",
    updatedAt: "2026-05-11T00:00:00.000Z",
  },
  commission: {
    state: "installed",
    installedAt: "2026-05-11T00:00:00.000Z",
    updatedAt: "2026-05-11T00:00:00.000Z",
  },
  agent: {
    state: "configured",
    installedAt: "2026-05-11T00:00:00.000Z",
    configuredAt: "2026-05-11T00:01:00.000Z",
    updatedAt: "2026-05-11T00:01:00.000Z",
  },
  dashboard: {
    state: "active",
    installedAt: "2026-05-11T00:00:00.000Z",
    configuredAt: "2026-05-11T00:01:00.000Z",
    activatedAt: "2026-05-11T00:02:00.000Z",
    updatedAt: "2026-05-11T00:02:00.000Z",
  },
  "direct-message": {
    state: "inactive",
    installedAt: "2026-05-11T00:00:00.000Z",
    deactivatedAt: "2026-05-11T00:03:00.000Z",
    updatedAt: "2026-05-11T00:03:00.000Z",
  },
  landing: {
    state: "error",
    installedAt: "2026-05-11T00:00:00.000Z",
    error: {
      code: "missing-domain",
      message: "Landing plugin needs a publish domain.",
      occurredAt: "2026-05-11T00:04:00.000Z",
    },
    updatedAt: "2026-05-11T00:04:00.000Z",
  },
  tracking: {
    state: "uninstalled",
    installedAt: "2026-05-11T00:00:00.000Z",
    deactivatedAt: "2026-05-11T00:05:00.000Z",
    updatedAt: "2026-05-11T00:05:00.000Z",
  },
  custom: {
    state: "available",
    updatedAt: "2026-05-11T00:00:00.000Z",
  },
} satisfies Record<PluginType, PluginLifecycle>;
