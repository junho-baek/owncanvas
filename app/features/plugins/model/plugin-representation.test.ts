import assert from "node:assert/strict";
import { test } from "node:test";

import {
  ALL_PLUGIN_TYPES,
  DEFAULT_PLUGIN_KIND_REGISTRY,
  DM_AUTOMATION_CONFIGURATION_SCHEMA,
  DM_AUTOMATION_CONFIGURATION_SCHEMA_VERSION,
  INSTAGRAM_COMMENT_TRIGGER_CONFIGURATION_SCHEMA,
  INSTAGRAM_COMMENT_TRIGGER_CONFIGURATION_SCHEMA_VERSION,
  INSTAGRAM_COMMENT_TRIGGER_POST_FILTER_FIELDS,
  INSTAGRAM_COMMENT_TRIGGER_EVENT_SCHEMA,
  INSTAGRAM_COMMENT_TRIGGER_EVENT_SCHEMA_VERSION,
  INSTAGRAM_COMMENT_TRIGGER_SUPPORTED_OPERATORS,
  INSTAGRAM_DM_ACTION_CONFIGURATION_SCHEMA,
  INSTAGRAM_DM_ACTION_CONFIGURATION_SCHEMA_VERSION,
  INSTAGRAM_DM_ACTION_EXECUTION_SCHEMA,
  INSTAGRAM_DM_ACTION_EXECUTION_SCHEMA_VERSION,
  LANDING_PAGE_HANDOFF_CONFIGURATION_SCHEMA,
  LANDING_PAGE_HANDOFF_CONFIGURATION_SCHEMA_VERSION,
  LANDING_DM_REFERRAL_CONTEXT_SCHEMA,
  LANDING_DM_REFERRAL_CONTEXT_SCHEMA_VERSION,
  LANDING_FLOW_DESTINATION_MAPPING_ACTION_SCHEMA,
  LANDING_FLOW_DESTINATION_MAPPING_SCHEMA_VERSION,
  LANDING_CONVERSION_EVENT_SCHEMA,
  LANDING_CONVERSION_EVENT_SCHEMA_VERSION,
  LANDING_PAGE_HANDOFF_EVENT_SCHEMA,
  LANDING_PAGE_HANDOFF_EVENT_SCHEMA_VERSION,
  LANDING_PAGE_HANDOFF_PAYLOAD_SCHEMA,
  LANDING_PAGE_HANDOFF_PAYLOAD_SCHEMA_VERSION,
  LANDING_PAGE_HANDOFF_TRACKING_METADATA_SCHEMA,
  LANDING_PAGE_HANDOFF_TRACKING_METADATA_SCHEMA_VERSION,
  PLUGIN_CATALOG_STORAGE_KEY,
  PLUGIN_CONFIGURATION_STORAGE_KEY,
  activateInstalledPluginForAgentInStorage,
  createInstagramDmDispatchAdapter,
  createPluginKindRegistry,
  createPluginDefaultConfigurationSchema,
  deactivateInstalledPluginForAgent,
  deactivateInstalledPluginForAgentInStorage,
  definePluginManifest,
  getPluginKindDefinition,
  getPersistedPluginCatalog,
  installSelectedPluginForAgent,
  installSelectedPluginForAgentInStorage,
  generateDmAutomationReply,
  listDiscoverablePluginsForAgent,
  listInstalledPluginsForAgent,
  listSelectableWorkflowCapabilitiesForAgent,
  parseLandingDmReferralContext,
  createLandingConversionEventFromFlow,
  selectInstagramDmResponseForCommentEvent,
  listPluginKindDefinitions,
  isPluginLifecycleTransitionAllowed,
  isSupportedPluginType,
  registerPluginKind,
  renderDmAutomationReply,
  verifyAgentInstalledPluginUsable,
  validateAgentPluginConfiguration,
  validateCommissionPluginConfiguration,
  validateDashboardPluginConfiguration,
  validateDirectMessagePluginConfiguration,
  validateDmAutomationConfiguration,
  validateInstagramCommentTriggerConfiguration,
  validateInstagramCommentTriggerEvent,
  validateInstagramDmActionConfiguration,
  validateInstagramDmActionExecutionRequest,
  validateLandingFlowDestinationMappingAction,
  validateLandingConversionEvent,
  validateLandingDmReferralContext,
  validateLandingPageHandoffEvent,
  validateLandingPageHandoffPayload,
  validateLandingPageHandoffTrackingMetadata,
  validateLandingPluginConfiguration,
  validateProviderPluginConfiguration,
  mapDmResponseEventToLandingDestinationMetadata,
  type DmAutomationConfiguration,
  type DirectMessagePluginManifest,
  type PluginManifest,
  type PluginType,
} from "./plugin-representation.ts";

type SupportedPluginFixture = {
  type: PluginType;
  title: string;
  registryCapabilityKinds: readonly string[];
  discoveryCapabilityKinds: readonly string[];
  requiredDetailKey?: string;
};

const SUPPORTED_PLUGIN_FIXTURES: readonly SupportedPluginFixture[] = [
  {
    type: "provider",
    title: "Provider",
    registryCapabilityKinds: [
      "generate.text",
      "generate.image",
      "generate.video",
      "generate.voice",
    ],
    discoveryCapabilityKinds: ["generate.image"],
    requiredDetailKey: "provider",
  },
  {
    type: "commission",
    title: "Commission",
    registryCapabilityKinds: ["commission.offer"],
    discoveryCapabilityKinds: ["commission.offer"],
    requiredDetailKey: "commission",
  },
  {
    type: "agent",
    title: "Agent",
    registryCapabilityKinds: ["agent.action"],
    discoveryCapabilityKinds: ["agent.action"],
    requiredDetailKey: "agent",
  },
  {
    type: "dashboard",
    title: "Dashboard",
    registryCapabilityKinds: ["dashboard.report"],
    discoveryCapabilityKinds: ["dashboard.report"],
    requiredDetailKey: "dashboard",
  },
  {
    type: "direct-message",
    title: "Direct Message",
    registryCapabilityKinds: ["channel.dm"],
    discoveryCapabilityKinds: ["channel.dm"],
    requiredDetailKey: "directMessage",
  },
  {
    type: "landing",
    title: "Landing",
    registryCapabilityKinds: ["landing.page"],
    discoveryCapabilityKinds: ["landing.page"],
    requiredDetailKey: "landing",
  },
  {
    type: "tracking",
    title: "Tracking",
    registryCapabilityKinds: ["track.event", "track.conversion"],
    discoveryCapabilityKinds: ["track.event", "track.conversion"],
  },
  {
    type: "custom",
    title: "Custom",
    registryCapabilityKinds: ["custom"],
    discoveryCapabilityKinds: ["custom"],
  },
];

function summarizeKindExpectation(fixture: SupportedPluginFixture) {
  return {
    type: fixture.type,
    title: fixture.title,
    capabilityKinds: fixture.registryCapabilityKinds,
    ...(fixture.requiredDetailKey === undefined
      ? {}
      : { requiredDetailKey: fixture.requiredDetailKey }),
  };
}

