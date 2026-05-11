import {
  activateInstalledPluginForAgent,
  activateInstalledPluginForAgentInStorage,
  deactivateInstalledPluginForAgent,
  deactivateInstalledPluginForAgentInStorage,
  createAgentPluginConfigurationState,
  getPersistedPluginCatalog,
  installSelectedPluginForAgent,
  installSelectedPluginForAgentInStorage,
  LANDING_CONVERSION_EVENT_SCHEMA,
  listDiscoverablePluginsForAgent,
  listInstalledPluginsForAgent,
  type AgentDiscoverablePlugin,
  type AgentPluginDeactivationError,
  type AgentInstalledPlugin,
  type AgentPluginConfigurationState,
  type AgentPluginActivationError,
  type AgentPluginInstallationError,
  type PluginCatalog,
  type PluginStorage,
} from "../features/plugins/model/plugin-representation.ts";

export const AGENT_PLUGIN_DISCOVERY_SCHEMA_VERSION =
  "owncanvas.agent-plugin-discovery.v1";

export const AGENT_PLUGIN_INSTALL_REQUEST_SCHEMA_VERSION =
  "owncanvas.agent-plugin-install-request.v1";

export const AGENT_PLUGIN_ACTIVATION_REQUEST_SCHEMA_VERSION =
  "owncanvas.agent-plugin-activation-request.v1";

export const AGENT_PLUGIN_DEACTIVATION_REQUEST_SCHEMA_VERSION =
  "owncanvas.agent-plugin-deactivation-request.v1";

export const AGENT_INSTALLED_PLUGINS_SCHEMA_VERSION =
  "owncanvas.agent-installed-plugins.v1";

export const DEFAULT_AGENT_PLUGIN_CATALOG = {
  id: "owncanvas.default-agent-catalog.v1",
  updatedAt: "2026-05-11T00:00:00.000Z",
  plugins: [
    {
      schemaVersion: "owncanvas.plugin.v1",
      id: "plugin.provider.parallel-media",
      name: "Parallel Media Provider",
      version: "0.1.0",
      type: "provider",
      lifecycle: {
        state: "available",
        updatedAt: "2026-05-11T00:00:00.000Z",
      },
      origin: {
        kind: "built-in",
        packageName: "@owncanvas/provider-parallel-media",
      },
      metadata: {
        displayName: "Parallel Media Provider",
        description: "Generates campaign image and video variants in parallel.",
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
          id: "cap.parallel-image",
          kind: "generate.image",
          title: "Parallel image generation",
          description: "Generates multiple image variants concurrently.",
          concurrency: {
            supportsParallel: true,
            supportsBulk: true,
            maxParallel: 8,
          },
          inputPorts: [{ id: "prompt", dataType: "text", required: true }],
          outputPorts: [{ id: "images", dataType: "image", multiple: true }],
        },
        {
          id: "cap.parallel-video",
          kind: "generate.video",
          title: "Parallel video generation",
          description: "Generates multiple video variants concurrently.",
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
    },
    {
      schemaVersion: "owncanvas.plugin.v1",
      id: "plugin.landing.immersive",
      name: "Immersive Landing",
      version: "0.1.0",
      type: "landing",
      lifecycle: {
        state: "available",
        updatedAt: "2026-05-11T00:00:00.000Z",
      },
      origin: {
        kind: "built-in",
        packageName: "@owncanvas/landing-immersive",
      },
      metadata: {
        displayName: "Immersive Landing",
        description: "Publishes tracked landing pages for campaign conversion.",
        tags: ["landing", "conversion"],
      },
      permissions: {
        mode: "advanced",
        installableBy: ["human", "agent"],
        configurableBy: ["human"],
        requiresApprovalFor: ["external_publish"],
      },
      landing: {
        pageTypes: ["content-commerce", "custom"],
        publishTargets: ["hosted"],
        supportsCheckout: true,
        preservesImmersion: true,
        conversionEventSchemas: [LANDING_CONVERSION_EVENT_SCHEMA],
      },
      capabilities: [
        {
          id: "cap.immersive-landing",
          kind: "landing.page",
          title: "Immersive landing page",
          description: "Publishes a tracked landing destination.",
          concurrency: {
            supportsParallel: false,
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
            key: "destination",
            label: "Destination",
            type: "string",
            required: true,
            scope: "campaign",
            landingConfigType: "domain",
            publishTarget: "hosted",
          },
          {
            key: "checkout",
            label: "Checkout",
            type: "select",
            required: true,
            scope: "campaign",
            landingConfigType: "checkout",
          },
        ],
      },
    },
    {
      schemaVersion: "owncanvas.plugin.v1",
      id: "plugin.provider.installed-media",
      name: "Installed Media Provider",
      version: "0.1.0",
      type: "provider",
      lifecycle: {
        state: "configured",
        installedAt: "2026-05-11T00:00:00.000Z",
        configuredAt: "2026-05-11T00:00:00.000Z",
        updatedAt: "2026-05-11T00:00:00.000Z",
      },
      origin: {
        kind: "built-in",
        packageName: "@owncanvas/provider-installed-media",
      },
      metadata: {
        displayName: "Installed Media Provider",
        description: "Installed provider for campaign image generation.",
        tags: ["image", "installed"],
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
          id: "cap.installed-image",
          kind: "generate.image",
          title: "Installed image generation",
          description: "Generates campaign image variants.",
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
            key: "apiKey",
            label: "API key",
            type: "secret",
            required: true,
            scope: "user",
            providerConfigType: "credential",
          },
        ],
      },
    },
    {
      schemaVersion: "owncanvas.plugin.v1",
      id: "plugin.tracking.active-conversion",
      name: "Active Conversion Tracking",
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
        packageName: "@partner/active-conversion-tracking",
        registryUrl: "https://registry.example.test",
      },
      metadata: {
        displayName: "Active Conversion Tracking",
        description: "Tracks final conversion and attribution events.",
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
          },
        ],
      },
    },
    {
      schemaVersion: "owncanvas.plugin.v1",
      id: "plugin.dashboard.human-only",
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
        description: "Human-only conversion reporting plugin.",
        tags: ["dashboard", "conversion"],
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
          id: "cap.conversion-dashboard",
          kind: "dashboard.report",
          title: "Conversion dashboard",
          description: "Reports conversion metrics.",
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
    },
  ],
} as const satisfies PluginCatalog;

