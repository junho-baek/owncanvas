import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";

import {
  createCampaignInWorkspace,
  initializeWorkspace,
  inspectCampaignInWorkspace,
  updateCampaignInWorkspace,
} from "./workspace-repository.ts";
import { createFileBackedCampaignDocument } from "./campaign-document.ts";
import {
  applyAuthoringCommand,
  applyAuthoringCommands,
  OwnCanvasAuthoringError,
} from "./authoring-commands.ts";

test("updateCampaignInWorkspace does not rewrite unchanged Campaign documents", async () => {
  const root = await createAuthoringWorkspace();
  const before = await inspectCampaignInWorkspace({
    root,
    id: "campaign_authoring",
  });
  const beforeJson = await readFile(before.paths.campaignJsonPath, "utf8");

  const result = await updateCampaignInWorkspace({
    root,
    id: "campaign_authoring",
    command: "campaign.noop",
    update: (document) => document,
    now: () => "2026-05-18T00:10:00.000Z",
  });
  const afterJson = await readFile(before.paths.campaignJsonPath, "utf8");

  assert.equal(result.changed, false);
  assert.equal(result.revisionBefore, before.document.revision.hash);
  assert.equal(result.revisionAfter, before.document.revision.hash);
  assert.equal(afterJson, beforeJson);
});

test("updateCampaignInWorkspace persists changed Campaign documents with revision metadata", async () => {
  const root = await createAuthoringWorkspace();
  const before = await inspectCampaignInWorkspace({
    root,
    id: "campaign_authoring",
  });

  const result = await updateCampaignInWorkspace({
    root,
    id: "campaign_authoring",
    command: "campaign.rename",
    update: (document) => ({
      ...document,
      title: "Renamed Campaign",
    }),
    now: () => "2026-05-18T00:10:00.000Z",
  });

  assert.equal(result.changed, true);
  assert.equal(result.document.title, "Renamed Campaign");
  assert.equal(result.document.revision.number, before.document.revision.number + 1);
  assert.equal(result.document.revision.previousHash, before.document.revision.hash);
  assert.equal(result.document.revision.lastCommand, "campaign.rename");
  assert.equal(result.revisionBefore, before.document.revision.hash);
  assert.equal(result.revisionAfter, result.document.revision.hash);
});

test("block.add creates text, image, and video blocks with caller-provided ids", () => {
  let document = createAuthoringDocument();

  let result = applyAuthoringCommand(document, {
    type: "block.add",
    id: "text_prompt",
    kind: "text",
    title: "Prompt",
    position: { x: 100, y: 120 },
  });
  document = result.document;
  result = applyAuthoringCommand(document, {
    type: "block.add",
    id: "image_hero",
    kind: "image",
    title: "Hero Image",
    position: { x: 420, y: 120 },
  });
  document = result.document;
  result = applyAuthoringCommand(document, {
    type: "block.add",
    id: "video_hero",
    kind: "video",
    title: "Hero Video",
    position: { x: 760, y: 120 },
  });
  document = result.document;

  assert.deepEqual(
    document.canvasState.nodes.map((node) => [node.id, node.kind, node.title]),
    [
      ["text_prompt", "text", "Prompt"],
      ["image_hero", "image", "Hero Image"],
      ["video_hero", "video", "Hero Video"],
    ],
  );
  assert.equal(result.changed, true);
});

test("block.add duplicate handling supports ifNotExists idempotency", () => {
  const document = applyAuthoringCommand(createAuthoringDocument(), {
    type: "block.add",
    id: "image_hero",
    kind: "image",
  }).document;

  assert.throws(
    () =>
      applyAuthoringCommand(document, {
        type: "block.add",
        id: "image_hero",
        kind: "image",
      }),
    OwnCanvasAuthoringError,
  );

  const result = applyAuthoringCommand(document, {
    type: "block.add",
    id: "image_hero",
    kind: "image",
    ifNotExists: true,
  });

  assert.equal(result.changed, false);
  assert.equal(result.document.canvasState.nodes.length, 1);
});