function createDiscoverablePluginFixture(type: PluginType): PluginManifest {
  const base = {
    schemaVersion: "owncanvas.plugin.v1" as const,
    id: `plugin.discovery.${type}`,
    name: `Discovery ${type}`,
    version: "0.1.0",
    type,
    lifecycle: {
      state: "available" as const,
      updatedAt: "2026-05-11T00:00:00.000Z",
    },
    origin: {
      kind: "built-in" as const,
      packageName: `@owncanvas/plugin-${type}`,
    },
    metadata: {
      displayName: `Discovery ${type}`,
      description: `Discovers ${type} plugins.`,
      tags: [type],
    },
    permissions: {
      mode: "basic" as const,
      installableBy: ["human", "agent"] as const,
      configurableBy: ["human", "agent"] as const,
      requiresApprovalFor: [],
    },
  };

  switch (type) {
    case "provider":
      return definePluginManifest({
        ...base,
        type,
        provider: {
          providerKind: "built-in",
          mediaTypes: ["image"],
          execution: "hosted",
          advanced: false,
        },
        capabilities: [
          {
            id: "cap.image",
            kind: "generate.image",
            title: "Image generation",
            description: "Generates images.",
            concurrency: { supportsParallel: true, supportsBulk: true },
            inputPorts: [{ id: "prompt", dataType: "text", required: true }],
            outputPorts: [{ id: "image", dataType: "image", multiple: false }],
          },
        ],
        configuration: {
          fields: [
            {
              key: "model",
              label: "Model",
              type: "string",
              required: true,
              scope: "workspace",
              providerConfigType: "model",
            },
          ],
        },
      }) as PluginManifest;
    case "commission":
      return definePluginManifest({
        ...base,
        type,
        commission: {
          model: "affiliate",
          supportedOfferSources: ["catalog"],
          payoutCurrencies: ["USD"],
          requiresAttribution: true,
        },
        capabilities: [
          {
            id: "cap.offer",
            kind: "commission.offer",
            title: "Offer",
            description: "Resolves offers.",
            concurrency: { supportsParallel: false, supportsBulk: false },
            inputPorts: [{ id: "product", dataType: "product", required: true }],
            outputPorts: [{ id: "offer", dataType: "json", multiple: false }],
          },
        ],
        configuration: {
          fields: [
            {
              key: "network",
              label: "Network",
              type: "string",
              required: true,
              scope: "workspace",
              commissionConfigType: "network",
              networkKind: "affiliate",
            },
          ],
        },
      }) as PluginManifest;
    case "agent":
      return definePluginManifest({
        ...base,
        type,
        permissions: {
          ...base.permissions,
          mode: "advanced",
          requiresApprovalFor: ["agent_execution"],
        },
        agent: {
          autonomy: "supervised",
          supportedActions: ["canvas.node.create"],
          safetyMode: "advanced",
          requiresHumanApproval: true,
        },
        capabilities: [
          {
            id: "cap.action",
            kind: "agent.action",
            title: "Canvas action",
            description: "Runs canvas actions.",
            concurrency: { supportsParallel: false, supportsBulk: false },
            inputPorts: [{ id: "action", dataType: "json", required: true }],
            outputPorts: [{ id: "result", dataType: "event", multiple: false }],
          },
        ],
        configuration: {
          fields: [
            {
              key: "instructions",
              label: "Instructions",
              type: "json",
              required: true,
              scope: "workspace",
              agentConfigType: "instruction",
            },
          ],
        },
      }) as PluginManifest;
    case "dashboard":
      return definePluginManifest({
        ...base,
        type,
        dashboard: {
          reportTypes: ["conversion"],
          supportedVisualizations: ["table"],
          realtime: true,
          exportable: true,
        },
        capabilities: [
          {
            id: "cap.report",
            kind: "dashboard.report",
            title: "Report",
            description: "Reports conversions.",
            concurrency: { supportsParallel: false, supportsBulk: false },
            inputPorts: [{ id: "events", dataType: "event", required: true }],
            outputPorts: [{ id: "report", dataType: "json", multiple: false }],
          },
        ],
        configuration: {
          fields: [
            {
              key: "metric",
              label: "Metric",
              type: "select",
              required: true,
              scope: "campaign",
              dashboardConfigType: "metric",
              metricKind: "conversion",
            },
          ],
        },
      }) as PluginManifest;
    case "direct-message":
      return definePluginManifest({
        ...base,
        type,
        directMessage: {
          channel: "instagram",
          supportedTriggers: ["comment"],
          deliveryModes: ["automated"],
          requiresComplianceReview: false,
        },
        capabilities: [
          {
            id: "cap.dm",
            kind: "channel.dm",
            title: "DM",
            description: "Sends campaign DMs.",
            concurrency: { supportsParallel: false, supportsBulk: true },
            inputPorts: [{ id: "event", dataType: "event", required: true }],
            outputPorts: [{ id: "delivery", dataType: "event", multiple: false }],
          },
        ],
        configuration: {
          fields: [
            {
              key: "template",
              label: "Template",
              type: "string",
              required: true,
              scope: "campaign",
              directMessageConfigType: "template",
            },
          ],
        },
      }) as PluginManifest;
    case "landing":
      return definePluginManifest({
        ...base,
        type,
        landing: {
          pageTypes: ["content-commerce"],
          publishTargets: ["hosted"],
          supportsCheckout: true,
          preservesImmersion: true,
        },
        capabilities: [
          {
            id: "cap.page",
            kind: "landing.page",
            title: "Landing page",
            description: "Publishes landing pages.",
            concurrency: { supportsParallel: false, supportsBulk: false },
            inputPorts: [{ id: "creative", dataType: "json", required: true }],
            outputPorts: [{ id: "url", dataType: "url", multiple: false }],
          },
        ],
        configuration: {
          fields: [
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
      }) as PluginManifest;
    case "tracking":
      return definePluginManifest({
        ...base,
        type,
        capabilities: [
          {
            id: "cap.event",
            kind: "track.event",
            title: "Event tracking",
            description: "Tracks funnel events.",
            concurrency: { supportsParallel: false, supportsBulk: true },
            inputPorts: [{ id: "event", dataType: "event", required: true }],
            outputPorts: [{ id: "tracked", dataType: "event", multiple: false }],
          },
          {
            id: "cap.conversion",
            kind: "track.conversion",
            title: "Conversion tracking",
            description: "Tracks final conversions.",
            concurrency: { supportsParallel: false, supportsBulk: true },
            inputPorts: [{ id: "event", dataType: "event", required: true }],
            outputPorts: [
              { id: "attribution", dataType: "json", multiple: false },
            ],
          },
        ],
        configuration: { fields: [] },
      }) as PluginManifest;
    case "custom":
      return definePluginManifest({
        ...base,
        type,
        capabilities: [
          {
            id: "cap.custom",
            kind: "custom",
            title: "Custom",
            description: "Runs custom plugin behavior.",
            concurrency: { supportsParallel: false, supportsBulk: false },
            inputPorts: [{ id: "input", dataType: "json", required: true }],
            outputPorts: [{ id: "output", dataType: "json", multiple: false }],
          },
        ],
        configuration: { fields: [] },
      }) as PluginManifest;
  }
}

test("default plugin kind registry exposes all supported plugin kinds", () => {
  const definitions = listPluginKindDefinitions();

  assert.deepEqual(
    definitions.map((definition) => definition.type),
    ALL_PLUGIN_TYPES,
  );
  assert.equal(getPluginKindDefinition("provider")?.requiredDetailKey, "provider");
  assert.deepEqual(getPluginKindDefinition("direct-message")?.capabilityKinds, [
    "channel.dm",
  ]);
  assert.equal(getPluginKindDefinition("tracking")?.defaultPermissionMode, "basic");
  assert.equal(isSupportedPluginType("landing"), true);
  assert.equal(isSupportedPluginType("unknown"), false);
  assert.equal(Object.isFrozen(DEFAULT_PLUGIN_KIND_REGISTRY), true);
  assert.equal(Object.isFrozen(DEFAULT_PLUGIN_KIND_REGISTRY.provider), true);
});

test("registerPluginKind builds a registry and rejects duplicate kinds", () => {
  const providerKind = getPluginKindDefinition("provider");

  assert.ok(providerKind);

  const registry = registerPluginKind(createPluginKindRegistry([]), providerKind);

  assert.deepEqual(listPluginKindDefinitions(registry), [providerKind]);
  assert.throws(
    () => registerPluginKind(registry, providerKind),
    /already registered/,
  );
});

test("plugin kind registration covers every supported plugin type distinctly", () => {
  const definitions = SUPPORTED_PLUGIN_FIXTURES.map(({ type }) => {
    const definition = getPluginKindDefinition(type);

    assert.ok(definition);

    return definition;
  });
  const registry = createPluginKindRegistry(definitions);

  assert.deepEqual(
    listPluginKindDefinitions(registry).map((definition) => ({
      type: definition.type,
      title: definition.title,
      capabilityKinds: definition.capabilityKinds,
      ...(definition.requiredDetailKey === undefined
        ? {}
        : { requiredDetailKey: definition.requiredDetailKey }),
    })),
    SUPPORTED_PLUGIN_FIXTURES.map(summarizeKindExpectation),
  );
  assert.equal(new Set(definitions.map((definition) => definition.type)).size, 8);
  assert.equal(new Set(definitions.map((definition) => definition.title)).size, 8);
});

test("agent discovery distinguishes every supported plugin kind", () => {
  const catalog = {
    id: "catalog.discovery.all-types",
    updatedAt: "2026-05-11T00:00:00.000Z",
    plugins: ALL_PLUGIN_TYPES.map(createDiscoverablePluginFixture),
  };

  const discoverablePlugins = listDiscoverablePluginsForAgent(catalog);

  assert.deepEqual(
    discoverablePlugins.map((plugin) => ({
      type: plugin.type,
      kind: plugin.kind,
      capabilityKinds: plugin.capabilityKinds,
    })),
    SUPPORTED_PLUGIN_FIXTURES.map(
      ({ type, title, discoveryCapabilityKinds, requiredDetailKey }) => ({
        type,
        kind: {
          type,
          title,
          campaignRole: getPluginKindDefinition(type)?.campaignRole,
          ...(requiredDetailKey === undefined ? {} : { requiredDetailKey }),
        },
        capabilityKinds: discoveryCapabilityKinds,
      }),
    ),
  );
  assert.equal(
    new Set(discoverablePlugins.map((plugin) => plugin.kind.title)).size,
    ALL_PLUGIN_TYPES.length,
  );
});

test("listDiscoverablePluginsForAgent lists agent-installable catalog plugins", () => {
  const agentInstallableProvider = definePluginManifest({
    schemaVersion: "owncanvas.plugin.v1",
    id: "plugin.catalog.image-video",
    name: "Catalog Image Video",
    version: "0.1.0",
    type: "provider",
    lifecycle: {
      state: "available",
      updatedAt: "2026-05-11T00:00:00.000Z",
    },
    origin: {
      kind: "built-in",
      packageName: "@owncanvas/provider-catalog-media",
    },
    metadata: {
      displayName: "Catalog Image Video",
      description: "Generates campaign image and video variants.",
      tags: ["image", "video", "bulk"],
    },
    permissions: {
      mode: "basic",
      installableBy: ["human", "agent"],
      configurableBy: ["human", "agent"],
      requiresApprovalFor: [],
    },
    provider: {
      providerKind: "built-in",
      mediaTypes: ["image", "video"],
      execution: "hosted",
      advanced: false,
    },
    capabilities: [
      {
        id: "cap.bulk-image",
        kind: "generate.image",
        title: "Bulk image generation",
        description: "Generates image variants in parallel.",
        concurrency: {
          supportsParallel: true,
          supportsBulk: true,
          maxParallel: 8,
        },
        inputPorts: [{ id: "prompt", dataType: "text", required: true }],
        outputPorts: [{ id: "images", dataType: "image", multiple: true }],
      },
      {
        id: "cap.bulk-video",
        kind: "generate.video",
        title: "Bulk video generation",
        description: "Generates video variants in parallel.",
        concurrency: {
          supportsParallel: true,
          supportsBulk: true,
          maxParallel: 4,
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
        },
      ],
    },
  });

  const humanOnlyDashboard = definePluginManifest({
    schemaVersion: "owncanvas.plugin.v1",
    id: "plugin.catalog.human-dashboard",
    name: "Human Dashboard",
    version: "0.1.0",
    type: "dashboard",
    lifecycle: {
      state: "available",
      updatedAt: "2026-05-11T00:00:00.000Z",
    },
    origin: {
      kind: "external",
      packageName: "@partner/human-dashboard",
      registryUrl: "https://registry.example.test",
    },
    metadata: {
      displayName: "Human Dashboard",
      description: "Requires human-only installation.",
      tags: ["dashboard"],
    },
    permissions: {
      mode: "advanced",
      installableBy: ["human"],
      configurableBy: ["human"],
      requiresApprovalFor: ["network_access"],
    },
    dashboard: {
      reportTypes: ["conversion"],
      supportedVisualizations: ["table"],
      realtime: false,
      exportable: false,
    },
    capabilities: [
      {
        id: "cap.report",
        kind: "dashboard.report",
        title: "Report",
        description: "Reports conversions.",
        concurrency: {
          supportsParallel: false,
          supportsBulk: false,
        },
        inputPorts: [{ id: "events", dataType: "event", required: true }],
        outputPorts: [{ id: "report", dataType: "json", multiple: false }],
      },
    ],
    configuration: {
      fields: [
        {
          key: "metric",
          label: "Metric",
          type: "select",
          required: true,
          scope: "campaign",
          dashboardConfigType: "metric",
          metricKind: "conversion",
        },
      ],
    },
  });

  const installedAgent = definePluginManifest({
    schemaVersion: "owncanvas.plugin.v1",
    id: "plugin.catalog.installed-agent",
    name: "Installed Agent",
    version: "0.1.0",
    type: "agent",
    lifecycle: {
      state: "installed",
      installedAt: "2026-05-11T00:00:00.000Z",
      updatedAt: "2026-05-11T00:00:00.000Z",
    },
    origin: {
      kind: "built-in",
      packageName: "@owncanvas/agent-installed",
    },
    metadata: {
      displayName: "Installed Agent",
      description: "Already installed in the workspace.",
      tags: ["agent"],
    },
    permissions: {
      mode: "advanced",
      installableBy: ["human", "agent"],
      configurableBy: ["human", "agent"],
      requiresApprovalFor: ["agent_execution"],
    },
    agent: {
      autonomy: "supervised",
      supportedActions: ["canvas.node.create"],
      safetyMode: "advanced",
      requiresHumanApproval: true,
    },
    capabilities: [
      {
        id: "cap.canvas-action",
        kind: "agent.action",
        title: "Canvas action",
        description: "Creates canvas nodes.",
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
          key: "instructions",
          label: "Instructions",
          type: "json",
          required: true,
          scope: "workspace",
          agentConfigType: "instruction",
        },
      ],
    },
  });

  const catalog = {
    id: "catalog.default",
    updatedAt: "2026-05-11T00:00:00.000Z",
    plugins: [humanOnlyDashboard, installedAgent, agentInstallableProvider],
  };

  assert.deepEqual(listDiscoverablePluginsForAgent(catalog), [
    {
      id: "plugin.catalog.image-video",
      name: "Catalog Image Video",
      version: "0.1.0",
      type: "provider",
      kind: {
        type: "provider",
        title: "Provider",
        campaignRole:
          "Supplies creative generation capabilities for campaign canvas nodes.",
        requiredDetailKey: "provider",
      },
      lifecycleState: "available",
      originKind: "built-in",
      displayName: "Catalog Image Video",
      description: "Generates campaign image and video variants.",
      tags: ["image", "video", "bulk"],
      permissionMode: "basic",
      requiresApprovalFor: [],
      capabilityKinds: ["generate.image", "generate.video"],
      supportsParallel: true,
      supportsBulk: true,
    },
  ]);
});

test("listInstalledPluginsForAgent lists installed plugins with activation state", () => {
  const installedProvider = definePluginManifest({
    schemaVersion: "owncanvas.plugin.v1",
    id: "plugin.installed.media",
    name: "Installed Media",
    version: "0.1.0",
    type: "provider",
    lifecycle: {
      state: "installed",
      installedAt: "2026-05-11T00:00:00.000Z",
      updatedAt: "2026-05-11T00:00:00.000Z",
    },
    origin: {
      kind: "built-in",
      packageName: "@owncanvas/provider-installed-media",
    },
    metadata: {
      displayName: "Installed Media",
      description: "Installed media provider.",
      tags: ["media"],
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
    capabilities: [
      {
        id: "cap.image",
        kind: "generate.image",
        title: "Image",
        description: "Generates images.",
        concurrency: {
          supportsParallel: true,
          supportsBulk: true,
        },
        inputPorts: [{ id: "prompt", dataType: "text", required: true }],
        outputPorts: [{ id: "images", dataType: "image", multiple: true }],
      },
    ],
    configuration: {
      fields: [
        {
          key: "model",
          label: "Model",
          type: "select",
          required: true,
          scope: "workspace",
          providerConfigType: "model",
        },
      ],
    },
  });
  const activeTracking: PluginManifest = {
    schemaVersion: "owncanvas.plugin.v1",
    id: "plugin.installed.tracking",
    name: "Installed Tracking",
    version: "0.1.0",
    type: "tracking",
    lifecycle: {
      state: "active",
      installedAt: "2026-05-11T00:00:00.000Z",
      configuredAt: "2026-05-11T00:01:00.000Z",
      activatedAt: "2026-05-11T00:02:00.000Z",
      updatedAt: "2026-05-11T00:02:00.000Z",
    },
    origin: {
      kind: "external",
      packageName: "@partner/installed-tracking",
      registryUrl: "https://registry.example.test",
    },
    metadata: {
      displayName: "Installed Tracking",
      description: "Active conversion tracking plugin.",
      tags: ["tracking", "conversion"],
    },
    permissions: {
      mode: "advanced",
      installableBy: ["human", "agent"],
      configurableBy: ["human", "agent"],
      requiresApprovalFor: ["network_access"],
    },
    capabilities: [
      {
        id: "cap.conversion",
        kind: "track.conversion",
        title: "Conversion",
        description: "Tracks conversions.",
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
  };
  const availableProvider: PluginManifest = {
    ...installedProvider,
    id: "plugin.installed.available",
    lifecycle: {
      state: "available",
      updatedAt: "2026-05-11T00:00:00.000Z",
    },
  };

  assert.deepEqual(
    listInstalledPluginsForAgent({
      id: "catalog.installed",
      updatedAt: "2026-05-11T00:02:00.000Z",
      plugins: [availableProvider, installedProvider, activeTracking],
    }),
    [
      {
        id: "plugin.installed.media",
        name: "Installed Media",
        version: "0.1.0",
        type: "provider",
        lifecycleState: "installed",
        activationState: "installed",
        installedAt: "2026-05-11T00:00:00.000Z",
        originKind: "built-in",
        displayName: "Installed Media",
        permissionMode: "basic",
        configurableByAgent: true,
        configurationState: {
          status: "not_configured",
          requiredFieldCount: 1,
          configuredValueCount: 0,
          configuredSecretRefCount: 0,
          missingRequiredFieldCount: 1,
        },
        requiresApprovalFor: [],
        capabilityKinds: ["generate.image"],
      },
      {
        id: "plugin.installed.tracking",
        name: "Installed Tracking",
        version: "0.1.0",
        type: "tracking",
        lifecycleState: "active",
        activationState: "active",
        installedAt: "2026-05-11T00:00:00.000Z",
        configuredAt: "2026-05-11T00:01:00.000Z",
        activatedAt: "2026-05-11T00:02:00.000Z",
        originKind: "external",
        displayName: "Installed Tracking",
        permissionMode: "advanced",
        configurableByAgent: true,
        configurationState: {
          status: "configured",
          requiredFieldCount: 1,
          configuredValueCount: 0,
          configuredSecretRefCount: 0,
          missingRequiredFieldCount: 0,
        },
        requiresApprovalFor: ["network_access"],
        capabilityKinds: ["track.conversion"],
      },
    ],
  );
});

test("plugin lifecycle transitions allow installation before activation", () => {
  assert.equal(isPluginLifecycleTransitionAllowed("available", "installed"), true);
  assert.equal(isPluginLifecycleTransitionAllowed("available", "active"), false);
  assert.equal(isPluginLifecycleTransitionAllowed("configured", "active"), true);
  assert.equal(isPluginLifecycleTransitionAllowed("active", "uninstalled"), true);
});

test("agents can install a selected available plugin and verify it is usable", () => {
  const availableProvider = definePluginManifest({
    schemaVersion: "owncanvas.plugin.v1",
    id: "plugin.catalog.agent-media",
    name: "Agent Media Provider",
    version: "0.1.0",
    type: "provider",
    lifecycle: {
      state: "available",
      updatedAt: "2026-05-11T00:00:00.000Z",
    },
    origin: {
      kind: "built-in",
      packageName: "@owncanvas/provider-agent-media",
    },
    metadata: {
      displayName: "Agent Media Provider",
      description: "Generates campaign media variants.",
      tags: ["provider", "image", "bulk"],
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
    capabilities: [
      {
        id: "cap.image.bulk",
        kind: "generate.image",
        title: "Bulk image generation",
        description: "Generates image variants in parallel.",
        concurrency: {
          supportsParallel: true,
          supportsBulk: true,
          maxParallel: 6,
        },
        inputPorts: [{ id: "prompt", dataType: "text", required: true }],
        outputPorts: [{ id: "images", dataType: "image", multiple: true }],
      },
    ],
    configuration: {
      fields: [
        {
          key: "model",
          label: "Model",
          type: "select",
          required: true,
          scope: "workspace",
          providerConfigType: "model",
          mediaType: "image",
          defaultValue: "builtin-image-v1",
        },
      ],
    },
  });
  const catalog = {
    id: "catalog.default",
    updatedAt: "2026-05-11T00:00:00.000Z",
    plugins: [availableProvider],
  };

  const installation = installSelectedPluginForAgent(
    catalog,
    "plugin.catalog.agent-media",
    { now: () => "2026-05-11T00:05:00.000Z" },
  );

  assert.equal(installation.ok, true);
  assert.equal(installation.plugin.lifecycle.state, "configured");
  assert.equal(installation.plugin.lifecycle.installedAt, "2026-05-11T00:05:00.000Z");
  assert.equal(installation.plugin.lifecycle.configuredAt, "2026-05-11T00:05:00.000Z");
  assert.equal(installation.plugin.lifecycle.updatedAt, "2026-05-11T00:05:00.000Z");
  assert.deepEqual(installation.plugin.appliedConfiguration, {
    appliedAt: "2026-05-11T00:05:00.000Z",
    appliedBy: "agent",
    source: "plugin.default",
    values: {
      model: "builtin-image-v1",
    },
    secretRefs: {},
    missingRequiredKeys: [],
  });
  assert.equal(catalog.plugins[0].lifecycle.state, "available");

  assert.deepEqual(verifyAgentInstalledPluginUsable(installation.plugin), {
    ok: true,
    errors: [],
    usableCapabilities: [
      {
        id: "cap.image.bulk",
        kind: "generate.image",
        inputPortIds: ["prompt"],
        outputPortIds: ["images"],
        supportsParallel: true,
        supportsBulk: true,
      },
    ],
  });
});

test("agents can deactivate an active installed plugin through the lifecycle service", () => {
  const activeTracking = definePluginManifest({
    schemaVersion: "owncanvas.plugin.v1",
    id: "plugin.agent.active-tracking",
    name: "Agent Active Tracking",
    version: "0.1.0",
    type: "tracking",
    lifecycle: {
      state: "active",
      installedAt: "2026-05-11T00:00:00.000Z",
      configuredAt: "2026-05-11T00:01:00.000Z",
      activatedAt: "2026-05-11T00:02:00.000Z",
      updatedAt: "2026-05-11T00:02:00.000Z",
    },
    origin: {
      kind: "external",
      packageName: "@partner/agent-active-tracking",
      registryUrl: "https://registry.example.test",
    },
    metadata: {
      displayName: "Agent Active Tracking",
      description: "Tracks campaign conversion events.",
      tags: ["tracking", "conversion"],
    },
    permissions: {
      mode: "advanced",
      installableBy: ["human", "agent"],
      configurableBy: ["human", "agent"],
      requiresApprovalFor: ["network_access"],
    },
    capabilities: [
      {
        id: "cap.conversion",
        kind: "track.conversion",
        title: "Conversion tracking",
        description: "Captures conversion attribution.",
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
          defaultValue: "px_123",
        },
      ],
    },
  });
  const catalog = {
    id: "catalog.active",
    updatedAt: "2026-05-11T00:02:00.000Z",
    plugins: [activeTracking],
  };

  const result = deactivateInstalledPluginForAgent(
    catalog,
    "plugin.agent.active-tracking",
    { now: () => "2026-05-11T00:07:00.000Z" },
  );

  assert.equal(result.ok, true);
  assert.equal(result.plugin.lifecycle.state, "inactive");
  assert.equal(result.plugin.lifecycle.deactivatedAt, "2026-05-11T00:07:00.000Z");
  assert.equal(result.plugin.lifecycle.updatedAt, "2026-05-11T00:07:00.000Z");
  assert.equal(result.plugin.lifecycle.activatedAt, "2026-05-11T00:02:00.000Z");
  assert.equal(result.catalog.updatedAt, "2026-05-11T00:07:00.000Z");
  assert.equal(catalog.plugins[0].lifecycle.state, "active");
});

test("agent installation applies secret default refs without copying secret values", () => {
  const externalProvider = definePluginManifest({
    schemaVersion: "owncanvas.plugin.v1",
    id: "plugin.catalog.secret-defaults",
    name: "Secret Defaults Provider",
    version: "0.1.0",
    type: "provider",
    lifecycle: {
      state: "available",
      updatedAt: "2026-05-11T00:00:00.000Z",
    },
    origin: {
      kind: "external",
      packageName: "@partner/secret-defaults",
      registryUrl: "https://registry.example.test",
    },
    metadata: {
      displayName: "Secret Defaults Provider",
      description: "Uses default secret references and model values.",
      tags: ["provider", "defaults"],
    },
    permissions: {
      mode: "advanced",
      installableBy: ["human", "agent"],
      configurableBy: ["human", "agent"],
      requiresApprovalFor: ["secret_access"],
    },
    provider: {
      providerKind: "external",
      mediaTypes: ["image"],
      execution: "remote",
      advanced: true,
    },
    capabilities: [
      {
        id: "cap.image",
        kind: "generate.image",
        title: "Image generation",
        description: "Generates campaign images.",
        concurrency: { supportsParallel: true, supportsBulk: true },
        inputPorts: [{ id: "prompt", dataType: "text", required: true }],
        outputPorts: [{ id: "image", dataType: "image", multiple: false }],
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
          secretRef: "secretDefaults.apiKey",
          defaultValue: "must-not-be-applied",
        },
        {
          key: "model",
          label: "Model",
          type: "select",
          required: true,
          scope: "workspace",
          providerConfigType: "model",
          defaultValue: "image-standard",
        },
      ],
    },
  });
  const catalog = {
    id: "catalog.secret-defaults",
    updatedAt: "2026-05-11T00:00:00.000Z",
    plugins: [externalProvider],
  };

  const installation = installSelectedPluginForAgent(
    catalog,
    "plugin.catalog.secret-defaults",
    { now: () => "2026-05-11T00:06:00.000Z" },
  );

  assert.equal(installation.ok, true);
  assert.equal(installation.plugin.lifecycle.state, "configured");
  assert.deepEqual(installation.plugin.appliedConfiguration, {
    appliedAt: "2026-05-11T00:06:00.000Z",
    appliedBy: "agent",
    source: "plugin.default",
    values: {
      model: "image-standard",
    },
    secretRefs: {
      apiKey: "secretDefaults.apiKey",
    },
    missingRequiredKeys: [],
  });
  assert.equal(
    JSON.stringify(installation.plugin.appliedConfiguration).includes(
      "must-not-be-applied",
    ),
    false,
  );
});

test("agent installation persists applied configuration to plugin storage", () => {
  const storage = new MemoryStorage();
  const availableProvider = definePluginManifest({
    schemaVersion: "owncanvas.plugin.v1",
    id: "plugin.catalog.persisted-defaults",
    name: "Persisted Defaults Provider",
    version: "0.1.0",
    type: "provider",
    lifecycle: {
      state: "available",
      updatedAt: "2026-05-11T00:00:00.000Z",
    },
    origin: {
      kind: "external",
      packageName: "@partner/persisted-defaults",
      registryUrl: "https://registry.example.test",
    },
    metadata: {
      displayName: "Persisted Defaults Provider",
      description: "Persists default configuration after installation.",
      tags: ["provider", "storage"],
    },
    permissions: {
      mode: "advanced",
      installableBy: ["human", "agent"],
      configurableBy: ["human", "agent"],
      requiresApprovalFor: ["secret_access"],
    },
    provider: {
      providerKind: "external",
      mediaTypes: ["image", "video"],
      execution: "remote",
      advanced: true,
    },
    capabilities: [
      {
        id: "cap.image",
        kind: "generate.image",
        title: "Image generation",
        description: "Generates campaign images.",
        concurrency: { supportsParallel: true, supportsBulk: true },
        inputPorts: [{ id: "prompt", dataType: "text", required: true }],
        outputPorts: [{ id: "image", dataType: "image", multiple: false }],
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
          secretRef: "persistedDefaults.apiKey",
          defaultValue: "do-not-store",
        },
        {
          key: "model",
          label: "Model",
          type: "select",
          required: true,
          scope: "workspace",
          providerConfigType: "model",
          defaultValue: "media-pro",
        },
      ],
    },
  });
  const catalog = {
    id: "catalog.persisted-defaults",
    updatedAt: "2026-05-11T00:00:00.000Z",
    plugins: [availableProvider],
  };

  const installation = installSelectedPluginForAgentInStorage(
    storage,
    catalog,
    "plugin.catalog.persisted-defaults",
    { now: () => "2026-05-11T00:08:00.000Z" },
  );
  const persistedCatalog = getPersistedPluginCatalog(storage);

  assert.equal(installation.ok, true);
  assert.equal(persistedCatalog?.plugins[0]?.lifecycle.state, "configured");
  assert.deepEqual(persistedCatalog?.plugins[0]?.appliedConfiguration, {
    appliedAt: "2026-05-11T00:08:00.000Z",
    appliedBy: "agent",
    source: "plugin.default",
    values: {
      model: "media-pro",
    },
    secretRefs: {
      apiKey: "persistedDefaults.apiKey",
    },
    missingRequiredKeys: [],
  });
  assert.equal(
    storage.getItem(PLUGIN_CATALOG_STORAGE_KEY)?.includes("do-not-store"),
    false,
  );
  assert.equal(catalog.plugins[0].lifecycle.state, "available");
});

test("agent installation persists plugin configuration separately from catalog runtime state", () => {
  const storage = new MemoryStorage();
  const availableProvider = definePluginManifest({
    schemaVersion: "owncanvas.plugin.v1",
    id: "plugin.catalog.separate-config",
    name: "Separate Config Provider",
    version: "0.1.0",
    type: "provider",
    lifecycle: {
      state: "available",
      updatedAt: "2026-05-11T00:00:00.000Z",
    },
    origin: {
      kind: "external",
      packageName: "@partner/separate-config",
      registryUrl: "https://registry.example.test",
    },
    metadata: {
      displayName: "Separate Config Provider",
      description: "Persists configuration outside runtime catalog state.",
      tags: ["provider", "storage"],
    },
    permissions: {
      mode: "advanced",
      installableBy: ["human", "agent"],
      configurableBy: ["human", "agent"],
      requiresApprovalFor: ["secret_access"],
    },
    provider: {
      providerKind: "external",
      mediaTypes: ["image"],
      execution: "remote",
      advanced: true,
    },
    capabilities: [
      {
        id: "cap.image",
        kind: "generate.image",
        title: "Image generation",
        description: "Generates campaign images.",
        concurrency: { supportsParallel: true, supportsBulk: true },
        inputPorts: [{ id: "prompt", dataType: "text", required: true }],
        outputPorts: [{ id: "image", dataType: "image", multiple: false }],
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
          secretRef: "separateConfig.apiKey",
        },
        {
          key: "model",
          label: "Model",
          type: "select",
          required: true,
          scope: "workspace",
          providerConfigType: "model",
          defaultValue: "image-pro",
        },
      ],
    },
  });
  const catalog = {
    id: "catalog.separate-config",
    updatedAt: "2026-05-11T00:00:00.000Z",
    plugins: [availableProvider],
  };

  const installation = installSelectedPluginForAgentInStorage(
    storage,
    catalog,
    "plugin.catalog.separate-config",
    { now: () => "2026-05-11T00:12:00.000Z" },
  );
  const serializedCatalog = storage.getItem(PLUGIN_CATALOG_STORAGE_KEY);
  const serializedConfigurations = storage.getItem(
    PLUGIN_CONFIGURATION_STORAGE_KEY,
  );
  const reloadedCatalog = getPersistedPluginCatalog(storage);

  assert.equal(installation.ok, true);
  assert.equal(serializedCatalog?.includes("appliedConfiguration"), false);
  assert.equal(serializedConfigurations?.includes("image-pro"), true);
  assert.equal(serializedConfigurations?.includes("\"lifecycle\""), false);
  assert.deepEqual(reloadedCatalog?.plugins[0]?.appliedConfiguration, {
    appliedAt: "2026-05-11T00:12:00.000Z",
    appliedBy: "agent",
    source: "plugin.default",
    values: {
      model: "image-pro",
    },
    secretRefs: {
      apiKey: "separateConfig.apiKey",
    },
    missingRequiredKeys: [],
  });
});

test("persisted agent defaults reload without losing applied configuration", () => {
  const initialStorage = new MemoryStorage();
  const reloadedStorage = new MemoryStorage();
  const availableProvider = definePluginManifest({
    schemaVersion: "owncanvas.plugin.v1",
    id: "plugin.catalog.reload-defaults",
    name: "Reload Defaults Provider",
    version: "0.1.0",
    type: "provider",
    lifecycle: {
      state: "available",
      updatedAt: "2026-05-11T00:00:00.000Z",
    },
    origin: {
      kind: "external",
      packageName: "@partner/reload-defaults",
      registryUrl: "https://registry.example.test",
    },
    metadata: {
      displayName: "Reload Defaults Provider",
      description: "Reloads default configuration after persistence.",
      tags: ["provider", "storage"],
    },
    permissions: {
      mode: "advanced",
      installableBy: ["human", "agent"],
      configurableBy: ["human", "agent"],
      requiresApprovalFor: ["secret_access"],
    },
    provider: {
      providerKind: "external",
      mediaTypes: ["image", "video"],
      execution: "remote",
      advanced: true,
    },
    capabilities: [
      {
        id: "cap.video",
        kind: "generate.video",
        title: "Video generation",
        description: "Generates campaign videos.",
        concurrency: { supportsParallel: true, supportsBulk: true },
        inputPorts: [{ id: "prompt", dataType: "text", required: true }],
        outputPorts: [{ id: "video", dataType: "video", multiple: false }],
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
          secretRef: "reloadDefaults.apiKey",
          defaultValue: "must-not-reload",
        },
        {
          key: "model",
          label: "Model",
          type: "select",
          required: true,
          scope: "workspace",
          providerConfigType: "model",
          defaultValue: "video-pro",
        },
        {
          key: "maxParallel",
          label: "Max parallel jobs",
          type: "number",
          required: false,
          scope: "workspace",
          providerConfigType: "rate-limit",
          defaultValue: 4,
        },
      ],
    },
  });
  const catalog = {
    id: "catalog.reload-defaults",
    updatedAt: "2026-05-11T00:00:00.000Z",
    plugins: [availableProvider],
  };

  const installation = installSelectedPluginForAgentInStorage(
    initialStorage,
    catalog,
    "plugin.catalog.reload-defaults",
    { now: () => "2026-05-11T00:09:00.000Z" },
  );
  const serializedCatalog = initialStorage.getItem(PLUGIN_CATALOG_STORAGE_KEY);
  const serializedConfigurations = initialStorage.getItem(
    PLUGIN_CONFIGURATION_STORAGE_KEY,
  );
  assert.notEqual(serializedCatalog, null);
  assert.notEqual(serializedConfigurations, null);
  reloadedStorage.setItem(PLUGIN_CATALOG_STORAGE_KEY, serializedCatalog ?? "");
  reloadedStorage.setItem(
    PLUGIN_CONFIGURATION_STORAGE_KEY,
    serializedConfigurations ?? "",
  );

  const reloadedCatalog = getPersistedPluginCatalog(reloadedStorage);
  const reloadedPlugin = reloadedCatalog?.plugins[0];

  assert.equal(installation.ok, true);
  assert.equal(reloadedCatalog?.updatedAt, "2026-05-11T00:09:00.000Z");
  assert.equal(reloadedPlugin?.lifecycle.state, "configured");
  assert.deepEqual(reloadedPlugin?.appliedConfiguration, {
    appliedAt: "2026-05-11T00:09:00.000Z",
    appliedBy: "agent",
    source: "plugin.default",
    values: {
      model: "video-pro",
      maxParallel: 4,
    },
    secretRefs: {
      apiKey: "reloadDefaults.apiKey",
    },
    missingRequiredKeys: [],
  });
  assert.deepEqual(listInstalledPluginsForAgent(reloadedCatalog ?? catalog), [
    {
      id: "plugin.catalog.reload-defaults",
      name: "Reload Defaults Provider",
      version: "0.1.0",
      type: "provider",
      lifecycleState: "configured",
      activationState: "configured",
      installedAt: "2026-05-11T00:09:00.000Z",
      configuredAt: "2026-05-11T00:09:00.000Z",
      originKind: "external",
      displayName: "Reload Defaults Provider",
      permissionMode: "advanced",
      configurableByAgent: true,
      configurationState: {
        status: "configured",
        appliedAt: "2026-05-11T00:09:00.000Z",
        appliedBy: "agent",
        source: "plugin.default",
        requiredFieldCount: 2,
        configuredValueCount: 2,
        configuredSecretRefCount: 1,
        missingRequiredFieldCount: 0,
      },
      requiresApprovalFor: ["secret_access"],
      capabilityKinds: ["generate.video"],
    },
  ]);
  assert.equal(serializedCatalog?.includes("must-not-reload"), false);
});

