import assert from "node:assert/strict";
import { test } from "node:test";

import {
  action as requestAgentPluginInstallation,
  loader as listAgentPlugins,
} from "./api.agent-plugins.ts";

async function readJson(response: Response) {
  return response.json() as Promise<Record<string, unknown>>;
}

test("GET /api/agent/plugins returns agent-selectable available plugins", async () => {
  const response = await listAgentPlugins();
  const body = await readJson(response);

  assert.equal(response.status, 200);
  assert.equal(body.schemaVersion, "owncanvas.agent-plugin-discovery.v1");
  assert.equal(body.catalogId, "owncanvas.default-agent-catalog.v1");
  assert.equal(body.count, 2);
  assert.deepEqual(body.plugins, [
    {
      id: "plugin.provider.parallel-media",
      name: "Parallel Media Provider",
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
      displayName: "Parallel Media Provider",
      description: "Generates campaign image and video variants in parallel.",
      tags: ["image", "video", "bulk"],
      permissionMode: "basic",
      requiresApprovalFor: [],
      capabilityKinds: ["generate.image", "generate.video"],
      supportsParallel: true,
      supportsBulk: true,
    },
    {
      id: "plugin.landing.immersive",
      name: "Immersive Landing",
      version: "0.1.0",
      type: "landing",
      kind: {
        type: "landing",
        title: "Landing",
        campaignRole:
          "Publishes content-commerce destinations while preserving the creative-to-conversion path.",
        requiredDetailKey: "landing",
      },
      lifecycleState: "available",
      originKind: "built-in",
      displayName: "Immersive Landing",
      description: "Publishes tracked landing pages for campaign conversion.",
      tags: ["landing", "conversion"],
      permissionMode: "advanced",
      requiresApprovalFor: ["external_publish"],
      capabilityKinds: ["landing.page"],
      supportsParallel: false,
      supportsBulk: false,
    },
  ]);
});

test("GET /api/agent/plugins does not expose configuration fields or human-only plugins", async () => {
  const response = await listAgentPlugins();
  const body = await readJson(response);
  const serializedBody = JSON.stringify(body);

  assert.equal(serializedBody.includes("plugin.dashboard.human-only"), false);
  assert.equal(serializedBody.includes("apiKey"), false);
  assert.equal(serializedBody.includes("secret"), false);
  assert.equal(serializedBody.includes("configuration"), false);
});