test("block.set partial-merges generation properties", () => {
  const document = applyAuthoringCommand(createAuthoringDocument(), {
    type: "block.add",
    id: "image_hero",
    kind: "image",
  }).document;

  const result = applyAuthoringCommand(document, {
    type: "block.set",
    id: "image_hero",
    prompt: "Make a cinematic launch image",
    model: "openai/gpt-image-1",
    aspectRatio: "9:16",
    count: 3,
    referenceAssetId: "asset_reference",
    position: { x: 240, y: 300 },
  });
  const node = result.document.canvasState.nodes.find(
    (candidate) => candidate.id === "image_hero",
  );

  assert.equal(node?.position.x, 240);
  assert.equal(node?.properties?.prompt, "Make a cinematic launch image");
  assert.equal(node?.properties?.modelSlug, "openai/gpt-image-1");
  assert.equal(node?.properties?.aspectRatio, "9:16");
  assert.equal(node?.properties?.batchCount, 3);
  assert.deepEqual(node?.properties?.referenceImages, [
    {
      type: "asset",
      ref: "asset_reference",
      attachmentMetadata: {
        source: "asset",
        asset: {
          assetId: "asset_reference",
          title: null,
          mediaType: "image",
        },
      },
    },
  ]);
});

test("block.remove stores deleted blocks and block.restore brings them back", () => {
  let document = applyAuthoringCommands(createAuthoringDocument(), [
    { type: "block.add", id: "image_hero", kind: "image" },
    { type: "block.add", id: "video_hero", kind: "video" },
    {
      type: "edge.connect",
      source: "image_hero:generated_image_asset",
      target: "video_hero:reference_image",
    },
  ]).document;

  let result = applyAuthoringCommand(document, {
    type: "block.remove",
    id: "image_hero",
  });
  document = result.document;

  assert.equal(document.canvasState.nodes.some((node) => node.id === "image_hero"), false);
  assert.equal(document.canvasState.edges.length, 0);
  assert.equal(result.deletedIds.includes("image_hero"), true);

  result = applyAuthoringCommand(document, {
    type: "block.restore",
    id: "image_hero",
  });

  assert.equal(result.document.canvasState.nodes.some((node) => node.id === "image_hero"), true);
  assert.equal(result.changed, true);
});

test("edge.connect parses ports and is idempotent", () => {
  const document = applyAuthoringCommands(createAuthoringDocument(), [
    { type: "block.add", id: "image_hero", kind: "image" },
    { type: "block.add", id: "video_hero", kind: "video" },
  ]).document;

  const connected = applyAuthoringCommand(document, {
    type: "edge.connect",
    source: "image_hero:generated_image_asset",
    target: "video_hero:reference_image",
  });
  const repeated = applyAuthoringCommand(connected.document, {
    type: "edge.connect",
    source: "image_hero:generated_image_asset",
    target: "video_hero:reference_image",
  });

  assert.equal(connected.document.canvasState.edges[0]?.sourcePort, "generated_image_asset");
  assert.equal(connected.document.canvasState.edges[0]?.targetPort, "reference_image");
  assert.equal(repeated.changed, false);
  assert.equal(repeated.document.canvasState.edges.length, 1);
});

test("edge.disconnect supports ifExists idempotency", () => {
  const connected = applyAuthoringCommands(createAuthoringDocument(), [
    { type: "block.add", id: "image_hero", kind: "image" },
    { type: "block.add", id: "video_hero", kind: "video" },
    {
      type: "edge.connect",
      source: "image_hero:generated_image_asset",
      target: "video_hero:reference_image",
    },
  ]);
  const edgeId = connected.document.canvasState.edges[0]?.id ?? "";
  const disconnected = applyAuthoringCommand(connected.document, {
    type: "edge.disconnect",
    id: edgeId,
  });
  const repeated = applyAuthoringCommand(disconnected.document, {
    type: "edge.disconnect",
    id: edgeId,
    ifExists: true,
  });

  assert.equal(disconnected.document.canvasState.edges.length, 0);
  assert.equal(repeated.changed, false);
});