export type AgentPluginDiscoveryResponse = {
  schemaVersion: typeof AGENT_PLUGIN_DISCOVERY_SCHEMA_VERSION;
  catalogId: string;
  catalogUpdatedAt: string;
  count: number;
  plugins: AgentDiscoverablePlugin[];
};

export type AgentInstalledPluginsResponse = {
  schemaVersion: typeof AGENT_INSTALLED_PLUGINS_SCHEMA_VERSION;
  catalogId: string;
  catalogUpdatedAt: string;
  count: number;
  plugins: AgentInstalledPlugin[];
};

export type AgentPluginInstallationRequestResponse = {
  schemaVersion: typeof AGENT_PLUGIN_INSTALL_REQUEST_SCHEMA_VERSION;
  catalogId: string;
  catalogUpdatedAt: string;
  request: {
    id: string;
    requestedBy: "agent";
    pluginId: string;
    status: "installed";
    requestedAt: string;
    requiresApprovalFor: readonly string[];
  };
  plugin: {
    id: string;
    lifecycleState: "installed";
    installedAt: string;
    configurationState: AgentPluginConfigurationState;
  };
};

export type AgentPluginActivationRequestResponse = {
  schemaVersion: typeof AGENT_PLUGIN_ACTIVATION_REQUEST_SCHEMA_VERSION;
  catalogId: string;
  catalogUpdatedAt: string;
  request: {
    id: string;
    requestedBy: "agent";
    pluginId: string;
    status: "active";
    requestedAt: string;
    requiresApprovalFor: readonly string[];
  };
  plugin: {
    id: string;
    lifecycleState: "active";
    activatedAt: string;
  };
};

export type AgentPluginDeactivationRequestResponse = {
  schemaVersion: typeof AGENT_PLUGIN_DEACTIVATION_REQUEST_SCHEMA_VERSION;
  catalogId: string;
  catalogUpdatedAt: string;
  request: {
    id: string;
    requestedBy: "agent";
    pluginId: string;
    status: "inactive";
    requestedAt: string;
    requiresApprovalFor: readonly string[];
  };
  plugin: {
    id: string;
    lifecycleState: "inactive";
    deactivatedAt: string;
  };
};

type AgentPluginActionArgs = {
  request: Request;
  storage?: PluginStorage;
};

type AgentPluginLoaderArgs = {
  request?: Request;
  storage?: Pick<Storage, "getItem">;
};

export function createAgentPluginDiscoveryResponse(
  catalog: PluginCatalog = DEFAULT_AGENT_PLUGIN_CATALOG,
): AgentPluginDiscoveryResponse {
  const plugins = listDiscoverablePluginsForAgent(catalog);

  return {
    schemaVersion: AGENT_PLUGIN_DISCOVERY_SCHEMA_VERSION,
    catalogId: catalog.id,
    catalogUpdatedAt: catalog.updatedAt,
    count: plugins.length,
    plugins,
  };
}