test("agent activation applies and persists plugin default configuration when missing", () => {
  const storage = new MemoryStorage();
  const configuredProvider: PluginManifest = definePluginManifest({
    schemaVersion: "owncanvas.plugin.v1",
    id: "plugin.catalog.activation-defaults",
    name: "Activation Defaults Provider",
    version: "0.1.0",
    type: "provider",
    lifecycle: {
      state: "configured",
      installedAt: "2026-05-11T00:00:00.000Z",
      configuredAt: "2026-05-11T00:01:00.000Z",
      updatedAt: "2026-05-11T00:01:00.000Z",
    },
    origin: {
      kind: "external",
      packageName: "@partner/activation-defaults",
      registryUrl: "https://registry.example.test",
    },
    metadata: {
      displayName: "Activation Defaults Provider",
      description: "Applies default configuration during activation.",
      tags: ["provider", "activation", "defaults"],
    },
    permissions: {
      mode: "advanced",
      installableBy: ["human", "agent"],
      configurableBy: ["human", "agent"],
      requiresApprovalFor: ["secret_access"],
    },
    provider: {
      providerKind: "external",
      mediaTypes: ["image", "video"],
      execution: "remote",
      advanced: true,
    },
    capabilities: [
      {
        id: "cap.image",
        kind: "generate.image",
        title: "Image generation",
        description: "Generates campaign images.",
        concurrency: { supportsParallel: true, supportsBulk: true },
        inputPorts: [{ id: "prompt", dataType: "text", required: true }],
        outputPorts: [{ id: "image", dataType: "image", multiple: false }],
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
          secretRef: "activationDefaults.apiKey",
          defaultValue: "must-not-persist",
        },
        {
          key: "model",
          label: "Model",
          type: "select",
          required: true,
          scope: "workspace",
          providerConfigType: "model",
          defaultValue: "image-video-pro",
        },
        {
          key: "maxParallel",
          label: "Max parallel jobs",
          type: "number",
          required: false,
          scope: "workspace",
          providerConfigType: "rate-limit",
          defaultValue: 4,
        },
      ],
    },
  });
  const catalog = {
    id: "catalog.activation-defaults",
    updatedAt: "2026-05-11T00:01:00.000Z",
    plugins: [configuredProvider],
  };

  const activation = activateInstalledPluginForAgentInStorage(
    storage,
    catalog,
    "plugin.catalog.activation-defaults",
    { now: () => "2026-05-11T00:10:00.000Z" },
  );
  const persistedCatalog = getPersistedPluginCatalog(storage);

  assert.equal(activation.ok, true);
  assert.equal(activation.plugin.lifecycle.state, "active");
  assert.deepEqual(activation.plugin.appliedConfiguration, {
    appliedAt: "2026-05-11T00:10:00.000Z",
    appliedBy: "agent",
    source: "plugin.default",
    values: {
      model: "image-video-pro",
      maxParallel: 4,
    },
    secretRefs: {
      apiKey: "activationDefaults.apiKey",
    },
    missingRequiredKeys: [],
  });
  assert.deepEqual(
    persistedCatalog?.plugins[0]?.appliedConfiguration,
    activation.plugin.appliedConfiguration,
  );
  assert.equal(
    storage.getItem(PLUGIN_CATALOG_STORAGE_KEY)?.includes("must-not-persist"),
    false,
  );
  assert.equal("appliedConfiguration" in configuredProvider, false);
});

test("agent activation state persists and is reflected in subsequent sessions", () => {
  const storage = new MemoryStorage();
  const configuredTracking = definePluginManifest({
    schemaVersion: "owncanvas.plugin.v1",
    id: "plugin.catalog.persisted-activation",
    name: "Persisted Activation Tracking",
    version: "0.1.0",
    type: "tracking",
    lifecycle: {
      state: "configured",
      installedAt: "2026-05-11T00:00:00.000Z",
      configuredAt: "2026-05-11T00:01:00.000Z",
      updatedAt: "2026-05-11T00:01:00.000Z",
    },
    origin: {
      kind: "built-in",
      packageName: "@owncanvas/tracking-persisted-activation",
    },
    metadata: {
      displayName: "Persisted Activation Tracking",
      description: "Tracks activation persistence across agent sessions.",
      tags: ["tracking", "activation"],
    },
    permissions: {
      mode: "basic",
      installableBy: ["human", "agent"],
      configurableBy: ["human", "agent"],
      requiresApprovalFor: [],
    },
    capabilities: [
      {
        id: "cap.conversion",
        kind: "track.conversion",
        title: "Conversion tracking",
        description: "Tracks attributed purchases.",
        concurrency: { supportsParallel: false, supportsBulk: false },
        inputPorts: [{ id: "event", dataType: "event", required: true }],
        outputPorts: [{ id: "conversion", dataType: "event", multiple: false }],
      },
    ],
    configuration: {
      fields: [],
    },
  });
  const catalog = {
    id: "catalog.persisted-activation",
    updatedAt: "2026-05-11T00:01:00.000Z",
    plugins: [configuredTracking],
  };

  const activation = activateInstalledPluginForAgentInStorage(
    storage,
    catalog,
    "plugin.catalog.persisted-activation",
    { now: () => "2026-05-11T00:09:00.000Z" },
  );
  const persistedCatalog = getPersistedPluginCatalog(storage);

  assert.equal(activation.ok, true);
  assert.equal(persistedCatalog?.updatedAt, "2026-05-11T00:09:00.000Z");
  assert.equal(persistedCatalog?.plugins[0]?.lifecycle.state, "active");
  assert.deepEqual(listInstalledPluginsForAgent(persistedCatalog ?? catalog), [
    {
      id: "plugin.catalog.persisted-activation",
      name: "Persisted Activation Tracking",
      version: "0.1.0",
      type: "tracking",
      lifecycleState: "active",
      activationState: "active",
      installedAt: "2026-05-11T00:00:00.000Z",
      configuredAt: "2026-05-11T00:01:00.000Z",
      activatedAt: "2026-05-11T00:09:00.000Z",
      originKind: "built-in",
      displayName: "Persisted Activation Tracking",
      permissionMode: "basic",
      configurableByAgent: true,
      configurationState: {
        status: "configured",
        appliedAt: "2026-05-11T00:09:00.000Z",
        appliedBy: "agent",
        source: "plugin.default",
        requiredFieldCount: 0,
        configuredValueCount: 0,
        configuredSecretRefCount: 0,
        missingRequiredFieldCount: 0,
      },
      requiresApprovalFor: [],
      capabilityKinds: ["track.conversion"],
    },
  ]);
  assert.equal(catalog.plugins[0].lifecycle.state, "configured");
});

test("agent deactivation state persists for later installed-plugin reads", () => {
  const storage = new MemoryStorage();
  const activeTracking = definePluginManifest({
    schemaVersion: "owncanvas.plugin.v1",
    id: "plugin.catalog.persisted-deactivation",
    name: "Persisted Deactivation Tracking",
    version: "0.1.0",
    type: "tracking",
    lifecycle: {
      state: "active",
      installedAt: "2026-05-11T00:00:00.000Z",
      configuredAt: "2026-05-11T00:01:00.000Z",
      activatedAt: "2026-05-11T00:02:00.000Z",
      updatedAt: "2026-05-11T00:02:00.000Z",
    },
    origin: {
      kind: "built-in",
      packageName: "@owncanvas/tracking-persisted-deactivation",
    },
    metadata: {
      displayName: "Persisted Deactivation Tracking",
      description: "Tracks deactivation persistence across agent sessions.",
      tags: ["tracking", "activation"],
    },
    permissions: {
      mode: "basic",
      installableBy: ["human", "agent"],
      configurableBy: ["human", "agent"],
      requiresApprovalFor: [],
    },
    capabilities: [
      {
        id: "cap.conversion",
        kind: "track.conversion",
        title: "Conversion tracking",
        description: "Tracks attributed purchases.",
        concurrency: { supportsParallel: false, supportsBulk: false },
        inputPorts: [{ id: "event", dataType: "event", required: true }],
        outputPorts: [{ id: "conversion", dataType: "event", multiple: false }],
      },
    ],
    configuration: {
      fields: [],
    },
  });
  const catalog = {
    id: "catalog.persisted-deactivation",
    updatedAt: "2026-05-11T00:02:00.000Z",
    plugins: [activeTracking],
  };

  const deactivation = deactivateInstalledPluginForAgentInStorage(
    storage,
    catalog,
    "plugin.catalog.persisted-deactivation",
    { now: () => "2026-05-11T00:10:00.000Z" },
  );
  const persistedCatalog = getPersistedPluginCatalog(storage);

  assert.equal(deactivation.ok, true);
  assert.equal(persistedCatalog?.plugins[0]?.lifecycle.state, "inactive");
  assert.deepEqual(listInstalledPluginsForAgent(persistedCatalog ?? catalog), [
    {
      id: "plugin.catalog.persisted-deactivation",
      name: "Persisted Deactivation Tracking",
      version: "0.1.0",
      type: "tracking",
      lifecycleState: "inactive",
      activationState: "inactive",
      installedAt: "2026-05-11T00:00:00.000Z",
      configuredAt: "2026-05-11T00:01:00.000Z",
      activatedAt: "2026-05-11T00:02:00.000Z",
      deactivatedAt: "2026-05-11T00:10:00.000Z",
      originKind: "built-in",
      displayName: "Persisted Deactivation Tracking",
      permissionMode: "basic",
      configurableByAgent: true,
      configurationState: {
        status: "configured",
        requiredFieldCount: 0,
        configuredValueCount: 0,
        configuredSecretRefCount: 0,
        missingRequiredFieldCount: 0,
      },
      requiresApprovalFor: [],
      capabilityKinds: ["track.conversion"],
    },
  ]);
  assert.equal(catalog.plugins[0].lifecycle.state, "active");
});

