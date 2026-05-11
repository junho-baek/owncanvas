import assert from "node:assert/strict";
import { test } from "node:test";

import { loader as listPluginKinds } from "./api.plugin-kinds.ts";
import { loader as getPluginKind } from "./api.plugin-kind.ts";

async function readJson(response: Response) {
  return response.json() as Promise<Record<string, unknown>>;
}

test("GET /api/plugin-kinds returns registered plugin kinds with metadata", async () => {
  const response = await listPluginKinds();
  const body = await readJson(response);

  assert.equal(response.status, 200);
  assert.equal(body.schemaVersion, "owncanvas.plugin-kind-discovery.v1");
  assert.equal(body.count, 8);
  assert.deepEqual(
    (body.pluginKinds as Array<{ type: string }>).map((kind) => kind.type),
    [
      "provider",
      "commission",
      "agent",
      "dashboard",
      "direct-message",
      "landing",
      "tracking",
      "custom",
    ],
  );
  assert.deepEqual(
    (body.pluginKinds as Array<{ type: string; metadata: unknown }>).find(
      (kind) => kind.type === "provider",
    ),
    {
      type: "provider",
      metadata: {
        title: "Provider",
        description:
          "Generation or model execution plugin for text, image, video, or voice blocks.",
        campaignRole:
          "Supplies creative generation capabilities for campaign canvas nodes.",
        capabilityKinds: [
          "generate.text",
          "generate.image",
          "generate.video",
          "generate.voice",
        ],
        originSupport: {
          builtIn: true,
          external: true,
        },
        defaultPermissionMode: "advanced",
        requiredDetailKey: "provider",
      },
    },
  );
});

test("GET /api/plugin-kinds/:pluginType returns one plugin kind by type", async () => {
  const response = await getPluginKind({
    params: {
      pluginType: "direct-message",
    },
  });
  const body = await readJson(response);

  assert.equal(response.status, 200);
  assert.deepEqual(body, {
    schemaVersion: "owncanvas.plugin-kind-discovery.v1",
    pluginKind: {
      type: "direct-message",
      metadata: {
        title: "Direct Message",
        description:
          "Channel plugin for comment-to-DM, keyword reply, and private-message delivery flows.",
        campaignRole:
          "Represents compliant DM handoffs from public engagement to tracked landing links.",
        capabilityKinds: ["channel.dm"],
        originSupport: {
          builtIn: true,
          external: true,
        },
        defaultPermissionMode: "advanced",
        requiredDetailKey: "directMessage",
      },
    },
  });
});

test("GET /api/plugin-kinds/:pluginType returns 404 for unknown plugin kinds", async () => {
  const response = await getPluginKind({
    params: {
      pluginType: "unsupported",
    },
  });
  const body = await readJson(response);

  assert.equal(response.status, 404);
  assert.deepEqual(body, {
    schemaVersion: "owncanvas.plugin-kind-discovery.v1",
    error: {
      code: "plugin_kind.not_found",
      message: "Plugin kind is not registered.",
      pluginType: "unsupported",
    },
  });
});