test("GET /api/agent/plugins?view=installed returns installed plugins and activation states", async () => {
  const response = await listAgentPlugins({
    request: new Request("http://localhost/api/agent/plugins?view=installed"),
  });
  const body = await readJson(response);

  assert.equal(response.status, 200);
  assert.equal(body.schemaVersion, "owncanvas.agent-installed-plugins.v1");
  assert.equal(body.catalogId, "owncanvas.default-agent-catalog.v1");
  assert.equal(body.count, 2);
  assert.deepEqual(body.plugins, [
    {
      id: "plugin.provider.installed-media",
      name: "Installed Media Provider",
      version: "0.1.0",
      type: "provider",
      lifecycleState: "configured",
      activationState: "configured",
      installedAt: "2026-05-11T00:00:00.000Z",
      configuredAt: "2026-05-11T00:00:00.000Z",
      originKind: "built-in",
      displayName: "Installed Media Provider",
      permissionMode: "basic",
      configurableByAgent: true,
      configurationState: {
        status: "configured",
        requiredFieldCount: 1,
        configuredValueCount: 0,
        configuredSecretRefCount: 0,
        missingRequiredFieldCount: 0,
      },
      requiresApprovalFor: [],
      capabilityKinds: ["generate.image"],
    },
    {
      id: "plugin.tracking.active-conversion",
      name: "Active Conversion Tracking",
      version: "0.1.0",
      type: "tracking",
      lifecycleState: "active",
      activationState: "active",
      installedAt: "2026-05-11T00:00:00.000Z",
      configuredAt: "2026-05-11T00:01:00.000Z",
      activatedAt: "2026-05-11T00:02:00.000Z",
      originKind: "external",
      displayName: "Active Conversion Tracking",
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
  ]);

  const serializedBody = JSON.stringify(body);

  assert.equal(serializedBody.includes("apiKey"), false);
  assert.equal(serializedBody.includes('"configuration":{"fields"'), false);
});

test("POST /api/agent/plugins lets agents request installation for a selected plugin", async () => {
  const response = await requestAgentPluginInstallation({
    request: new Request("http://localhost/api/agent/plugins", {
      method: "POST",
      body: JSON.stringify({ pluginId: "plugin.provider.parallel-media" }),
      headers: { "content-type": "application/json" },
    }),
  });
  const body = await readJson(response);

  assert.equal(response.status, 201);
  assert.equal(body.schemaVersion, "owncanvas.agent-plugin-install-request.v1");
  assert.deepEqual(body.request, {
    id: "agent-install:plugin.provider.parallel-media:2026-05-11T00:00:00.000Z",
    requestedBy: "agent",
    pluginId: "plugin.provider.parallel-media",
    status: "installed",
    requestedAt: "2026-05-11T00:00:00.000Z",
    requiresApprovalFor: [],
  });
  assert.deepEqual(body.plugin, {
    id: "plugin.provider.parallel-media",
    lifecycleState: "installed",
    installedAt: "2026-05-11T00:00:00.000Z",
    configurationState: {
      status: "needs_configuration",
      appliedAt: "2026-05-11T00:00:00.000Z",
      appliedBy: "agent",
      source: "plugin.default",
      requiredFieldCount: 1,
      configuredValueCount: 0,
      configuredSecretRefCount: 0,
      missingRequiredFieldCount: 1,
    },
  });
});

test("POST /api/agent/plugins lets agents activate an installed plugin through the validated API path", async () => {
  const response = await requestAgentPluginInstallation({
    request: new Request("http://localhost/api/agent/plugins", {
      method: "POST",
      body: JSON.stringify({
        action: "activate",
        pluginId: "plugin.provider.installed-media",
      }),
      headers: { "content-type": "application/json" },
    }),
  });
  const body = await readJson(response);

  assert.equal(response.status, 200);
  assert.deepEqual(body, {
    schemaVersion: "owncanvas.agent-plugin-activation-request.v1",
    catalogId: "owncanvas.default-agent-catalog.v1",
    catalogUpdatedAt: "2026-05-11T00:00:00.000Z",
    request: {
      id: "agent-activate:plugin.provider.installed-media:2026-05-11T00:00:00.000Z",
      requestedBy: "agent",
      pluginId: "plugin.provider.installed-media",
      status: "active",
      requestedAt: "2026-05-11T00:00:00.000Z",
      requiresApprovalFor: [],
    },
    plugin: {
      id: "plugin.provider.installed-media",
      lifecycleState: "active",
      activatedAt: "2026-05-11T00:00:00.000Z",
    },
  });

  const serializedBody = JSON.stringify(body);

  assert.equal(serializedBody.includes("apiKey"), false);
  assert.equal(serializedBody.includes("configuration"), false);
});

test("POST /api/agent/plugins lets agents deactivate an active installed plugin through the validated API path", async () => {
  const response = await requestAgentPluginInstallation({
    request: new Request("http://localhost/api/agent/plugins", {
      method: "POST",
      body: JSON.stringify({
        action: "deactivate",
        pluginId: "plugin.tracking.active-conversion",
      }),
      headers: { "content-type": "application/json" },
    }),
  });
  const body = await readJson(response);

  assert.equal(response.status, 200);
  assert.deepEqual(body, {
    schemaVersion: "owncanvas.agent-plugin-deactivation-request.v1",
    catalogId: "owncanvas.default-agent-catalog.v1",
    catalogUpdatedAt: "2026-05-11T00:00:00.000Z",
    request: {
      id: "agent-deactivate:plugin.tracking.active-conversion:2026-05-11T00:00:00.000Z",
      requestedBy: "agent",
      pluginId: "plugin.tracking.active-conversion",
      status: "inactive",
      requestedAt: "2026-05-11T00:00:00.000Z",
      requiresApprovalFor: ["network_access"],
    },
    plugin: {
      id: "plugin.tracking.active-conversion",
      lifecycleState: "inactive",
      deactivatedAt: "2026-05-11T00:00:00.000Z",
    },
  });

  const serializedBody = JSON.stringify(body);

  assert.equal(serializedBody.includes("pixelId"), false);
  assert.equal(serializedBody.includes("configuration"), false);
});

test("agent installed plugin API exposes sanitized configuration readiness after install", async () => {
  const storage = new MemoryStorage();

  await requestAgentPluginInstallation({
    request: new Request("http://localhost/api/agent/plugins", {
      method: "POST",
      body: JSON.stringify({ pluginId: "plugin.provider.parallel-media" }),
      headers: { "content-type": "application/json" },
    }),
    storage,
  });

  const response = await listAgentPlugins({
    request: new Request("http://localhost/api/agent/plugins?view=installed"),
    storage,
  });
  const body = await readJson(response);
  const installedPlugin = (
    body.plugins as {
      id: string;
      configurationState?: Record<string, unknown>;
    }[]
  ).find((plugin) => plugin.id === "plugin.provider.parallel-media");

  assert.equal(response.status, 200);
  assert.deepEqual(installedPlugin?.configurationState, {
    status: "needs_configuration",
    appliedAt: "2026-05-11T00:00:00.000Z",
    appliedBy: "agent",
    source: "plugin.default",
    requiredFieldCount: 1,
    configuredValueCount: 0,
    configuredSecretRefCount: 0,
    missingRequiredFieldCount: 1,
  });

  const serializedBody = JSON.stringify(body);

  assert.equal(serializedBody.includes("apiKey"), false);
  assert.equal(serializedBody.includes("secret"), false);
  assert.equal(serializedBody.includes("missingRequiredKeys"), false);
  assert.equal(serializedBody.includes("secretRefs"), false);
});

test("POST /api/agent/plugins rejects human-only plugin installation requests", async () => {
  const response = await requestAgentPluginInstallation({
    request: new Request("http://localhost/api/agent/plugins", {
      method: "POST",
      body: JSON.stringify({ pluginId: "plugin.dashboard.human-only" }),
      headers: { "content-type": "application/json" },
    }),
  });
  const body = await readJson(response);

  assert.equal(response.status, 403);
  assert.deepEqual(body, {
    error: {
      code: "plugin.agent_install_not_allowed",
      message: "Selected plugin does not allow agent installation.",
      pluginId: "plugin.dashboard.human-only",
    },
  });
});

test("agent plugin install and activation API state persists across installed view reloads", async () => {
  const storage = new MemoryStorage();

  const installResponse = await requestAgentPluginInstallation({
    request: new Request("http://localhost/api/agent/plugins", {
      method: "POST",
      body: JSON.stringify({ pluginId: "plugin.provider.parallel-media" }),
      headers: { "content-type": "application/json" },
    }),
    storage,
  });
  const installedAfterInstallResponse = await listAgentPlugins({
    request: new Request("http://localhost/api/agent/plugins?view=installed"),
    storage,
  });
  const installedAfterInstall = await readJson(installedAfterInstallResponse);

  assert.equal(installResponse.status, 201);
  assert.equal(installedAfterInstallResponse.status, 200);
  assert.equal(installedAfterInstall.count, 3);
  assert.equal(
    (installedAfterInstall.plugins as { id: string; lifecycleState: string }[]).some(
      (plugin) =>
        plugin.id === "plugin.provider.parallel-media" &&
        plugin.lifecycleState === "installed",
    ),
    true,
  );

  const activationResponse = await requestAgentPluginInstallation({
    request: new Request("http://localhost/api/agent/plugins", {
      method: "POST",
      body: JSON.stringify({
        action: "activate",
        pluginId: "plugin.provider.installed-media",
      }),
      headers: { "content-type": "application/json" },
    }),
    storage,
  });
  const installedAfterActivationResponse = await listAgentPlugins({
    request: new Request("http://localhost/api/agent/plugins?view=installed"),
    storage,
  });
  const installedAfterActivation = await readJson(installedAfterActivationResponse);

  assert.equal(activationResponse.status, 200);
  assert.equal(installedAfterActivationResponse.status, 200);
  assert.equal(
    (installedAfterActivation.plugins as { id: string; lifecycleState: string }[]).some(
      (plugin) =>
        plugin.id === "plugin.provider.installed-media" &&
        plugin.lifecycleState === "active",
    ),
    true,
  );
});

class MemoryStorage implements Pick<Storage, "getItem" | "setItem"> {
  readonly #values = new Map<string, string>();

  getItem(key: string) {
    return this.#values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.#values.set(key, value);
  }
}