test("agents can select workflow capabilities from installed plugins", () => {
  const installedProvider: PluginManifest = definePluginManifest({
    schemaVersion: "owncanvas.plugin.v1",
    id: "plugin.workflow.media",
    name: "Workflow Media",
    version: "0.1.0",
    type: "provider",
    lifecycle: {
      state: "installed",
      installedAt: "2026-05-11T00:00:00.000Z",
      updatedAt: "2026-05-11T00:00:00.000Z",
    },
    origin: {
      kind: "built-in",
      packageName: "@owncanvas/provider-workflow-media",
    },
    metadata: {
      displayName: "Workflow Media",
      description: "Generates workflow image and video variants.",
      tags: ["workflow", "media"],
    },
    permissions: {
      mode: "basic",
      installableBy: ["human", "agent"],
      configurableBy: ["human", "agent"],
      requiresApprovalFor: [],
    },
    provider: {
      providerKind: "built-in",
      mediaTypes: ["image", "video"],
      execution: "hosted",
      advanced: false,
    },
    capabilities: [
      {
        id: "cap.workflow.image",
        kind: "generate.image",
        title: "Workflow image generation",
        description: "Generates image candidates for a campaign workflow.",
        concurrency: {
          supportsParallel: true,
          supportsBulk: true,
          maxParallel: 8,
        },
        inputPorts: [{ id: "prompt", dataType: "text", required: true }],
        outputPorts: [{ id: "images", dataType: "image", multiple: true }],
      },
      {
        id: "cap.workflow.video",
        kind: "generate.video",
        title: "Workflow video generation",
        description: "Generates video candidates for a campaign workflow.",
        concurrency: {
          supportsParallel: true,
          supportsBulk: true,
          maxParallel: 4,
        },
        inputPorts: [{ id: "storyboard", dataType: "json", required: true }],
        outputPorts: [{ id: "videos", dataType: "video", multiple: true }],
      },
    ],
    configuration: {
      fields: [
        {
          key: "model",
          label: "Model",
          type: "select",
          required: true,
          scope: "workspace",
          providerConfigType: "model",
          mediaType: "image",
          defaultValue: "workflow-image-v1",
        },
      ],
    },
  });
  const advancedExternalTracking = definePluginManifest({
    schemaVersion: "owncanvas.plugin.v1",
    id: "plugin.workflow.attribution",
    name: "Workflow Attribution",
    version: "0.1.0",
    type: "tracking",
    lifecycle: {
      state: "active",
      installedAt: "2026-05-11T00:00:00.000Z",
      configuredAt: "2026-05-11T00:01:00.000Z",
      activatedAt: "2026-05-11T00:02:00.000Z",
      updatedAt: "2026-05-11T00:02:00.000Z",
    },
    origin: {
      kind: "external",
      packageName: "@partner/workflow-attribution",
      registryUrl: "https://registry.example.test",
    },
    metadata: {
      displayName: "Workflow Attribution",
      description: "Tracks workflow conversion outcomes.",
      tags: ["tracking", "conversion"],
    },
    permissions: {
      mode: "advanced",
      installableBy: ["human", "agent"],
      configurableBy: ["human", "agent"],
      requiresApprovalFor: ["network_access"],
    },
    capabilities: [
      {
        id: "cap.workflow.conversion",
        kind: "track.conversion",
        title: "Workflow conversion tracking",
        description: "Measures attribution through final conversion.",
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
  });
  const availableProvider: PluginManifest = {
    ...installedProvider,
    id: "plugin.workflow.available",
    lifecycle: {
      state: "available",
      updatedAt: "2026-05-11T00:00:00.000Z",
    },
  };
  const invalidInstalledProvider: PluginManifest = {
    ...installedProvider,
    id: "plugin.workflow.invalid",
    capabilities: [
      {
        ...installedProvider.capabilities[0],
        inputPorts: [],
      },
    ],
  };
  const catalog = {
    id: "catalog.workflow",
    updatedAt: "2026-05-11T00:00:00.000Z",
    plugins: [
      installedProvider,
      advancedExternalTracking,
      availableProvider,
      invalidInstalledProvider,
    ],
  };

  assert.deepEqual(
    listSelectableWorkflowCapabilitiesForAgent(catalog, { mode: "basic" }),
    [
      {
        id: "plugin.workflow.media:cap.workflow.image",
        pluginId: "plugin.workflow.media",
        pluginName: "Workflow Media",
        pluginDisplayName: "Workflow Media",
        pluginType: "provider",
        pluginOriginKind: "built-in",
        pluginLifecycleState: "installed",
        permissionMode: "basic",
        requiresApprovalFor: [],
        capabilityId: "cap.workflow.image",
        capabilityKind: "generate.image",
        title: "Workflow image generation",
        description: "Generates image candidates for a campaign workflow.",
        inputPorts: [{ id: "prompt", dataType: "text", required: true }],
        outputPorts: [{ id: "images", dataType: "image", multiple: true }],
        supportsParallel: true,
        supportsBulk: true,
        maxParallel: 8,
        selection: {
          type: "canvas.node.create",
          pluginId: "plugin.workflow.media",
          capabilityId: "cap.workflow.image",
        },
      },
      {
        id: "plugin.workflow.media:cap.workflow.video",
        pluginId: "plugin.workflow.media",
        pluginName: "Workflow Media",
        pluginDisplayName: "Workflow Media",
        pluginType: "provider",
        pluginOriginKind: "built-in",
        pluginLifecycleState: "installed",
        permissionMode: "basic",
        requiresApprovalFor: [],
        capabilityId: "cap.workflow.video",
        capabilityKind: "generate.video",
        title: "Workflow video generation",
        description: "Generates video candidates for a campaign workflow.",
        inputPorts: [{ id: "storyboard", dataType: "json", required: true }],
        outputPorts: [{ id: "videos", dataType: "video", multiple: true }],
        supportsParallel: true,
        supportsBulk: true,
        maxParallel: 4,
        selection: {
          type: "canvas.node.create",
          pluginId: "plugin.workflow.media",
          capabilityId: "cap.workflow.video",
        },
      },
    ],
  );

  assert.deepEqual(
    listSelectableWorkflowCapabilitiesForAgent(catalog, {
      mode: "advanced",
      capabilityKinds: ["track.conversion"],
    }).map((capability) => capability.id),
    ["plugin.workflow.attribution:cap.workflow.conversion"],
  );
});

test("createPluginDefaultConfigurationSchema exposes safe default configuration metadata", () => {
  const manifest = definePluginManifest({
    schemaVersion: "owncanvas.plugin.v1",
    id: "plugin.defaults.media",
    name: "Defaults Media",
    version: "0.1.0",
    type: "provider",
    lifecycle: {
      state: "available",
      updatedAt: "2026-05-11T00:00:00.000Z",
    },
    origin: {
      kind: "external",
      packageName: "@partner/defaults-media",
      registryUrl: "https://registry.example.test",
    },
    metadata: {
      displayName: "Defaults Media",
      description: "Generates campaign image and video variants.",
      tags: ["provider", "defaults"],
    },
    permissions: {
      mode: "advanced",
      installableBy: ["human", "agent"],
      configurableBy: ["human", "agent"],
      requiresApprovalFor: ["network_access", "secret_access"],
    },
    provider: {
      providerKind: "external",
      mediaTypes: ["image", "video"],
      execution: "remote",
      advanced: true,
    },
    capabilities: [
      {
        id: "cap.image",
        kind: "generate.image",
        title: "Generate image",
        description: "Generates image variants.",
        concurrency: {
          supportsParallel: true,
          supportsBulk: true,
          maxParallel: 4,
        },
        inputPorts: [{ id: "prompt", dataType: "text", required: true }],
        outputPorts: [{ id: "images", dataType: "image", multiple: true }],
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
          secretRef: "defaultsMedia.apiKey",
          defaultValue: "must-not-leak",
        },
        {
          key: "model",
          label: "Model",
          type: "select",
          required: true,
          scope: "workspace",
          description: "Default generation model.",
          providerConfigType: "model",
          mediaType: "image",
          defaultValue: "image-standard",
          options: [
            { label: "Standard", value: "image-standard" },
            { label: "Fast", value: "image-fast" },
          ],
        },
        {
          key: "maxParallel",
          label: "Max parallel",
          type: "number",
          required: false,
          scope: "campaign",
          providerConfigType: "rate-limit",
          defaultValue: 4,
        },
      ],
    },
  });

  assert.deepEqual(createPluginDefaultConfigurationSchema(manifest), {
    pluginId: "plugin.defaults.media",
    pluginType: "provider",
    permissionMode: "advanced",
    configurableBy: ["human", "agent"],
    fields: [
      {
        key: "apiKey",
        label: "API key",
        type: "secret",
        required: true,
        scope: "user",
        sensitive: true,
        hasDefaultValue: false,
        hasSecretRef: true,
      },
      {
        key: "model",
        label: "Model",
        type: "select",
        required: true,
        scope: "workspace",
        description: "Default generation model.",
        sensitive: false,
        hasDefaultValue: true,
        hasSecretRef: false,
        options: [
          { label: "Standard", value: "image-standard" },
          { label: "Fast", value: "image-fast" },
        ],
      },
      {
        key: "maxParallel",
        label: "Max parallel",
        type: "number",
        required: false,
        scope: "campaign",
        sensitive: false,
        hasDefaultValue: true,
        hasSecretRef: false,
      },
    ],
    requiredKeys: ["apiKey", "model"],
    defaults: {
      values: {
        model: "image-standard",
        maxParallel: 4,
      },
      secretRefs: {
        apiKey: "defaultsMedia.apiKey",
      },
    },
  });
});

test("definePluginManifest preserves shared metadata and lifecycle fields", () => {
  const manifest = definePluginManifest({
    schemaVersion: "owncanvas.plugin.v1",
    id: "plugin.instagram.dm",
    name: "Instagram DM",
    version: "0.1.0",
    type: "direct-message",
    lifecycle: {
      state: "installed",
      installedAt: "2026-05-11T00:00:00.000Z",
      updatedAt: "2026-05-11T00:00:00.000Z",
    },
    origin: {
      kind: "external",
      packageName: "@owncanvas/plugin-instagram-dm",
      registryUrl: "https://registry.owncanvas.local",
    },
    metadata: {
      displayName: "Instagram DM",
      description: "Turns campaign comments into direct-message flows.",
      license: "Apache-2.0",
      tags: ["instagram", "dm", "conversion"],
    },
    permissions: {
      mode: "advanced",
      installableBy: ["human", "agent"],
      configurableBy: ["human", "agent"],
      requiresApprovalFor: ["network_access", "external_publish"],
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
        inputPorts: [{ id: "comment", dataType: "event", required: true }],
        outputPorts: [{ id: "landingUrl", dataType: "url", multiple: false }],
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
        },
      ],
    },
  });

  assert.equal(manifest.type, "direct-message");
  assert.equal(manifest.lifecycle.state, "installed");
  assert.deepEqual(manifest.permissions.installableBy, ["human", "agent"]);
  assert.equal(manifest.capabilities[0].outputPorts[0].dataType, "url");
});

test("definePluginManifest preserves provider capabilities and configuration fields", () => {
  const manifest = definePluginManifest({
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
      license: "Apache-2.0",
      tags: ["image", "video", "provider"],
    },
    permissions: {
      mode: "advanced",
      installableBy: ["human", "agent"],
      configurableBy: ["human", "agent"],
      requiresApprovalFor: ["secret_access"],
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
        description: "Generates campaign image variants in parallel.",
        concurrency: {
          supportsParallel: true,
          supportsBulk: true,
          maxParallel: 8,
        },
        inputPorts: [{ id: "prompt", dataType: "text", required: true }],
        outputPorts: [{ id: "images", dataType: "image", multiple: true }],
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
      ],
    },
  });

  assert.equal(manifest.provider.providerKind, "built-in");
  assert.deepEqual(manifest.provider.mediaTypes, ["image", "video"]);
  assert.equal(manifest.capabilities[0].kind, "generate.image");
  assert.equal(manifest.capabilities[0].concurrency.supportsBulk, true);
  assert.equal(manifest.configuration.fields[0].providerConfigType, "credential");
});

test("definePluginManifest preserves commission detail and typed configuration fields", () => {
  const manifest = definePluginManifest({
    schemaVersion: "owncanvas.plugin.v1",
    id: "plugin.affiliate.commission",
    name: "Affiliate Commission",
    version: "0.1.0",
    type: "commission",
    lifecycle: {
      state: "configured",
      installedAt: "2026-05-11T00:00:00.000Z",
      configuredAt: "2026-05-11T00:01:00.000Z",
      updatedAt: "2026-05-11T00:01:00.000Z",
    },
    origin: {
      kind: "external",
      packageName: "@owncanvas/commission-affiliate",
    },
    metadata: {
      displayName: "Affiliate Commission",
      description: "Resolves tracked affiliate offers for campaigns.",
      tags: ["commission", "affiliate"],
    },
    permissions: {
      mode: "advanced",
      installableBy: ["human", "agent"],
      configurableBy: ["human", "agent"],
      requiresApprovalFor: ["network_access", "secret_access"],
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
        title: "Resolve offer",
        description: "Returns a tracked product offer URL.",
        concurrency: {
          supportsParallel: true,
          supportsBulk: true,
          maxParallel: 25,
        },
        inputPorts: [{ id: "product", dataType: "product", required: true }],
        outputPorts: [{ id: "trackingUrl", dataType: "url", multiple: false }],
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
          key: "cookieWindowDays",
          label: "Cookie window",
          type: "number",
          required: true,
          scope: "campaign",
          commissionConfigType: "attribution-window",
          windowUnit: "day",
        },
      ],
    },
  });

  assert.equal(manifest.type, "commission");
  assert.equal(manifest.commission.model, "affiliate");
  assert.equal(manifest.configuration.fields[0].commissionConfigType, "network");
  assert.equal(manifest.configuration.fields[1].commissionConfigType, "attribution-window");
});

test("definePluginManifest preserves agent detail and typed configuration fields", () => {
  const manifest = definePluginManifest({
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
      description: "Performs explicit campaign canvas actions on behalf of a user.",
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
        description: "Creates nodes and connections through the same canvas action model as a human.",
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
        {
          key: "approvalPolicy",
          label: "Approval policy",
          type: "select",
          required: true,
          scope: "workspace",
          agentConfigType: "approval-policy",
        },
      ],
    },
  });

  assert.equal(manifest.type, "agent");
  assert.equal(manifest.agent.autonomy, "supervised");
  assert.equal(manifest.capabilities[0].kind, "agent.action");
  assert.equal(manifest.configuration.fields[0].agentConfigType, "instruction");
  assert.deepEqual(validateAgentPluginConfiguration(manifest), {
    ok: true,
    errors: [],
  });
});

test("validateAgentPluginConfiguration rejects agent configuration rule violations", () => {
  const invalidAgent = {
    capabilities: [
      {
        kind: "dashboard.report",
      },
    ],
    configuration: {
      fields: [
        {
          key: "instructionProfile",
          label: "Instruction profile",
          type: "number",
          required: true,
          scope: "workspace",
          agentConfigType: "instruction",
        },
        {
          key: "instructionProfile",
          label: "Duplicate instruction profile",
          type: "json",
          required: false,
          scope: "workspace",
          agentConfigType: "unknown",
        },
      ],
    },
  } as const;

  const result = validateAgentPluginConfiguration(invalidAgent);

  assert.equal(result.ok, false);
  assert.deepEqual(
    result.errors.map((error) => error.code),
    [
      "agent.action_capability_required",
      "agent.duplicate_config_key",
      "agent.field_type_mismatch",
      "agent.unknown_config_type",
    ],
  );
});