test("asset.import creates reference assets and supports ifNotExists", () => {
  const imported = applyAuthoringCommand(createAuthoringDocument(), {
    type: "asset.import",
    id: "asset_reference",
    uri: "file:///tmp/reference.png",
    mediaType: "image",
    title: "Reference",
  });

  assert.equal(imported.document.assets[0]?.id, "asset_reference");
  assert.equal(imported.document.assets[0]?.usage, "reference");
  assert.throws(
    () =>
      applyAuthoringCommand(imported.document, {
        type: "asset.import",
        id: "asset_reference",
        uri: "file:///tmp/reference.png",
        mediaType: "image",
        title: "Reference",
      }),
    OwnCanvasAuthoringError,
  );

  const repeated = applyAuthoringCommand(imported.document, {
    type: "asset.import",
    id: "asset_reference",
    uri: "file:///tmp/reference.png",
    mediaType: "image",
    title: "Reference",
    ifNotExists: true,
  });

  assert.equal(repeated.changed, false);
  assert.equal(repeated.document.assets.length, 1);
});

test("asset.list returns existing assets without mutation", () => {
  const document = applyAuthoringCommand(createAuthoringDocument(), {
    type: "asset.import",
    id: "asset_reference",
    uri: "file:///tmp/reference.png",
    mediaType: "image",
    title: "Reference",
  }).document;

  const result = applyAuthoringCommand(document, {
    type: "asset.list",
  });

  assert.equal(result.changed, false);
  assert.deepEqual(result.data.assets, document.assets);
});

test("applyAuthoringCommands applies a connected multi-command plan", () => {
  const result = applyAuthoringCommands(createAuthoringDocument(), [
    { type: "block.add", id: "text_prompt", kind: "text" },
    { type: "block.add", id: "image_hero", kind: "image" },
    {
      type: "block.set",
      id: "image_hero",
      prompt: "Create a launch image",
      count: 2,
    },
    {
      type: "edge.connect",
      source: "text_prompt:prompt",
      target: "image_hero:prompt",
    },
  ]);

  assert.equal(result.changed, true);
  assert.deepEqual(result.createdIds, [
    "text_prompt",
    "image_hero",
    "edge_text_prompt_prompt_image_hero_prompt",
  ]);
  assert.equal(result.document.canvasState.nodes.length, 2);
  assert.equal(result.document.canvasState.edges.length, 1);
});

test("applyAuthoringCommands leaves the input document unchanged when a later command fails", () => {
  const document = createAuthoringDocument();

  assert.throws(
    () =>
      applyAuthoringCommands(document, [
        { type: "block.add", id: "image_hero", kind: "image" },
        {
          type: "edge.connect",
          source: "image_hero:generated_image_asset",
          target: "missing_video:reference_image",
        },
      ]),
    OwnCanvasAuthoringError,
  );

  assert.deepEqual(document.canvasState.nodes, []);
  assert.deepEqual(document.canvasState.edges, []);
});

test("applyAuthoringCommands reports unchanged repeated edge connects", () => {
  const connected = applyAuthoringCommands(createAuthoringDocument(), [
    { type: "block.add", id: "text_prompt", kind: "text" },
    { type: "block.add", id: "image_hero", kind: "image" },
    {
      type: "edge.connect",
      source: "text_prompt:prompt",
      target: "image_hero:prompt",
    },
  ]);
  const repeated = applyAuthoringCommands(connected.document, [
    {
      type: "edge.connect",
      source: "text_prompt:prompt",
      target: "image_hero:prompt",
    },
  ]);

  assert.equal(repeated.changed, false);
  assert.equal(repeated.document.canvasState.edges.length, 1);
});

async function createAuthoringWorkspace() {
  const root = await mkdtemp(path.join(tmpdir(), "owncanvas-authoring-"));
  await initializeWorkspace({
    root,
    now: () => "2026-05-18T00:00:00.000Z",
  });
  await createCampaignInWorkspace({
    root,
    id: "campaign_authoring",
    title: "Authoring Campaign",
    now: () => "2026-05-18T00:05:00.000Z",
  });
  return root;
}

function createAuthoringDocument() {
  return createFileBackedCampaignDocument({
    id: "campaign_authoring_unit",
    title: "Authoring Unit",
    now: () => "2026-05-18T00:00:00.000Z",
  });
}