export function createAgentInstalledPluginsResponse(
  catalog: PluginCatalog = DEFAULT_AGENT_PLUGIN_CATALOG,
): AgentInstalledPluginsResponse {
  const plugins = listInstalledPluginsForAgent(catalog);

  return {
    schemaVersion: AGENT_INSTALLED_PLUGINS_SCHEMA_VERSION,
    catalogId: catalog.id,
    catalogUpdatedAt: catalog.updatedAt,
    count: plugins.length,
    plugins,
  };
}

export function loader(args: AgentPluginLoaderArgs = {}) {
  const view =
    args.request === undefined
      ? undefined
      : new URL(args.request.url).searchParams.get("view");
  const catalog = readDurableAgentPluginCatalog(args.storage);

  if (view === "installed") {
    return Response.json(createAgentInstalledPluginsResponse(catalog));
  }

  return Response.json(createAgentPluginDiscoveryResponse(catalog));
}

export function createAgentPluginInstallationRequestResponse(
  pluginId: string,
  catalog: PluginCatalog = DEFAULT_AGENT_PLUGIN_CATALOG,
  options: { now?: () => string; storage?: PluginStorage } = {},
): AgentPluginInstallationRequestResponse | AgentPluginInstallationError {
  const requestedAt = options.now?.() ?? catalog.updatedAt;
  const result =
    options.storage === undefined
      ? installSelectedPluginForAgent(catalog, pluginId, {
          now: () => requestedAt,
        })
      : installSelectedPluginForAgentInStorage(
          options.storage,
          catalog,
          pluginId,
          {
            now: () => requestedAt,
          },
        );

  if (!result.ok) {
    return result.error;
  }

  return {
    schemaVersion: AGENT_PLUGIN_INSTALL_REQUEST_SCHEMA_VERSION,
    catalogId: result.catalog.id,
    catalogUpdatedAt: result.catalog.updatedAt,
    request: {
      id: `agent-install:${pluginId}:${requestedAt}`,
      requestedBy: "agent",
      pluginId,
      status: "installed",
      requestedAt,
      requiresApprovalFor: result.plugin.permissions.requiresApprovalFor,
    },
    plugin: {
      id: result.plugin.id,
      lifecycleState: "installed",
      installedAt: requestedAt,
      configurationState: createAgentPluginConfigurationState(result.plugin),
    },
  };
}

export function createAgentPluginActivationRequestResponse(
  pluginId: string,
  catalog: PluginCatalog = DEFAULT_AGENT_PLUGIN_CATALOG,
  options: { now?: () => string; storage?: PluginStorage } = {},
): AgentPluginActivationRequestResponse | AgentPluginActivationError {
  const requestedAt = options.now?.() ?? catalog.updatedAt;
  const result =
    options.storage === undefined
      ? activateInstalledPluginForAgent(catalog, pluginId, {
          now: () => requestedAt,
        })
      : activateInstalledPluginForAgentInStorage(
          options.storage,
          catalog,
          pluginId,
          {
            now: () => requestedAt,
          },
        );

  if (!result.ok) {
    return result.error;
  }

  return {
    schemaVersion: AGENT_PLUGIN_ACTIVATION_REQUEST_SCHEMA_VERSION,
    catalogId: result.catalog.id,
    catalogUpdatedAt: result.catalog.updatedAt,
    request: {
      id: `agent-activate:${pluginId}:${requestedAt}`,
      requestedBy: "agent",
      pluginId,
      status: "active",
      requestedAt,
      requiresApprovalFor: result.plugin.permissions.requiresApprovalFor,
    },
    plugin: {
      id: result.plugin.id,
      lifecycleState: "active",
      activatedAt: requestedAt,
    },
  };
}