test("validateAgentPluginConfiguration requires explicit action input and result output ports", () => {
  const invalidAgent = {
    capabilities: [
      {
        kind: "agent.action",
        inputPorts: [],
        outputPorts: [],
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
  } as const;

  const result = validateAgentPluginConfiguration(invalidAgent);

  assert.equal(result.ok, false);
  assert.deepEqual(
    result.errors.map((error) => error.code),
    [
      "agent.action_input_port_required",
      "agent.result_output_port_required",
    ],
  );
});

test("definePluginManifest preserves dashboard detail and typed configuration fields", () => {
  const manifest = definePluginManifest({
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
      tags: ["dashboard", "conversion", "attribution"],
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
        inputPorts: [
          { id: "events", dataType: "event", required: true, multiple: true },
          { id: "campaign", dataType: "json", required: true },
        ],
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
          key: "attributionWindowDays",
          label: "Attribution window",
          type: "number",
          required: true,
          scope: "campaign",
          dashboardConfigType: "attribution-window",
          windowUnit: "day",
          defaultValue: 14,
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

  assert.equal(manifest.type, "dashboard");
  assert.deepEqual(manifest.dashboard.reportTypes, [
    "funnel",
    "conversion",
    "attribution",
  ]);
  assert.equal(manifest.capabilities[0].kind, "dashboard.report");
  assert.equal(manifest.configuration.fields[0].dashboardConfigType, "metric");
  assert.deepEqual(validateDashboardPluginConfiguration(manifest), {
    ok: true,
    errors: [],
  });
});

test("validateDashboardPluginConfiguration rejects dashboard configuration rule violations", () => {
  const invalidDashboard = {
    dashboard: {
      reportTypes: ["conversion"],
      supportedVisualizations: ["table"],
      realtime: false,
      exportable: false,
    },
    capabilities: [
      {
        kind: "track.conversion",
        inputPorts: [],
        outputPorts: [],
      },
    ],
    configuration: {
      fields: [
        {
          key: "primaryMetric",
          label: "Primary metric",
          type: "number",
          required: true,
          scope: "campaign",
          dashboardConfigType: "metric",
          metricKind: "revenue",
        },
        {
          key: "primaryMetric",
          label: "Duplicate metric",
          type: "select",
          required: false,
          scope: "campaign",
          dashboardConfigType: "unknown",
        },
        {
          key: "attributionWindowDays",
          label: "Attribution window",
          type: "number",
          required: true,
          scope: "campaign",
          dashboardConfigType: "attribution-window",
          defaultValue: 0,
        },
      ],
    },
  } as const;

  const result = validateDashboardPluginConfiguration(invalidDashboard);

  assert.equal(result.ok, false);
  assert.deepEqual(
    result.errors.map((error) => error.code),
    [
      "dashboard.report_capability_required",
      "dashboard.duplicate_config_key",
      "dashboard.unknown_config_type",
      "dashboard.unsupported_metric",
      "dashboard.field_type_mismatch",
      "dashboard.numeric_default_must_be_positive",
    ],
  );
});

test("validateCommissionPluginConfiguration accepts a valid commission offer plugin", () => {
  const manifest = definePluginManifest({
    schemaVersion: "owncanvas.plugin.v1",
    id: "plugin.commission.valid",
    name: "Valid Commission",
    version: "0.1.0",
    type: "commission",
    lifecycle: {
      state: "configured",
      updatedAt: "2026-05-11T00:00:00.000Z",
    },
    origin: {
      kind: "external",
      packageName: "@owncanvas/commission-valid",
    },
    metadata: {
      displayName: "Valid Commission",
      description: "Resolves commission offers.",
      tags: ["commission"],
    },
    permissions: {
      mode: "advanced",
      installableBy: ["human", "agent"],
      configurableBy: ["human", "agent"],
      requiresApprovalFor: ["network_access", "secret_access"],
    },
    commission: {
      model: "affiliate",
      supportedOfferSources: ["catalog", "api"],
      payoutCurrencies: ["USD", "KRW"],
      requiresAttribution: true,
    },
    capabilities: [
      {
        id: "cap.offer",
        kind: "commission.offer",
        title: "Resolve offer",
        description: "Returns a tracked commerce offer.",
        concurrency: {
          supportsParallel: true,
          supportsBulk: true,
          maxParallel: 10,
        },
        inputPorts: [
          { id: "audience", dataType: "audience", required: true },
          { id: "product", dataType: "product", required: true },
        ],
        outputPorts: [
          { id: "offer", dataType: "product", multiple: false },
          { id: "url", dataType: "url", multiple: false },
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
          key: "offerSource",
          label: "Offer source",
          type: "select",
          required: true,
          scope: "campaign",
          commissionConfigType: "offer",
          offerSource: "catalog",
        },
        {
          key: "commissionRate",
          label: "Commission rate",
          type: "number",
          required: true,
          scope: "campaign",
          commissionConfigType: "payout",
          payoutModel: "percentage",
          currency: "USD",
          defaultValue: 15,
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

  assert.deepEqual(validateCommissionPluginConfiguration(manifest), {
    ok: true,
    errors: [],
  });
});

test("validateCommissionPluginConfiguration rejects commission configuration rule violations", () => {
  const invalidCommission = {
    commission: {
      model: "affiliate",
      supportedOfferSources: ["catalog"],
      payoutCurrencies: ["USD"],
      requiresAttribution: true,
    },
    capabilities: [
      {
        kind: "track.conversion",
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
          networkKind: "referral",
        },
        {
          key: "offerSource",
          label: "Offer source",
          type: "select",
          required: true,
          scope: "campaign",
          commissionConfigType: "offer",
          offerSource: "feed",
        },
        {
          key: "commissionRate",
          label: "Commission rate",
          type: "string",
          required: true,
          scope: "campaign",
          commissionConfigType: "payout",
          payoutModel: "percentage",
          currency: "EUR",
        },
        {
          key: "commissionRate",
          label: "Duplicate commission rate",
          type: "number",
          required: false,
          scope: "campaign",
          commissionConfigType: "payout",
          payoutModel: "percentage",
          defaultValue: 0,
        },
      ],
    },
  } as const;

  const result = validateCommissionPluginConfiguration(invalidCommission);

  assert.equal(result.ok, false);
  assert.deepEqual(
    result.errors.map((error) => error.code),
    [
      "commission.offer_capability_required",
      "commission.duplicate_config_key",
      "commission.network_kind_mismatch",
      "commission.unsupported_offer_source",
      "commission.unsupported_payout_currency",
      "commission.field_type_mismatch",
      "commission.attribution_window_required",
      "commission.numeric_default_must_be_positive",
    ],
  );
});

test("validateCommissionPluginConfiguration rejects unknown commission configuration types", () => {
  const invalidCommission = {
    commission: {
      model: "affiliate",
      supportedOfferSources: ["catalog"],
      payoutCurrencies: ["USD"],
      requiresAttribution: false,
    },
    capabilities: [
      {
        kind: "commission.offer",
      },
    ],
    configuration: {
      fields: [
        {
          key: "trackingPixel",
          label: "Tracking pixel",
          type: "string",
          required: true,
          scope: "campaign",
          commissionConfigType: "tracking",
        },
      ],
    },
  } as const;

  const result = validateCommissionPluginConfiguration(invalidCommission);

  assert.equal(result.ok, false);
  assert.deepEqual(
    result.errors.map((error) => error.code),
    ["commission.unknown_config_type"],
  );
});

test("validateProviderPluginConfiguration accepts valid built-in and external provider rules", () => {
  const builtInProvider = definePluginManifest({
    schemaVersion: "owncanvas.plugin.v1",
    id: "plugin.provider.builtin",
    name: "Built-in Image Provider",
    version: "0.1.0",
    type: "provider",
    lifecycle: {
      state: "configured",
      updatedAt: "2026-05-11T00:00:00.000Z",
    },
    origin: {
      kind: "built-in",
      packageName: "@owncanvas/provider-builtin",
    },
    metadata: {
      displayName: "Built-in Image Provider",
      description: "Generates image variants.",
      tags: ["provider", "image"],
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
    capabilities: [
      {
        id: "cap.image",
        kind: "generate.image",
        title: "Generate image",
        description: "Generates image output.",
        concurrency: {
          supportsParallel: true,
          supportsBulk: true,
          maxParallel: 4,
        },
        inputPorts: [{ id: "prompt", dataType: "text", required: true }],
        outputPorts: [{ id: "image", dataType: "image", multiple: false }],
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
        },
        {
          key: "maxParallel",
          label: "Max parallel",
          type: "number",
          required: false,
          scope: "workspace",
          providerConfigType: "rate-limit",
          defaultValue: 4,
        },
      ],
    },
  });

  const externalProvider = definePluginManifest({
    ...builtInProvider,
    id: "plugin.provider.external",
    name: "External Video Provider",
    origin: {
      kind: "external",
      packageName: "@partner/provider-video",
      registryUrl: "https://registry.example.test",
    },
    provider: {
      providerKind: "external",
      mediaTypes: ["video"],
      execution: "remote",
      advanced: true,
    },
    capabilities: [
      {
        ...builtInProvider.capabilities[0],
        id: "cap.video",
        kind: "generate.video",
        outputPorts: [{ id: "video", dataType: "video", multiple: false }],
      },
    ],
    configuration: {
      fields: [
        ...builtInProvider.configuration.fields,
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
  });

  assert.deepEqual(validateProviderPluginConfiguration(builtInProvider), {
    ok: true,
    errors: [],
  });
  assert.deepEqual(validateProviderPluginConfiguration(externalProvider), {
    ok: true,
    errors: [],
  });
});

test("validateProviderPluginConfiguration rejects provider configuration rule violations", () => {
  const invalidProvider = {
    schemaVersion: "owncanvas.plugin.v1",
    id: "plugin.provider.invalid",
    name: "Invalid Provider",
    version: "0.1.0",
    type: "provider",
    lifecycle: {
      state: "configured",
      updatedAt: "2026-05-11T00:00:00.000Z",
    },
    origin: {
      kind: "built-in",
      packageName: "@owncanvas/provider-invalid",
    },
    metadata: {
      displayName: "Invalid Provider",
      description: "Invalid provider config.",
      tags: ["provider"],
    },
    permissions: {
      mode: "advanced",
      installableBy: ["human", "agent"],
      configurableBy: ["human", "agent"],
      requiresApprovalFor: [],
    },
    provider: {
      providerKind: "external",
      mediaTypes: ["image"],
      execution: "hosted",
      advanced: false,
    },
    capabilities: [
      {
        id: "cap.image",
        kind: "generate.image",
        title: "Generate image",
        description: "Generates image output.",
        concurrency: {
          supportsParallel: true,
          supportsBulk: true,
        },
        inputPorts: [{ id: "prompt", dataType: "text", required: true }],
        outputPorts: [{ id: "image", dataType: "image", multiple: false }],
      },
    ],
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
        {
          key: "maxParallel",
          label: "Max parallel",
          type: "number",
          required: false,
          scope: "workspace",
          providerConfigType: "rate-limit",
          defaultValue: 0,
        },
      ],
    },
  } as const;

  const result = validateProviderPluginConfiguration(invalidProvider);

  assert.equal(result.ok, false);
  assert.deepEqual(
    result.errors.map((error) => error.code),
    [
      "provider.kind_mismatch",
      "provider.builtin_disallowed_config",
      "provider.numeric_default_must_be_positive",
    ],
  );
});

test("definePluginManifest preserves direct-message detail and typed configuration fields", () => {
  const manifest = definePluginManifest({
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
        inputPorts: [
          { id: "trigger", dataType: "event", required: true },
          { id: "landingUrl", dataType: "url", required: true },
        ],
        outputPorts: [
          { id: "delivery", dataType: "event", multiple: false },
          { id: "trackedUrl", dataType: "url", multiple: false },
        ],
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
        {
          key: "personalizationVariables",
          label: "Personalization variables",
          type: "json",
          required: true,
          scope: "campaign",
          directMessageConfigType: "personalization",
        },
        {
          key: "landingRoutes",
          label: "Landing URL routes",
          type: "json",
          required: true,
          scope: "campaign",
          directMessageConfigType: "landing-routing",
        },
        {
          key: "maxMessagesPerMinute",
          label: "Max messages per minute",
          type: "number",
          required: true,
          scope: "workspace",
          directMessageConfigType: "throttle",
          defaultValue: 30,
        },
        {
          key: "quietHoursPolicy",
          label: "Quiet hours policy",
          type: "json",
          required: true,
          scope: "workspace",
          directMessageConfigType: "compliance",
        },
      ],
    },
  });

  assert.equal(manifest.type, "direct-message");
  assert.equal(manifest.directMessage.channel, "instagram");
  assert.equal(
    manifest.directMessage.automationConfigurationSchemas[0].configurationSchemaVersion,
    DM_AUTOMATION_CONFIGURATION_SCHEMA_VERSION,
  );
  assert.equal(
    manifest.directMessage.actionConfigurationSchemas[0].configurationSchemaVersion,
    INSTAGRAM_DM_ACTION_CONFIGURATION_SCHEMA_VERSION,
  );
  assert.equal(
    manifest.directMessage.triggerConfigurationSchemas[0].schemaVersion,
    INSTAGRAM_COMMENT_TRIGGER_CONFIGURATION_SCHEMA_VERSION,
  );
  assert.equal(
    manifest.directMessage.triggerEventSchemas[0].eventSchemaVersion,
    INSTAGRAM_COMMENT_TRIGGER_EVENT_SCHEMA_VERSION,
  );
  assert.equal(manifest.capabilities[0].kind, "channel.dm");
  assert.equal(manifest.configuration.fields[0].directMessageConfigType, "account");
  assert.deepEqual(validateDirectMessagePluginConfiguration(manifest), {
    ok: true,
    errors: [],
  });
});

test("validateInstagramDmActionConfiguration accepts tracked comment-to-DM configuration", () => {
  const result = validateInstagramDmActionConfiguration({
    schemaVersion: INSTAGRAM_DM_ACTION_CONFIGURATION_SCHEMA_VERSION,
    campaignId: "campaign.launch-1",
    capabilityId: "cap.comment-to-dm",
    triggerConfiguration: {
      schemaVersion: INSTAGRAM_COMMENT_TRIGGER_CONFIGURATION_SCHEMA_VERSION,
      accountId: "ig.account.1",
      mediaIds: ["ig.media.1"],
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
    },
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
      term: "send me the link",
    },
  });

  assert.deepEqual(result, {
    ok: true,
    errors: [],
  });
  assert.equal(INSTAGRAM_DM_ACTION_CONFIGURATION_SCHEMA.channel, "instagram");
});

test("validateDmAutomationConfiguration accepts templated replies with personalization and landing routes", () => {
  const result = validateDmAutomationConfiguration({
    schemaVersion: DM_AUTOMATION_CONFIGURATION_SCHEMA_VERSION,
    channel: "instagram",
    trigger: "comment",
    campaignId: "campaign.launch-1",
    templates: [
      {
        id: "template.drop-link",
        name: "Drop link reply",
        body: "Hi {{firstName}}, here is your {{offerName}} link: {{landingUrl}}",
        requiredVariables: ["firstName", "offerName", "landingUrl"],
        fallbackBody: "Here is your private link: {{landingUrl}}",
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
        source: "campaign",
        path: "productOffer.name",
        required: true,
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
        routeWhen: {
          variable: "offerName",
          operator: "exists",
        },
        appendAttribution: true,
      },
    ],
    defaultTemplateId: "template.drop-link",
    defaultLandingRouteId: "route.default",
  });

  assert.deepEqual(result, {
    ok: true,
    errors: [],
  });
  assert.deepEqual(DM_AUTOMATION_CONFIGURATION_SCHEMA.requiredFields, [
    "campaignId",
    "templates",
    "personalizationVariables",
    "landingUrlRoutes",
    "defaultTemplateId",
    "defaultLandingRouteId",
  ]);
  assert.deepEqual(DM_AUTOMATION_CONFIGURATION_SCHEMA.routingFields, [
    "landingUrlRoutes.id",
    "landingUrlRoutes.urlTemplate",
    "landingUrlRoutes.routeWhen",
    "defaultLandingRouteId",
  ]);
});

test("renderDmAutomationReply renders templates with only supported personalization variables", () => {
  const configuration = {
    schemaVersion: DM_AUTOMATION_CONFIGURATION_SCHEMA_VERSION,
    channel: "instagram",
    trigger: "comment",
    campaignId: "campaign.launch-1",
    templates: [
      {
        id: "template.drop-link",
        name: "Drop link reply",
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
        urlTemplate: "https://shop.example.test/drop",
        appendAttribution: true,
      },
    ],
    defaultTemplateId: "template.drop-link",
    defaultLandingRouteId: "route.default",
  } satisfies DmAutomationConfiguration;

  const rendered = renderDmAutomationReply({
    configuration,
    variables: {
      offerName: "Spring Drop",
      landingUrl: "https://shop.example.test/drop?utm_source=instagram",
    },
  });

  assert.deepEqual(rendered, {
    ok: true,
    templateId: "template.drop-link",
    text: "Hi there, your Spring Drop link is https://shop.example.test/drop?utm_source=instagram",
    variables: {
      firstName: "there",
      offerName: "Spring Drop",
      landingUrl: "https://shop.example.test/drop?utm_source=instagram",
    },
    errors: [],
  });

  const rejected = renderDmAutomationReply({
    configuration,
    variables: {
      firstName: "Creative Buyer",
      offerName: "Spring Drop",
      landingUrl: "https://shop.example.test/drop",
      couponCode: "VIP",
    },
  });

  assert.equal(rejected.ok, false);
  assert.deepEqual(
    rejected.errors.map((error) => error.code),
    ["dm-reply-render.variable_not_supported"],
  );
});

test("generateDmAutomationReply routes generated replies to the matching tracked landing URL", () => {
  const configuration = {
    schemaVersion: DM_AUTOMATION_CONFIGURATION_SCHEMA_VERSION,
    channel: "instagram",
    trigger: "comment",
    campaignId: "campaign.launch-1",
    templates: [
      {
        id: "template.drop-link",
        name: "Drop link reply",
        body: "Your {{offerName}} link is {{landingUrl}}",
        requiredVariables: ["offerName", "landingUrl"],
      },
    ],
    personalizationVariables: [
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
        id: "route.vip",
        label: "VIP drop landing",
        urlTemplate:
          "https://shop.example.test/vip-drop?campaign={{campaignId}}&offer={{offerName}}",
        routeWhen: {
          variable: "segment",
          operator: "equals",
          value: "vip",
        },
        appendAttribution: true,
      },
      {
        id: "route.default",
        label: "Default drop landing",
        urlTemplate: "https://shop.example.test/drop?campaign={{campaignId}}",
        appendAttribution: true,
      },
    ],
    defaultTemplateId: "template.drop-link",
    defaultLandingRouteId: "route.default",
  } satisfies DmAutomationConfiguration;

  const generated = generateDmAutomationReply({
    configuration,
    variables: {
      offerName: "Spring Drop",
      segment: "vip",
    },
    attribution: {
      source: "instagram",
      medium: "dm",
      campaign: "spring-drop",
      content: "comment-123",
    },
  });

  assert.deepEqual(generated, {
    ok: true,
    templateId: "template.drop-link",
    landingRouteId: "route.vip",
    landingUrl:
      "https://shop.example.test/vip-drop?campaign=campaign.launch-1&offer=Spring+Drop&utm_source=instagram&utm_medium=dm&utm_campaign=spring-drop&utm_content=comment-123",
    text: "Your Spring Drop link is https://shop.example.test/vip-drop?campaign=campaign.launch-1&offer=Spring+Drop&utm_source=instagram&utm_medium=dm&utm_campaign=spring-drop&utm_content=comment-123",
    variables: {
      offerName: "Spring Drop",
      segment: "vip",
      landingUrl:
        "https://shop.example.test/vip-drop?campaign=campaign.launch-1&offer=Spring+Drop&utm_source=instagram&utm_medium=dm&utm_campaign=spring-drop&utm_content=comment-123",
    },
    errors: [],
  });
});

test("validateDmAutomationConfiguration rejects unsafe automation setup", () => {
  const result = validateDmAutomationConfiguration({
    schemaVersion: "owncanvas.dm-automation-configuration.v0",
    channel: "",
    trigger: "",
    campaignId: "",
    templates: [
      {
        id: "template.drop-link",
        name: "Drop link reply",
        body: "Missing variable {{landingUrl}}",
        requiredVariables: ["landingUrl"],
      },
    ],
    personalizationVariables: [
      {
        key: "",
        source: "unknown",
        path: "",
        required: true,
      },
    ],
    landingUrlRoutes: [
      {
        id: "route.default",
        label: "Default product landing",
        urlTemplate: "javascript:alert(1)",
        routeWhen: {
          variable: "",
          operator: "unknown",
        },
        appendAttribution: true,
      },
    ],
    defaultTemplateId: "template.missing",
    defaultLandingRouteId: "route.missing",
  });

  assert.equal(result.ok, false);
  assert.deepEqual(
    result.errors.map((error) => error.code),
    [
      "dm-automation.schema_version_invalid",
      "dm-automation.channel_required",
      "dm-automation.trigger_required",
      "dm-automation.campaign_id_required",
      "dm-automation.template_variable_missing",
      "dm-automation.personalization_key_required",
      "dm-automation.personalization_source_invalid",
      "dm-automation.personalization_path_required",
      "dm-automation.landing_route_url_invalid",
      "dm-automation.landing_route_condition_invalid",
      "dm-automation.default_template_not_found",
      "dm-automation.default_landing_route_not_found",
    ],
  );
});

test("Instagram DM action configuration maps comment triggers to response templates", () => {
  assert.equal(
    INSTAGRAM_DM_ACTION_CONFIGURATION_SCHEMA.responseMappingSchemaVersion,
    "owncanvas.instagram-comment-to-dm-response-mapping.v1",
  );
  assert.deepEqual(INSTAGRAM_DM_ACTION_CONFIGURATION_SCHEMA.mappingFields, [
    "responseMappings.triggerMatcherId",
    "responseMappings.message.templateId",
    "responseMappings.message.text",
    "responseMappings.landingUrl",
  ]);

  const result = validateInstagramDmActionConfiguration({
    schemaVersion: INSTAGRAM_DM_ACTION_CONFIGURATION_SCHEMA_VERSION,
    campaignId: "campaign.launch-1",
    capabilityId: "cap.comment-to-dm",
    triggerConfiguration: {
      schemaVersion: INSTAGRAM_COMMENT_TRIGGER_CONFIGURATION_SCHEMA_VERSION,
      accountId: "ig.account.1",
      conditionMatchers: [
        {
          id: "condition.drop-link",
          field: "text",
          operator: "any_keyword",
          keywords: ["drop", "link"],
        },
        {
          id: "condition.vip",
          field: "commenter.username",
          operator: "contains",
          value: "vip",
        },
      ],
      attribution: {
        campaign: "campaign.launch-1",
        contentTemplate: "{{mediaId}}",
        termTemplate: "{{commentText}}",
      },
    },
    responseMappings: [
      {
        id: "mapping.drop-link",
        triggerMatcherId: "condition.drop-link",
        message: {
          templateId: "template.drop-link",
          text: "Here is the launch link: {{landingUrl}}",
          variables: {
            landingUrl: "https://shop.example.test/drop?utm_source=instagram",
          },
        },
        landingUrl: "https://shop.example.test/drop?utm_source=instagram&utm_medium=dm",
        attributionTermTemplate: "{{commentText}}",
      },
      {
        id: "mapping.vip",
        triggerMatcherId: "condition.vip",
        message: {
          templateId: "template.vip",
          text: "Your private VIP link is ready: {{landingUrl}}",
        },
        landingUrl: "https://shop.example.test/vip?utm_source=instagram&utm_medium=dm",
      },
    ],
    attribution: {
      source: "instagram",
      medium: "dm",
      campaign: "campaign.launch-1",
    },
  });

  assert.deepEqual(result, {
    ok: true,
    errors: [],
  });
});

test("selectInstagramDmResponseForCommentEvent selects a mapped DM response from comment text", () => {
  const selection = selectInstagramDmResponseForCommentEvent(
    {
      schemaVersion: INSTAGRAM_DM_ACTION_CONFIGURATION_SCHEMA_VERSION,
      campaignId: "campaign.launch-1",
      capabilityId: "cap.comment-to-dm",
      triggerConfiguration: {
        schemaVersion: INSTAGRAM_COMMENT_TRIGGER_CONFIGURATION_SCHEMA_VERSION,
        accountId: "ig.account.1",
        conditionMatchers: [
          {
            id: "condition.drop-link",
            field: "text",
            operator: "any_keyword",
            keywords: ["drop", "link"],
          },
          {
            id: "condition.vip",
            field: "commenter.username",
            operator: "contains",
            value: "vip",
          },
        ],
      },
      responseMappings: [
        {
          id: "mapping.drop-link",
          triggerMatcherId: "condition.drop-link",
          message: {
            templateId: "template.drop-link",
            text: "Here is the launch link: {{landingUrl}}",
          },
          landingUrl:
            "https://shop.example.test/drop?utm_source=instagram&utm_medium=dm",
          attributionTermTemplate: "{{commentText}}",
        },
        {
          id: "mapping.vip",
          triggerMatcherId: "condition.vip",
          message: {
            templateId: "template.vip",
            text: "Your VIP link is ready: {{landingUrl}}",
          },
          landingUrl:
            "https://shop.example.test/vip?utm_source=instagram&utm_medium=dm",
        },
      ],
      attribution: {
        source: "instagram",
        medium: "dm",
        campaign: "campaign.launch-1",
      },
    },
    {
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
        username: "creativebuyer",
      },
      text: "Please send the DROP details",
    },
  );

  assert.deepEqual(selection, {
    matched: true,
    matcherId: "condition.drop-link",
    mappingId: "mapping.drop-link",
    message: {
      templateId: "template.drop-link",
      text: "Here is the launch link: {{landingUrl}}",
    },
    landingUrl: "https://shop.example.test/drop?utm_source=instagram&utm_medium=dm",
    attribution: {
      source: "instagram",
      medium: "dm",
      campaign: "campaign.launch-1",
      term: "Please send the DROP details",
    },
  });
});

test("selectInstagramDmResponseForCommentEvent supports commenter, mention, and metadata matchers", () => {
  const baseConfiguration = {
    schemaVersion: INSTAGRAM_DM_ACTION_CONFIGURATION_SCHEMA_VERSION,
    campaignId: "campaign.launch-1",
    capabilityId: "cap.comment-to-dm",
    triggerConfiguration: {
      schemaVersion: INSTAGRAM_COMMENT_TRIGGER_CONFIGURATION_SCHEMA_VERSION,
      accountId: "ig.account.1",
      conditionMatchers: [
        {
          id: "condition.vip",
          field: "commenter.username",
          operator: "contains",
          value: "vip",
        },
        {
          id: "condition.mention",
          field: "mentions",
          operator: "contains",
          mentions: ["@owncanvas"],
        },
        {
          id: "condition.offer",
          field: "metadata",
          metadataField: "productOfferId",
          operator: "equals",
          value: "offer.launch-1",
        },
      ],
    },
    responseMappings: [
      {
        id: "mapping.vip",
        triggerMatcherId: "condition.vip",
        message: {
          templateId: "template.vip",
          text: "Your VIP link is ready.",
        },
        landingUrl:
          "https://shop.example.test/vip?utm_source=instagram&utm_medium=dm",
      },
      {
        id: "mapping.mention",
        triggerMatcherId: "condition.mention",
        message: {
          templateId: "template.mention",
          text: "Thanks for mentioning us.",
        },
        landingUrl:
          "https://shop.example.test/mention?utm_source=instagram&utm_medium=dm",
      },
      {
        id: "mapping.offer",
        triggerMatcherId: "condition.offer",
        message: {
          templateId: "template.offer",
          text: "This offer is ready.",
        },
        landingUrl:
          "https://shop.example.test/offer?utm_source=instagram&utm_medium=dm",
      },
    ],
  } as const;

  const baseEvent = {
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
      username: "creativebuyer",
    },
    text: "Need details",
  } as const;

  assert.equal(
    selectInstagramDmResponseForCommentEvent(baseConfiguration, {
      ...baseEvent,
      commenter: {
        id: "ig.user.2",
        username: "vip_buyer",
      },
    }).mappingId,
    "mapping.vip",
  );
  assert.equal(
    selectInstagramDmResponseForCommentEvent(baseConfiguration, {
      ...baseEvent,
      text: "@owncanvas can I get this?",
    }).mappingId,
    "mapping.mention",
  );
  assert.equal(
    selectInstagramDmResponseForCommentEvent(baseConfiguration, {
      ...baseEvent,
      metadata: {
        productOfferId: "offer.launch-1",
      },
    }).mappingId,
    "mapping.offer",
  );
  assert.deepEqual(
    selectInstagramDmResponseForCommentEvent(baseConfiguration, {
      ...baseEvent,
      text: "No rule should match this",
    }),
    {
      matched: false,
      reason: "no_matching_response_mapping",
    },
  );
});

test("validateInstagramDmActionConfiguration rejects unsafe tracked DM configuration", () => {
  const result = validateInstagramDmActionConfiguration({
    schemaVersion: "owncanvas.instagram-dm-action-configuration.v0",
    campaignId: "campaign.launch-1",
    capabilityId: "",
    triggerConfiguration: {
      schemaVersion: INSTAGRAM_COMMENT_TRIGGER_CONFIGURATION_SCHEMA_VERSION,
      accountId: "",
      keywordMatchers: [],
      attribution: {
        campaign: "campaign.other",
      },
    },
    message: {
      text: "",
    },
    landingUrl: "javascript:alert(1)",
    attribution: {
      source: "instagram",
      medium: "comment",
      campaign: "campaign.other",
    },
  });

  assert.equal(result.ok, false);
  assert.deepEqual(
    result.errors.map((error) => error.code),
    [
      "instagram-dm-config.schema_version_invalid",
      "instagram-dm-config.capability_id_required",
      "instagram-dm-config.trigger_configuration_invalid",
      "instagram-dm-config.message_text_required",
      "instagram-dm-config.landing_url_invalid",
      "instagram-dm-config.attribution_medium_invalid",
      "instagram-dm-config.attribution_campaign_mismatch",
      "instagram-dm-config.trigger_campaign_mismatch",
    ],
  );
});

test("validateInstagramDmActionConfiguration rejects unsafe response mappings", () => {
  const result = validateInstagramDmActionConfiguration({
    schemaVersion: INSTAGRAM_DM_ACTION_CONFIGURATION_SCHEMA_VERSION,
    campaignId: "campaign.launch-1",
    capabilityId: "cap.comment-to-dm",
    triggerConfiguration: {
      schemaVersion: INSTAGRAM_COMMENT_TRIGGER_CONFIGURATION_SCHEMA_VERSION,
      accountId: "ig.account.1",
      conditionMatchers: [
        {
          id: "condition.drop-link",
          field: "text",
          operator: "any_keyword",
          keywords: ["drop"],
        },
      ],
      attribution: {
        campaign: "campaign.launch-1",
      },
    },
    responseMappings: [
      {
        id: "",
        triggerMatcherId: "",
        message: {
          text: "",
        },
        landingUrl: "javascript:alert(1)",
      },
      {
        id: "mapping.unknown",
        triggerMatcherId: "condition.unknown",
        message: {
          text: "Unknown matcher link: {{landingUrl}}",
        },
        landingUrl: "https://shop.example.test/drop",
      },
    ],
  });

  assert.equal(result.ok, false);
  assert.deepEqual(
    result.errors.map((error) => error.code),
    [
      "instagram-dm-config.response_mapping_id_required",
      "instagram-dm-config.response_mapping_trigger_matcher_id_required",
      "instagram-dm-config.response_mapping_message_text_required",
      "instagram-dm-config.response_mapping_landing_url_invalid",
      "instagram-dm-config.response_mapping_trigger_matcher_not_found",
    ],
  );
});

test("validateInstagramCommentTriggerEvent accepts attribution-ready Instagram comment events", () => {
  const result = validateInstagramCommentTriggerEvent({
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
    permalink: "https://instagram.example.test/p/1",
    attribution: {
      source: "instagram",
      medium: "comment",
      campaign: "campaign.launch-1",
      content: "ig.media.1",
      term: "send me the link",
    },
  });

  assert.deepEqual(result, {
    ok: true,
    errors: [],
  });
});

test("Instagram comment trigger event schema models normalized commenter identity references", () => {
  assert.deepEqual(
    INSTAGRAM_COMMENT_TRIGGER_EVENT_SCHEMA.identityFields,
    [
      "commenter.platform",
      "commenter.platformUserId",
      "commenter.username",
      "commenter.profile.profileUrl",
      "commenter.profile.profilePictureUrl",
      "commenter.identityLinkage.normalizedIdentityId",
      "commenter.identityLinkage.namespace",
      "commenter.identityLinkage.externalUserId",
      "commenter.identityLinkage.anonymousId",
      "commenter.identityLinkage.emailHash",
      "commenter.identityLinkage.phoneHash",
      "commenter.identityLinkage.linkSource",
      "commenter.identityLinkage.linkConfidence",
      "commenter.identityLinkage.linkedAt",
    ],
  );

  const result = validateInstagramCommentTriggerEvent({
    schemaVersion: INSTAGRAM_COMMENT_TRIGGER_EVENT_SCHEMA_VERSION,
    id: "evt.instagram-comment.identity",
    campaignId: "campaign.launch-1",
    occurredAt: "2026-05-11T00:00:00.000Z",
    channel: "instagram",
    trigger: "comment",
    accountId: "ig.account.1",
    mediaId: "ig.media.1",
    commentId: "ig.comment.1",
    commenter: {
      id: "legacy-commenter-id",
      platform: "instagram",
      platformUserId: "17841400000000000",
      username: "creativebuyer",
      profile: {
        profileUrl: "https://www.instagram.com/creativebuyer/",
      },
      identityLinkage: {
        normalizedIdentityId: "identity.instagram.creativebuyer",
        namespace: "instagram-commenters",
        linkSource: "instagram-comment-webhook",
        linkConfidence: 0.8,
        linkedAt: "2026-05-11T00:00:01.000Z",
      },
    },
    text: "send me the link",
  });

  assert.deepEqual(result, {
    ok: true,
    errors: [],
  });
});

test("validateInstagramCommentTriggerConfiguration accepts keyword and attribution settings", () => {
  assert.equal(
    INSTAGRAM_COMMENT_TRIGGER_CONFIGURATION_SCHEMA.schemaVersion,
    INSTAGRAM_COMMENT_TRIGGER_CONFIGURATION_SCHEMA_VERSION,
  );
  assert.equal(INSTAGRAM_COMMENT_TRIGGER_CONFIGURATION_SCHEMA.channel, "instagram");
  assert.deepEqual(
    INSTAGRAM_COMMENT_TRIGGER_CONFIGURATION_SCHEMA.requiredFields,
    ["accountId", "conditionMatchers"],
  );

  const result = validateInstagramCommentTriggerConfiguration({
    schemaVersion: INSTAGRAM_COMMENT_TRIGGER_CONFIGURATION_SCHEMA_VERSION,
    accountId: "ig.account.1",
    mediaIds: ["ig.media.1", "ig.media.2"],
    keywordMatchers: [
      {
        id: "matcher.send-link",
        matchType: "contains",
        value: "send me the link",
        caseSensitive: false,
      },
    ],
    attribution: {
      campaign: "campaign.launch-1",
      contentTemplate: "{{mediaId}}",
      termTemplate: "{{commentText}}",
    },
  });

  assert.deepEqual(result, {
    ok: true,
    errors: [],
  });
});

test("Instagram comment trigger schema defines condition matching operators, keywords, mentions, and metadata fields", () => {
  assert.deepEqual(INSTAGRAM_COMMENT_TRIGGER_SUPPORTED_OPERATORS, [
    "equals",
    "contains",
    "starts_with",
    "ends_with",
    "regex",
    "any_keyword",
    "all_keywords",
  ]);
  assert.deepEqual(
    INSTAGRAM_COMMENT_TRIGGER_CONFIGURATION_SCHEMA.conditionFields,
    ["text", "commenter.username", "mentions", "metadata"],
  );
  assert.deepEqual(
    INSTAGRAM_COMMENT_TRIGGER_CONFIGURATION_SCHEMA.metadataFields,
    ["sourceNodeId", "creativeAssetId", "productOfferId", "attributionTerm"],
  );

  const result = validateInstagramCommentTriggerConfiguration({
    schemaVersion: INSTAGRAM_COMMENT_TRIGGER_CONFIGURATION_SCHEMA_VERSION,
    accountId: "ig.account.1",
    conditionMatchers: [
      {
        id: "condition.keyword",
        field: "text",
        operator: "any_keyword",
        keywords: ["drop", "link"],
        caseSensitive: false,
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
    metadata: {
      sourceNodeId: "node.instagram-comment",
      creativeAssetId: "asset.drop-video",
      productOfferId: "offer.launch-1",
      attributionTerm: "drop link",
    },
  });

  assert.deepEqual(result, {
    ok: true,
    errors: [],
  });
});

test("Instagram comment trigger configuration models matched post references and selection filters", () => {
  assert.deepEqual(
    INSTAGRAM_COMMENT_TRIGGER_CONFIGURATION_SCHEMA.postReferenceFields,
    ["mediaId", "postId", "permalink", "caption"],
  );
  assert.deepEqual(INSTAGRAM_COMMENT_TRIGGER_POST_FILTER_FIELDS, [
    "mediaIds",
    "permalinkUrls",
    "captionKeywords",
    "hashtags",
    "publishedAfter",
    "publishedBefore",
  ]);

  const result = validateInstagramCommentTriggerConfiguration({
    schemaVersion: INSTAGRAM_COMMENT_TRIGGER_CONFIGURATION_SCHEMA_VERSION,
    accountId: "ig.account.1",
    matchedPosts: [
      {
        mediaId: "ig.media.1",
        postId: "ig.post.1",
        shortcode: "DROP001",
        permalink: "https://www.instagram.com/p/DROP001/",
        caption: {
          text: "Drop a comment for the private launch link.",
          sourceNodeId: "node.caption-copy",
          assetId: "asset.caption.1",
        },
        selectionCriteria: {
          mode: "include",
          hashtags: ["#drop"],
          captionKeywords: ["private launch"],
          publishedAfter: "2026-05-01T00:00:00.000Z",
          publishedBefore: "2026-05-31T23:59:59.000Z",
        },
      },
    ],
    postSelection: {
      mode: "include",
      mediaIds: ["ig.media.1"],
      permalinkUrls: ["https://www.instagram.com/p/DROP001/"],
      captionKeywords: ["private launch"],
      hashtags: ["#drop"],
      publishedAfter: "2026-05-01T00:00:00.000Z",
      publishedBefore: "2026-05-31T23:59:59.000Z",
    },
    conditionMatchers: [
      {
        id: "condition.keyword",
        field: "text",
        operator: "any_keyword",
        keywords: ["link"],
      },
    ],
  });

  assert.deepEqual(result, {
    ok: true,
    errors: [],
  });
});

test("validateInstagramCommentTriggerConfiguration rejects unsafe trigger settings", () => {
  const result = validateInstagramCommentTriggerConfiguration({
    schemaVersion: "owncanvas.instagram-comment-trigger-configuration.v0",
    accountId: "",
    mediaIds: ["ig.media.1", ""],
    keywordMatchers: [
      {
        id: "",
        matchType: "regex",
        value: "",
      },
      {
        id: "matcher.unsupported",
        matchType: "starts-with",
        value: "buy",
      },
    ],
    attribution: {
      campaign: "",
    },
  });

  assert.equal(result.ok, false);
  assert.deepEqual(
    result.errors.map((error) => error.code),
    [
      "instagram-comment-trigger.schema_version_invalid",
      "instagram-comment-trigger.account_id_required",
      "instagram-comment-trigger.media_id_required",
      "instagram-comment-trigger.keyword_matcher_id_required",
      "instagram-comment-trigger.keyword_value_required",
      "instagram-comment-trigger.keyword_match_type_invalid",
      "instagram-comment-trigger.attribution_campaign_required",
    ],
  );
});

test("validateInstagramCommentTriggerConfiguration rejects unsafe condition matchers", () => {
  const result = validateInstagramCommentTriggerConfiguration({
    schemaVersion: INSTAGRAM_COMMENT_TRIGGER_CONFIGURATION_SCHEMA_VERSION,
    accountId: "ig.account.1",
    conditionMatchers: [
      {
        id: "",
        field: "caption",
        operator: "near",
      },
      {
        id: "condition.empty-keyword",
        field: "text",
        operator: "all_keywords",
        keywords: [""],
      },
      {
        id: "condition.empty-mention",
        field: "mentions",
        operator: "contains",
        mentions: [],
      },
      {
        id: "condition.bad-metadata",
        field: "metadata",
        metadataField: "unknownField",
        operator: "equals",
        value: "value",
      },
    ],
  });

  assert.equal(result.ok, false);
  assert.deepEqual(
    result.errors.map((error) => error.code),
    [
      "instagram-comment-trigger.condition_matcher_id_required",
      "instagram-comment-trigger.condition_field_invalid",
      "instagram-comment-trigger.condition_operator_invalid",
      "instagram-comment-trigger.condition_keyword_required",
      "instagram-comment-trigger.condition_mention_required",
      "instagram-comment-trigger.condition_metadata_field_invalid",
    ],
  );
});

test("validateInstagramCommentTriggerConfiguration rejects unsafe matched post references and filters", () => {
  const result = validateInstagramCommentTriggerConfiguration({
    schemaVersion: INSTAGRAM_COMMENT_TRIGGER_CONFIGURATION_SCHEMA_VERSION,
    accountId: "ig.account.1",
    matchedPosts: [
      {
        permalink: "javascript:alert(1)",
        caption: {},
        selectionCriteria: {
          mode: "all",
          mediaIds: [""],
          permalinkUrls: ["ftp://instagram.example.test/p/1"],
          captionKeywords: [""],
          hashtags: [""],
          publishedAfter: "not-a-date",
          publishedBefore: "not-a-date",
        },
      },
    ],
    postSelection: {
      mode: "include",
      permalinkUrls: ["notaurl"],
    },
    conditionMatchers: [
      {
        id: "condition.keyword",
        field: "text",
        operator: "any_keyword",
        keywords: ["link"],
      },
    ],
  });

  assert.equal(result.ok, false);
  assert.deepEqual(
    result.errors.map((error) => error.code),
    [
      "instagram-comment-trigger.post_identifier_required",
      "instagram-comment-trigger.post_permalink_invalid",
      "instagram-comment-trigger.post_caption_reference_required",
      "instagram-comment-trigger.post_selection_mode_invalid",
      "instagram-comment-trigger.post_selection_media_id_required",
      "instagram-comment-trigger.post_selection_caption_keyword_required",
      "instagram-comment-trigger.post_selection_hashtag_required",
      "instagram-comment-trigger.post_selection_permalink_invalid",
      "instagram-comment-trigger.post_selection_published_after_invalid",
      "instagram-comment-trigger.post_selection_published_before_invalid",
      "instagram-comment-trigger.post_selection_permalink_invalid",
    ],
  );
});

test("validateInstagramCommentTriggerEvent rejects malformed comment trigger events", () => {
  const result = validateInstagramCommentTriggerEvent({
    schemaVersion: "owncanvas.instagram-comment-trigger-event.v0",
    campaignId: "",
    occurredAt: "not-a-date",
    channel: "messenger",
    trigger: "keyword",
    accountId: "",
    mediaId: "",
    commentId: "",
    commenter: {
      username: "missing-id",
    },
    text: "",
  });

  assert.equal(result.ok, false);
  assert.deepEqual(
    result.errors.map((error) => error.code),
    [
      "instagram-comment.schema_version_invalid",
      "instagram-comment.id_required",
      "instagram-comment.campaign_id_required",
      "instagram-comment.occurred_at_invalid",
      "instagram-comment.channel_invalid",
      "instagram-comment.trigger_invalid",
      "instagram-comment.account_id_required",
      "instagram-comment.media_id_required",
      "instagram-comment.comment_id_required",
      "instagram-comment.commenter_id_required",
      "instagram-comment.text_required",
    ],
  );
});

test("validateInstagramCommentTriggerEvent rejects malformed commenter identity references", () => {
  const result = validateInstagramCommentTriggerEvent({
    schemaVersion: INSTAGRAM_COMMENT_TRIGGER_EVENT_SCHEMA_VERSION,
    id: "evt.instagram-comment.identity.invalid",
    campaignId: "campaign.launch-1",
    occurredAt: "2026-05-11T00:00:00.000Z",
    channel: "instagram",
    trigger: "comment",
    accountId: "ig.account.1",
    mediaId: "ig.media.1",
    commentId: "ig.comment.1",
    commenter: {
      id: "ig.user.1",
      platform: "tiktok",
      platformUserId: "",
      username: "",
      profile: {
        profileUrl: "ftp://instagram.example.test/creativebuyer",
        profilePictureUrl: "not-a-url",
      },
      identityLinkage: {
        normalizedIdentityId: "",
        namespace: "",
        externalUserId: "",
        anonymousId: "",
        emailHash: "",
        phoneHash: "",
        linkSource: "",
        linkConfidence: 1.5,
        linkedAt: "not-a-date",
      },
    },
    text: "send me the link",
  });

  assert.equal(result.ok, false);
  assert.deepEqual(
    result.errors.map((error) => error.code),
    [
      "instagram-comment.commenter_platform_invalid",
      "instagram-comment.commenter_platform_user_id_required",
      "instagram-comment.commenter_username_required",
      "instagram-comment.commenter_profile_url_invalid",
      "instagram-comment.commenter_profile_picture_url_invalid",
      "instagram-comment.commenter_normalized_identity_id_required",
      "instagram-comment.commenter_identity_namespace_required",
      "instagram-comment.commenter_external_user_id_required",
      "instagram-comment.commenter_anonymous_id_required",
      "instagram-comment.commenter_email_hash_required",
      "instagram-comment.commenter_phone_hash_required",
      "instagram-comment.commenter_link_source_required",
      "instagram-comment.commenter_link_confidence_invalid",
      "instagram-comment.commenter_linked_at_invalid",
    ],
  );
});

test("validateInstagramDmActionExecutionRequest accepts attribution-ready DM executions", () => {
  const result = validateInstagramDmActionExecutionRequest({
    schemaVersion: INSTAGRAM_DM_ACTION_EXECUTION_SCHEMA_VERSION,
    id: "exec.instagram-dm.1",
    campaignId: "campaign.launch-1",
    capabilityId: "cap.comment-to-dm",
    requestedAt: "2026-05-11T00:02:00.000Z",
    requestedBy: "agent",
    triggerEvent: {
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
        username: "creativebuyer",
      },
      text: "send me the link",
      attribution: {
        source: "instagram",
        medium: "comment",
        campaign: "campaign.launch-1",
        content: "ig.media.1",
        term: "send me the link",
      },
    },
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
      term: "send me the link",
    },
  });

  assert.deepEqual(result, {
    ok: true,
    errors: [],
  });
  assert.equal(INSTAGRAM_DM_ACTION_EXECUTION_SCHEMA.channel, "instagram");
});

test("validateInstagramDmActionExecutionRequest rejects unsafe DM executions", () => {
  const result = validateInstagramDmActionExecutionRequest({
    schemaVersion: "owncanvas.instagram-dm-action-execution.v0",
    id: "",
    campaignId: "campaign.launch-1",
    capabilityId: "",
    requestedAt: "not-a-date",
    requestedBy: "bot",
    triggerEvent: {
      schemaVersion: INSTAGRAM_COMMENT_TRIGGER_EVENT_SCHEMA_VERSION,
      id: "evt.instagram-comment.1",
      campaignId: "campaign.other",
      occurredAt: "2026-05-11T00:00:00.000Z",
      channel: "instagram",
      trigger: "comment",
      accountId: "ig.account.1",
      mediaId: "ig.media.1",
      commentId: "ig.comment.1",
      commenter: {
        id: "ig.user.1",
      },
      text: "send me the link",
    },
    recipient: {
      instagramUserId: "",
    },
    message: {
      text: "",
    },
    landingUrl: "javascript:alert(1)",
  });

  assert.equal(result.ok, false);
  assert.deepEqual(
    result.errors.map((error) => error.code),
    [
      "instagram-dm.schema_version_invalid",
      "instagram-dm.id_required",
      "instagram-dm.capability_id_required",
      "instagram-dm.requested_at_invalid",
      "instagram-dm.requested_by_invalid",
      "instagram-dm.recipient_id_required",
      "instagram-dm.message_text_required",
      "instagram-dm.landing_url_invalid",
      "instagram-dm.trigger_campaign_mismatch",
    ],
  );
});

test("createInstagramDmDispatchAdapter sends matched Instagram DM responses", async () => {
  const sentMessages: unknown[] = [];
  const adapter = createInstagramDmDispatchAdapter({
    async sendDirectMessage(message) {
      sentMessages.push(message);

      return {
        messageId: "ig.dm.1",
        metadata: {
          providerRequestId: "req.instagram.1",
        },
      };
    },
  });

  const response = await adapter.execute(
    {
      schemaVersion: INSTAGRAM_DM_ACTION_EXECUTION_SCHEMA_VERSION,
      id: "exec.instagram-dm.1",
      campaignId: "campaign.launch-1",
      capabilityId: "cap.comment-to-dm",
      requestedAt: "2026-05-11T00:02:00.000Z",
      requestedBy: "agent",
      triggerEvent: {
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
          username: "creativebuyer",
        },
        text: "send me the link",
      },
      recipient: {
        instagramUserId: "ig.user.1",
        username: "creativebuyer",
      },
      message: {
        templateId: "template.drop-link",
        text: "Here is the tracked link for the launch.",
      },
      landingUrl:
        "https://shop.example.test/drop?utm_source=instagram&utm_medium=dm",
      attribution: {
        source: "instagram",
        medium: "dm",
        campaign: "campaign.launch-1",
        content: "ig.media.1",
        term: "send me the link",
      },
      metadata: {
        mappingId: "mapping.drop-link",
      },
    },
    {
      plugin: createDiscoverablePluginFixture(
        "direct-message",
      ) as DirectMessagePluginManifest,
      configuration: {
        appliedAt: "2026-05-11T00:01:00.000Z",
        appliedBy: "agent",
        source: "plugin.default",
        values: {
          accountId: "ig.account.1",
        },
        secretRefs: {},
        missingRequiredKeys: [],
      },
      now: () => "2026-05-11T00:02:01.000Z",
    },
  );

  assert.deepEqual(sentMessages, [
    {
      accountId: "ig.account.1",
      recipientId: "ig.user.1",
      text: "Here is the tracked link for the launch.",
      landingUrl:
        "https://shop.example.test/drop?utm_source=instagram&utm_medium=dm",
      metadata: {
        campaignId: "campaign.launch-1",
        capabilityId: "cap.comment-to-dm",
        executionId: "exec.instagram-dm.1",
        requestedBy: "agent",
        triggerEventId: "evt.instagram-comment.1",
        mappingId: "mapping.drop-link",
      },
    },
  ]);
  assert.deepEqual(response, {
    schemaVersion: INSTAGRAM_DM_ACTION_EXECUTION_SCHEMA_VERSION,
    requestId: "exec.instagram-dm.1",
    campaignId: "campaign.launch-1",
    capabilityId: "cap.comment-to-dm",
    status: "delivered",
    occurredAt: "2026-05-11T00:02:01.000Z",
    delivery: {
      channel: "instagram",
      recipientId: "ig.user.1",
      messageId: "ig.dm.1",
      landingUrl:
        "https://shop.example.test/drop?utm_source=instagram&utm_medium=dm",
    },
    attribution: {
      source: "instagram",
      medium: "dm",
      campaign: "campaign.launch-1",
      content: "ig.media.1",
      term: "send me the link",
    },
    metadata: {
      providerRequestId: "req.instagram.1",
    },
  });
});

test("createInstagramDmDispatchAdapter returns failed responses for validation and provider errors", async () => {
  const adapter = createInstagramDmDispatchAdapter({
    async sendDirectMessage() {
      throw Object.assign(new Error("Instagram declined this DM."), {
        code: "instagram_dm_recipient_unreachable",
      });
    },
  });
  const plugin = createDiscoverablePluginFixture(
    "direct-message",
  ) as DirectMessagePluginManifest;
  const invalidExecutionRequest: unknown = {
    schemaVersion: "owncanvas.instagram-dm-action-execution.v0",
    id: "",
    campaignId: "campaign.launch-1",
    capabilityId: "",
    requestedAt: "not-a-date",
    requestedBy: "agent",
    triggerEvent: {
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
      },
      text: "send me the link",
    },
    recipient: {
      instagramUserId: "ig.user.1",
    },
    message: {
      text: "Here is the tracked link.",
    },
    landingUrl: "https://shop.example.test/drop",
  };

  const invalidResponse = await adapter.execute(
    invalidExecutionRequest as Parameters<typeof adapter.execute>[0],
    {
      plugin,
      now: () => "2026-05-11T00:02:01.000Z",
    },
  );

  assert.equal(invalidResponse.status, "failed");
  assert.deepEqual(invalidResponse.error, {
    code: "instagram-dm.schema_version_invalid",
    message:
      "Instagram DM dispatch requires a valid execution request before sending.",
  });

  const providerResponse = await adapter.execute(
    {
      schemaVersion: INSTAGRAM_DM_ACTION_EXECUTION_SCHEMA_VERSION,
      id: "exec.instagram-dm.1",
      campaignId: "campaign.launch-1",
      capabilityId: "cap.comment-to-dm",
      requestedAt: "2026-05-11T00:02:00.000Z",
      requestedBy: "human",
      triggerEvent: {
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
        },
        text: "send me the link",
      },
      recipient: {
        instagramUserId: "ig.user.1",
      },
      message: {
        text: "Here is the tracked link.",
      },
      landingUrl: "https://shop.example.test/drop",
    },
    {
      plugin,
      now: () => "2026-05-11T00:02:02.000Z",
    },
  );

  assert.equal(providerResponse.status, "failed");
  assert.deepEqual(providerResponse.error, {
    code: "instagram_dm_recipient_unreachable",
    message: "Instagram declined this DM.",
  });
});

test("validateLandingPageHandoffEvent accepts attribution-ready landing handoffs", () => {
  const result = validateLandingPageHandoffEvent({
    schemaVersion: LANDING_PAGE_HANDOFF_EVENT_SCHEMA_VERSION,
    id: "evt.landing-handoff.1",
    campaignId: "campaign.launch-1",
    occurredAt: "2026-05-11T00:03:00.000Z",
    requestedBy: "agent",
    source: {
      pluginId: "plugin.instagram.dm",
      capabilityId: "cap.comment-to-dm",
      channel: "instagram",
      eventId: "exec.instagram-dm.1",
    },
    destination: {
      url: "https://shop.example.test/drop?utm_source=instagram&utm_medium=dm",
      landingPageId: "landing.drop-1",
      checkoutUrl: "https://shop.example.test/checkout/drop-1",
    },
    visitor: {
      platformUserId: "ig.user.1",
    },
    offer: {
      productId: "product.drop-1",
      offerId: "offer.spring-drop",
      sku: "DROP-001",
    },
    attribution: {
      source: "instagram",
      medium: "dm",
      campaign: "campaign.launch-1",
      content: "ig.media.1",
      term: "send me the link",
      clickId: "clk.1",
      touchpointId: "touch.dm.1",
    },
  });

  assert.deepEqual(result, {
    ok: true,
    errors: [],
  });
  assert.equal(
    LANDING_PAGE_HANDOFF_EVENT_SCHEMA.eventSchemaVersion,
    LANDING_PAGE_HANDOFF_EVENT_SCHEMA_VERSION,
  );
  assert.deepEqual(LANDING_PAGE_HANDOFF_EVENT_SCHEMA.requiredFields, [
    "id",
    "campaignId",
    "occurredAt",
    "requestedBy",
    "source.pluginId",
    "source.capabilityId",
    "destination.url",
  ]);
});