export function createAgentPluginDeactivationRequestResponse(
  pluginId: string,
  catalog: PluginCatalog = DEFAULT_AGENT_PLUGIN_CATALOG,
  options: { now?: () => string; storage?: PluginStorage } = {},
): AgentPluginDeactivationRequestResponse | AgentPluginDeactivationError {
  const requestedAt = options.now?.() ?? catalog.updatedAt;
  const result =
    options.storage === undefined
      ? deactivateInstalledPluginForAgent(catalog, pluginId, {
          now: () => requestedAt,
        })
      : deactivateInstalledPluginForAgentInStorage(
          options.storage,
          catalog,
          pluginId,
          {
            now: () => requestedAt,
          },
        );

  if (!result.ok) {
    return result.error;
  }

  return {
    schemaVersion: AGENT_PLUGIN_DEACTIVATION_REQUEST_SCHEMA_VERSION,
    catalogId: result.catalog.id,
    catalogUpdatedAt: result.catalog.updatedAt,
    request: {
      id: `agent-deactivate:${pluginId}:${requestedAt}`,
      requestedBy: "agent",
      pluginId,
      status: "inactive",
      requestedAt,
      requiresApprovalFor: result.plugin.permissions.requiresApprovalFor,
    },
    plugin: {
      id: result.plugin.id,
      lifecycleState: "inactive",
      deactivatedAt: requestedAt,
    },
  };
}

export async function action({ request, storage }: AgentPluginActionArgs) {
  if (request.method !== "POST") {
    return Response.json(
      {
        error: {
          code: "method_not_allowed",
          message: "Agent plugin installation requests must use POST.",
        },
      },
      { status: 405 },
    );
  }

  const body = await readAgentPluginInstallationRequestBody(request);

  if (body.pluginId === undefined) {
    return Response.json(
      {
        error: {
          code: "plugin_id_required",
          message: "Agent plugin installation requests require a pluginId.",
        },
      },
      { status: 400 },
    );
  }

  if (body.action === "activate") {
    const catalog = readDurableAgentPluginCatalog(storage);
    const response = createAgentPluginActivationRequestResponse(
      body.pluginId,
      catalog,
      { storage },
    );

    if ("code" in response) {
      return Response.json(
        { error: response },
        { status: getAgentPluginActivationErrorStatus(response) },
      );
    }

    return Response.json(response, { status: 200 });
  }

  if (body.action === "deactivate") {
    const catalog = readDurableAgentPluginCatalog(storage);
    const response = createAgentPluginDeactivationRequestResponse(
      body.pluginId,
      catalog,
      { storage },
    );

    if ("code" in response) {
      return Response.json(
        { error: response },
        { status: getAgentPluginDeactivationErrorStatus(response) },
      );
    }

    return Response.json(response, { status: 200 });
  }

  const catalog = readDurableAgentPluginCatalog(storage);
  const response = createAgentPluginInstallationRequestResponse(
    body.pluginId,
    catalog,
    { storage },
  );

  if ("code" in response) {
    return Response.json(
      { error: response },
      { status: getAgentPluginInstallationErrorStatus(response) },
    );
  }

  return Response.json(response, { status: 201 });
}

function readDurableAgentPluginCatalog(
  storage?: Pick<Storage, "getItem">,
): PluginCatalog {
  if (storage === undefined) {
    return DEFAULT_AGENT_PLUGIN_CATALOG;
  }

  return getPersistedPluginCatalog(storage) ?? DEFAULT_AGENT_PLUGIN_CATALOG;
}

async function readAgentPluginInstallationRequestBody(
  request: Request,
): Promise<{ action?: "install" | "activate" | "deactivate"; pluginId?: string }> {
  try {
    const body = (await request.json()) as {
      action?: unknown;
      pluginId?: unknown;
    };
    const action =
      body.action === "activate" ||
      body.action === "deactivate" ||
      body.action === "install"
        ? body.action
        : undefined;

    return typeof body.pluginId === "string" && body.pluginId.length > 0
      ? { action, pluginId: body.pluginId }
      : {};
  } catch {
    return {};
  }
}

function getAgentPluginInstallationErrorStatus(
  error: AgentPluginInstallationError,
) {
  switch (error.code) {
    case "plugin.not_found":
      return 404;
    case "plugin.agent_install_not_allowed":
      return 403;
    case "plugin.not_available":
    case "plugin.install_transition_not_allowed":
      return 409;
  }
}

function getAgentPluginActivationErrorStatus(
  error: AgentPluginActivationError,
) {
  switch (error.code) {
    case "plugin.not_found":
      return 404;
    case "plugin.agent_activation_not_allowed":
      return 403;
    case "plugin.not_installed":
    case "plugin.activation_transition_not_allowed":
    case "plugin.not_usable":
      return 409;
  }
}

function getAgentPluginDeactivationErrorStatus(
  error: AgentPluginDeactivationError,
) {
  switch (error.code) {
    case "plugin.not_found":
      return 404;
    case "plugin.agent_deactivation_not_allowed":
      return 403;
    case "plugin.not_active":
    case "plugin.deactivation_transition_not_allowed":
      return 409;
  }
}