test("validateLandingPageHandoffEvent rejects unsafe landing handoffs", () => {
  const result = validateLandingPageHandoffEvent({
    schemaVersion: "owncanvas.landing-page-handoff-event.v0",
    id: "",
    campaignId: "campaign.launch-1",
    occurredAt: "not-a-date",
    requestedBy: "bot",
    source: {
      pluginId: "",
      capabilityId: "",
    },
    destination: {
      url: "javascript:alert(1)",
      checkoutUrl: "ftp://shop.example.test/checkout",
    },
    attribution: {
      source: "instagram",
      medium: "dm",
      campaign: "campaign.other",
    },
  });

  assert.equal(result.ok, false);
  assert.deepEqual(
    result.errors.map((error) => error.code),
    [
      "landing-handoff.schema_version_invalid",
      "landing-handoff.id_required",
      "landing-handoff.occurred_at_invalid",
      "landing-handoff.requested_by_invalid",
      "landing-handoff.source_plugin_id_required",
      "landing-handoff.source_capability_id_required",
      "landing-handoff.destination_url_invalid",
      "landing-handoff.checkout_url_invalid",
      "landing-handoff.attribution_campaign_mismatch",
    ],
  );
});

test("validateLandingPageHandoffPayload accepts configured landing payloads with conversion tracking metadata", () => {
  const tracking = {
    schemaVersion: LANDING_PAGE_HANDOFF_TRACKING_METADATA_SCHEMA_VERSION,
    attribution: {
      source: "instagram",
      medium: "dm",
      campaign: "campaign.launch-1",
      content: "ig.media.1",
      term: "send me the link",
      clickId: "clk.1",
      touchpointId: "touch.dm.1",
    },
    events: [
      {
        name: "landing_view",
        destination: "owncanvas",
        required: true,
      },
      {
        name: "purchase_conversion",
        destination: "external",
        required: true,
        conversion: true,
      },
    ],
    conversion: {
      eventName: "purchase_conversion",
      currency: "USD",
      attributionWindowDays: 7,
    },
  } as const;

  assert.deepEqual(validateLandingPageHandoffTrackingMetadata(tracking), {
    ok: true,
    errors: [],
  });

  const result = validateLandingPageHandoffPayload({
    schemaVersion: LANDING_PAGE_HANDOFF_PAYLOAD_SCHEMA_VERSION,
    id: "handoff.payload.1",
    campaignId: "campaign.launch-1",
    requestedAt: "2026-05-11T00:04:00.000Z",
    requestedBy: "agent",
    configuration: {
      schemaVersion: LANDING_PAGE_HANDOFF_CONFIGURATION_SCHEMA_VERSION,
      landingPageId: "landing.drop-1",
      pageType: "content-commerce",
      destinationUrl: "https://shop.example.test/drop",
      checkoutUrl: "https://shop.example.test/checkout/drop-1",
      preserveImmersion: true,
    },
    payload: {
      creative: {
        headline: "Spring drop",
      },
      productOffer: {
        productId: "product.drop-1",
        offerId: "offer.spring-drop",
        checkoutUrl: "https://shop.example.test/checkout/drop-1",
      },
      visitor: {
        platformUserId: "ig.user.1",
      },
    },
    tracking,
  });

  assert.deepEqual(result, {
    ok: true,
    errors: [],
  });
  assert.equal(
    LANDING_PAGE_HANDOFF_CONFIGURATION_SCHEMA.schemaVersion,
    LANDING_PAGE_HANDOFF_CONFIGURATION_SCHEMA_VERSION,
  );
  assert.equal(
    LANDING_PAGE_HANDOFF_PAYLOAD_SCHEMA.schemaVersion,
    LANDING_PAGE_HANDOFF_PAYLOAD_SCHEMA_VERSION,
  );
  assert.deepEqual(LANDING_PAGE_HANDOFF_TRACKING_METADATA_SCHEMA.requiredFields, [
    "schemaVersion",
    "attribution.source",
    "attribution.medium",
    "attribution.campaign",
    "events",
    "conversion.eventName",
  ]);
});

test("validateLandingPageHandoffPayload rejects unsafe handoff payloads and tracking metadata", () => {
  const result = validateLandingPageHandoffPayload({
    schemaVersion: "owncanvas.landing-page-handoff-payload.v0",
    id: "",
    campaignId: "campaign.launch-1",
    requestedAt: "not-a-date",
    requestedBy: "bot",
    configuration: {
      schemaVersion: "owncanvas.landing-page-handoff-configuration.v0",
      landingPageId: "",
      pageType: "content-commerce",
      destinationUrl: "javascript:alert(1)",
      checkoutUrl: "ftp://shop.example.test/checkout",
      preserveImmersion: false,
    },
    payload: {
      creative: undefined,
      productOffer: {
        checkoutUrl: "javascript:alert(1)",
      },
    },
    tracking: {
      schemaVersion: "owncanvas.landing-page-handoff-tracking-metadata.v0",
      attribution: {
        source: "",
        medium: "",
        campaign: "campaign.other",
      },
      events: [],
      conversion: {
        eventName: "",
        attributionWindowDays: 0,
      },
    },
  });

  assert.equal(result.ok, false);
  assert.deepEqual(
    result.errors.map((error) => error.code),
    [
      "landing-payload.schema_version_invalid",
      "landing-payload.id_required",
      "landing-payload.requested_at_invalid",
      "landing-payload.requested_by_invalid",
      "landing-config.schema_version_invalid",
      "landing-config.landing_page_id_required",
      "landing-config.destination_url_invalid",
      "landing-config.checkout_url_invalid",
      "landing-config.immersion_required",
      "landing-payload.creative_required",
      "landing-payload.product_offer_checkout_url_invalid",
      "landing-tracking.schema_version_invalid",
      "landing-tracking.source_required",
      "landing-tracking.medium_required",
      "landing-tracking.attribution_campaign_mismatch",
      "landing-tracking.events_required",
      "landing-tracking.conversion_event_required",
      "landing-tracking.attribution_window_invalid",
    ],
  );
});

test("landing plugins can register a DM referral context contract", () => {
  const manifest = definePluginManifest({
    schemaVersion: "owncanvas.plugin.v1",
    id: "plugin.landing.dm-referral",
    name: "DM Referral Landing",
    version: "0.1.0",
    type: "landing",
    lifecycle: {
      state: "configured",
      updatedAt: "2026-05-11T00:01:00.000Z",
    },
    origin: {
      kind: "built-in",
      packageName: "@owncanvas/landing-dm-referral",
    },
    metadata: {
      displayName: "DM Referral Landing",
      description: "Consumes Instagram DM referral context for tracked landing pages.",
      tags: ["landing", "dm", "conversion"],
    },
    permissions: {
      mode: "advanced",
      installableBy: ["human", "agent"],
      configurableBy: ["human", "agent"],
      requiresApprovalFor: ["external_publish"],
    },
    landing: {
      pageTypes: ["product", "content-commerce", "offer", "custom"],
      publishTargets: ["hosted"],
      supportsCheckout: true,
      preservesImmersion: true,
      dmReferralContextSchemas: [LANDING_DM_REFERRAL_CONTEXT_SCHEMA],
      handoffEventSchemas: [LANDING_PAGE_HANDOFF_EVENT_SCHEMA],
    },
    capabilities: [
      {
        id: "cap.publish-dm-referral-landing",
        kind: "landing.page",
        title: "Publish DM referral landing",
        description: "Publishes a landing page from DM referral context.",
        concurrency: {
          supportsParallel: true,
          supportsBulk: true,
        },
        inputPorts: [
          { id: "creative", dataType: "json", required: true },
          { id: "dmReferralContext", dataType: "json", required: true },
        ],
        outputPorts: [
          { id: "url", dataType: "url", multiple: false },
          { id: "handoffEvent", dataType: "event", multiple: false },
        ],
      },
    ],
    configuration: {
      fields: [
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

  assert.equal(
    manifest.landing.dmReferralContextSchemas[0].contextSchemaVersion,
    LANDING_DM_REFERRAL_CONTEXT_SCHEMA_VERSION,
  );
  assert.deepEqual(validateLandingPluginConfiguration(manifest), {
    ok: true,
    errors: [],
  });
  assert.deepEqual(
    LANDING_DM_REFERRAL_CONTEXT_SCHEMA.requiredFields,
    [
      "schemaVersion",
      "campaignId",
      "channel",
      "sourceDm.pluginId",
      "sourceDm.capabilityId",
      "sourceDm.deliveryEventId",
      "landingUrl",
      "attribution.source",
      "attribution.medium",
      "attribution.campaign",
    ],
  );
});

test("validateLandingDmReferralContext accepts DM referral context for landing attribution", () => {
  const result = validateLandingDmReferralContext({
    schemaVersion: LANDING_DM_REFERRAL_CONTEXT_SCHEMA_VERSION,
    campaignId: "campaign.launch-1",
    channel: "instagram",
    sourceDm: {
      pluginId: "plugin.instagram.dm",
      capabilityId: "cap.comment-to-dm",
      deliveryEventId: "exec.instagram-dm.1",
      triggerEventId: "evt.instagram-comment.1",
    },
    visitor: {
      platformUserId: "ig.user.1",
      username: "creativebuyer",
      identityLinkage: {
        normalizedIdentityId: "identity.instagram.creativebuyer",
      },
    },
    landingUrl: "https://shop.example.test/drop?utm_source=instagram&utm_medium=dm",
    attribution: {
      source: "instagram",
      medium: "dm",
      campaign: "campaign.launch-1",
      content: "ig.media.1",
      term: "send me the link",
      touchpointId: "touch.dm.1",
    },
    offer: {
      productId: "product.drop-1",
      offerId: "offer.spring-drop",
    },
  });

  assert.deepEqual(result, {
    ok: true,
    errors: [],
  });
});

test("parseLandingDmReferralContext normalizes DM referral URLs for landing plugins", () => {
  const result = parseLandingDmReferralContext({
    landingUrl:
      "https://shop.example.test/drop?utm_source=Instagram&utm_medium=DM&utm_campaign=campaign.launch-1&utm_content=ig.media.1&utm_term=send%20me%20the%20link&oc_dm_plugin_id=plugin.instagram.dm&oc_dm_capability_id=cap.comment-to-dm&oc_dm_delivery_event_id=exec.instagram-dm.1&oc_dm_trigger_event_id=evt.instagram-comment.1&oc_platform_user_id=ig.user.1&oc_username=%40CreativeBuyer&oc_touchpoint_id=touch.dm.1&oc_offer_id=offer.spring-drop&oc_product_id=product.drop-1",
    channel: " Instagram ",
    campaignId: " campaign.launch-1 ",
    visitor: {
      identityLinkage: {
        normalizedIdentityId: "identity.instagram.creativebuyer",
      },
    },
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.context, {
    schemaVersion: LANDING_DM_REFERRAL_CONTEXT_SCHEMA_VERSION,
    campaignId: "campaign.launch-1",
    channel: "instagram",
    sourceDm: {
      pluginId: "plugin.instagram.dm",
      capabilityId: "cap.comment-to-dm",
      deliveryEventId: "exec.instagram-dm.1",
      triggerEventId: "evt.instagram-comment.1",
    },
    visitor: {
      platformUserId: "ig.user.1",
      username: "CreativeBuyer",
      identityLinkage: {
        normalizedIdentityId: "identity.instagram.creativebuyer",
      },
    },
    landingUrl:
      "https://shop.example.test/drop?utm_source=Instagram&utm_medium=DM&utm_campaign=campaign.launch-1&utm_content=ig.media.1&utm_term=send%20me%20the%20link&oc_dm_plugin_id=plugin.instagram.dm&oc_dm_capability_id=cap.comment-to-dm&oc_dm_delivery_event_id=exec.instagram-dm.1&oc_dm_trigger_event_id=evt.instagram-comment.1&oc_platform_user_id=ig.user.1&oc_username=%40CreativeBuyer&oc_touchpoint_id=touch.dm.1&oc_offer_id=offer.spring-drop&oc_product_id=product.drop-1",
    attribution: {
      source: "instagram",
      medium: "dm",
      campaign: "campaign.launch-1",
      content: "ig.media.1",
      term: "send me the link",
      touchpointId: "touch.dm.1",
    },
    offer: {
      productId: "product.drop-1",
      offerId: "offer.spring-drop",
    },
  });
});

test("landing-flow action contract maps delivered DM responses to destination metadata", () => {
  const mapping = mapDmResponseEventToLandingDestinationMetadata({
    dmResponse: {
      schemaVersion: INSTAGRAM_DM_ACTION_EXECUTION_SCHEMA_VERSION,
      requestId: "exec.instagram-dm.1",
      campaignId: "campaign.launch-1",
      capabilityId: "cap.comment-to-dm",
      status: "delivered",
      occurredAt: "2026-05-11T00:03:00.000Z",
      delivery: {
        channel: "instagram",
        recipientId: "ig.user.1",
        messageId: "ig.dm.1",
        landingUrl:
          "https://shop.example.test/drop?utm_source=instagram&utm_medium=dm",
      },
      attribution: {
        source: "instagram",
        medium: "dm",
        campaign: "campaign.launch-1",
        content: "ig.media.1",
        term: "send me the link",
      },
    },
    action: {
      schemaVersion: LANDING_FLOW_DESTINATION_MAPPING_SCHEMA_VERSION,
      id: "landing-flow.map.1",
      campaignId: "campaign.launch-1",
      requestedAt: "2026-05-11T00:03:01.000Z",
      requestedBy: "agent",
      sourceDmResponse: {
        pluginId: "plugin.instagram.dm",
        capabilityId: "cap.comment-to-dm",
        responseEventId: "exec.instagram-dm.1",
        channel: "instagram",
        status: "delivered",
      },
      landingDestination: {
        landingPageId: "landing.drop-1",
        pageType: "content-commerce",
        url: "https://shop.example.test/drop?utm_source=instagram&utm_medium=dm",
        checkoutUrl: "https://shop.example.test/checkout/drop-1",
        preserveImmersion: true,
      },
      attribution: {
        source: "instagram",
        medium: "dm",
        campaign: "campaign.launch-1",
        content: "ig.media.1",
        term: "send me the link",
        touchpointId: "touch.dm.1",
      },
      visitor: {
        platformUserId: "ig.user.1",
      },
      offer: {
        productId: "product.drop-1",
        offerId: "offer.spring-drop",
      },
    },
  });

  assert.deepEqual(validateLandingFlowDestinationMappingAction(mapping), {
    ok: true,
    errors: [],
  });
  assert.equal(
    LANDING_FLOW_DESTINATION_MAPPING_ACTION_SCHEMA.actionSchemaVersion,
    LANDING_FLOW_DESTINATION_MAPPING_SCHEMA_VERSION,
  );
  assert.deepEqual(
    LANDING_FLOW_DESTINATION_MAPPING_ACTION_SCHEMA.requiredFields,
    [
      "schemaVersion",
      "id",
      "campaignId",
      "requestedAt",
      "requestedBy",
      "sourceDmResponse.pluginId",
      "sourceDmResponse.capabilityId",
      "sourceDmResponse.responseEventId",
      "sourceDmResponse.status",
      "landingDestination.landingPageId",
      "landingDestination.url",
      "landingDestination.preserveImmersion",
      "attribution.source",
      "attribution.medium",
      "attribution.campaign",
    ],
  );
  assert.deepEqual(mapping.landingDestination, {
    landingPageId: "landing.drop-1",
    pageType: "content-commerce",
    url: "https://shop.example.test/drop?utm_source=instagram&utm_medium=dm",
    checkoutUrl: "https://shop.example.test/checkout/drop-1",
    preserveImmersion: true,
  });
  assert.deepEqual(mapping.sourceDmResponse, {
    pluginId: "plugin.instagram.dm",
    capabilityId: "cap.comment-to-dm",
    responseEventId: "exec.instagram-dm.1",
    channel: "instagram",
    status: "delivered",
    messageId: "ig.dm.1",
  });
  assert.equal(mapping.attribution.touchpointId, "touch.dm.1");
});

test("landing-flow plugins expose conversion event APIs with required measurement metadata", () => {
  const manifest = definePluginManifest({
    schemaVersion: "owncanvas.plugin.v1",
    id: "plugin.landing.conversion-api",
    name: "Conversion API Landing",
    version: "0.1.0",
    type: "landing",
    lifecycle: {
      state: "configured",
      updatedAt: "2026-05-11T00:04:00.000Z",
    },
    origin: {
      kind: "built-in",
      packageName: "@owncanvas/landing-conversion-api",
    },
    metadata: {
      displayName: "Conversion API Landing",
      description: "Publishes landing pages and emits conversion events.",
      tags: ["landing", "conversion", "attribution"],
    },
    permissions: {
      mode: "advanced",
      installableBy: ["human", "agent"],
      configurableBy: ["human", "agent"],
      requiresApprovalFor: ["external_publish"],
    },
    landing: {
      pageTypes: ["product", "content-commerce", "offer", "custom"],
      publishTargets: ["hosted"],
      supportsCheckout: true,
      preservesImmersion: true,
      conversionEventSchemas: [LANDING_CONVERSION_EVENT_SCHEMA],
    },
    capabilities: [
      {
        id: "cap.publish-conversion-landing",
        kind: "landing.page",
        title: "Publish conversion landing",
        description: "Publishes landing pages and emits conversion events.",
        concurrency: {
          supportsParallel: true,
          supportsBulk: false,
        },
        inputPorts: [{ id: "creative", dataType: "json", required: true }],
        outputPorts: [
          { id: "url", dataType: "url", multiple: false },
          { id: "conversionEvent", dataType: "event", multiple: true },
        ],
      },
    ],
    configuration: {
      fields: [
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

  assert.equal(
    manifest.landing.conversionEventSchemas[0].eventSchemaVersion,
    LANDING_CONVERSION_EVENT_SCHEMA_VERSION,
  );
  assert.deepEqual(validateLandingPluginConfiguration(manifest), {
    ok: true,
    errors: [],
  });
  assert.deepEqual(LANDING_CONVERSION_EVENT_SCHEMA.requiredFields, [
    "schemaVersion",
    "id",
    "campaignId",
    "occurredAt",
    "landing.pluginId",
    "landing.capabilityId",
    "landing.landingPageId",
    "landing.url",
    "conversion.eventName",
    "attribution.source",
    "attribution.medium",
    "attribution.campaign",
    "measurement.conversionKpi",
    "measurement.attributionWindowDays",
  ]);
});

test("createLandingConversionEventFromFlow preserves conversion attribution metadata", () => {
  const event = createLandingConversionEventFromFlow({
    mapping: {
      schemaVersion: LANDING_FLOW_DESTINATION_MAPPING_SCHEMA_VERSION,
      id: "landing-flow.map.1",
      campaignId: "campaign.launch-1",
      requestedAt: "2026-05-11T00:03:01.000Z",
      requestedBy: "agent",
      sourceDmResponse: {
        pluginId: "plugin.instagram.dm",
        capabilityId: "cap.comment-to-dm",
        responseEventId: "exec.instagram-dm.1",
        channel: "instagram",
        status: "delivered",
      },
      landingDestination: {
        landingPageId: "landing.drop-1",
        pageType: "content-commerce",
        url: "https://shop.example.test/drop?utm_source=instagram&utm_medium=dm",
        checkoutUrl: "https://shop.example.test/checkout/drop-1",
        preserveImmersion: true,
      },
      attribution: {
        source: "instagram",
        medium: "dm",
        campaign: "campaign.launch-1",
        content: "ig.media.1",
        term: "send me the link",
        touchpointId: "touch.dm.1",
      },
      visitor: {
        platformUserId: "ig.user.1",
      },
      offer: {
        productId: "product.drop-1",
        offerId: "offer.spring-drop",
      },
    },
    landingPluginId: "plugin.landing.conversion-api",
    landingCapabilityId: "cap.publish-conversion-landing",
    conversion: {
      eventName: "purchase",
      value: 79,
      currency: "USD",
      orderId: "order.1001",
    },
    measurement: {
      conversionKpi: "purchase_conversion_rate",
      attributionWindowDays: 7,
      trackingPluginId: "plugin.tracking.active-conversion",
      destination: "owncanvas",
    },
    occurredAt: "2026-05-11T00:05:00.000Z",
  });

  assert.deepEqual(validateLandingConversionEvent(event), {
    ok: true,
    errors: [],
  });
  assert.deepEqual(event, {
    schemaVersion: LANDING_CONVERSION_EVENT_SCHEMA_VERSION,
    id: "landing-conversion:landing-flow.map.1:purchase",
    campaignId: "campaign.launch-1",
    occurredAt: "2026-05-11T00:05:00.000Z",
    landing: {
      pluginId: "plugin.landing.conversion-api",
      capabilityId: "cap.publish-conversion-landing",
      landingPageId: "landing.drop-1",
      url: "https://shop.example.test/drop?utm_source=instagram&utm_medium=dm",
      checkoutUrl: "https://shop.example.test/checkout/drop-1",
      mappingActionId: "landing-flow.map.1",
    },
    conversion: {
      eventName: "purchase",
      value: 79,
      currency: "USD",
      orderId: "order.1001",
      productId: "product.drop-1",
      offerId: "offer.spring-drop",
    },
    attribution: {
      source: "instagram",
      medium: "dm",
      campaign: "campaign.launch-1",
      content: "ig.media.1",
      term: "send me the link",
      touchpointId: "touch.dm.1",
    },
    measurement: {
      conversionKpi: "purchase_conversion_rate",
      attributionWindowDays: 7,
      trackingPluginId: "plugin.tracking.active-conversion",
      destination: "owncanvas",
    },
    visitor: {
      platformUserId: "ig.user.1",
    },
  });
});

test("validateLandingConversionEvent rejects missing measurement metadata", () => {
  const result = validateLandingConversionEvent({
    schemaVersion: "owncanvas.landing-conversion-event.v0",
    id: "",
    campaignId: "campaign.launch-1",
    occurredAt: "not-a-date",
    landing: {
      pluginId: "",
      capabilityId: "",
      landingPageId: "",
      url: "javascript:alert(1)",
      checkoutUrl: "ftp://shop.example.test/checkout",
    },
    conversion: {
      eventName: "",
      value: -1,
      currency: "",
    },
    attribution: {
      source: "",
      medium: "",
      campaign: "campaign.other",
    },
    measurement: {
      conversionKpi: "",
      attributionWindowDays: 0,
      destination: "",
    },
  });

  assert.equal(result.ok, false);
  assert.deepEqual(
    result.errors.map((error) => error.code),
    [
      "landing-conversion.schema_version_invalid",
      "landing-conversion.id_required",
      "landing-conversion.occurred_at_invalid",
      "landing-conversion.plugin_id_required",
      "landing-conversion.capability_id_required",
      "landing-conversion.landing_page_id_required",
      "landing-conversion.url_invalid",
      "landing-conversion.checkout_url_invalid",
      "landing-conversion.event_name_required",
      "landing-conversion.value_invalid",
      "landing-conversion.currency_required",
      "landing-conversion.source_required",
      "landing-conversion.medium_required",
      "landing-conversion.attribution_campaign_mismatch",
      "landing-conversion.conversion_kpi_required",
      "landing-conversion.attribution_window_invalid",
      "landing-conversion.destination_required",
    ],
  );
});

test("validateLandingFlowDestinationMappingAction rejects unsafe or mismatched mappings", () => {
  const result = validateLandingFlowDestinationMappingAction({
    schemaVersion: "owncanvas.landing-flow-destination-mapping.v0",
    id: "",
    campaignId: "campaign.launch-1",
    requestedAt: "not-a-date",
    requestedBy: "bot",
    sourceDmResponse: {
      pluginId: "",
      capabilityId: "",
      responseEventId: "",
      status: "failed",
    },
    landingDestination: {
      landingPageId: "",
      pageType: "lead-capture",
      url: "javascript:alert(1)",
      checkoutUrl: "ftp://shop.example.test/checkout",
      preserveImmersion: false,
    },
    attribution: {
      source: "",
      medium: "",
      campaign: "campaign.other",
    },
  });

  assert.equal(result.ok, false);
  assert.deepEqual(
    result.errors.map((error) => error.code),
    [
      "landing-flow-mapping.schema_version_invalid",
      "landing-flow-mapping.id_required",
      "landing-flow-mapping.requested_at_invalid",
      "landing-flow-mapping.requested_by_invalid",
      "landing-flow-mapping.source_plugin_id_required",
      "landing-flow-mapping.source_capability_id_required",
      "landing-flow-mapping.response_event_id_required",
      "landing-flow-mapping.response_status_not_delivered",
      "landing-flow-mapping.landing_page_id_required",
      "landing-flow-mapping.page_type_unsupported",
      "landing-flow-mapping.destination_url_invalid",
      "landing-flow-mapping.checkout_url_invalid",
      "landing-flow-mapping.immersion_required",
      "landing-flow-mapping.source_required",
      "landing-flow-mapping.medium_required",
      "landing-flow-mapping.attribution_campaign_mismatch",
    ],
  );
});

test("validateLandingPluginConfiguration rejects invalid DM referral context registration", () => {
  const invalidLanding = {
    landing: {
      pageTypes: ["content-commerce"],
      publishTargets: ["hosted"],
      supportsCheckout: false,
      preservesImmersion: true,
      dmReferralContextSchemas: [
        {
          ...LANDING_DM_REFERRAL_CONTEXT_SCHEMA,
          supportedChannels: ["email"],
          supportedPageTypes: ["lead-capture"],
        },
      ],
    },
    capabilities: [
      {
        kind: "landing.page",
        inputPorts: [{ id: "creative", dataType: "json" }],
        outputPorts: [{ id: "url", dataType: "url" }],
      },
    ],
    configuration: {
      fields: [
        {
          key: "pageTemplate",
          label: "Page template",
          type: "select",
          required: true,
          scope: "campaign",
          landingConfigType: "template",
          pageType: "content-commerce",
        },
      ],
    },
  } as const;

  const result = validateLandingPluginConfiguration(invalidLanding);

  assert.equal(result.ok, false);
  assert.deepEqual(
    result.errors.map((error) => error.code),
    [
      "landing.dm_referral_context_input_port_required",
      "landing.dm_referral_context_channel_unsupported",
      "landing.dm_referral_context_page_type_unsupported",
    ],
  );
});

test("validateDirectMessagePluginConfiguration rejects direct-message rule violations", () => {
  const invalidDirectMessage = {
    directMessage: {
      channel: "instagram",
      supportedTriggers: ["comment"],
      deliveryModes: ["one-to-one"],
      requiresComplianceReview: true,
      triggerEventSchemas: [
        {
          ...INSTAGRAM_COMMENT_TRIGGER_EVENT_SCHEMA,
          channel: "messenger",
        },
      ],
    },
    capabilities: [
      {
        kind: "channel.publish",
        inputPorts: [{ id: "event", dataType: "event" }],
        outputPorts: [{ id: "result", dataType: "json" }],
      },
    ],
    configuration: {
      fields: [
        {
          key: "accountId",
          label: "Account ID",
          type: "number",
          required: true,
          scope: "workspace",
          directMessageConfigType: "account",
          channel: "sms",
        },
        {
          key: "accountId",
          label: "Duplicate account",
          type: "string",
          required: false,
          scope: "workspace",
          directMessageConfigType: "unknown",
        },
        {
          key: "maxMessagesPerMinute",
          label: "Max messages per minute",
          type: "number",
          required: true,
          scope: "workspace",
          directMessageConfigType: "throttle",
          defaultValue: 0,
        },
      ],
    },
  } as const;

  const result = validateDirectMessagePluginConfiguration(invalidDirectMessage);

  assert.equal(result.ok, false);
  assert.deepEqual(
    result.errors.map((error) => error.code),
    [
      "direct-message.dm_capability_required",
      "direct-message.delivery_event_output_port_required",
      "direct-message.duplicate_config_key",
      "direct-message.unknown_config_type",
      "direct-message.channel_mismatch",
      "direct-message.field_type_mismatch",
      "direct-message.compliance_required",
      "direct-message.numeric_default_must_be_positive",
      "direct-message.trigger_event_channel_mismatch",
    ],
  );
});

test("definePluginManifest preserves landing detail and typed configuration fields", () => {
  const manifest = definePluginManifest({
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
      pageTypes: ["product", "content-commerce", "offer"],
      publishTargets: ["hosted", "custom-domain"],
      supportsCheckout: true,
      preservesImmersion: true,
      handoffConfigurationSchemas: [LANDING_PAGE_HANDOFF_CONFIGURATION_SCHEMA],
      handoffPayloadSchemas: [LANDING_PAGE_HANDOFF_PAYLOAD_SCHEMA],
      trackingMetadataSchemas: [LANDING_PAGE_HANDOFF_TRACKING_METADATA_SCHEMA],
      handoffEventSchemas: [LANDING_PAGE_HANDOFF_EVENT_SCHEMA],
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
        inputPorts: [
          { id: "creative", dataType: "json", required: true },
          { id: "product", dataType: "product", required: true },
        ],
        outputPorts: [
          { id: "url", dataType: "url", multiple: false },
          { id: "publishEvent", dataType: "event", multiple: false },
        ],
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
        {
          key: "publishDefaults",
          label: "Publish defaults",
          type: "json",
          required: false,
          scope: "workspace",
          landingConfigType: "publish",
        },
      ],
    },
  });

  assert.equal(manifest.type, "landing");
  assert.equal(manifest.landing.preservesImmersion, true);
  assert.equal(
    manifest.landing.handoffEventSchemas[0].eventSchemaVersion,
    LANDING_PAGE_HANDOFF_EVENT_SCHEMA_VERSION,
  );
  assert.equal(
    manifest.landing.handoffPayloadSchemas[0].schemaVersion,
    LANDING_PAGE_HANDOFF_PAYLOAD_SCHEMA_VERSION,
  );
  assert.equal(manifest.capabilities[0].kind, "landing.page");
  assert.equal(manifest.configuration.fields[0].landingConfigType, "domain");
  assert.deepEqual(validateLandingPluginConfiguration(manifest), {
    ok: true,
    errors: [],
  });
});

test("validateLandingPluginConfiguration rejects landing rule violations", () => {
  const invalidLanding = {
    landing: {
      pageTypes: ["product"],
      publishTargets: ["hosted"],
      supportsCheckout: true,
      preservesImmersion: false,
      handoffEventSchemas: [
        {
          ...LANDING_PAGE_HANDOFF_EVENT_SCHEMA,
          supportedPageTypes: ["lead-capture"],
        },
      ],
    },
    capabilities: [
      {
        kind: "channel.publish",
        inputPorts: [{ id: "event", dataType: "event" }],
        outputPorts: [{ id: "result", dataType: "json" }],
      },
    ],
    configuration: {
      fields: [
        {
          key: "domain",
          label: "Domain",
          type: "number",
          required: true,
          scope: "workspace",
          landingConfigType: "domain",
          publishTarget: "custom-domain",
        },
        {
          key: "domain",
          label: "Duplicate domain",
          type: "string",
          required: false,
          scope: "workspace",
          landingConfigType: "unknown",
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
      ],
    },
  } as const;

  const result = validateLandingPluginConfiguration(invalidLanding);

  assert.equal(result.ok, false);
  assert.deepEqual(
    result.errors.map((error) => error.code),
    [
      "landing.page_capability_required",
      "landing.creative_input_port_required",
      "landing.url_output_port_required",
      "landing.duplicate_config_key",
      "landing.unknown_config_type",
      "landing.unsupported_publish_target",
      "landing.unsupported_page_type",
      "landing.field_type_mismatch",
      "landing.checkout_required",
      "landing.immersion_required",
      "landing.handoff_event_page_type_unsupported",
    ],
  );
});

test("validateLandingPluginConfiguration requires creative input and url output ports", () => {
  const invalidLanding = {
    landing: {
      pageTypes: ["content-commerce"],
      publishTargets: ["hosted"],
      supportsCheckout: false,
      preservesImmersion: true,
    },
    capabilities: [
      {
        kind: "landing.page",
        inputPorts: [{ id: "offer", dataType: "product" }],
        outputPorts: [{ id: "asset", dataType: "json" }],
      },
    ],
    configuration: {
      fields: [
        {
          key: "pageTemplate",
          label: "Page template",
          type: "select",
          required: true,
          scope: "campaign",
          landingConfigType: "template",
          pageType: "content-commerce",
        },
      ],
    },
  } as const;

  const result = validateLandingPluginConfiguration(invalidLanding);

  assert.equal(result.ok, false);
  assert.deepEqual(
    result.errors.map((error) => error.code),
    [
      "landing.creative_input_port_required",
      "landing.url_output_port_required",
    ],
  );
});

class MemoryStorage implements Pick<Storage, "getItem" | "setItem"> {
  private readonly items = new Map<string, string>();

  getItem(key: string) {
    return this.items.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.items.set(key, value);
  }
}
